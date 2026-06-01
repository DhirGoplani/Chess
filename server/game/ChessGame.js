import { Chess } from 'chess.js';

export const TIME_CONTROLS = {
  bullet: [{ label: "1 min",  ms: 60000   }],
  blitz:  [{ label: "3 min",  ms: 180000  },
           { label: "5 min",  ms: 300000  }],
  rapid:  [{ label: "10 min", ms: 600000  },
           { label: "15 min", ms: 900000  },
           { label: "30 min", ms: 1800000 }],
};

class ChessGame {
  constructor(gameId, player1, player2, timeMs) {
    this.gameId = gameId;
    this.chess  = new Chess();
    this.players = {
      white: player1,
      black: player2
    };
    this.status      = 'playing';
    this.moveHistory = [];

    // Timer
    this.timers = {
      white: timeMs,
      black: timeMs
    };
    this.activeColour  = 'white';  // white moves first
    this.timerInterval = null;
    this.onTimeout     = null;     // callback when timer hits 0
    this.lastTickTime  = null;
  }

  // Start the timer for the current active colour
  startTimer(onTick, onTimeout) {
    this.onTimeout   = onTimeout;
    this.lastTickTime = Date.now();

    this.timerInterval = setInterval(() => {
      const now     = Date.now();
      const elapsed = now - this.lastTickTime;
      this.lastTickTime = now;

      this.timers[this.activeColour] -= elapsed;

      if (this.timers[this.activeColour] <= 0) {
        this.timers[this.activeColour] = 0;
        this.stopTimer();
        if (this.onTimeout) this.onTimeout(this.activeColour);
        return;
      }

      if (onTick) onTick(this.timers);
    }, 1000);
  }

  stopTimer() {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
  }

  switchTimer() {
    this.activeColour = this.activeColour === 'white' ? 'black' : 'white';
    this.lastTickTime = Date.now();
  }

  makeMove(from, to, promotion = 'q') {
    try {
      const move = this.chess.move({ from, to, promotion });
      if (!move) return { success: false, message: 'Invalid move' };

      this.moveHistory.push(move.san);
      this.switchTimer();  // switch timer after move

      if (this.chess.isCheckmate())  this.status = 'checkmate';
      else if (this.chess.isDraw())  this.status = 'draw';
      else if (this.chess.isCheck()) this.status = 'check';
      else                           this.status = 'playing';

      return {
        success: true,
        move,
        board:       this.chess.fen(),
        status:      this.status,
        turn:        this.chess.turn() === 'w' ? 'white' : 'black',
        moveHistory: this.moveHistory,
        timers:      this.timers
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
      board:       this.chess.fen(),
      turn:        this.getCurrentTurn(),
      status:      this.status,
      moveHistory: this.moveHistory,
      players:     this.players,
      timers:      this.timers
    };
  }
}

export default ChessGame;