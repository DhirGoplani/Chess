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
  //  START TIMER
  // ─────────────────────────────────────────────
  startTimer(gameId, io) {
    const game = this.games.get(gameId);
    if (!game) {
      console.warn(`[GameManager] startTimer: game ${gameId} not found`);
      return;
    }

    const onTick = (timers) => {
      io.to(gameId).emit('timerUpdate', {
        white: timers.white,
        black: timers.black,
      });
    };

    const onTimeout = (loserColour) => {
      const winnerColour = loserColour === 'white' ? 'black' : 'white';
      const winner       = game[`${winnerColour}Player`];

      io.to(gameId).emit('gameOver', {
        status: 'timeout',
        winner: winnerColour,
      });

      this.endGame(gameId, winner.userId, `${winnerColour}_wins`, io)
        .then(() => this.deleteGame(gameId))
        .catch(err => console.error(`[GameManager] timeout endGame error:`, err.message));
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
    if (!colour)                          return { success: false, message: 'Not a player in this game' };
    if (colour !== game.getCurrentTurn()) return { success: false, message: 'Not your turn' };

    return game.makeMove(from, to, promotion);
  }

  // ─────────────────────────────────────────────
  //  END GAME
  //  FIX: snapshot player data synchronously before any await so that
  //  deleteGame() racing in won't wipe the data we need.
  //  FIX: emit ratingUpdate to each socketId individually (not the room)
  //  so the right rating goes to the right player.
  // ─────────────────────────────────────────────
  async endGame(gameId, winnerId, result, io) {
    const game = this.games.get(gameId);
    if (!game) {
      console.warn(`[GameManager] endGame called for unknown game ${gameId}`);
      return;
    }

    // Snapshot BEFORE any async call — deleteGame may run concurrently
    const whiteSocketId  = game.whitePlayer.socketId;
    const blackSocketId  = game.blackPlayer.socketId;
    const whiteUserId    = game.whitePlayer.userId;
    const blackUserId    = game.blackPlayer.userId;
    const format         = game.format;
    const pgn            = (game.moveHistory ?? []).join(' ');
    const gId            = game.gameId;

    game.stopTimer();

    try {
      // 1. Persist result to DB
      await sql`
        UPDATE games
        SET status    = 'finished',
            result    = ${result},
            winner_id = ${winnerId},
            ended_at  = now(),
            pgn       = ${pgn}
        WHERE id = ${gameId}
      `;
      console.log(`[GameManager] Game ${gameId} saved — result: ${result}`);

      // 2. Compute ELO and write to DB
      const { newWhiteRating, newBlackRating } =
        await this._updateRatings(
          { gameId: gId, whitePlayer: { userId: whiteUserId }, blackPlayer: { userId: blackUserId }, format },
          winnerId,
          result
        );

      // 3. Emit the new rating to each player via their own socketId.
      //    This works even after the game room is torn down.
      if (io) {
        console.log(`[ratingUpdate] → white socket ${whiteSocketId} : ${newWhiteRating}`);
        console.log(`[ratingUpdate] → black socket ${blackSocketId} : ${newBlackRating}`);

        io.to(whiteSocketId).emit('ratingUpdate', {
          newRating: newWhiteRating,
          format,
        });
        io.to(blackSocketId).emit('ratingUpdate', {
          newRating: newBlackRating,
          format,
        });
      }

    } catch (err) {
      console.error(`[GameManager] endGame error for ${gameId}:`, err.message);
      console.error(err);
    }
  }

  // ─────────────────────────────────────────────
  //  ELO
  //  FIX: read ratings fresh from DB (not from JWT/memory which are stale).
  //  FIX: use explicit column names per format instead of dynamic sql column
  //  interpolation which breaks with postgres.js tagged templates.
  // ─────────────────────────────────────────────
  async _updateRatings(game, winnerId, result) {
    const whiteUserId = game.whitePlayer.userId;
    const blackUserId = game.blackPlayer.userId;
    const format      = game.format;   // 'bullet' | 'blitz' | 'rapid'
    const gameId      = game.gameId;

    // Read fresh ratings from DB
    const [whiteRow] = await sql`SELECT bullet_rating, blitz_rating, rapid_rating FROM users WHERE id = ${whiteUserId}`;
    const [blackRow] = await sql`SELECT bullet_rating, blitz_rating, rapid_rating FROM users WHERE id = ${blackUserId}`;

    const col          = `${format}_rating`;
    const whiteRating  = whiteRow[col] ?? 800;
    const blackRating  = blackRow[col] ?? 800;

    // ELO
    const expectedWhite = 1 / (1 + Math.pow(10, (blackRating - whiteRating) / 400));
    const expectedBlack = 1 - expectedWhite;

    let actualWhite, actualBlack;
    if (result === 'draw') {
      actualWhite = 0.5; actualBlack = 0.5;
    } else if (winnerId === whiteUserId) {
      actualWhite = 1;   actualBlack = 0;
    } else {
      actualWhite = 0;   actualBlack = 1;
    }

    const K              = 32;
    const whiteChange    = Math.round(K * (actualWhite - expectedWhite));
    const blackChange    = Math.round(K * (actualBlack - expectedBlack));
    const newWhiteRating = whiteRating + whiteChange;
    const newBlackRating = blackRating + blackChange;

    // Write ratings — explicit column per format (postgres.js safe)
    if (format === 'bullet') {
      await sql`UPDATE users SET bullet_rating = ${newWhiteRating} WHERE id = ${whiteUserId}`;
      await sql`UPDATE users SET bullet_rating = ${newBlackRating} WHERE id = ${blackUserId}`;
    } else if (format === 'blitz') {
      await sql`UPDATE users SET blitz_rating = ${newWhiteRating} WHERE id = ${whiteUserId}`;
      await sql`UPDATE users SET blitz_rating = ${newBlackRating} WHERE id = ${blackUserId}`;
    } else {
      await sql`UPDATE users SET rapid_rating = ${newWhiteRating} WHERE id = ${whiteUserId}`;
      await sql`UPDATE users SET rapid_rating = ${newBlackRating} WHERE id = ${blackUserId}`;
    }

    // Write rating history
    await sql`
      INSERT INTO rating_history (user_id, game_id, game_type, rating_before, rating_after, change)
      VALUES (${whiteUserId}, ${gameId}, ${format}, ${whiteRating}, ${newWhiteRating}, ${whiteChange})
    `;
    await sql`
      INSERT INTO rating_history (user_id, game_id, game_type, rating_before, rating_after, change)
      VALUES (${blackUserId}, ${gameId}, ${format}, ${blackRating}, ${newBlackRating}, ${blackChange})
    `;

    console.log(`[ELO] White ${whiteUserId}: ${whiteRating} → ${newWhiteRating} (${whiteChange >= 0 ? '+' : ''}${whiteChange})`);
    console.log(`[ELO] Black ${blackUserId}: ${blackRating} → ${newBlackRating} (${blackChange >= 0 ? '+' : ''}${blackChange})`);

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
  //  FIX: use whitePlayer/blackPlayer socketIds (not game.players.white/black
  //  which is the old shape and may be undefined).
  // ─────────────────────────────────────────────
  deleteGame(gameId) {
    const game = this.games.get(gameId);
    if (!game) return;

    game.stopTimer();
    this.playerGameMap.delete(game.whitePlayer.socketId);
    this.playerGameMap.delete(game.blackPlayer.socketId);
    this.games.delete(gameId);
    console.log(`[GameManager] Game ${gameId} removed from memory`);
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