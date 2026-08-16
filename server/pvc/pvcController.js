import { v4 as uuidv4 } from "uuid";
import { Chess } from "chess.js";
import { pvcStore } from "./pvcStore.js";
export async function createGame(req, res){
  const { playerColour = "white", difficulty = "hard" } = req.body;
  if(playerColour !== "white" && playerColour !== "black"){
    return res.status(400).json({ error: "playerColour must be 'white' or 'black'" });
  }
  const validDifficulty = difficulty === "easy" ? "easy" : "hard";
  const gameId = uuidv4();
  try{
    const game = await pvcStore.createGame(gameId, playerColour, validDifficulty);
    const engineGoesFirst = game.engineColour === "white";

    const response = {
      gameId,
      playerColour,
      engineColour: game.engineColour,
      difficulty: validDifficulty,
    };
    if(engineGoesFirst && game.engineFirstMove) response.engineFirstMove = game.engineFirstMove;
    return res.status(201).json(response);
  }
  catch (err) {
    console.error("[pvc] createGame error:", err);
    return res.status(500).json({ error: "Failed to start engine: " + err.message });
  }
}

export async function makeMove(req, res) {
  const { gameId, from, to, promotion = null } = req.body;

  if(!gameId || !from || !to) {
    return res.status(400).json({ error: "gameId, from, and to are required" });
  }
  const game = pvcStore.get(gameId);
  if(!game) return res.status(404).json({ error: "Game not found" });
  if(game.status !== "active") return res.status(400).json({ error: "Game is already over" });
  // Validate the player's move with chess.js
  const chess = buildChessFromMoves(game.moves);
  const chessMove = chess.move({ from, to, promotion: promotion || undefined });

  if (!chessMove) {
    return res.status(400).json({ error: `Illegal move: ${from}-${to}` });
  }

  // Record player's move
  pvcStore.recordMove(gameId, { from, to, promotion }, "player");

  // Send to engine, await reply
  try {
    let response = await game.engine.sendMove({ from, to, promotion });

    if (response.type === "bestmove") {
      let engineMove = toEngineMove(response);

      // fix: never trust the engine's proposed move blindly — validate it
      // against the authoritative chess.js board before applying it. A
      // rejection here means the engine's long-lived internal board has
      // desynced from the real game (this is what produced the earlier
      // "Invalid move: a1-c1" bug). Resync the engine from pvcStore's move
      // history — the source of truth, which does NOT yet include this bad
      // move — and ask it to think again, once, instead of failing the
      // whole request.
      if (!applyIfLegal(chess, engineMove)) {
        console.error(
          `[pvc] engine proposed illegal move ${engineMove.from}-${engineMove.to} for game ${gameId} — resyncing`
        );
        const syncResult = await game.engine.sync(game.moves);
        if (syncResult.type !== "synced") {
          return res.status(500).json({
            error: "Engine desynced and resync failed: " + (syncResult.message || "unknown response"),
          });
        }
        response = await game.engine.requestBestMove();
        if (response.type === "bestmove") {
          engineMove = toEngineMove(response);
          if (!applyIfLegal(chess, engineMove)) {
            return res.status(500).json({
              error: `Engine proposed illegal move ${engineMove.from}-${engineMove.to} even after resync`,
            });
          }
        }
      }

      if (response.type === "bestmove") {
        pvcStore.recordMove(gameId, engineMove, "engine");

        const result = { engineMove };
        if (chess.isGameOver()){
          const { reason, winner } = getGameOverInfo(chess, "engine");
          pvcStore.setStatus(gameId, reason);
          result.gameOver = true;
          result.reason = reason;
          result.winner = winner;
          // Give a moment then clean up
          setTimeout(() => pvcStore.destroy(gameId), 5000);
        }
        return res.json(result);
      }
    }

    if(response.type === "gameover") {
      const { reason, winner } = resolveGameover(response.reason, game.moves);
      pvcStore.setStatus(gameId, reason);
      setTimeout(() => pvcStore.destroy(gameId), 5000);
      return res.json({ gameOver: true, reason, winner });
    }
    if(response.type === "error") return res.status(500).json({ error: response.message });
    return res.status(500).json({ error: "Unexpected engine response" });
  } catch (err) {
    console.error("[pvc] makeMove error:", err);
    return res.status(500).json({ error: "Engine error: " + err.message });
  }
}

export async function resignGame(req, res) {
  const { gameId } = req.body;

  if (!gameId) {
    return res.status(400).json({ error: "gameId is required" });
  }

  const game = pvcStore.get(gameId);
  if (!game) {
    return res.status(404).json({ error: "Game not found" });
  }

  pvcStore.setStatus(gameId, "resigned");
  pvcStore.destroy(gameId);

  return res.json({ ok: true });
}

function buildChessFromMoves(moves) {
  const chess = new Chess();
  for (const m of moves) {
    chess.move({ from: m.from, to: m.to, promotion: m.promotion || undefined });
  }
  return chess;
}

// fix: normalize an engine stdout response into the {from,to,promotion}
// shape used everywhere else (pvcStore, chess.js).
function toEngineMove(response) {
  return { from: response.from, to: response.to, promotion: response.promotion || null };
}

// fix: try to apply a move to a chess.js board without letting it throw —
// some chess.js versions throw on illegal moves instead of returning null,
// and an engine desync should surface as a controlled resync, not a 500.
function applyIfLegal(chess, move) {
  try {
    const result = chess.move({ from: move.from, to: move.to, promotion: move.promotion || undefined });
    return !!result;
  } catch (_) {
    return false;
  }
}

function getGameOverInfo(chess, lastMovedBy) {
  if (chess.isCheckmate()) {
    return { reason: "checkmate", winner: lastMovedBy };
  }
  if (chess.isStalemate())     return { reason: "stalemate",      winner: "draw" };
  if (chess.isDraw())          return { reason: "draw",           winner: "draw" };
  if (chess.isInsufficientMaterial()) return { reason: "insufficient", winner: "draw" };
  return { reason: "unknown", winner: "draw" };
}

// When the C++ engine reports gameover, figure out who won
function resolveGameover(reason, moves) {
  if (reason === "checkmate") {
    const lastMove = moves[moves.length - 1];
    const winner = lastMove?.by === "engine" ? "engine" : "player";
    return { reason: "checkmate", winner };
  }
  const drawReasons = ["stalemate", "repetition", "insufficient", "fifty-move", "draw"];
  if(drawReasons.includes(reason)){
    return { reason, winner: "draw" };
  }
  return { reason: "draw", winner: "draw" };
}