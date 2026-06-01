import { v4 as uuidv4 } from "uuid";
import { Chess } from "chess.js";
import { pvcStore } from "./pvcStore.js";
export async function createGame(req, res){
  const { playerColour = "white" } = req.body;
  if(playerColour !== "white" && playerColour !== "black"){
    return res.status(400).json({ error: "playerColour must be 'white' or 'black'" });
  }
  const gameId = uuidv4();
  try{
    const game = await pvcStore.createGame(gameId, playerColour);
    const engineGoesFirst = game.engineColour === "white";

    const response = {
      gameId,
      playerColour,
      engineColour: game.engineColour,
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
    const response = await game.engine.sendMove({ from, to, promotion });

    if (response.type === "bestmove") {
      const engineMove = {
        from: response.from,
        to: response.to,
        promotion: response.promotion || null,
      };

      pvcStore.recordMove(gameId, engineMove, "engine");

      // Apply engine move to chess.js to check resulting game state
      chess.move({
        from: engineMove.from,
        to: engineMove.to,
        promotion: engineMove.promotion || undefined,
      });

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