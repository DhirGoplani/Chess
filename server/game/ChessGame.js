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

    // Draw offers
    // drawOffer: colour ('white' | 'black') of the player with a pending
    // offer, or null if none is pending right now.
    this.drawOffer = null;
    // drawOfferMoveIndex[colour]: moveHistory.length at the moment that
    // colour's last offer was declined. A colour may only send a new offer
    // once moveHistory.length has grown past this value, i.e. after another
    // move has been made (by either player). Starts at -1 so an offer is
    // always allowed before it has ever been used.
    this.drawOfferMoveIndex = { white: -1, black: -1 };

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

      // Any move made (by either side) implicitly voids a pending draw offer
      this.drawOffer = null;

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

  // Can `colour` legally send a draw offer right now?
  canOfferDraw(colour) {
    if (this.status !== 'playing' && this.status !== 'check') return false;
    if (this.drawOffer) return false; // an offer is already pending
    return this.moveHistory.length > this.drawOfferMoveIndex[colour];
  }

  // Try to register a draw offer from `colour`. Returns true on success.
  offerDraw(colour) {
    if (!this.canOfferDraw(colour)) return false;
    this.drawOffer = colour;
    return true;
  }

  // Resolve the pending offer. Returns the offering colour, or null if
  // there was no pending offer to respond to.
  respondDraw(accept) {
    const offerColour = this.drawOffer;
    if (!offerColour) return null;

    if (accept) {
      this.status = 'draw';
    } else {
      // Offering side must wait for another move before offering again
      this.drawOfferMoveIndex[offerColour] = this.moveHistory.length;
    }

    this.drawOffer = null;
    return offerColour;
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