import { useEffect, useRef, useState, useCallback } from "react";
import { useParams, useLocation, useNavigate } from "react-router-dom";
import { Chess } from "chess.js";
import Board from "../../components/board";
import { getApiUrl } from "../../utils/apiUrl";
import { playSound, playMoveSound } from "../../utils/sound";

import { IconFlip, IconDraw, IconFlag, IconZap, IconCrown, IconCpu, IconUser, IconShield } from "../../components/Icons";
import { showToast } from "../../utils/toast";
import ConfirmModal from "../../components/ConfirmModal";

const API = getApiUrl() + "/api";

function authHeaders() {
  const token = localStorage.getItem("token");
  return { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) };
}

function applyMove(chess, move) {
  return chess.move({ from: move.from, to: move.to, promotion: move.promotion ?? undefined });
}

function resultLabel(reason, winner, playerColour) {
  if (reason === "resigned") return { headline: "You Resigned", sub: "Better luck next time.", type: "loss" };
  if (winner === "draw") {
    const sub = {
      stalemate: "No legal moves — it's a draw.",
      repetition: "Threefold repetition — it's a draw.",
      insufficient: "Insufficient material — it's a draw.",
      "fifty-move": "Fifty-move rule — it's a draw.",
    }[reason] ?? "It's a draw.";
    return { headline: "Draw Game", sub, type: "draw" };
  }
  if (reason === "checkmate") {
    if (winner === "player") return { headline: "Victory!", sub: "You checkmated the engine!", type: "win" };
    return { headline: "Defeat", sub: "The engine checkmated your King.", type: "loss" };
  }
  return { headline: "Game Over", sub: reason, type: "draw" };
}

function useWindowWidth() {
  const [width, setWidth] = useState(typeof window !== "undefined" ? window.innerWidth : 1024);
  useEffect(() => {
    const h = () => setWidth(window.innerWidth);
    window.addEventListener("resize", h);
    return () => window.removeEventListener("resize", h);
  }, []);
  return width;
}

export default function PvcGame() {
  const { gameId }    = useParams();
  const { state }     = useLocation();
  const navigate      = useNavigate();
  const width         = useWindowWidth();
  const isMobile      = width < 640;

  const chessRef      = useRef(new Chess());
  const moveListRef   = useRef(null);
  const [, forceUpdate] = useState(0);
  const redraw        = useCallback(() => forceUpdate(n => n + 1), []);

  const [playerColour,    setPlayerColour]    = useState(state?.playerColour ?? "white");
  const [difficulty,      setDifficulty]      = useState(state?.difficulty ?? "hard");
  const [engineThinking,  setEngineThinking]  = useState(false);
  const [lastMove,        setLastMove]        = useState(null);
  const [gameOver,        setGameOver]        = useState(null);
  const [error,           setError]           = useState(null);
  const [capturedByPlayer, setCapturedByPlayer] = useState([]);
  const [capturedByEngine, setCapturedByEngine] = useState([]);
  const [moveCount,       setMoveCount]       = useState(0);
  const [moveHistory,     setMoveHistory]     = useState([]);

  const engineFirstMoveApplied = useRef(false);

  useEffect(() => {
    if (!state || engineFirstMoveApplied.current) return;
    engineFirstMoveApplied.current = true;
    setPlayerColour(state.playerColour);
    if (state.engineFirstMove) {
      const chess = chessRef.current;
      const mv = applyMove(chess, state.engineFirstMove);
      setLastMove({ from: state.engineFirstMove.from, to: state.engineFirstMove.to });
      setMoveCount(1);
      if (mv) setMoveHistory([mv.san]);
      redraw();
    }
  }, []);

  useEffect(() => {
    if (moveListRef.current)
      moveListRef.current.scrollTop = moveListRef.current.scrollHeight;
  }, [moveHistory]);

  function syncCaptures(chess) {
    const starting = { p: 8, n: 2, b: 2, r: 2, q: 1 };
    const order = ["p", "n", "b", "r", "q"];
    const onBoard = { w: {}, b: {} };
    chess.board().flat().forEach(sq => {
      if (!sq) return;
      onBoard[sq.color][sq.type] = (onBoard[sq.color][sq.type] ?? 0) + 1;
    });
    const counts = { w: {}, b: {} };
    for (const side of ["w", "b"])
      for (const t of order) {
        const missing = (starting[t] ?? 0) - (onBoard[side][t] ?? 0);
        if (missing > 0) counts[side][t] = missing;
      }
    const engineSide = playerColour === "white" ? "b" : "w";
    const playerSide  = playerColour === "white" ? "w" : "b";
    const expand = obj => Object.entries(obj).flatMap(([t, n]) => Array(n).fill(t));
    setCapturedByPlayer(expand(counts[engineSide]));
    setCapturedByEngine(expand(counts[playerSide]));
  }

  // Determines who was checkmated (side to move, since they have no legal
  // moves left) and plays victory/defeat from the player's perspective.
  function playCheckmateOutcome(chess) {
    const matedColour = chess.turn() === "w" ? "white" : "black";
    playSound(matedColour === playerColour ? "loss" : "win");
  }

  async function handleMove(from, to, promotion) {
    const chess = chessRef.current;
    const move = chess.move({ from, to, promotion: promotion ?? undefined });
    if (!move) return;
    setLastMove({ from, to });
    setMoveCount(n => n + 1);
    setMoveHistory(h => [...h, move.san]);
    syncCaptures(chess);
    const isCheckmate = chess.isCheckmate();
    playMoveSound({ isCheckmate, isCheck: chess.isCheck(), isCapture: !!move.captured });
    if (isCheckmate) playCheckmateOutcome(chess);
    redraw();
    if (chess.isGameOver()) { setGameOver(buildLocalGameOver(chess, "player")); return; }
    setEngineThinking(true);
    setError(null);
    try {
      const res = await fetch(`${API}/pvc/move`, {
        method: "POST", headers: authHeaders(),
        body: JSON.stringify({ gameId, from, to, promotion: promotion ?? null }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Server error"); return; }
      if (data.engineMove) {
        const mv = applyMove(chess, data.engineMove);
        setLastMove({ from: data.engineMove.from, to: data.engineMove.to });
        setMoveCount(n => n + 1);
        if (mv) setMoveHistory(h => [...h, mv.san]);
        syncCaptures(chess);
        if (mv) {
          const engineCheckmate = chess.isCheckmate();
          playMoveSound({ isCheckmate: engineCheckmate, isCheck: chess.isCheck(), isCapture: !!mv.captured });
          if (engineCheckmate) playCheckmateOutcome(chess);
        }
        redraw();
      }
      if (data.gameOver) setGameOver(resultLabel(data.reason, data.winner, playerColour));
    } catch (err) {
      setError("Network error — " + err.message);
    } finally {
      setEngineThinking(false);
    }
  }

  function buildLocalGameOver(chess, lastMovedBy) {
    if (chess.isCheckmate())
      return resultLabel("checkmate", lastMovedBy === "player" ? "player" : "engine", playerColour);
    return resultLabel("stalemate", "draw", playerColour);
  }

  const [confirmResignOpen, setConfirmResignOpen] = useState(false);

  async function handleResignConfirm() {
    setConfirmResignOpen(false);
    try {
      await fetch(`${API}/pvc/resign`, { method: "POST", headers: authHeaders(), body: JSON.stringify({ gameId }) });
    } catch (_) {}
    setGameOver(resultLabel("resigned", "engine", playerColour));
    showToast("You resigned the game.", "info");
  }

  const chess = chessRef.current;
  const isPlayerTurn = !gameOver && !engineThinking &&
    ((chess.turn() === "w" && playerColour === "white") || (chess.turn() === "b" && playerColour === "black"));

  const pieceGlyph = { p: "♟", n: "♞", b: "♝", r: "♜", q: "♛" };

  const pairedMoves = [];
  for (let i = 0; i < moveHistory.length; i += 2)
    pairedMoves.push([moveHistory[i], moveHistory[i + 1] ?? ""]);

  const whiteName = playerColour === "white" ? "You" : "Computer";
  const blackName = playerColour === "white" ? "Computer" : "You";

  const statusText  = gameOver ? gameOver.headline
    : chess.isCheck() ? "Check!"
    : isPlayerTurn   ? "Your turn"
    : engineThinking ? "Thinking…"
    : "Waiting…";

  const statusColor = gameOver ? "#c4a35a"
    : chess.isCheck() ? "#e05555"
    : isPlayerTurn   ? "#81b64c"
    : "#8a7055";

  // ── MOBILE LAYOUT ──────────────────────────────────────────────────────────
  if (isMobile) {
    return (
      <div style={m.root}>
        {/* Top bar */}
        <div style={m.topBar}>
          <div style={m.topBarLeft}>
            <span style={m.logoIcon}>♞</span>
            <span style={m.logoText}>vs Computer</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{ ...m.statusBadge, color: statusColor, borderColor: `${statusColor}44`, background: `${statusColor}12` }}>
              {statusText}
            </span>
            {!gameOver && (
              <button onClick={handleResign} style={m.resignBtnSmall}>Resign</button>
            )}
          </div>
        </div>

        {/* Opponent bar */}
        <div style={m.playerBar}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div style={m.engineAvatar}>{difficulty === "hard" ? "⚡" : "🟢"}</div>
            <div>
              <div style={m.playerName}>{difficulty === "hard" ? "Computer (Hard 1800 ELO)" : "Computer (Easy 1100 ELO)"}</div>
              <div style={m.playerSide}>{state?.engineColour === "white" ? "White" : "Black"}</div>
            </div>
          </div>
          <div style={m.capturedRow}>
            {capturedByEngine.map((t, i) => <span key={i} style={m.capturedPiece}>{pieceGlyph[t]}</span>)}
          </div>
          {engineThinking && <span style={m.thinkingBadge}>thinking…</span>}
        </div>

        {/* Board */}
        <div style={m.boardWrap}>
          <div style={{ width: "100%", maxWidth: `${Math.min(width, 480)}px`, aspectRatio: "1 / 1" }}>
            <Board
              chess={chess}
              playerColour={playerColour}
              onMove={handleMove}
              lastMove={lastMove}
              engineThinking={engineThinking || !isPlayerTurn}
              size={Math.floor(Math.min(width, 480) / 8) * 8}
            />
          </div>
        </div>

        {/* Player bar */}
        <div style={m.playerBar}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div style={m.playerAvatar}>♟</div>
            <div>
              <div style={m.playerName}>You</div>
              <div style={m.playerSide}>{playerColour === "white" ? "White" : "Black"}</div>
            </div>
          </div>
          <div style={m.capturedRow}>
            {capturedByPlayer.map((t, i) => <span key={i} style={m.capturedPiece}>{pieceGlyph[t]}</span>)}
          </div>
          <div style={{ fontSize: "0.75rem", color: "#8a7055" }}>Move {Math.ceil(moveCount / 2)}</div>
        </div>

        {/* Move history (mobile) */}
        <div style={m.movesPanel}>
          <div style={m.movesPanelHeader}>
            <span style={m.movesPanelTag}>
              <span style={{ ...m.colorDotSmall, background: "#f0e6d3", border: "2px solid #8a7055" }} />
              White · {whiteName}
            </span>
            <span style={m.movesPanelTag}>
              <span style={{ ...m.colorDotSmall, background: "#2c1a0e", border: "2px solid #c4a35a" }} />
              Black · {blackName}
            </span>
          </div>
          <div style={m.movesPanelList}>
            {pairedMoves.length === 0 && <span style={m.noMovesSmall}>No moves yet</span>}
            {pairedMoves.map(([white, black], i) => (
              <span key={i} style={m.movePillGroup}>
                <span style={m.moveNumSmall}>{i + 1}.</span> {white} {black}
              </span>
            ))}
          </div>
        </div>

        {error && <div style={m.errorBar}>{error}</div>}

        {/* Game over overlay */}
        {gameOver && (
          <div style={m.overlay}>
            <div style={m.popup}>
              <div style={{ fontSize: "3rem" }}>{gameOver.icon}</div>
              <h2 style={{ ...m.popupTitle, color: gameOver.headline === "You Win!" ? "#81b64c" : gameOver.headline === "Draw" ? "#c4a35a" : "#e05555" }}>
                {gameOver.headline}
              </h2>
              <p style={m.popupSub}>{gameOver.sub}</p>
              <button onClick={() => navigate("/pvc")} style={m.popupBtnPrimary}>Play Again</button>
              <button onClick={() => navigate("/home")} style={m.popupBtnSecondary}>Home</button>
            </div>
          </div>
        )}

        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700&family=DM+Sans:wght@400;500;600&display=swap');
          @keyframes popIn { from { opacity:0; transform:scale(0.92) translateY(12px); } to { opacity:1; transform:scale(1) translateY(0); } }
          @keyframes fadeIn { from { opacity:0; } to { opacity:1; } }
        `}</style>
      </div>
    );
  }

  // ── DESKTOP LAYOUT ─────────────────────────────────────────────────────────
  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600;700&family=DM+Sans:wght@300;400;500&display=swap');
        @keyframes fadeIn { from { opacity:0; } to { opacity:1; } }
        @keyframes fadeUp { from { opacity:0; transform:translateY(16px); } to { opacity:1; transform:translateY(0); } }
        @keyframes popIn  { from { opacity:0; transform:scale(0.9) translateY(16px); } to { opacity:1; transform:scale(1) translateY(0); } }
      `}</style>

      <div style={d.root}>
        {/* SIDEBAR */}
        <aside style={d.sidebar}>
          {/* Engine */}
          <div style={d.playerSection}>
            <div style={d.playerRow}>
              <div style={d.engineAvatar}>{difficulty === "hard" ? "⚡" : "🟢"}</div>
              <div style={{ flex: 1 }}>
                <div style={d.playerName}>{difficulty === "hard" ? "Computer (Hard 1800 ELO)" : "Computer (Easy 1100 ELO)"}</div>
                <div style={d.playerSide}>{state?.engineColour === "white" ? "White" : "Black"}</div>
              </div>
              {engineThinking && <span style={d.thinkingBadge}>thinking…</span>}
            </div>
            <div style={d.capturedRow}>
              {capturedByEngine.map((t, i) => <span key={i} style={d.capturedPiece}>{pieceGlyph[t]}</span>)}
            </div>
          </div>

          <div style={d.divider} />

          {/* Game meta */}
          <div style={d.metaSection}>
            {[
              { label: "Move",  value: Math.ceil(moveCount / 2) },
              { label: "Turn",  value: gameOver ? "—" : chess.turn() === "w" ? "White" : "Black" },
            ].map(({ label, value }) => (
              <div key={label} style={d.metaRow}>
                <span style={d.metaLabel}>{label}</span>
                <span style={d.metaValue}>{value}</span>
              </div>
            ))}
            <div style={d.statusRow}>
              <div style={{ ...d.statusDot, background: statusColor, boxShadow: `0 0 6px ${statusColor}88` }} />
              <span style={{ ...d.statusText, color: statusColor }}>{statusText}</span>
            </div>
          </div>

          <div style={d.divider} />

          {/* Bottom */}
          <div style={d.bottomSection}>
            <div style={d.capturedRow}>
              {capturedByPlayer.map((t, i) => <span key={i} style={d.capturedPiece}>{pieceGlyph[t]}</span>)}
            </div>
            <div style={d.playerRow}>
              <div style={d.playerAvatar}>♟</div>
              <div>
                <div style={d.playerName}>You</div>
                <div style={d.playerSide}>{playerColour === "white" ? "White" : "Black"}</div>
              </div>
            </div>

            {error && <div style={d.errorBox}>{error}</div>}

            {!gameOver ? (
              <button onClick={() => setConfirmResignOpen(true)} style={d.resignBtn} className="flex items-center justify-center gap-2">
                <IconFlag size={16} /> Resign Game
              </button>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                <button onClick={() => navigate("/pvc")} style={d.primaryBtn} className="flex items-center justify-center gap-2">
                  <IconZap size={16} /> New Game
                </button>
                <button onClick={() => navigate("/home")} style={d.secondaryBtn}>Home</button>
              </div>
            )}
          </div>
        </aside>

        {/* BOARD AREA */}
        <main style={d.boardArea}>
          <div style={d.boardPatternBg} aria-hidden="true" />
          <Board
            chess={chess}
            playerColour={playerColour}
            onMove={handleMove}
            lastMove={lastMove}
            engineThinking={engineThinking || !isPlayerTurn}
          />

          {/* Game over overlay */}
          {gameOver && (
            <div style={d.overlay}>
              <div style={d.popup}>
                <div style={{ ...d.popupGlow, background: gameOver.type === "win" ? "radial-gradient(circle, rgba(129,182,76,0.2) 0%, transparent 70%)" : gameOver.type === "draw" ? "radial-gradient(circle, rgba(196,163,90,0.2) 0%, transparent 70%)" : "radial-gradient(circle, rgba(200,60,60,0.15) 0%, transparent 70%)" }} />
                <div className="flex items-center justify-center mb-3">
                  <IconCrown size={48} className={gameOver.type === "win" ? "text-[#81b64c]" : gameOver.type === "draw" ? "text-[#c4a35a]" : "text-[#e53935]"} />
                </div>
                <h2 style={{ ...d.popupTitle, color: gameOver.type === "win" ? "#81b64c" : gameOver.type === "draw" ? "#c4a35a" : "#e05555" }}>
                  {gameOver.headline}
                </h2>
                <p style={d.popupSub}>{gameOver.sub}</p>
                <div style={{ display: "flex", gap: "10px" }}>
                  <button onClick={() => navigate("/pvc")} style={d.primaryBtn} className="flex items-center gap-2">
                    <IconZap size={16} /> Play Again
                  </button>
                  <button onClick={() => navigate("/home")} style={d.secondaryBtn}>Home</button>
                </div>
              </div>
            </div>
          )}

          <ConfirmModal
            isOpen={confirmResignOpen}
            title="Resign Game?"
            message="Are you sure you want to resign this game? This will count as a defeat."
            confirmText="Resign"
            cancelText="Cancel"
            isDanger={true}
            onConfirm={handleResignConfirm}
            onCancel={() => setConfirmResignOpen(false)}
          />
        </main>

        {/* MOVES SIDEBAR (right) */}
        <aside style={d.movesSidebar}>
          <div style={d.movesHeader}>
            <div style={d.movesHeaderRow}>
              <span style={{ ...d.colorDot, background: "#f0e6d3", border: "2px solid #8a7055" }} />
              <span style={d.movesColorLabel}>White</span>
              <span style={d.movesPlayerName}>{whiteName}</span>
            </div>
            <div style={d.movesHeaderRow}>
              <span style={{ ...d.colorDot, background: "#2c1a0e", border: "2px solid #c4a35a" }} />
              <span style={d.movesColorLabel}>Black</span>
              <span style={d.movesPlayerName}>{blackName}</span>
            </div>
          </div>

          <div style={d.movesTitleRow}>
            <span>Move History</span>
            <span style={d.movesCount}>{moveHistory.length}</span>
          </div>

          <div style={d.moveList} ref={moveListRef}>
            {pairedMoves.length === 0 && (
              <p style={d.noMoves}>Waiting for first move…</p>
            )}
            {pairedMoves.map(([white, black], i) => (
              <div key={i} style={{ ...d.moveRow, background: i % 2 === 0 ? "rgba(0,0,0,0.15)" : "transparent" }}>
                <span style={d.moveNum}>{i + 1}</span>
                <span style={d.moveWhite}>{white}</span>
                <span style={d.moveBlack}>{black}</span>
              </div>
            ))}
          </div>
        </aside>
      </div>
    </>
  );
}

// ── MOBILE STYLES ────────────────────────────────────────────────────────────
const m = {
  root: { minHeight: "100vh", background: "#1a0e07", display: "flex", flexDirection: "column", fontFamily: "'DM Sans',sans-serif" },
  topBar: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 16px", background: "rgba(26,14,7,0.9)", borderBottom: "1px solid rgba(196,163,90,0.12)", position: "sticky", top: 0, zIndex: 10 },
  topBarLeft: { display: "flex", alignItems: "center", gap: "8px" },
  logoIcon: { fontSize: "1.3rem", color: "#81b64c" },
  logoText: { fontFamily: "'Playfair Display',serif", fontSize: "1rem", fontWeight: 700, color: "#f0e6d3" },
  statusBadge: { fontSize: "0.7rem", fontWeight: 600, letterSpacing: "0.05em", padding: "4px 10px", borderRadius: "20px", border: "1px solid" },
  resignBtnSmall: { padding: "5px 12px", background: "transparent", border: "1px solid rgba(200,60,60,0.35)", borderRadius: "4px", color: "#c05050", fontSize: "0.75rem", cursor: "pointer", fontFamily: "'DM Sans',sans-serif" },
  playerBar: { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 16px", background: "rgba(44,26,14,0.9)", borderBottom: "1px solid rgba(196,163,90,0.1)" },
  engineAvatar: { width: "32px", height: "32px", borderRadius: "50%", background: "#2c1a0e", border: "1px solid rgba(196,163,90,0.3)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1rem", color: "#c4a35a" },
  playerAvatar: { width: "32px", height: "32px", borderRadius: "50%", background: "rgba(196,163,90,0.2)", border: "1px solid rgba(196,163,90,0.3)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1rem", color: "#c4a35a" },
  playerName: { fontSize: "0.82rem", fontWeight: 600, color: "#f0e6d3" },
  playerSide: { fontSize: "0.65rem", color: "#8a7055" },
  capturedRow: { display: "flex", flexWrap: "wrap", gap: "2px" },
  capturedPiece: { fontSize: "0.9rem", color: "#c4a882" },
  thinkingBadge: { fontSize: "0.62rem", fontWeight: 600, color: "#e8a838", background: "rgba(232,168,56,0.12)", border: "1px solid rgba(232,168,56,0.3)", borderRadius: "10px", padding: "2px 8px" },
  boardWrap: { width: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "#1a0e07", overflow: "hidden" },
  errorBar: { padding: "8px 16px", background: "rgba(200,60,60,0.15)", borderTop: "1px solid rgba(200,60,60,0.3)", color: "#e08080", fontSize: "0.78rem" },
  overlay: { position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, animation: "fadeIn 0.2s ease both" },
  popup: { background: "#2c1a0e", border: "1px solid rgba(196,163,90,0.2)", borderRadius: "10px", padding: "36px 28px", textAlign: "center", width: "calc(100% - 48px)", maxWidth: "320px", display: "flex", flexDirection: "column", alignItems: "center", gap: "12px", animation: "popIn 0.3s cubic-bezier(0.34,1.56,0.64,1) both" },
  popupTitle: { fontFamily: "'Playfair Display',serif", fontSize: "1.8rem", fontWeight: 700, margin: 0 },
  popupSub: { color: "#8a7055", fontSize: "0.85rem", margin: 0 },
  popupBtnPrimary: { width: "100%", padding: "12px", background: "#81b64c", border: "none", borderRadius: "6px", color: "#0d1f05", fontSize: "0.92rem", fontWeight: 700, cursor: "pointer", fontFamily: "'DM Sans',sans-serif" },
  popupBtnSecondary: { width: "100%", padding: "11px", background: "transparent", border: "1px solid rgba(196,163,90,0.3)", borderRadius: "6px", color: "#8a7055", fontSize: "0.88rem", cursor: "pointer", fontFamily: "'DM Sans',sans-serif" },

  // MOVES PANEL (mobile)
  movesPanel: { padding: "10px 16px", background: "rgba(26,14,7,0.6)", borderBottom: "1px solid rgba(196,163,90,0.1)" },
  movesPanelHeader: { display: "flex", gap: "14px", marginBottom: "6px" },
  movesPanelTag: { display: "flex", alignItems: "center", gap: "5px", fontSize: "0.68rem", color: "#8a7055", fontWeight: 600 },
  colorDotSmall: { width: "8px", height: "8px", borderRadius: "50%", flexShrink: 0 },
  movesPanelList: { display: "flex", flexWrap: "wrap", gap: "4px 10px", maxHeight: "62px", overflowY: "auto" },
  movePillGroup: { fontSize: "0.78rem", color: "#c4a882", whiteSpace: "nowrap" },
  moveNumSmall: { color: "#4a2c18", fontWeight: 600 },
  noMovesSmall: { fontSize: "0.78rem", color: "#4a2c18", fontStyle: "italic" },
};

// ── DESKTOP STYLES ───────────────────────────────────────────────────────────
const d = {
  root: { height: "100vh", width: "100vw", display: "flex", overflow: "hidden", background: "#1a0e07", fontFamily: "'DM Sans',sans-serif" },
  sidebar: { width: "240px", flexShrink: 0, height: "100%", background: "rgba(44,26,14,0.95)", borderRight: "1px solid rgba(196,163,90,0.12)", padding: "20px 18px", display: "flex", flexDirection: "column", gap: "0" },
  playerSection: { display: "flex", flexDirection: "column", gap: "8px", paddingBottom: "16px" },
  playerRow: { display: "flex", alignItems: "center", gap: "10px" },
  engineAvatar: { width: "36px", height: "36px", borderRadius: "50%", background: "#2c1a0e", border: "1px solid rgba(196,163,90,0.25)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.1rem", color: "#c4a35a", flexShrink: 0 },
  playerAvatar: { width: "36px", height: "36px", borderRadius: "50%", background: "rgba(196,163,90,0.15)", border: "1px solid rgba(196,163,90,0.25)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.1rem", color: "#c4a35a", flexShrink: 0 },
  playerName: { fontSize: "0.85rem", fontWeight: 600, color: "#f0e6d3", lineHeight: 1 },
  playerSide: { fontSize: "0.68rem", color: "#8a7055", marginTop: "2px" },
  thinkingBadge: { fontSize: "0.62rem", fontWeight: 600, color: "#e8a838", background: "rgba(232,168,56,0.12)", border: "1px solid rgba(232,168,56,0.3)", borderRadius: "10px", padding: "2px 8px", marginLeft: "auto", whiteSpace: "nowrap" },
  capturedRow: { display: "flex", flexWrap: "wrap", gap: "2px", minHeight: "20px", paddingLeft: "46px" },
  capturedPiece: { fontSize: "0.95rem", color: "#c4a882" },
  divider: { height: "1px", background: "rgba(196,163,90,0.1)", margin: "0 -18px" },
  metaSection: { padding: "16px 0", display: "flex", flexDirection: "column", gap: "10px" },
  metaRow: { display: "flex", justifyContent: "space-between", alignItems: "center" },
  metaLabel: { fontSize: "0.68rem", fontWeight: 600, color: "#8a7055", textTransform: "uppercase", letterSpacing: "0.08em" },
  metaValue: { fontSize: "0.85rem", fontWeight: 600, color: "#f0e6d3" },
  statusRow: { display: "flex", alignItems: "center", gap: "8px", marginTop: "4px" },
  statusDot: { width: "8px", height: "8px", borderRadius: "50%", flexShrink: 0, transition: "all 0.3s" },
  statusText: { fontSize: "0.82rem", fontWeight: 500, transition: "color 0.3s" },
  bottomSection: { marginTop: "auto", display: "flex", flexDirection: "column", gap: "10px", paddingTop: "16px" },
  errorBox: { padding: "8px 10px", background: "rgba(200,60,60,0.12)", border: "1px solid rgba(200,60,60,0.25)", borderRadius: "4px", color: "#e08080", fontSize: "0.75rem" },
  resignBtn: { width: "100%", padding: "10px", background: "transparent", border: "1px solid rgba(200,60,60,0.3)", borderRadius: "4px", color: "#c05050", fontSize: "0.85rem", cursor: "pointer", fontWeight: 500, fontFamily: "'DM Sans',sans-serif" },
  primaryBtn: { flex: 1, padding: "10px 16px", background: "rgba(129,182,76,0.15)", border: "1px solid rgba(129,182,76,0.4)", borderRadius: "4px", color: "#81b64c", fontSize: "0.85rem", fontWeight: 600, cursor: "pointer", fontFamily: "'DM Sans',sans-serif" },
  secondaryBtn: { flex: 1, padding: "10px 16px", background: "transparent", border: "1px solid rgba(196,163,90,0.2)", borderRadius: "4px", color: "#8a7055", fontSize: "0.85rem", cursor: "pointer", fontFamily: "'DM Sans',sans-serif" },
  boardArea: { flex: 1, display: "flex", alignItems: "center", justifyContent: "center", background: "#1a0e07", position: "relative", overflow: "hidden" },
  boardPatternBg: { position: "absolute", inset: 0, opacity: 0.04, pointerEvents: "none", backgroundImage: "repeating-conic-gradient(#b58863 0% 25%, transparent 0% 50%)", backgroundSize: "48px 48px" },
  overlay: { position: "absolute", inset: 0, background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50, animation: "fadeIn 0.2s ease both" },
  popup: { position: "relative", background: "#2c1a0e", border: "1px solid rgba(196,163,90,0.2)", borderRadius: "10px", padding: "44px 40px", textAlign: "center", minWidth: "300px", display: "flex", flexDirection: "column", alignItems: "center", gap: "14px", boxShadow: "0 0 0 1px rgba(196,163,90,0.08), 0 32px 80px rgba(0,0,0,0.7)", animation: "popIn 0.3s cubic-bezier(0.34,1.56,0.64,1) both", overflow: "hidden" },
  popupGlow: { position: "absolute", inset: 0, pointerEvents: "none" },
  popupTitle: { fontFamily: "'Playfair Display',serif", fontSize: "2rem", fontWeight: 700, margin: 0 },
  popupSub: { color: "#8a7055", fontSize: "0.88rem", margin: 0 },

  // MOVES SIDEBAR (right)
  movesSidebar: { width: "230px", flexShrink: 0, height: "100%", background: "rgba(44,26,14,0.95)", borderLeft: "1px solid rgba(196,163,90,0.12)", padding: "20px 16px", display: "flex", flexDirection: "column", gap: "14px", overflow: "hidden" },
  movesHeader: { display: "flex", flexDirection: "column", gap: "8px", paddingBottom: "14px", borderBottom: "1px solid rgba(196,163,90,0.1)" },
  movesHeaderRow: { display: "flex", alignItems: "center", gap: "8px" },
  colorDot: { width: "12px", height: "12px", borderRadius: "50%", flexShrink: 0 },
  movesColorLabel: { fontSize: "0.68rem", fontWeight: 600, color: "#8a7055", textTransform: "uppercase", letterSpacing: "0.08em", width: "42px" },
  movesPlayerName: { fontSize: "0.85rem", fontWeight: 600, color: "#f0e6d3" },
  movesTitleRow: { display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "0.72rem", fontWeight: 600, color: "#8a7055", textTransform: "uppercase", letterSpacing: "0.1em" },
  movesCount: { color: "rgba(138,112,85,0.5)", fontWeight: 400 },
  moveList: { flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: "2px", scrollbarWidth: "thin", scrollbarColor: "rgba(196,163,90,0.2) transparent" },
  noMoves: { color: "#4a2c18", fontSize: "0.82rem", textAlign: "center", marginTop: "20px", fontStyle: "italic" },
  moveRow: { display: "grid", gridTemplateColumns: "20px 1fr 1fr", gap: "4px", fontSize: "0.83rem", padding: "4px 6px", borderRadius: "3px" },
  moveNum: { color: "#4a2c18", fontWeight: 600, fontSize: "0.7rem", paddingTop: "1px" },
  moveWhite: { color: "#c4a882", fontWeight: 500 },
  moveBlack: { color: "#8a7055" },
};