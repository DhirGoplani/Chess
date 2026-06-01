import { useEffect, useRef, useState, useCallback } from "react";
import { useParams, useLocation, useNavigate } from "react-router-dom";
import { Chess } from "chess.js";
import Board from "../../components/board";

const API = (import.meta.env.VITE_API_URL ?? "http://localhost:3000") + "/api";

function authHeaders() {
  const token = localStorage.getItem("token");
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

function applyMove(chess, move) {
  chess.move({ from: move.from, to: move.to, promotion: move.promotion ?? undefined });
}

function resultLabel(reason, winner, playerColour) {
  if (reason === "resigned") return { headline: "You Resigned", sub: "Better luck next time." };
  if (winner === "draw") {
    const sub = {
      stalemate:   "No legal moves — it's a draw.",
      repetition:  "Threefold repetition — it's a draw.",
      insufficient: "Insufficient material — it's a draw.",
      "fifty-move": "Fifty-move rule — it's a draw.",
    }[reason] ?? "It's a draw.";
    return { headline: "Draw", sub };
  }
  if (reason === "checkmate") {
    if (winner === "player") return { headline: "Checkmate!", sub: "You beat the engine! 🎉" };
    return { headline: "Checkmate!", sub: "The engine wins. Try again?" };
  }
  return { headline: "Game Over", sub: reason };
}

export default function PvcGame() {
  const { gameId } = useParams();
  const { state } = useLocation();
  const navigate = useNavigate();

  const chessRef = useRef(new Chess());
  const [, forceUpdate] = useState(0);
  const redraw = useCallback(() => forceUpdate((n) => n + 1), []);

  const [playerColour, setPlayerColour] = useState(state?.playerColour ?? "white");
  const [engineThinking, setEngineThinking] = useState(false);
  const [lastMove, setLastMove] = useState(null);
  const [gameOver, setGameOver] = useState(null);
  const [error, setError] = useState(null);
  const [capturedByPlayer, setCapturedByPlayer] = useState([]);
  const [capturedByEngine, setCapturedByEngine] = useState([]);
  const [moveCount, setMoveCount] = useState(0);

 const engineFirstMoveApplied = useRef(false);

useEffect(() => {
  if (!state || engineFirstMoveApplied.current) return;
  engineFirstMoveApplied.current = true;
  setPlayerColour(state.playerColour);
  if (state.engineFirstMove) {
    const chess = chessRef.current;
    applyMove(chess, state.engineFirstMove);
    setLastMove({ from: state.engineFirstMove.from, to: state.engineFirstMove.to });
    setMoveCount(1);
    redraw();
  }
}, []);

  function syncCaptures(chess) {
    const starting = { p: 8, n: 2, b: 2, r: 2, q: 1 };
    const order = ["p", "n", "b", "r", "q"];
    const onBoard = { w: {}, b: {} };
    chess.board().flat().forEach((sq) => {
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
    const expand = (obj) =>
      Object.entries(obj).flatMap(([t, n]) => Array(n).fill(t));
    setCapturedByPlayer(expand(counts[engineSide]));
    setCapturedByEngine(expand(counts[playerSide]));
  }

  async function handleMove(from, to, promotion) {
    const chess = chessRef.current;
    const move = chess.move({ from, to, promotion: promotion ?? undefined });
    if (!move) return;
    setLastMove({ from, to });
    setMoveCount((n) => n + 1);
    syncCaptures(chess);
    redraw();
    if (chess.isGameOver()) {
      setGameOver(buildLocalGameOver(chess, "player"));
      return;
    }
    setEngineThinking(true);
    setError(null);
    try {
      const res = await fetch(`${API}/pvc/move`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({ gameId, from, to, promotion: promotion ?? null }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Server error"); return; }
      if (data.engineMove) {
        applyMove(chess, data.engineMove);
        setLastMove({ from: data.engineMove.from, to: data.engineMove.to });
        setMoveCount((n) => n + 1);
        syncCaptures(chess);
        redraw();
      }
      if (data.gameOver)
        setGameOver(resultLabel(data.reason, data.winner, playerColour));
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

  async function handleResign() {
    if (!window.confirm("Resign this game?")) return;
    try {
      await fetch(`${API}/pvc/resign`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({ gameId }),
      });
    } catch (_) {}
    setGameOver(resultLabel("resigned", "engine", playerColour));
  }

  const chess = chessRef.current;
  const isPlayerTurn =
    !gameOver &&
    !engineThinking &&
    ((chess.turn() === "w" && playerColour === "white") ||
      (chess.turn() === "b" && playerColour === "black"));

  const pieceGlyph = { p: "♟", n: "♞", b: "♝", r: "♜", q: "♛" };

  // Status dot colour
  const dotClass = chess.isCheck() && !gameOver
    ? "bg-red-500 shadow-[0_0_6px_rgba(239,68,68,0.7)]"
    : isPlayerTurn
    ? "bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.6)]"
    : "bg-[#c4a87a]";

  const statusText = gameOver
    ? gameOver.headline
    : chess.isCheck()
    ? "Check!"
    : isPlayerTurn
    ? "Your turn"
    : engineThinking
    ? "Engine thinking…"
    : "Waiting…";

  // Shared action button styles
  const btnBase =
    "px-4 py-2 rounded-sm text-[0.82rem] font-medium tracking-wide transition-all duration-150 cursor-pointer border";
  const btnPrimary =
    "bg-gradient-to-br from-[#c9a96e] to-[#a07840] text-[#1a0f00] border-transparent hover:opacity-90 hover:-translate-y-px shadow-sm";
  const btnSecondary =
    "bg-transparent text-[#7a6340] border-[#ddd0b8] hover:border-[#c4a87a] hover:bg-[#fdf8f0]";

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600;700&family=DM+Sans:wght@300;400;500&display=swap');
        @keyframes fadeIn  { from { opacity:0; } to { opacity:1; } }
        @keyframes fadeUp  { from { opacity:0; transform:translateY(16px); } to { opacity:1; transform:translateY(0); } }
        @keyframes spin    { to { transform: rotate(360deg); } }
        .pvc-fadein  { animation: fadeIn  0.3s ease both; }
        .pvc-fadeup  { animation: fadeUp  0.4s ease both; }
        .pvc-spin    { display:inline-block; animation: spin 1s linear infinite; }
      `}</style>

      <div
        className="flex h-screen w-screen overflow-hidden bg-[#f5f0e8] font-['DM_Sans',sans-serif]"
        style={{ fontFamily: "'DM Sans', sans-serif" }}
      >
        {/* ── Sidebar ── */}
        <aside className="flex flex-col w-64 shrink-0 h-full bg-[rgba(255,252,245,0.96)] border-r border-[rgba(180,140,70,0.18)] shadow-[2px_0_16px_rgba(120,80,20,0.07)] px-5 py-6 gap-4">

          {/* Engine player */}
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-[#2c1f08] flex items-center justify-center text-[#d4b87a] text-lg shrink-0 shadow-md">
                ⚙
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[0.87rem] font-medium text-[#2c1f08] leading-tight">Engine</div>
                <div className="text-[0.7rem] text-[#9a7f52] font-light">
                  {state?.engineColour === "white" ? "White" : "Black"}
                </div>
              </div>
              {engineThinking && (
                <span className="text-[0.65rem] font-semibold tracking-wide text-[#a07840] bg-[rgba(160,120,64,0.1)] border border-[rgba(160,120,64,0.25)] rounded-[2px] px-2 py-0.5 uppercase shrink-0 pvc-fadein">
                  thinking…
                </span>
              )}
            </div>

            {/* Pieces captured by engine */}
            <div className="flex flex-wrap gap-0.5 min-h-[1.2rem]">
              {capturedByEngine.map((t, i) => (
                <span key={i} className="text-base text-[#2c1f08] leading-none">{pieceGlyph[t]}</span>
              ))}
            </div>
          </div>

          {/* Divider */}
          <div className="border-t border-[rgba(180,140,70,0.15)]" />

          {/* Game meta */}
          <div className="flex flex-col gap-2.5">
            {[
              { label: "Move", value: Math.ceil(moveCount / 2) },
              { label: "Turn", value: gameOver ? "—" : chess.turn() === "w" ? "White" : "Black" },
            ].map(({ label, value }) => (
              <div key={label} className="flex justify-between items-center">
                <span className="text-[0.7rem] font-medium text-[#9a7f52] uppercase tracking-[0.08em]">{label}</span>
                <span className="text-[0.87rem] font-semibold text-[#2c1f08]">{value}</span>
              </div>
            ))}

            {/* Status row */}
            <div className="flex items-center gap-2 mt-1">
              <span className={`w-2 h-2 rounded-full shrink-0 transition-colors duration-300 ${dotClass}`} />
              <span className="text-[0.8rem] text-[#5a4520] font-medium">{statusText}</span>
            </div>
          </div>

          {/* Divider */}
          <div className="border-t border-[rgba(180,140,70,0.15)]" />

          {/* Bottom section */}
          <div className="flex flex-col gap-3 mt-auto">
            {/* Pieces captured by player */}
            <div className="flex flex-wrap gap-0.5 min-h-[1.2rem]">
              {capturedByPlayer.map((t, i) => (
                <span key={i} className="text-base text-[#2c1f08] leading-none">{pieceGlyph[t]}</span>
              ))}
            </div>

            {/* You */}
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-[#d4b87a] flex items-center justify-center text-[#2c1f08] text-lg shrink-0 shadow-md">
                ♟
              </div>
              <div>
                <div className="text-[0.87rem] font-medium text-[#2c1f08] leading-tight">You</div>
                <div className="text-[0.7rem] text-[#9a7f52] font-light">
                  {playerColour === "white" ? "White" : "Black"}
                </div>
              </div>
            </div>

            {/* Error */}
            {error && (
              <p className="text-[0.78rem] text-red-500 bg-red-50 border border-red-200 rounded-sm px-3 py-2 pvc-fadein">
                {error}
              </p>
            )}

            {/* Actions */}
            {!gameOver ? (
              <button
                onClick={handleResign}
                className={`${btnBase} ${btnSecondary} w-full justify-center`}
              >
                Resign
              </button>
            ) : (
              <div className="flex flex-col gap-2 pvc-fadein">
                <button
                  onClick={() => navigate("/pvc")}
                  className={`${btnBase} ${btnPrimary} w-full`}
                >
                  New Game
                </button>
                <button
                  onClick={() => navigate("/home")}
                  className={`${btnBase} ${btnSecondary} w-full`}
                >
                  Home
                </button>
              </div>
            )}
          </div>
        </aside>

        {/* ── Board ── */}
        <main className="flex-1 flex items-center justify-center bg-[#ede8df] relative overflow-hidden">
          {/* Subtle board-pattern bg */}
          <div
            aria-hidden="true"
            className="absolute inset-0 opacity-[0.06] pointer-events-none"
            style={{
              backgroundImage:
                "repeating-conic-gradient(#8b6914 0% 25%, transparent 0% 50%)",
              backgroundSize: "48px 48px",
            }}
          />

          <Board
            chess={chess}
            playerColour={playerColour}
            onMove={handleMove}
            lastMove={lastMove}
            engineThinking={engineThinking || !isPlayerTurn}
          />

          {/* Game-over overlay */}
          {gameOver && (
            <div className="absolute inset-0 flex items-center justify-center bg-[rgba(30,18,6,0.55)] backdrop-blur-[3px] pvc-fadein">
              <div className="bg-[rgba(255,252,245,0.97)] border border-[rgba(180,140,70,0.25)] rounded-sm px-10 py-9 text-center shadow-[0_12px_48px_rgba(60,30,0,0.25)] max-w-xs w-full mx-4 pvc-fadeup">
                <div className="text-5xl mb-3">
                  {gameOver.headline.includes("You beat")
                    ? "🏆"
                    : gameOver.headline === "Stalemate"
                    ? "🤝"
                    : "💀"}
                </div>
                <h2 className="font-['Playfair_Display',serif] text-[1.6rem] font-bold text-[#2c1f08] mb-1 tracking-tight">
                  {gameOver.headline}
                </h2>
                <p className="text-[0.85rem] text-[#9a7f52] mb-6 font-light">{gameOver.sub}</p>
                <div className="flex gap-3 justify-center">
                  <button
                    onClick={() => navigate("/pvc")}
                    className={`${btnBase} ${btnPrimary}`}
                  >
                    Play Again
                  </button>
                  <button
                    onClick={() => navigate("/home")}
                    className={`${btnBase} ${btnSecondary}`}
                  >
                    Home
                  </button>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </>
  );
}