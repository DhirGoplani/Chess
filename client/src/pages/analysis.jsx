import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Chess } from "chess.js";
import Board from "../components/board";
import { getApiUrl } from "../utils/apiUrl";
import Logo from "../components/Logo";
import LoadingScreen from "../components/LoadingScreen";

const SQUARES = Array.from({ length: 64 }, (_, i) => i);

export default function Analysis() {
  const { gameId }              = useParams();
  const navigate                = useNavigate();
  const token                   = localStorage.getItem("token");

  // Instant load from sessionStorage cache if available (0ms delay!)
  const [moves, setMoves]       = useState(() => {
    try {
      const cached = sessionStorage.getItem(`cached_moves_${gameId}`);
      return cached ? JSON.parse(cached) : [];
    } catch {
      return [];
    }
  });

  const [currentIdx, setCurrentIdx] = useState(-1); // -1 = starting position
  const [chess]                 = useState(new Chess());
  const [, forceUpdate]         = useState(0);
  const [loading, setLoading]   = useState(() => moves.length === 0);
  const [menuOpen, setMenuOpen] = useState(false);
  const [boardSize, setBoardSize] = useState(480);

  useEffect(() => {
    const fetchMoves = async () => {
      try {
        const res  = await fetch(`${getApiUrl()}/api/games/${gameId}/moves`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (data.moves) {
          setMoves(data.moves);
          sessionStorage.setItem(`cached_moves_${gameId}`, JSON.stringify(data.moves));
        }
      } catch (err) {
        console.error("Failed to fetch moves:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchMoves();
  }, [gameId]);

  // Load position at currentIdx
  useEffect(() => {
    chess.reset();
    if (currentIdx >= 0) {
      chess.load(moves[currentIdx].fen);
    }
    forceUpdate(n => n + 1);
  }, [currentIdx, moves]);

  // Responsive board sizing
  // Accounts for: content horizontal padding (32px) + board frame padding (up to 24px)
  // + a safety buffer, so the board can never exceed the viewport width and get clipped.
  useEffect(() => {
    const calc = () => {
      const w = window.innerWidth;
      let size;
      if (w >= 900) size = 480;
      else if (w >= 640) size = 420;
      else if (w >= 480) size = 360;
      else size = w - 80; // fluid on phones, generous buffer
      setBoardSize(Math.max(220, Math.min(size, w - 64)));
    };
    calc();
    window.addEventListener("resize", calc);
    window.addEventListener("orientationchange", calc);
    return () => {
      window.removeEventListener("resize", calc);
      window.removeEventListener("orientationchange", calc);
    };
  }, []);

  const goToStart = () => setCurrentIdx(-1);
  const goToPrev  = () => setCurrentIdx(i => Math.max(-1, i - 1));
  const goToNext  = () => setCurrentIdx(i => Math.min(moves.length - 1, i + 1));
  const goToEnd   = () => setCurrentIdx(moves.length - 1);

  const lastMove = currentIdx >= 0
    ? { from: moves[currentIdx].from_square, to: moves[currentIdx].to_square }
    : null;

  // Pair moves for display
  const pairedMoves = [];
  for (let i = 0; i < moves.length; i += 2) {
    pairedMoves.push([moves[i], moves[i + 1]]);
  }

  if (loading && moves.length === 0) {
    return <LoadingScreen message="Loading Game Analysis..." />;
  }

  return (
    <div style={s.root}>
      <GlobalStyles />

      <div style={s.boardBg}>
        {SQUARES.map((i) => {
          const row = Math.floor(i / 8), col = i % 8;
          return <div key={i} style={{ ...s.sq, background: (row + col) % 2 === 1 ? "#b58863" : "#f0d9b5" }} />;
        })}
      </div>
      <div style={s.vignette} />

      {/* NAVBAR */}
      <nav style={s.nav}>
        <div style={s.navLogo} className="cursor-pointer" onClick={() => navigate("/home")}>
          <Logo size={36} />
        </div>
        <div style={s.navRight} className="nav-right-el">
          <button style={s.navBtn} onClick={() => navigate("/history")}>
            ← Back to History
          </button>
        </div>
        <button style={s.hamburger} className="hamburger-el" onClick={() => setMenuOpen(v => !v)}>
          {menuOpen ? "✕" : "☰"}
        </button>
      </nav>

      {menuOpen && (
        <div style={s.mobileMenu} className="mobile-menu-el">
          <button style={s.mobileBtn} onClick={() => navigate("/history")}>
            ← Back to History
          </button>
        </div>
      )}

      <div style={s.content} className="content-el">
        <div style={s.titleRow}>
          <p style={s.eyebrow}>Post-Game Review</p>
          <h1 style={s.title} className="title-el">Game Analysis</h1>
        </div>

        {loading && (
          <div style={s.loadingWrap}>
            <div style={s.spinner} />
            <p style={s.loading}>Loading moves…</p>
          </div>
        )}

        {!loading && (
          <div style={s.layout} className="layout-el">

            {/* BOARD */}
            <div style={s.boardCol}>
              <div style={s.boardFrame} className="board-frame-el">
                <Board
                  chess={chess}
                  playerColour="white"
                  onMove={() => {}}          // read-only
                  lastMove={lastMove}
                  engineThinking={true}      // disables clicking
                  size={boardSize}
                />
              </div>

              {/* CONTROLS */}
              <div style={s.controls}>
                <button style={s.ctrlBtn} onClick={goToStart} title="Start" disabled={currentIdx === -1}>⏮</button>
                <button style={s.ctrlBtn} onClick={goToPrev}  title="Previous" disabled={currentIdx === -1}>◀</button>
                <span style={s.moveCounter}>
                  {currentIdx === -1 ? "Starting position" : `Move ${currentIdx + 1} / ${moves.length}`}
                </span>
                <button style={s.ctrlBtn} onClick={goToNext}  title="Next" disabled={currentIdx === moves.length - 1}>▶</button>
                <button style={s.ctrlBtn} onClick={goToEnd}   title="End" disabled={currentIdx === moves.length - 1}>⏭</button>
              </div>
            </div>

            {/* MOVE LIST */}
            <div style={s.sideCol} className="side-col-el">
              <div style={s.sideCard}>
                <div style={s.sideHeader}>
                  <h3 style={s.sideTitle}>Moves</h3>
                  <span style={s.moveTotal}>{moves.length}</span>
                </div>
                <div style={s.cardDivider} />
                <div style={s.moveList} className="move-list-el">
                  {pairedMoves.length === 0 && (
                    <p style={s.noMoves}>No moves recorded for this game</p>
                  )}
                  {pairedMoves.map(([white, black], i) => {
                    const whiteIdx = i * 2;
                    const blackIdx = i * 2 + 1;
                    return (
                      <div key={i} style={s.moveRow}>
                        <span style={s.moveNum}>{i + 1}</span>
                        <span
                          style={{
                            ...s.moveSan,
                            ...(currentIdx === whiteIdx ? s.moveActive : {}),
                          }}
                          onClick={() => setCurrentIdx(whiteIdx)}
                        >
                          {white?.san}
                        </span>
                        <span
                          style={{
                            ...s.moveSan,
                            ...(black && currentIdx === blackIdx ? s.moveActive : {}),
                          }}
                          onClick={() => black && setCurrentIdx(blackIdx)}
                        >
                          {black?.san ?? ""}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

const s = {
  root: { minHeight: "100vh", background: "#1a0e07", position: "relative", overflow: "hidden", fontFamily: "'DM Sans', sans-serif" },
  boardBg: { position: "fixed", inset: 0, display: "grid", gridTemplateColumns: "repeat(8,1fr)", gridTemplateRows: "repeat(8,1fr)", opacity: 0.06, transform: "rotate(12deg) scale(1.5)", pointerEvents: "none" },
  sq: { width: "100%", height: "100%" },
  vignette: { position: "fixed", inset: 0, background: "radial-gradient(ellipse at center, transparent 20%, #1a0e07 80%)", pointerEvents: "none" },

  nav: { position: "relative", zIndex: 20, display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 24px", borderBottom: "1px solid rgba(196,163,90,0.12)", background: "rgba(26,14,7,0.85)", backdropFilter: "blur(12px)" },
  navLogo: { display: "flex", alignItems: "center", gap: "8px" },
  logoIcon: { fontSize: "1.5rem", color: "#c4a35a", filter: "drop-shadow(0 0 8px rgba(196,163,90,0.4))" },
  logoText: { fontFamily: "'Playfair Display', serif", fontSize: "1.25rem", fontWeight: 700, color: "#f0e6d3" },
  navRight: { display: "flex", alignItems: "center", gap: "12px" },
  navBtn: { padding: "8px 18px", background: "transparent", border: "1px solid rgba(196,163,90,0.3)", borderRadius: "4px", color: "#c4a882", fontSize: "0.82rem", cursor: "pointer", fontFamily: "'DM Sans', sans-serif", fontWeight: 500 },
  hamburger: { display: "none", background: "transparent", border: "none", color: "#c4a882", fontSize: "1.4rem", cursor: "pointer", padding: "4px" },
  mobileMenu: { position: "relative", zIndex: 19, background: "rgba(44,26,14,0.98)", borderBottom: "1px solid rgba(196,163,90,0.15)", padding: "16px 24px", display: "flex" },
  mobileBtn: { width: "100%", padding: "10px 16px", background: "transparent", border: "1px solid rgba(196,163,90,0.25)", borderRadius: "4px", color: "#c4a882", fontSize: "0.85rem", cursor: "pointer", fontFamily: "'DM Sans', sans-serif" },

  content: { position: "relative", zIndex: 10, maxWidth: "1100px", margin: "0 auto", padding: "0 16px 80px" },

  titleRow: { textAlign: "center", padding: "40px 0 32px", animation: "fadeUp 0.5s ease both" },
  eyebrow: { fontSize: "0.72rem", fontWeight: 600, letterSpacing: "0.2em", textTransform: "uppercase", color: "#81b64c", marginBottom: "12px" },
  title: { fontFamily: "'Playfair Display', serif", fontSize: "2.4rem", fontWeight: 700, color: "#f0e6d3", lineHeight: 1.1 },

  loadingWrap: { display: "flex", flexDirection: "column", alignItems: "center", gap: "16px", padding: "80px 0" },
  spinner: { width: "34px", height: "34px", borderRadius: "50%", border: "3px solid rgba(196,163,90,0.15)", borderTopColor: "#c4a35a", animation: "spin 0.9s linear infinite" },
  loading: { color: "#8a7055", fontSize: "0.9rem" },

  layout: { display: "flex", gap: "24px", alignItems: "flex-start", justifyContent: "center", animation: "fadeUp 0.6s ease both" },
  boardCol: { display: "flex", flexDirection: "column", gap: "14px", alignItems: "center", width: "100%", maxWidth: "100%" },
  boardFrame: { padding: "12px", background: "rgba(44,26,14,0.85)", border: "1px solid rgba(196,163,90,0.18)", borderRadius: "10px", boxShadow: "0 8px 32px rgba(0,0,0,0.35)", backdropFilter: "blur(12px)", maxWidth: "100%", overflow: "hidden", display: "inline-flex" },

  controls: { display: "flex", alignItems: "center", gap: "8px", justifyContent: "center", background: "rgba(44,26,14,0.85)", border: "1px solid rgba(196,163,90,0.18)", borderRadius: "8px", padding: "10px 16px", backdropFilter: "blur(12px)", width: "100%" },
  ctrlBtn: { width: "36px", height: "36px", background: "rgba(196,163,90,0.08)", border: "1px solid rgba(196,163,90,0.25)", borderRadius: "6px", cursor: "pointer", fontSize: "1rem", color: "#c4a882", display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.15s" },
  moveCounter: { flex: 1, textAlign: "center", fontSize: "0.82rem", color: "#8a7055", fontWeight: 500 },

  sideCol: { width: "280px", flexShrink: 0, position: "sticky", top: "20px" },
  sideCard: { background: "rgba(44,26,14,0.85)", border: "1px solid rgba(196,163,90,0.18)", borderRadius: "10px", padding: "18px", display: "flex", flexDirection: "column", gap: "12px", backdropFilter: "blur(12px)", boxShadow: "0 8px 32px rgba(0,0,0,0.3)" },
  sideHeader: { display: "flex", justifyContent: "space-between", alignItems: "center" },
  sideTitle: { fontFamily: "'Playfair Display', serif", fontSize: "1.15rem", fontWeight: 700, color: "#f0e6d3" },
  moveTotal: { fontSize: "0.72rem", color: "#8a7055", background: "rgba(0,0,0,0.2)", borderRadius: "20px", padding: "3px 10px", fontWeight: 600 },
  cardDivider: { height: "1px", background: "rgba(196,163,90,0.15)" },

  moveList: { maxHeight: "460px", overflowY: "auto", display: "flex", flexDirection: "column", gap: "2px" },
  noMoves: { color: "#5c4a30", fontSize: "0.85rem", textAlign: "center", marginTop: "16px" },
  moveRow: { display: "grid", gridTemplateColumns: "28px 1fr 1fr", gap: "4px", fontSize: "0.88rem", padding: "3px" },
  moveNum: { color: "#5c4a30", fontWeight: 600, display: "flex", alignItems: "center", fontSize: "0.78rem" },
  moveSan: { color: "#c4a882", cursor: "pointer", padding: "6px 8px", borderRadius: "4px", fontWeight: 500, transition: "all 0.12s" },
  moveActive: { background: "rgba(196,163,90,0.18)", color: "#e8c887", fontWeight: 700 },
};

const GlobalStyles = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600;700&family=DM+Sans:wght@300;400;500;600&display=swap');
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

    @keyframes fadeUp { from { opacity:0; transform:translateY(24px); } to { opacity:1; transform:translateY(0); } }
    @keyframes spin { to { transform: rotate(360deg); } }

    button:disabled { opacity: 0.35; cursor: not-allowed !important; }
    button:not(:disabled):hover { filter: brightness(1.15); }

    .move-list-el::-webkit-scrollbar { width: 6px; }
    .move-list-el::-webkit-scrollbar-thumb { background: rgba(196,163,90,0.25); border-radius: 3px; }
    .move-list-el::-webkit-scrollbar-track { background: transparent; }

    @media (min-width: 769px) {
      .hamburger-el  { display: none !important; }
      .mobile-menu-el { display: none !important; }
    }
    @media (max-width: 768px) {
      .nav-right-el  { display: none !important; }
      .hamburger-el  { display: flex !important; }
    }

    @media (max-width: 900px) {
      .layout-el { flex-direction: column !important; align-items: center !important; }
      .side-col-el { width: 100% !important; max-width: 480px; position: relative !important; top: 0 !important; }
    }

    @media (max-width: 560px) {
      .title-el { font-size: 1.8rem !important; }
      .board-frame-el { padding: 8px !important; }
      .move-list-el { max-height: 300px !important; }
      .content-el { padding-left: 10px !important; padding-right: 10px !important; }
    }

    html, body { overflow-x: hidden; }
  `}</style>
);