// client/src/components/Board/Board.jsx
import { useState, useCallback } from "react";
import { Chess } from "chess.js";
import Square from "./Square";
import Piece from "./Piece";

const FILES = ["a", "b", "c", "d", "e", "f", "g", "h"];
const RANKS = ["8", "7", "6", "5", "4", "3", "2", "1"]; // top → bottom

const TYPE_MAP = { p: "P", n: "N", b: "B", r: "R", q: "Q", k: "K" };

export default function Board({
  chess,
  playerColour,
  onMove,
  lastMove,
  engineThinking,
  size,           // optional px size — if omitted, defaults to 8 × 4rem = 512px
}) {
  const [selected,   setSelected]   = useState(null);
  const [legalDests, setLegalDests] = useState([]);

  const board = chess.board();

  // Square size: if a numeric `size` prop is passed use it, otherwise fall back to 4rem (64px)
  const sqPx = size ? Math.floor(size / 8) : 64;

  const checkSquare = (() => {
    if (!chess.isCheck()) return null;
    const turn = chess.turn();
    for (let r = 0; r < 8; r++)
      for (let c = 0; c < 8; c++) {
        const p = board[r][c];
        if (p && p.type === "k" && p.color === turn)
          return FILES[c] + RANKS[r];
      }
    return null;
  })();

  const handleSquareClick = useCallback((square) => {
    if (engineThinking) return;

    const piece = chess.get(square);

    if (!selected) {
      if (!piece || (piece.color === "w") !== (playerColour === "white")) return;
      const moves = chess.moves({ square, verbose: true });
      setSelected(square);
      setLegalDests(moves.map((m) => m.to));
      return;
    }

    if (selected === square) {
      setSelected(null);
      setLegalDests([]);
      return;
    }

    if (piece && (piece.color === "w") === (playerColour === "white")) {
      const moves = chess.moves({ square, verbose: true });
      setSelected(square);
      setLegalDests(moves.map((m) => m.to));
      return;
    }

    if (legalDests.includes(square)) {
      const movingPiece = chess.get(selected);
      const isPromotion =
        movingPiece?.type === "p" &&
        ((playerColour === "white" && square[1] === "8") ||
         (playerColour === "black" && square[1] === "1"));

      setSelected(null);
      setLegalDests([]);
      onMove(selected, square, isPromotion ? "q" : undefined);
      return;
    }

    setSelected(null);
    setLegalDests([]);
  }, [selected, legalDests, chess, playerColour, engineThinking, onMove]);

  const displayRanks = playerColour === "black" ? [...RANKS].reverse() : RANKS;
  const displayFiles = playerColour === "black" ? [...FILES].reverse() : FILES;

  return (
    <div
      style={{
        display: "inline-block",
        borderRadius: "4px",
        overflow: "hidden",
        boxShadow: "0 8px 32px rgba(0,0,0,0.45), 0 2px 8px rgba(0,0,0,0.3)",
        width: `${sqPx * 8}px`,
        height: `${sqPx * 8}px`,
        flexShrink: 0,
      }}
    >
      <div
        style={{
          display: "grid",
          gridTemplateColumns: `repeat(8, ${sqPx}px)`,
          gridTemplateRows:    `repeat(8, ${sqPx}px)`,
        }}
      >
        {displayRanks.map((rank, ri) =>
          displayFiles.map((file, fi) => {
            const square   = file + rank;
            const colIndex = FILES.indexOf(file);
            const rowIndex = RANKS.indexOf(rank);
            const isLight  = (rowIndex + colIndex) % 2 === 0;
            const piece    = board[rowIndex]?.[colIndex];

            const isSelected = selected === square;
            const isLastMove = lastMove && (lastMove.from === square || lastMove.to === square);
            const isCheck    = checkSquare === square;
            const hasLegal   = legalDests.includes(square);
            const legalMove  = hasLegal ? (piece ? "capture" : "move") : null;

            return (
              <Square
                key={square}
                isLight={isLight}
                isSelected={isSelected}
                isLastMove={!!isLastMove}
                isCheck={isCheck}
                legalMove={legalMove}
                rank={rank}
                file={file}
                showRank={fi === 0}
                showFile={ri === 7}
                size={sqPx}
                onClick={() => handleSquareClick(square)}
              >
                {piece && (
                  <Piece
                    type={TYPE_MAP[piece.type]}
                    color={piece.color === "w" ? "white" : "black"}
                    size={sqPx}
                  />
                )}
              </Square>
            );
          })
        )}
      </div>
    </div>
  );
}