// import jwt from 'jsonwebtoken';
// import GameManager from '../game/GameManager.js';
// import MatchmakingQueue from '../matchmaking/MatchmakingQueue.js';

// const socketHandler = (io) => {
//   io.on('connection', (socket) => {
//     console.log('Player connected:', socket.id);

//     socket.on('findMatch', () => {
//       console.log('Finding match for:', socket.id);

//       const match = MatchmakingQueue.addPlayer(socket.id);

//       if (match) {
//         // Match mil gaya!
//         const { gameId, players } = match;

//         // Dono players ko ek room mein daalo
//         io.sockets.sockets.get(players.white)?.join(gameId);
//         io.sockets.sockets.get(players.black)?.join(gameId);

//         // Dono ko game start ka signal bhejo
//         io.to(players.white).emit('gameStart', {
//           gameId,
//           color: 'white',
//           opponent: players.black
//         });

//         io.to(players.black).emit('gameStart', {
//           gameId,
//           color: 'black',
//           opponent: players.white
//         });

//         console.log(`Game started: ${gameId}`);

//       } else {
//         // Abhi wait karo
//         socket.emit('waiting', { message: 'Waiting for opponent...' });
//       }
//     });


//     socket.on('makeMove', ({ gameId, from, to, promotion }) => {
//       const game = GameManager.getGame(gameId);

//       // Game exist karti hai
//       if (!game) {
//         socket.emit('error', { message: 'Game not found!' });
//         return;
//       }

//       // Kya yeh player ki baari hai
//       const playerColor = game.getPlayerColor(socket.id);
//       if (playerColor !== game.getCurrentTurn()) {
//         socket.emit('error', { message: 'Not your turn!' });
//         return;
//       }

//       // Move karo
//       const result = game.makeMove(from, to, promotion);

//       if (!result.success) {
//         socket.emit('error', { message: 'Invalid move!' });
//         return;
//       }

//       // Dono players ko move broadcast karo
//       io.to(gameId).emit('moveMade', {
//         from,
//         to,
//         board: result.board,
//         status: result.status,
//         turn: result.turn,
//         moveHistory: result.moveHistory
//       });

//       // Game khatam?
//       if (result.status === 'checkmate' || result.status === 'draw') {
//         io.to(gameId).emit('gameOver', {
//           status: result.status,
//           winner: result.status === 'checkmate' ? playerColor : null
//         });
//         GameManager.deleteGame(gameId);
//       }
//     });

//     // ─── DISCONNECT ────────────────────────────────
//     socket.on('disconnect', () => {
//       console.log('Player disconnected:', socket.id);

//       // Queue se hatao
//       MatchmakingQueue.removePlayer(socket.id);

//       // Game se hatao
//       const game = GameManager.removePlayer(socket.id);
//       if (game) {
//         // Opponent ko batao
//         io.to(game.gameId).emit('opponentLeft', {
//           message: 'Opponent disconnected! You win!'
//         });
//         GameManager.deleteGame(game.gameId);
//       }
//     });
//   });
// };

// module.exports = socketHandler;