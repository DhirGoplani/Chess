import jwt from 'jsonwebtoken';
import GameManager from '../game/GameManager.js';
import MatchmakingQueue from '../matchmaking/MatchmakingQueue.js';

const socketHandler = (io) => {

  // ── JWT MIDDLEWARE 
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
        rapid_rating:  decoded.rapid_rating  ?? 800
      };
      next();
    } catch (err) {
      return next(new Error('Invalid token'));
    }
  });


  setInterval(() => {
    MatchmakingQueue.tick(io);
  }, 5000);

  io.on('connection', (socket) => {
    console.log(`Player connected: ${socket.id} | User: ${socket.user.username}`);
    socket.on('cancelSearch', () => {
  MatchmakingQueue.removePlayer(socket.id);
  console.log(`[Matchmaking] ${socket.user.username} cancelled search`);
   });
    // ── FIND MATCH
    socket.on('findMatch', ({ format }) => {
      if (!['bullet', 'blitz', 'rapid'].includes(format)) {
        socket.emit('error', { message: 'Invalid format' });
        return;
      }

      const rating = socket.user[`${format}_rating`] ?? 800;

      const playerInfo = {
        socketId: socket.id,
        userId:   socket.user.id,
        username: socket.user.username,
        rating,
        format
      };

      console.log(`[Matchmaking] ${socket.user.username} looking for ${format} | Rating: ${rating}`);

      const match = MatchmakingQueue.addPlayer(playerInfo);

      if (match) {
        MatchmakingQueue._emitMatchFound(io, match);
      } else {
        socket.emit('waiting', { message: 'Waiting for opponent...' });
      }
    });

    // ── MAKE MOVE
    socket.on('makeMove', ({ gameId, from, to, promotion }) => {
      const game = GameManager.getGame(gameId);

      if (!game) {
        socket.emit('error', { message: 'Game not found!' });
        return;
      }

      const playerColor = game.getPlayerColor(socket.id);
      if (playerColor !== game.getCurrentTurn()) {
        socket.emit('error', { message: 'Not your turn!' });
        return;
      }

      const result = game.makeMove(from, to, promotion);
      if (!result.success) {
        socket.emit('error', { message: 'Invalid move!' });
        return;
      }

      io.to(gameId).emit('moveMade', {
        from,
        to,
        board:       result.board,
        status:      result.status,
        turn:        result.turn,
        moveHistory: result.moveHistory
      });

      if (result.status === 'checkmate' || result.status === 'draw') {
      const winnerId = result.status === 'checkmate'
      ? (playerColor === 'white' ? game.whitePlayer.userId : game.blackPlayer.userId)
      : null;
        io.to(gameId).emit('gameOver', {
          status: result.status,
          winner: result.status === 'checkmate' ? playerColor : 'draw'
        });
        GameManager.endGame(gameId, winnerId, result.status)
      .then(() => GameManager.deleteGame(gameId));
      }
    });

    // ── RESIGN 
    socket.on('resign', ({ gameId }) => {
      const game = GameManager.getGame(gameId);
      if (!game) return;

      const playerColor = game.getPlayerColor(socket.id);
      const winner      = playerColor === 'white' ? 'black' : 'white';

      io.to(gameId).emit('gameOver', {
        status: 'resign',
        winner
      });
        GameManager.endGame(gameId, winnerId, 'resign')
    .then(() => GameManager.deleteGame(gameId));
    });

    // ── DISCONNECT 
socket.on('disconnect', () => {
  console.log(`Player disconnected: ${socket.user?.username}`);

  MatchmakingQueue.removePlayer(socket.id);

  const game = GameManager.getGameByPlayer(socket.id);
  if (game) {
    const playerColor = game.getPlayerColor(socket.id);
    const winner      = playerColor === 'white' ? 'black' : 'white';
    const winnerId    = playerColor === 'white'
      ? game.blackPlayer.userId
      : game.whitePlayer.userId;

    io.to(game.gameId).emit('opponentLeft', {
      message: 'Opponent disconnected! You win!'
    });

    GameManager.endGame(game.gameId, winnerId, 'disconnect')
      .then(() => GameManager.deleteGame(game.gameId));
  }
});
  });
};

export default socketHandler;