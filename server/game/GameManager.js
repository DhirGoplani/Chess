import ChessGame from './ChessGame.js';
import { sql }   from '../utils/connectDB.js';

class GameManager {
  constructor() {
    this.games         = new Map(); // gameId  → ChessGame
    this.playerGameMap = new Map(); // socketId → gameId
  }

  // ─────────────────────────────────────────────
  //  CREATE
  // ─────────────────────────────────────────────
  async createGame(gameId, whitePlayer, blackPlayer, timeMs) {
    const game = new ChessGame(
      gameId,
      whitePlayer.socketId,
      blackPlayer.socketId,
      timeMs
    );

    // Attach full player info for ELO / DB use
    game.whitePlayer = whitePlayer;
    game.blackPlayer = blackPlayer;
    game.format      = whitePlayer.format;

    this.games.set(gameId, game);
    this.playerGameMap.set(whitePlayer.socketId, gameId);
    this.playerGameMap.set(blackPlayer.socketId, gameId);

    try {
      await sql`
        INSERT INTO games (id, white_player_id, black_player_id, status, game_type)
        VALUES (
          ${gameId},
          ${whitePlayer.userId},
          ${blackPlayer.userId},
          'playing',
          ${whitePlayer.format}
        )
      `;
      console.log(`[GameManager] Game ${gameId} saved to DB`);
    } catch (err) {
      console.error(`[GameManager] DB insert failed for ${gameId}:`, err.message);
    }

    return game;
  }

  // ─────────────────────────────────────────────
  //  START TIMER  (called after gameStart emitted)
  // ─────────────────────────────────────────────
  startTimer(gameId, io) {
    const game = this.games.get(gameId);
    if (!game) {
      console.warn(`[GameManager] startTimer: game ${gameId} not found`);
      return;
    }

    // onTick — broadcast updated timers to the room every second
    const onTick = (timers) => {
      io.to(gameId).emit('timerUpdate', {
        white: timers.white,
        black: timers.black,
      });
    };

    // onTimeout — the active colour ran out of time
    const onTimeout = (loserColour) => {
      const winnerColour = loserColour === 'white' ? 'black' : 'white';
      const winner       = game[`${winnerColour}Player`];

      io.to(gameId).emit('gameOver', {
        status: 'timeout',
        winner: winnerColour,
      });

      // ✅ Pass io so endGame can emit ratingUpdate
      this.endGame(gameId, winner.userId, `${winnerColour}_wins`, io).catch(err =>
        console.error(`[GameManager] endGame error:`, err.message)
      );
    };

    game.startTimer(onTick, onTimeout);
    console.log(`[GameManager] Timer started for game ${gameId}`);
  }

  // ─────────────────────────────────────────────
  //  MAKE MOVE
  // ─────────────────────────────────────────────
  makeMove(gameId, socketId, from, to, promotion = 'q') {
    const game = this.games.get(gameId);
    if (!game) return { success: false, message: 'Game not found' };

    const colour = game.getPlayerColor(socketId);
    if (!colour)                         return { success: false, message: 'Not a player in this game' };
    if (colour !== game.getCurrentTurn()) return { success: false, message: 'Not your turn' };

    return game.makeMove(from, to, promotion);
  }

  // ─────────────────────────────────────────────
  //  END GAME
  // ─────────────────────────────────────────────
  async endGame(gameId, winnerId, result, io) { // ✅ added io param
    const game = this.games.get(gameId);
    if (!game) return;

    game.stopTimer();

    try {
      await sql`
        UPDATE games
        SET status    = 'finished',
            result    = ${result},
            winner_id = ${winnerId},
            ended_at  = now(),
            pgn       = ${game.moveHistory.join(' ')}
        WHERE id = ${gameId}
      `;

      const { newWhiteRating, newBlackRating } = await this._updateRatings(game, winnerId, result);

      // ✅ Emit new rating to each player individually
      if (io) {
        io.to(game.whitePlayer.socketId).emit('ratingUpdate', {
          newRating: newWhiteRating,
          format: game.format,
        });
        io.to(game.blackPlayer.socketId).emit('ratingUpdate', {
          newRating: newBlackRating,
          format: game.format,
        });
      }

      console.log(`[GameManager] Game ${gameId} ended — result: ${result}`);
    } catch (err) {
      console.error(`[GameManager] endGame DB error for ${gameId}:`, err.message);
    }
  }

  // ─────────────────────────────────────────────
  //  ELO
  // ─────────────────────────────────────────────
  async _updateRatings(game, winnerId, result) {
    const white  = game.whitePlayer;
    const black  = game.blackPlayer;
    const format = game.format;

    const whiteRating = white.rating;
    const blackRating = black.rating;

    const expectedWhite = 1 / (1 + Math.pow(10, (blackRating - whiteRating) / 400));
    const expectedBlack = 1 - expectedWhite;

    let actualWhite, actualBlack;
    if (result === 'draw') {
      actualWhite = 0.5;
      actualBlack = 0.5;
    } else if (winnerId === white.userId) {
      actualWhite = 1;
      actualBlack = 0;
    } else {
      actualWhite = 0;
      actualBlack = 1;
    }

    const K = 32;
    const whiteChange    = Math.round(K * (actualWhite - expectedWhite));
    const blackChange    = Math.round(K * (actualBlack - expectedBlack));
    const newWhiteRating = whiteRating + whiteChange;
    const newBlackRating = blackRating + blackChange;

    if (format === 'bullet') {
      await sql`UPDATE users SET bullet_rating = ${newWhiteRating} WHERE id = ${white.userId}`;
      await sql`UPDATE users SET bullet_rating = ${newBlackRating} WHERE id = ${black.userId}`;
    } else if (format === 'blitz') {
      await sql`UPDATE users SET blitz_rating = ${newWhiteRating} WHERE id = ${white.userId}`;
      await sql`UPDATE users SET blitz_rating = ${newBlackRating} WHERE id = ${black.userId}`;
    } else {
      await sql`UPDATE users SET rapid_rating = ${newWhiteRating} WHERE id = ${white.userId}`;
      await sql`UPDATE users SET rapid_rating = ${newBlackRating} WHERE id = ${black.userId}`;
    }

    await sql`
      INSERT INTO rating_history
        (user_id, game_id, game_type, rating_before, rating_after, change)
      VALUES
        (${white.userId}, ${game.gameId}, ${format}, ${whiteRating}, ${newWhiteRating}, ${whiteChange})
    `;
    await sql`
      INSERT INTO rating_history
        (user_id, game_id, game_type, rating_before, rating_after, change)
      VALUES
        (${black.userId}, ${game.gameId}, ${format}, ${blackRating}, ${newBlackRating}, ${blackChange})
    `;

    console.log(`[ELO] White: ${whiteRating} → ${newWhiteRating} (${whiteChange >= 0 ? '+' : ''}${whiteChange})`);
    console.log(`[ELO] Black: ${blackRating} → ${newBlackRating} (${blackChange >= 0 ? '+' : ''}${blackChange})`);
    return { newWhiteRating, newBlackRating };
  }

  // ─────────────────────────────────────────────
  //  LOOKUPS
  // ─────────────────────────────────────────────
  getGame(gameId) {
    return this.games.get(gameId) ?? null;
  }

  getGameByPlayer(socketId) {
    const gameId = this.playerGameMap.get(socketId);
    return gameId ? (this.games.get(gameId) ?? null) : null;
  }

  // ─────────────────────────────────────────────
  //  CLEANUP
  // ─────────────────────────────────────────────
  deleteGame(gameId) {
    const game = this.games.get(gameId);
    if (!game) return;

    game.stopTimer();
    this.playerGameMap.delete(game.players.white);
    this.playerGameMap.delete(game.players.black);
    this.games.delete(gameId);
  }

  removePlayer(socketId) {
    const game = this.getGameByPlayer(socketId);
    if (game) {
      this.deleteGame(game.gameId);
      return game;
    }
    return null;
  }
}

export default new GameManager();