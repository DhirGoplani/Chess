import { Chess } from "chess.js";

// Piece evaluation values
const PIECE_VALUES = { p: 100, n: 320, b: 330, r: 500, q: 900, k: 20000 };

// Simple Piece Square Table Bonus
const PAWN_TABLE = [
  0,  0,  0,  0,  0,  0,  0,  0,
 50, 50, 50, 50, 50, 50, 50, 50,
 10, 10, 20, 30, 30, 20, 10, 10,
  5,  5, 10, 25, 25, 10,  5,  5,
  0,  0,  0, 20, 20,  0,  0,  0,
  5, -5,-10,  0,  0,-10, -5,  5,
  5, 10, 10,-20,-20, 10, 10,  5,
  0,  0,  0,  0,  0,  0,  0,  0
];

const KNIGHT_TABLE = [
 -50,-40,-30,-30,-30,-30,-40,-50,
 -40,-20,  0,  0,  0,  0,-20,-40,
 -30,  0, 10, 15, 15, 10,  0,-30,
 -30,  5, 15, 20, 20, 15,  5,-30,
 -30,  0, 15, 20, 20, 15,  0,-30,
 -30,  5, 10, 15, 15, 10,  5,-30,
 -40,-20,  0,  5,  5,  0,-20,-40,
 -50,-40,-30,-30,-30,-30,-40,-50
];

function evaluateBoard(chess) {
  let totalScore = 0;
  const board = chess.board();

  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const piece = board[r][c];
      if (!piece) continue;

      const sqIndex = r * 8 + c;
      let val = PIECE_VALUES[piece.type] || 0;

      if (piece.type === "p") val += PAWN_TABLE[sqIndex];
      if (piece.type === "n") val += KNIGHT_TABLE[sqIndex];

      if (piece.color === "w") totalScore += val;
      else totalScore -= val;
    }
  }

  return totalScore;
}

// Minimax with Alpha-Beta Pruning
function minimax(chess, depth, alpha, beta, isMaximizing) {
  if (depth === 0 || chess.isGameOver()) {
    return evaluateBoard(chess);
  }

  const moves = chess.moves({ verbose: true });

  if (isMaximizing) {
    let maxEval = -Infinity;
    for (const move of moves) {
      chess.move(move);
      const evalScore = minimax(chess, depth - 1, alpha, beta, false);
      chess.undo();
      maxEval = Math.max(maxEval, evalScore);
      alpha = Math.max(alpha, evalScore);
      if (beta <= alpha) break;
    }
    return maxEval;
  } else {
    let minEval = Infinity;
    for (const move of moves) {
      chess.move(move);
      const evalScore = minimax(chess, depth - 1, alpha, beta, true);
      chess.undo();
      minEval = Math.min(minEval, evalScore);
      beta = Math.min(beta, evalScore);
      if (beta <= alpha) break;
    }
    return minEval;
  }
}

export function getJsEngineBestMove(movesHistory, difficulty = "hard") {
  const chess = new Chess();

  for (const m of movesHistory) {
    chess.move({ from: m.from, to: m.to, promotion: m.promotion || undefined });
  }

  const moves = chess.moves({ verbose: true });
  if (moves.length === 0) return null;

  const depth = difficulty === "easy" ? 2 : 3; // depth 3 is fast and smart in JS
  const isWhite = chess.turn() === "w";

  let bestMove = moves[0];
  let bestValue = isWhite ? -Infinity : Infinity;

  for (const move of moves) {
    chess.move(move);
    const boardVal = minimax(chess, depth - 1, -Infinity, Infinity, !isWhite);
    chess.undo();

    if (isWhite) {
      if (boardVal > bestValue) {
        bestValue = boardVal;
        bestMove = move;
      }
    } else {
      if (boardVal < bestValue) {
        bestValue = boardVal;
        bestMove = move;
      }
    }
  }

  return {
    type: "bestmove",
    from: bestMove.from,
    to: bestMove.to,
    promotion: bestMove.promotion || null,
  };
}
