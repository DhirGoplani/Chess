import { EngineProcess } from "./bridge.js";

// gameId → { engine, playerColour, engineColour, engineFirstMove?, status, moves[] }
const games = new Map();

export const pvcStore = {
  async createGame(gameId, playerColour, difficulty = "hard"){
    const engineColour = playerColour === "white" ? "black" : "white";
    const engine = new EngineProcess(gameId, engineColour, difficulty);

    const game = {
      engine,
      playerColour,
      engineColour,
      difficulty,
      engineFirstMove: null,
      status: "active",
      moves: [],
      createdAt: Date.now(),
    };

    games.set(gameId, game);

    // If engine plays white it prints its first move immediately after start()
    // Capture it so the controller can return it in the create response
    if (engineColour === "white") {
      await new Promise((resolve) => {
        engine.once("message", (line) => {
          const parsed = engine._parseLine(line);
          if (parsed.type === "bestmove") {
            game.engineFirstMove = {
              from: parsed.from,
              to: parsed.to,
              promotion: parsed.promotion || null,
            };
            game.moves.push({ ...game.engineFirstMove, by: "engine" });
          }
          resolve();
        });

        engine.start().then(() => {
          setTimeout(resolve, 200); // fallback if message fires before listener
        });
      });
    } else {
      await engine.start();
    }

    return game;
  },

  get(gameId) {
    return games.get(gameId);
  },

  setStatus(gameId, status) {
    const g = games.get(gameId);
    if (g) g.status = status;
  },

  recordMove(gameId, move, by) {
    const g = games.get(gameId);
    if (g) g.moves.push({ ...move, by });
  },

  destroy(gameId) {
    const g = games.get(gameId);
    if (g) {
      g.engine.kill();
      games.delete(gameId);
      console.log(`[pvcStore] Destroyed game ${gameId}`);
    }
  },

  cleanup(maxAgeMs = 2 * 60 * 60 * 1000) {
    const now = Date.now();
    for (const [id, game] of games.entries()) {
      if (now - game.createdAt > maxAgeMs) {
        console.log(`[pvcStore] Cleaning up stale game ${id}`);
        this.destroy(id);
      }
    }
  },
};