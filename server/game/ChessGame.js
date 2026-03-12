const { Chess } = require('chess.js');

class ChessGame {
  constructor(gameId, player1, player2) {
    this.gameId = gameId;
    this.chess = new Chess();
    this.players = {
      white: player1,
      black: player2
    };
    this.status = 'playing'; 
    this.moveHistory = [];
  }

  makeMove(from, to, promotion = 'q') {
    try {
      const move = this.chess.move({ from, to, promotion });

      if (!move) return { success: false, message: 'Invalid move' };

      this.moveHistory.push(move.san);

      if (this.chess.isCheckmate()) this.status = 'checkmate';
      else if (this.chess.isDraw()) this.status = 'draw';
      else if (this.chess.isCheck()) this.status = 'check';
      else this.status = 'playing';

      return {
        success: true,
        move,
        board: this.chess.fen(),
        status: this.status,
        turn: this.chess.turn() === 'w' ? 'white' : 'black',
        moveHistory: this.moveHistory
      };

    } catch (err) {
      return { success: false, message: 'Invalid move' };
    }
  }
  getPlayerColor(socketId) {
    if (this.players.white === socketId) return 'white';
    if (this.players.black === socketId) return 'black';
    return null;
  }
  getCurrentTurn() {
    return this.chess.turn() === 'w' ? 'white' : 'black';
  }
  getBoardState() {
    return {
      board: this.chess.fen(),
      turn: this.getCurrentTurn(),
      status: this.status,
      moveHistory: this.moveHistory,
      players: this.players
    };
  }
}

module.exports = ChessGame;