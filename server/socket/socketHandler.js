import jwt from 'jsonwebtoken';
import GameManager from '../game/GameManager.js';
import MatchmakingQueue from '../matchmaking/MatchmakingQueue.js';

const socketHandler = (io) => {

  // ── JWT MIDDLEWARE ────────────────────────────────
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) {
      return next(new Error('No token provided'));
    }
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.user = {
        id:       decoded.id,
       bullet_rating: decoded.bullet_rating ?? 800,
      blitz_rating:  decoded.blitz_rating  ?? 800,
      rapid_rating:  decoded.rapid_rating  ?? 800
      };
      next();
    } catch (err) {
      return next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    console.log(`Player connected: ${socket.id} | User: ${socket.user.username}`);

    // ── FIND MATCH
    socket.on('findMatch', () => {
      console.log(`Finding match for: ${socket.user.username}`);

      const match = MatchmakingQueue.addPlayer(socket.id);

      if (match) {
        const { gameId, players } = match;

        io.sockets.sockets.get(players.white)?.join(gameId);
        io.sockets.sockets.get(players.black)?.join(gameId);

        const whiteSocket = io.sockets.sockets.get(players.white);
        const blackSocket = io.sockets.sockets.get(players.black);

        io.to(players.white).emit('gameStart', {
          gameId,
          color:    'white',
          opponent: blackSocket?.user?.username ?? 'Opponent'
        });

        io.to(players.black).emit('gameStart', {
          gameId,
          color:    'black',
          opponent: whiteSocket?.user?.username ?? 'Opponent'
        });

        console.log(`Game started: ${gameId}`);
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
        io.to(gameId).emit('gameOver', {
          status: result.status,
          winner: result.status === 'checkmate' ? playerColor : 'draw'
        });
        GameManager.deleteGame(gameId);
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
      GameManager.deleteGame(gameId);
    });

    // ── DISCONNECT 
    socket.on('disconnect', () => {
      console.log(`Player disconnected: ${socket.user?.username}`);

      MatchmakingQueue.removePlayer(socket.id);

      const game = GameManager.removePlayer(socket.id);
      if (game) {
        io.to(game.gameId).emit('opponentLeft', {
          message: 'Opponent disconnected! You win!'
        });
        GameManager.deleteGame(game.gameId);
      }
    });
  });
};

export default socketHandler;