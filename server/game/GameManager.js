import ChessGame from './ChessGame.js';
import { sql } from '../utils/connectDB.js';

class GameManager {
  constructor() {
    this.games = new Map();
    this.playerGameMap = new Map();
  }

  async createGame(gameId, whitePlayer, blackPlayer) {
    const game = new ChessGame(gameId, whitePlayer.socketId, blackPlayer.socketId);

    // Store full player info
    game.whitePlayer = whitePlayer;
    game.blackPlayer = blackPlayer;
    game.format      = whitePlayer.format;

    this.games.set(gameId, game);
    this.playerGameMap.set(whitePlayer.socketId, gameId);
    this.playerGameMap.set(blackPlayer.socketId, gameId);

    // Save to database
    await sql`
      INSERT INTO games (id, white_player_id, black_player_id, status, game_type)
      VALUES (${gameId}, ${whitePlayer.userId}, ${blackPlayer.userId}, 'playing', ${whitePlayer.format})
    `;

    console.log(`[GameManager] Game ${gameId} saved to DB`);
    return game;
  }

  getGame(gameId) {
    return this.games.get(gameId) || null;
  }

  getGameByPlayer(socketId) {
    const gameId = this.playerGameMap.get(socketId);
    if (!gameId) return null;
    return this.games.get(gameId) || null;
  }

  async endGame(gameId, winnerId, result) {
    const game = this.games.get(gameId);
    if (!game) return;

    // Update game in database
    await sql`
      UPDATE games
      SET status    = 'finished',
          result    = ${result},
          winner_id = ${winnerId},
          ended_at  = now(),
          pgn       = ${game.moveHistory.join(' ')}
      WHERE id = ${gameId}
    `;

    // Calculate and update ELO ratings
    await this._updateRatings(game, winnerId, result);

    console.log(`[GameManager] Game ${gameId} ended — result: ${result}`);
  }

  async _updateRatings(game, winnerId, result) {
    const white  = game.whitePlayer;
    const black  = game.blackPlayer;
    const format = game.format;

    const whiteRating = white.rating;
    const blackRating = black.rating;

    // ELO calculation
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

    const K = 32; // K factor
    const whiteChange = Math.round(K * (actualWhite - expectedWhite));
    const blackChange = Math.round(K * (actualBlack - expectedBlack));

    const newWhiteRating = whiteRating + whiteChange;
    const newBlackRating = blackRating + blackChange;

    const ratingColumn = `${format}_rating`;

    // Update ratings in users table
    await sql`
      UPDATE users SET ${sql(ratingColumn)} = ${newWhiteRating}
      WHERE id = ${white.userId}
    `;
    await sql`
      UPDATE users SET ${sql(ratingColumn)} = ${newBlackRating}
      WHERE id = ${black.userId}
    `;

    // Save rating history
    await sql`
      INSERT INTO rating_history (user_id, game_id, game_type, rating_before, rating_after, change)
      VALUES (${white.userId}, ${game.gameId}, ${format}, ${whiteRating}, ${newWhiteRating}, ${whiteChange})
    `;
    await sql`
      INSERT INTO rating_history (user_id, game_id, game_type, rating_before, rating_after, change)
      VALUES (${black.userId}, ${game.gameId}, ${format}, ${blackRating}, ${newBlackRating}, ${blackChange})
    `;

    console.log(`[ELO] White: ${whiteRating} → ${newWhiteRating} (${whiteChange > 0 ? '+' : ''}${whiteChange})`);
    console.log(`[ELO] Black: ${blackRating} → ${newBlackRating} (${blackChange > 0 ? '+' : ''}${blackChange})`);
  }

  deleteGame(gameId) {
    const game = this.games.get(gameId);
    if (game) {
      this.playerGameMap.delete(game.players.white);
      this.playerGameMap.delete(game.players.black);
      this.games.delete(gameId);
    }
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