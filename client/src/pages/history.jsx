import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getApiUrl } from "../utils/apiUrl";

export default function History() {
  const navigate = useNavigate();
  const [games, setGames] = useState([]);
  const [loading, setLoading] = useState(true);
  const [hoveredId, setHoveredId] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);
  
  const token = localStorage.getItem("token");
  const user = JSON.parse(localStorage.getItem("user") || "{}");

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const res = await fetch(`${getApiUrl()}/api/games/history`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        setGames(data.games || []);
      } catch (err) {
        console.error("Failed to fetch history:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchHistory();
  }, []);

  const formatDate = (ts) =>
    new Date(ts).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });

  const resultColor = (result) => {
    if (result === "win") return "#81b64c";
    if (result === "loss") return "#e53935";
    return "#c4a35a";
  };

  const resultLabel = (result) => {
    if (result === "win") return "Win";
    if (result === "loss") return "Loss";
    return "Draw";
  };

  const resultIcon = (result) => {
    if (result === "win") return "✓";
    if (result === "loss") return "✕";
    return "=";
  };

  return (
    <div style={s.root}>
      <GridStyles />
      
      {/* Background */}
      <div style={s.vignette} />

      {/* NAVBAR */}
      <nav style={s.nav}>
        <div style={s.navLogo}>
          <span style={s.logoIcon}>♞</span>
          <span style={s.logoText}>ChessMate</span>
        </div>
        <div style={s.navRight} className="nav-right-el">
          <button style={s.navBtn} onClick={() => navigate("/home")}>
            Home
          </button>
          <button style={{ ...s.navBtn, borderColor: "#81b64c", color: "#81b64c" }} 
            onClick={() => navigate("/home")}>
            Play Now
          </button>
        </div>
        <button style={s.hamburger} className="hamburger-el" onClick={() => setMenuOpen(v => !v)}>
          {menuOpen ? "✕" : "☰"}
        </button>
      </nav>

      {menuOpen && (
        <div style={s.mobileMenu}>
          <button style={s.mobileMenuBtn} onClick={() => { navigate("/home"); setMenuOpen(false); }}>
            Home
          </button>
          <button style={s.mobileMenuBtn} onClick={() => { navigate("/home"); setMenuOpen(false); }}>
            Play Now
          </button>
        </div>
      )}

      <div style={s.content}>
        {/* HERO */}
        <div style={s.hero}>
          <h1 style={s.title}>Game History</h1>
          <p style={s.subtitle}>{user.username}'s recent matches</p>
        </div>

        {loading && (
          <div style={s.loadingState}>
            <div style={s.spinner} />
            <p style={s.loadingText}>Loading your games...</p>
          </div>
        )}

        {!loading && games.length === 0 && (
          <div style={s.emptyState}>
            <div style={s.emptyIcon}>♟</div>
            <h2 style={s.emptyTitle}>No Games Yet</h2>
            <p style={s.emptyDesc}>Play your first game and it'll appear here</p>
            <button style={s.emptyBtn} onClick={() => navigate("/home")}>
              Start Playing →
            </button>
          </div>
        )}

        {!loading && games.length > 0 && (
          <>
            {/* Desktop Table */}
            <div style={s.tableContainer} className="table-desktop">
              <div style={s.tableHeader}>
                <span>Result</span>
                <span>Opponent</span>
                <span>Format</span>
                <span>Rating</span>
                <span>Date</span>
                <span></span>
              </div>

              {games.map((g, idx) => (
                <div
                  key={g.game_id}
                  style={{
                    ...s.tableRow,
                    borderColor: hoveredId === g.game_id ? resultColor(g.result) + "44" : "rgba(196,163,90,0.1)",
                    boxShadow: hoveredId === g.game_id ? `0 0 0 1px ${resultColor(g.result)}22` : "none",
                    animation: `fadeUp 0.4s ease both ${0.05 * idx}s`,
                  }}
                  onMouseEnter={() => setHoveredId(g.game_id)}
                  onMouseLeave={() => setHoveredId(null)}
                >
                  <span style={{ ...s.resultBadge, background: resultColor(g.result) + "20", color: resultColor(g.result) }}>
                    {resultIcon(g.result)} {resultLabel(g.result)}
                  </span>
                  <span style={s.opponent}>
                    <span style={s.colorIcon}>{g.user_colour === "white" ? "♔" : "♚"}</span>
                    {g.opponent_username}
                  </span>
                  <span style={s.format}>{g.game_type}</span>
                  <span style={s.rating}>
                    <span style={{ color: g.rating_change >= 0 ? "#81b64c" : "#e53935" }}>
                      {g.rating_change >= 0 ? "+" : ""}{g.rating_change}
                    </span>
                    <span style={s.ratingAfter}>{g.rating_after}</span>
                  </span>
                  <span style={s.date}>{formatDate(g.ended_at)}</span>
                  <button
                    style={s.analyzeBtn}
                    onClick={() => navigate(`/analysis/${g.game_id}`)}
                  >
                    →
                  </button>
                </div>
              ))}
            </div>

            {/* Mobile Cards */}
            <div style={s.cardContainer} className="table-mobile">
              {games.map((g, idx) => (
                <div
                  key={g.game_id}
                  style={{
                    ...s.gameCard,
                    borderLeftColor: resultColor(g.result),
                    animation: `fadeUp 0.4s ease both ${0.05 * idx}s`,
                  }}
                  onClick={() => navigate(`/analysis/${g.game_id}`)}
                >
                  <div style={s.cardTop}>
                    <div style={s.cardResult}>
                      <div style={{ ...s.resultIcon, background: resultColor(g.result) + "20", color: resultColor(g.result) }}>
                        {resultIcon(g.result)}
                      </div>
                      <div>
                        <div style={{ ...s.cardResultLabel, color: resultColor(g.result) }}>
                          {resultLabel(g.result)}
                        </div>
                        <div style={s.cardDate}>{formatDate(g.ended_at)}</div>
                      </div>
                    </div>
                    <span style={s.cardArrow}>→</span>
                  </div>

                  <div style={s.cardDivider} />

                  <div style={s.cardDetails}>
                    <div style={s.cardDetailRow}>
                      <span style={s.cardLabel}>vs</span>
                      <span style={s.cardValue}>
                        <span style={s.colorIcon}>{g.user_colour === "white" ? "♔" : "♚"}</span>
                        {g.opponent_username}
                      </span>
                    </div>
                    <div style={s.cardDetailRow}>
                      <span style={s.cardLabel}>Format</span>
                      <span style={s.cardValue}>{g.game_type}</span>
                    </div>
                    <div style={s.cardDetailRow}>
                      <span style={s.cardLabel}>Rating</span>
                      <span style={s.cardValue}>
                        <span style={{ color: g.rating_change >= 0 ? "#81b64c" : "#e53935", fontWeight: 600 }}>
                          {g.rating_change >= 0 ? "+" : ""}{g.rating_change}
                        </span>
                        <span style={s.ratingAfter}>{g.rating_after}</span>
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600;700&family=DM+Sans:wght@300;400;500;600&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        
        @keyframes fadeUp { from { opacity:0; transform:translateY(16px); } to { opacity:1; transform:translateY(0); } }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }

        @media (min-width: 769px) {
          .table-mobile { display: none !important; }
          .hamburger-el { display: none !important; }
          .nav-right-el { display: flex !important; }
        }

        @media (max-width: 768px) {
          .table-desktop { display: none !important; }
          .nav-right-el { display: none !important; }
          .hamburger-el { display: flex !important; }
        }
      `}</style>
    </div>
  );
}

const s = {
  root: { 
    minHeight: "100vh", 
    background: "#1a0e07", 
    fontFamily: "'DM Sans', sans-serif",
    position: "relative",
    overflow: "hidden"
  },
  vignette: { 
    position: "fixed", 
    inset: 0, 
    background: "radial-gradient(ellipse at center, transparent 20%, #1a0e07 80%)", 
    pointerEvents: "none" 
  },

  // NAVBAR
  nav: { 
    position: "relative", 
    zIndex: 20, 
    display: "flex", 
    justifyContent: "space-between", 
    alignItems: "center", 
    padding: "16px 24px", 
    borderBottom: "1px solid rgba(196,163,90,0.12)", 
    background: "rgba(26,14,7,0.85)", 
    backdropFilter: "blur(12px)" 
  },
  navLogo: { 
    display: "flex", 
    alignItems: "center", 
    gap: "8px" 
  },
  logoIcon: { 
    fontSize: "1.5rem", 
    color: "#81b64c", 
    filter: "drop-shadow(0 0 8px rgba(129,182,76,0.5))" 
  },
  logoText: { 
    fontFamily: "'Playfair Display', serif", 
    fontSize: "1.25rem", 
    fontWeight: 700, 
    color: "#f0e6d3" 
  },
  navRight: { 
    display: "flex", 
    alignItems: "center", 
    gap: "12px" 
  },
  navBtn: { 
    padding: "7px 16px", 
    background: "transparent", 
    border: "1px solid rgba(196,163,90,0.25)", 
    borderRadius: "4px", 
    color: "#8a7055", 
    fontSize: "0.82rem", 
    cursor: "pointer",
    fontFamily: "'DM Sans', sans-serif",
    fontWeight: 500,
    transition: "all 0.2s ease"
  },
  hamburger: { 
    display: "none", 
    background: "transparent", 
    border: "none", 
    color: "#c4a882", 
    fontSize: "1.4rem", 
    cursor: "pointer", 
    padding: "4px"
  },
  mobileMenu: { 
    position: "relative", 
    zIndex: 19, 
    background: "rgba(44,26,14,0.95)", 
    borderBottom: "1px solid rgba(196,163,90,0.15)", 
    padding: "12px", 
    display: "flex", 
    flexDirection: "column", 
    gap: "8px"
  },
  mobileMenuBtn: { 
    padding: "10px 16px", 
    background: "rgba(196,163,90,0.1)", 
    border: "1px solid rgba(196,163,90,0.2)", 
    borderRadius: "4px", 
    color: "#c4a882", 
    fontSize: "0.9rem", 
    cursor: "pointer",
    fontFamily: "'DM Sans', sans-serif",
    fontWeight: 500
  },

  // CONTENT
  content: { 
    position: "relative", 
    zIndex: 10, 
    maxWidth: "1000px", 
    margin: "0 auto", 
    padding: "0 16px 80px" 
  },

  // HERO
  hero: { 
    textAlign: "center", 
    padding: "48px 0 32px", 
    animation: "fadeUp 0.5s ease both" 
  },
  title: { 
    fontFamily: "'Playfair Display', serif", 
    fontSize: "2.4rem", 
    fontWeight: 700, 
    color: "#f0e6d3", 
    marginBottom: "6px" 
  },
  subtitle: { 
    fontSize: "0.9rem", 
    color: "#8a7055" 
  },

  // LOADING
  loadingState: { 
    display: "flex", 
    flexDirection: "column", 
    alignItems: "center", 
    justifyContent: "center", 
    padding: "80px 24px", 
    gap: "16px"
  },
  spinner: { 
    width: "40px", 
    height: "40px", 
    border: "2px solid rgba(196,163,90,0.2)", 
    borderTop: "2px solid #81b64c", 
    borderRadius: "50%", 
    animation: "spin 1s linear infinite"
  },
  loadingText: { 
    color: "#8a7055", 
    fontSize: "0.9rem"
  },

  // EMPTY STATE
  emptyState: { 
    textAlign: "center", 
    padding: "60px 24px", 
    display: "flex", 
    flexDirection: "column", 
    alignItems: "center", 
    gap: "16px",
    animation: "fadeUp 0.5s ease both"
  },
  emptyIcon: { 
    fontSize: "3.5rem", 
    opacity: 0.5
  },
  emptyTitle: { 
    fontFamily: "'Playfair Display', serif", 
    fontSize: "1.5rem", 
    fontWeight: 700, 
    color: "#f0e6d3"
  },
  emptyDesc: { 
    fontSize: "0.9rem", 
    color: "#8a7055", 
    marginBottom: "8px"
  },
  emptyBtn: { 
    padding: "12px 32px", 
    background: "#81b64c", 
    border: "none", 
    borderRadius: "4px", 
    color: "#0d1f05", 
    fontWeight: 700, 
    cursor: "pointer",
    fontFamily: "'DM Sans', sans-serif",
    fontSize: "0.9rem",
    transition: "all 0.2s ease",
    marginTop: "8px"
  },

  // DESKTOP TABLE
  tableContainer: { 
    display: "flex", 
    flexDirection: "column", 
    gap: "8px",
    animation: "fadeUp 0.55s ease both"
  },
  tableHeader: { 
    display: "grid", 
    gridTemplateColumns: "100px 1fr 100px 120px 120px 50px", 
    gap: "12px", 
    padding: "10px 16px", 
    fontSize: "0.7rem", 
    color: "#8a7055", 
    textTransform: "uppercase", 
    letterSpacing: "0.08em", 
    fontWeight: 600,
    marginBottom: "8px"
  },
  tableRow: { 
    display: "grid", 
    gridTemplateColumns: "100px 1fr 100px 120px 120px 50px", 
    gap: "12px", 
    padding: "14px 16px", 
    background: "rgba(44,26,14,0.85)", 
    border: "1px solid rgba(196,163,90,0.1)", 
    borderRadius: "6px", 
    alignItems: "center", 
    fontSize: "0.9rem",
    backdropFilter: "blur(8px)",
    cursor: "pointer",
    transition: "all 0.25s ease"
  },
  resultBadge: { 
    padding: "6px 12px", 
    borderRadius: "4px", 
    fontWeight: 700, 
    fontSize: "0.85rem"
  },
  opponent: { 
    color: "#f0e6d3", 
    fontWeight: 500,
    display: "flex",
    alignItems: "center",
    gap: "6px"
  },
  format: { 
    color: "#8a7055", 
    textTransform: "capitalize"
  },
  rating: { 
    display: "flex", 
    gap: "6px",
    alignItems: "center"
  },
  ratingAfter: { 
    color: "#8a7055", 
    fontSize: "0.82rem"
  },
  date: { 
    color: "#8a7055", 
    fontSize: "0.85rem"
  },
  analyzeBtn: { 
    background: "transparent", 
    border: "none", 
    color: "#c4a35a", 
    fontSize: "1.1rem", 
    cursor: "pointer",
    transition: "all 0.2s ease",
    padding: "4px 8px"
  },

  // MOBILE CARDS
  cardContainer: { 
    display: "flex", 
    flexDirection: "column", 
    gap: "12px"
  },
  gameCard: { 
    background: "rgba(44,26,14,0.85)", 
    border: "1px solid rgba(196,163,90,0.15)", 
    borderLeft: "3px solid #81b64c",
    borderRadius: "8px", 
    padding: "16px", 
    backdropFilter: "blur(8px)",
    cursor: "pointer",
    transition: "all 0.2s ease"
  },
  cardTop: { 
    display: "flex", 
    justifyContent: "space-between", 
    alignItems: "center",
    marginBottom: "12px"
  },
  cardResult: { 
    display: "flex", 
    alignItems: "center", 
    gap: "12px"
  },
  resultIcon: { 
    width: "40px", 
    height: "40px", 
    borderRadius: "6px", 
    display: "flex", 
    alignItems: "center", 
    justifyContent: "center", 
    fontWeight: 700,
    fontSize: "1.2rem"
  },
  cardResultLabel: { 
    fontFamily: "'Playfair Display', serif", 
    fontSize: "1rem", 
    fontWeight: 700
  },
  cardDate: { 
    fontSize: "0.75rem", 
    color: "#8a7055", 
    marginTop: "2px"
  },
  cardArrow: { 
    fontSize: "1.2rem", 
    color: "#c4a35a"
  },
  cardDivider: { 
    height: "1px", 
    background: "rgba(196,163,90,0.1)", 
    marginBottom: "12px"
  },
  cardDetails: { 
    display: "flex", 
    flexDirection: "column", 
    gap: "10px"
  },
  cardDetailRow: { 
    display: "flex", 
    justifyContent: "space-between", 
    alignItems: "center"
  },
  cardLabel: { 
    fontSize: "0.75rem", 
    color: "#8a7055", 
    textTransform: "uppercase",
    fontWeight: 600,
    letterSpacing: "0.08em"
  },
  cardValue: { 
    color: "#f0e6d3", 
    fontSize: "0.9rem",
    display: "flex",
    alignItems: "center",
    gap: "6px"
  },
  colorIcon: { 
    fontSize: "0.95rem"
  },
};

const GridStyles = () => (
  <style>{`
    @media (max-width: 768px) {
      [style*="gridTemplateColumns"] {
        grid-template-columns: 1fr !important;
      }
    }
  `}</style>
);