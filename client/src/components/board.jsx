// client/src/components/Board/Board.jsx
import { useState, useCallback } from "react";
import { Chess } from "chess.js";
import Square from "./Square";
import Piece from "./Piece";

const FILES = ["a", "b", "c", "d", "e", "f", "g", "h"];
const RANKS = ["8", "7", "6", "5", "4", "3", "2", "1"]; // top → bottom

// Map chess.js piece type+color to our Piece props
// chess.js: { type: 'p'|'n'|'b'|'r'|'q'|'k', color: 'w'|'b' }
const TYPE_MAP = { p: "P", n: "N", b: "B", r: "R", q: "Q", k: "K" };

export default function Board({
  chess,               // Chess instance (from useChessGame)
  playerColour,        // "white" | "black"
  onMove,              // (from, to, promotion?) → called when player makes a move
  lastMove,            // { from, to } | null
  engineThinking,      // bool — disables interaction while engine is thinking
}) {
  const [selected, setSelected]   = useState(null);   // "e2" | null
  const [legalDests, setLegalDests] = useState([]);   // ["e3", "e4", ...]

  const board = chess.board(); // 8×8 array of { type, color } | null

  // Which square index is the king in check?
  const checkSquare = (() => {
    if (!chess.isCheck()) return null;
    const turn = chess.turn(); // "w" | "b"
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const p = board[r][c];
        if (p && p.type === "k" && p.color === turn) {
          return FILES[c] + RANKS[r]; // e.g. "e1"
        }
      }
    }
    return null;
  })();

  const handleSquareClick = useCallback((square) => {
    if (engineThinking) return;

    // It's not the player's turn
    const turnColour = chess.turn() === "w" ? "white" : "black";
    // if (turnColour !== playerColour) return;

    const piece = chess.get(square);

    // Nothing selected yet
    if (!selected) {
      if (!piece || (piece.color === "w") !== (playerColour === "white")) return;
      const moves = chess.moves({ square, verbose: true });
      setSelected(square);
      setLegalDests(moves.map((m) => m.to));
      return;
    }

    // Clicking the already-selected square → deselect
    if (selected === square) {
      setSelected(null);
      setLegalDests([]);
      return;
    }

    // Clicking another own piece → switch selection
    if (piece && (piece.color === "w") === (playerColour === "white")) {
      const moves = chess.moves({ square, verbose: true });
      setSelected(square);
      setLegalDests(moves.map((m) => m.to));
      return;
    }

    // Attempting a move
    if (legalDests.includes(square)) {
      // Check for pawn promotion
      const movingPiece = chess.get(selected);
      const isPromotion =
        movingPiece?.type === "p" &&
        ((playerColour === "white" && square[1] === "8") ||
         (playerColour === "black" && square[1] === "1"));

      setSelected(null);
      setLegalDests([]);
      onMove(selected, square, isPromotion ? "q" : undefined); // auto-promote to queen for now
      return;
    }

    // Clicked an empty/enemy square that's not a legal dest → deselect
    setSelected(null);
    setLegalDests([]);
  }, [selected, legalDests, chess, playerColour, engineThinking, onMove]);
// const handleSquareClick = useCallback((square) => {
//     if (engineThinking) return;

//     const piece = chess.get(square);

//     if (!selected) {
//       if (!piece) return;
//       const moves = chess.moves({ square, verbose: true });
//       if (moves.length === 0) return;
//       setSelected(square);
//       setLegalDests(moves.map((m) => m.to));
//       return;
//     }

//     if (selected === square) {
//       setSelected(null);
//       setLegalDests([]);
//       return;
//     }

//     if (piece && piece.color === chess.get(selected)?.color) {
//       const moves = chess.moves({ square, verbose: true });
//       setSelected(square);
//       setLegalDests(moves.map((m) => m.to));
//       return;
//     }

//     if (legalDests.includes(square)) {
//       const movingPiece = chess.get(selected);
//       const isPromotion =
//         movingPiece?.type === "p" &&
//         ((chess.turn() === "w" && square[1] === "8") ||
//          (chess.turn() === "b" && square[1] === "1"));

//       setSelected(null);
//       setLegalDests([]);
//       onMove(selected, square, isPromotion ? "q" : undefined);
//       return;
//     }

//     setSelected(null);
//     setLegalDests([]);
//   }, [selected, legalDests, chess, engineThinking, onMove]);
  // Flip board so player always faces up
  const displayRanks = playerColour === "black" ? [...RANKS].reverse() : RANKS;
  const displayFiles = playerColour === "black" ? [...FILES].reverse() : FILES;

  return (
    <div className="inline-block rounded-sm overflow-hidden"
         style={{ boxShadow: "0 8px 32px rgba(0,0,0,0.45), 0 2px 8px rgba(0,0,0,0.3)" }}>
      <div className="grid"
           style={{ gridTemplateColumns: "repeat(8, 4rem)", gridTemplateRows: "repeat(8, 4rem)" }}>
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
                onClick={() => handleSquareClick(square)}
              >
                {piece && (
                  <Piece
                    type={TYPE_MAP[piece.type]}
                    color={piece.color === "w" ? "white" : "black"}
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