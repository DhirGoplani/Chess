// client/src/components/Board/Board.jsx
import { useState, useCallback, useRef, useEffect } from "react";
import { Chess } from "chess.js";
import Square from "./square";
import Piece from "./piece";

const FILES = ["a", "b", "c", "d", "e", "f", "g", "h"];
const RANKS = ["8", "7", "6", "5", "4", "3", "2", "1"]; // top → bottom

const TYPE_MAP = { p: "P", n: "N", b: "B", r: "R", q: "Q", k: "K" };
const PROMOTION_CHOICES = [
  { code: "q", label: "Queen" },
  { code: "r", label: "Rook" },
  { code: "b", label: "Bishop" },
  { code: "n", label: "Knight" },
];

export default function Board({
  chess,
  playerColour,
  onMove,
  lastMove,
  engineThinking,
  size,           // optional px CAP — the board fills its container and never exceeds this
}) {
  const [selected,   setSelected]   = useState(null);
  const [legalDests, setLegalDests] = useState([]);
  const [premove,    setPremove]    = useState(null); // { from, to, promotion }
  const [promotionPending, setPromotionPending] = useState(null); // { from, to, color }

  const board = chess.board();
  const isPlayerTurn = !engineThinking && ((chess.turn() === "w") === (playerColour === "white"));

  // --- Fluid sizing -----------------------------------------------------
  const wrapperRef = useRef(null);
  const [renderedWidth, setRenderedWidth] = useState(size || 512);

  useEffect(() => {
    const el = wrapperRef.current;
    if (!el) return;

    if (el.offsetWidth) setRenderedWidth(el.offsetWidth);

    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const w = entry.contentRect.width;
        if (w > 0) setRenderedWidth(w);
      }
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const sqPx = renderedWidth / 8;

  // --- Auto-execute Premove on player turn -------------------------------
  useEffect(() => {
    if (isPlayerTurn && premove) {
      const pm = premove;
      setPremove(null);

      // Verify legal moves for player in current board position
      const moves = chess.moves({ verbose: true });
      const legal = moves.some((m) => m.from === pm.from && m.to === pm.to);

      if (legal) {
        onMove(pm.from, pm.to, pm.promotion);
      }
    }
  }, [isPlayerTurn, premove, chess, onMove]);
  // ------------------------------------------------------------------------

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
    const piece = chess.get(square);

    // --- PREMOVE LOGIC when not player's turn -----------------------------
    if (!isPlayerTurn) {
      if (!selected) {
        if (!piece || (piece.color === "w") !== (playerColour === "white")) return;
        setSelected(square);
        return;
      }

      if (selected === square) {
        setSelected(null);
        setPremove(null);
        return;
      }

      if (piece && (piece.color === "w") === (playerColour === "white")) {
        setSelected(square);
        return;
      }

      // Record premove from selected -> square
      const movingPiece = chess.get(selected);
      const isPromotion =
        movingPiece?.type === "p" &&
        ((playerColour === "white" && square[1] === "8") ||
         (playerColour === "black" && square[1] === "1"));

      const from = selected;
      setSelected(null);
      setPremove({ from, to: square, promotion: isPromotion ? "q" : undefined });
      return;
    }
    // ----------------------------------------------------------------------

    // Clear any leftover premove when playing real turn
    if (premove) setPremove(null);

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

      const from = selected;
      setSelected(null);
      setLegalDests([]);

      if (isPromotion) {
        setPromotionPending({ from, to: square, color: movingPiece.color });
        return;
      }

      onMove(from, square, undefined);
      return;
    }

    setSelected(null);
    setLegalDests([]);
  }, [selected, legalDests, chess, playerColour, isPlayerTurn, premove, onMove]);

  const handlePromotionChoice = useCallback((pieceCode) => {
    if (!promotionPending) return;
    const { from, to } = promotionPending;
    setPromotionPending(null);
    onMove(from, to, pieceCode);
  }, [promotionPending, onMove]);

  const handlePromotionCancel = useCallback(() => {
    setPromotionPending(null);
  }, []);

  const displayRanks = playerColour === "black" ? [...RANKS].reverse() : RANKS;
  const displayFiles = playerColour === "black" ? [...FILES].reverse() : FILES;

  const promoBtnSize = Math.max(sqPx, 44);

  return (
    <div
      ref={wrapperRef}
      onContextMenu={(e) => {
        e.preventDefault();
        setPremove(null);
        setSelected(null);
        setLegalDests([]);
      }}
      style={{
        position: "relative",
        width: "100%",
        maxWidth: size ? `${size}px` : "512px",
        aspectRatio: "1 / 1",
        borderRadius: "4px",
        overflow: "hidden",
        boxShadow: "0 8px 32px rgba(0,0,0,0.45), 0 2px 8px rgba(0,0,0,0.3)",
        flexShrink: 0,
      }}
    >
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(8, 1fr)",
          gridTemplateRows:    "repeat(8, 1fr)",
          width: "100%",
          height: "100%",
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
            const isPremove  = premove && (premove.from === square || premove.to === square);
            const isLastMove = lastMove && (lastMove.from === square || lastMove.to === square);
            const isCheck    = checkSquare === square;
            const hasLegal   = legalDests.includes(square);
            const legalMove  = hasLegal ? (piece ? "capture" : "move") : null;

            return (
              <Square
                key={square}
                isLight={isLight}
                isSelected={isSelected}
                isPremove={!!isPremove}
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

      {promotionPending && (
        <div
          onClick={handlePromotionCancel}
          style={{
            position: "absolute",
            inset: 0,
            background: "rgba(10,6,3,0.72)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 20,
            padding: "8px",
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: "#2c1a0e",
              border: "1px solid rgba(196,163,90,0.3)",
              borderRadius: "8px",
              padding: "16px",
              boxShadow: "0 12px 40px rgba(0,0,0,0.6)",
              textAlign: "center",
              maxWidth: "100%",
            }}
          >
            <div
              style={{
                fontFamily: "'DM Sans', sans-serif",
                fontSize: "0.75rem",
                fontWeight: 600,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                color: "#8a7055",
                marginBottom: "10px",
              }}
            >
              Promote to
            </div>
            <div style={{ display: "flex", gap: "8px" }}>
              {PROMOTION_CHOICES.map(({ code, label }) => (
                <button
                  key={code}
                  onClick={() => handlePromotionChoice(code)}
                  title={label}
                  aria-label={label}
                  style={{
                    width: `${promoBtnSize}px`,
                    height: `${promoBtnSize}px`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    background: "rgba(196,163,90,0.08)",
                    border: "1px solid rgba(196,163,90,0.25)",
                    borderRadius: "6px",
                    cursor: "pointer",
                    padding: 0,
                    transition: "background 0.15s, border-color 0.15s",
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(129,182,76,0.18)"; e.currentTarget.style.borderColor = "rgba(129,182,76,0.5)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(196,163,90,0.08)"; e.currentTarget.style.borderColor = "rgba(196,163,90,0.25)"; }}
                >
                  <Piece
                    type={TYPE_MAP[code]}
                    color={promotionPending.color === "w" ? "white" : "black"}
                    size={promoBtnSize}
                  />
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}