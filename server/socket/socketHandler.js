import jwt         from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import GameManager  from '../game/GameManager.js';
import MatchmakingQueue from '../matchmaking/MatchmakingQueue.js';
import { sql } from '../utils/connectDB.js';
import onlineUsers from '../friends/onlineUsers.js';

// challengeId -> { challengerSocketId, challengerId, challengerUsername, targetId, format, timeControl, createdAt }
const pendingChallenges = new Map();
const CHALLENGE_TTL = 30000; // auto-expire an unanswered challenge after 30s

const socketHandler = (io) => {

  // Auth middleware
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error('No token provided'));
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.user = {
        id:            decoded.id,
        username:      decoded.username,
        bullet_rating: decoded.bullet_rating ?? 800,
        blitz_rating:  decoded.blitz_rating  ?? 800,
        rapid_rating:  decoded.rapid_rating  ?? 800,
      };
      next();
    } catch {
      return next(new Error('Invalid token'));
    }
  });

  //  Matchmaking tick 
  setInterval(() => {
    MatchmakingQueue.tick(io);
  }, 5000);

  // Sweep expired challenges
  setInterval(() => {
    const now = Date.now();
    for (const [challengeId, ch] of pendingChallenges.entries()) {
      if (now - ch.createdAt > CHALLENGE_TTL) {
        io.to(ch.challengerSocketId).emit('challengeExpired', { challengeId });
        const targetSocketId = onlineUsers.getSocketId(ch.targetId);
        if (targetSocketId) {
          io.to(targetSocketId).emit('challengeExpired', { challengeId });
        }
        pendingChallenges.delete(challengeId);
      }
    }
  }, 5000);

  // Connection
  io.on('connection', (socket) => {
    console.log(`Player connected: ${socket.id} | User: ${socket.user.username}`);
    onlineUsers.setOnline(socket.user.id, socket.id);

    // ── Find match 
    socket.on('findMatch', async ({ format, timeControl }) => {
      if (!['bullet', 'blitz', 'rapid'].includes(format)) {
        socket.emit('error', { message: 'Invalid format' });
        return;
      }

      // Always use the live rating from the DB, not the one baked into the
      // JWT at login (which goes stale as soon as the player finishes a game).
      let rating = socket.user[`${format}_rating`] ?? 800;
      try {
        const [row] = await sql`SELECT bullet_rating, blitz_rating, rapid_rating FROM users WHERE id = ${socket.user.id}`;
        if (row) {
          const col = `${format}_rating`;
          if (row[col] != null) rating = row[col];
        }
      } catch (err) {
        console.error(`[Matchmaking] rating lookup failed for ${socket.user.username}:`, err.message);
        // fall back to the JWT-derived rating above
      }

      const playerInfo = {
        socketId:    socket.id,
        userId:      socket.user.id,
        username:    socket.user.username,
        rating,
        format,
        timeControl,
      };

      console.log(`[Matchmaking] ${socket.user.username} looking for ${format} ${timeControl}ms | Rating: ${rating}`);

      const match = MatchmakingQueue.addPlayer(playerInfo);

      if (match) {
        MatchmakingQueue._emitMatchFound(io, match);
      } else {
        socket.emit('waiting', { message: 'Waiting for opponent...' });
      }
    });

    // ── Cancel search
    socket.on('cancelSearch', () => {
      MatchmakingQueue.removePlayer(socket.id);
      console.log(`[Matchmaking] ${socket.user.username} cancelled search`);
    });

    // ── Challenge a friend
    socket.on('challengeFriend', ({ friendId, format, timeControl }) => {
      if (!['bullet', 'blitz', 'rapid'].includes(format)) {
        socket.emit('error', { message: 'Invalid format' });
        return;
      }

      const friendSocketId = onlineUsers.getSocketId(friendId);
      if (!friendSocketId) {
        socket.emit('challengeFailed', { message: 'Friend is not online' });
        return;
      }

      const challengeId = uuidv4();
      pendingChallenges.set(challengeId, {
        challengerSocketId: socket.id,
        challengerId:        socket.user.id,
        challengerUsername:  socket.user.username,
        targetId:            friendId,
        format,
        timeControl,
        createdAt:           Date.now(),
      });

      io.to(friendSocketId).emit('challengeReceived', {
        challengeId,
        from: { id: socket.user.id, username: socket.user.username },
        format,
        timeControl,
      });

      socket.emit('challengeSent', { challengeId, targetId: friendId });
    });

    // ── Cancel an outgoing challenge
    socket.on('cancelChallenge', ({ challengeId }) => {
      const ch = pendingChallenges.get(challengeId);
      if (ch && ch.challengerId === socket.user.id) {
        const targetSocketId = onlineUsers.getSocketId(ch.targetId);
        if (targetSocketId) {
          io.to(targetSocketId).emit('challengeCancelled', { challengeId });
        }
        pendingChallenges.delete(challengeId);
      }
    });

    // ── Respond to a challenge (accept/decline)
    socket.on('respondChallenge', async ({ challengeId, accept }) => {
      const challenge = pendingChallenges.get(challengeId);
      if (!challenge) {
        socket.emit('challengeFailed', { message: 'Challenge no longer valid' });
        return;
      }
      // Only the intended target can respond
      if (challenge.targetId !== socket.user.id) return;

      pendingChallenges.delete(challengeId);

      if (!accept) {
        io.to(challenge.challengerSocketId).emit('challengeDeclined', {
          by: socket.user.username,
        });
        return;
      }

      const ratingCol = `${challenge.format}_rating`;

      // Fetch live ratings for both players, same as findMatch does
      let challengerRating = 800;
      let responderRating  = 800;
      try {
        const rows = await sql`
          SELECT id, bullet_rating, blitz_rating, rapid_rating
          FROM users
          WHERE id = ${challenge.challengerId} OR id = ${socket.user.id}
        `;
        const challengerRow = rows.find(r => r.id === challenge.challengerId);
        const responderRow  = rows.find(r => r.id === socket.user.id);
        if (challengerRow?.[ratingCol] != null) challengerRating = challengerRow[ratingCol];
        if (responderRow?.[ratingCol]  != null) responderRating  = responderRow[ratingCol];
      } catch (err) {
        console.error(`[Challenge] rating lookup failed for challenge ${challengeId}:`, err.message);
        // fall back to 800 defaults above
      }

      const challengerPlayer = {
        socketId: challenge.challengerSocketId,
        userId:   challenge.challengerId,
        username: challenge.challengerUsername,
        rating:   challengerRating,
      };
      const responderPlayer = {
        socketId: socket.id,
        userId:   socket.user.id,
        username: socket.user.username,
        rating:   responderRating,
      };

      const [white, black] = Math.random() > 0.5
        ? [challengerPlayer, responderPlayer]
        : [responderPlayer, challengerPlayer];

      const gameId = uuidv4();

      GameManager.createGame(gameId, white, black, challenge.timeControl)
        .then(() => {
          MatchmakingQueue._emitMatchFound(io, {
            gameId,
            format: challenge.format,
            timeControl: challenge.timeControl,
            players: { white, black },
          });
        })
        .catch(err => console.error(`[Challenge] createGame failed for ${gameId}:`, err.message));
    });

    // ── Make move
    socket.on('makeMove', ({ gameId, from, to, promotion }) => {
      const game = GameManager.getGame(gameId);
      if (!game) {
        socket.emit('error', { message: 'Game not found' });
        return;
      }

      const playerColor = game.getPlayerColor(socket.id);
      if (!playerColor) {
        socket.emit('error', { message: 'You are not in this game' });
        return;
      }
      if (playerColor !== game.getCurrentTurn()) {
        socket.emit('error', { message: 'Not your turn' });
        return;
      }

      const result = game.makeMove(from, to, promotion);
      if (!result.success) {
        socket.emit('error', { message: result.message ?? 'Invalid move' });
        return;
      }
      const moveNumber  = game.moveHistory.length;
      const movedColour = playerColor; // playerColor is the one who just moved
      GameManager.recordMove(gameId, {
      moveNumber,
      colour:   movedColour,
      from,
      to,
      fen:      result.board,
      san:      result.move.san,
      timeLeft: result.timers?.[movedColour] ?? null
});
      // Broadcast move to both players
      io.to(gameId).emit('moveMade', {
        from,
        to,
        board:       result.board,
        status:      result.status,
        turn:        result.turn,
        moveHistory: result.moveHistory,
      });

      // Broadcast updated timers (timer already switched inside makeMove)
      io.to(gameId).emit('timerUpdate', {
        white: Math.max(0, result.timers.white),
        black: Math.max(0, result.timers.black),
      });

      // Check for game over
      if (result.status === 'checkmate') {
        // The player who just moved is the winner
        const winnerId = playerColor === 'white'
          ? game.whitePlayer.userId
          : game.blackPlayer.userId;

        io.to(gameId).emit('gameOver', {
          status: 'checkmate',
          winner: playerColor,
        });

        GameManager.endGame(gameId, winnerId, 'checkmate',io)
          .then(() => GameManager.deleteGame(gameId))
          .catch(err => console.error('[socketHandler] endGame error:', err.message));

      } else if (result.status === 'draw') {
        io.to(gameId).emit('gameOver', {
          status: 'draw',
          winner: 'draw',
        });

        GameManager.endGame(gameId, null, 'draw',io)
          .catch(err => console.error('[socketHandler] endGame error:', err.message));
      }
    });

    // ── Offer draw
    socket.on('offerDraw', ({ gameId }) => {
      const game = GameManager.getGame(gameId);
      if (!game) {
        socket.emit('error', { message: 'Game not found' });
        return;
      }

      const playerColor = game.getPlayerColor(socket.id);
      if (!playerColor) {
        socket.emit('error', { message: 'You are not in this game' });
        return;
      }

      if (!game.offerDraw(playerColor)) {
        socket.emit('drawOfferRejected', {
          message: game.drawOffer
            ? 'A draw offer is already pending'
            : 'You must make a move before offering another draw',
        });
        return;
      }

      const opponentColor  = playerColor === 'white' ? 'black' : 'white';
      const opponentSocket = game.players[opponentColor];

      io.to(opponentSocket).emit('drawOffered', { by: playerColor });
      socket.emit('drawOfferSent', { by: playerColor });
    });

    // ── Respond to a pending draw offer
    socket.on('respondDraw', ({ gameId, accept }) => {
      const game = GameManager.getGame(gameId);
      if (!game) return;

      const playerColor = game.getPlayerColor(socket.id);
      if (!playerColor) return;

      // Ignore if there's no offer, or if you're trying to respond to your own offer
      if (!game.drawOffer || game.drawOffer === playerColor) return;

      const offerColor = game.respondDraw(accept);
      if (!offerColor) return;

      if (accept) {
        io.to(gameId).emit('gameOver', {
          status: 'draw',
          winner: 'draw',
        });

        GameManager.endGame(gameId, null, 'draw_agreement', io)
          .then(() => GameManager.deleteGame(gameId))
          .catch(err => console.error('[socketHandler] draw endGame error:', err.message));
      } else {
        io.to(gameId).emit('drawDeclined', { by: playerColor });
      }
    });

    // Resign 
    socket.on('resign', ({ gameId }) => {
      const game = GameManager.getGame(gameId);
      if (!game) return;

      const playerColor  = game.getPlayerColor(socket.id);
      if (!playerColor) return;

      const winnerColor  = playerColor === 'white' ? 'black' : 'white';
      const winnerId     = winnerColor  === 'white'
        ? game.whitePlayer.userId
        : game.blackPlayer.userId;

      io.to(gameId).emit('gameOver', {
        status: 'resign',
        winner: winnerColor, 
      });

      GameManager.endGame(gameId, winnerId, 'resign',io)
        .then(() => GameManager.deleteGame(gameId))
        .catch(err => console.error('[socketHandler] resign endGame error:', err.message));
    });

    // Disconnect 
    socket.on('disconnect', () => {
      console.log(`Player disconnected: ${socket.user?.username}`);

      if (socket.user?.id) {
        onlineUsers.setOffline(socket.user.id);
      }

      MatchmakingQueue.removePlayer(socket.id);

      const game = GameManager.getGameByPlayer(socket.id);
      if (!game) return;

      const playerColor = game.getPlayerColor(socket.id);
      const winnerColor = playerColor === 'white' ? 'black' : 'white';
      const winnerId    = winnerColor  === 'white'
        ? game.whitePlayer.userId
        : game.blackPlayer.userId;

      io.to(game.gameId).emit('opponentLeft', {
        message: 'Opponent disconnected! You win!',
      });

      GameManager.endGame(game.gameId, winnerId, 'disconnect',io)
        .then(() => GameManager.deleteGame(game.gameId))
        .catch(err => console.error('[socketHandler] disconnect endGame error:', err.message));
    });
  });
};

export default socketHandler;   