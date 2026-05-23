import ChessGame from './ChessGame.js';

class GameManager {
  constructor() {
    this.games = new Map();
    this.playerGameMap = new Map();//using map to store the game id's
  }

  createGame(gameId, player1, player2) {
    const game = new ChessGame(gameId, player1, player2);
    this.games.set(gameId, game);
    this.playerGameMap.set(player1, gameId);
    this.playerGameMap.set(player2, gameId);
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