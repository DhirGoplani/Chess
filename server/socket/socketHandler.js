import jwt         from 'jsonwebtoken';
import GameManager  from '../game/GameManager.js';
import MatchmakingQueue from '../matchmaking/MatchmakingQueue.js';

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

  // Connection
  io.on('connection', (socket) => {
    console.log(`Player connected: ${socket.id} | User: ${socket.user.username}`);

    // ── Find match 
    socket.on('findMatch', ({ format, timeControl }) => {
      if (!['bullet', 'blitz', 'rapid'].includes(format)) {
        socket.emit('error', { message: 'Invalid format' });
        return;
      }

      const rating = socket.user[`${format}_rating`] ?? 800;

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