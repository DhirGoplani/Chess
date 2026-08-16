import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import FriendsModal from "../components/FriendsModal";
import ChallengeModal from "../components/ChallengeModal";
import ChallengeNotifier from "../components/ChallengeNotifier";
import { connectSocket } from "../socket/socket";

const SQUARES = Array.from({ length: 64 }, (_, i) => i);

const FORMATS = [
  {
    id: "bullet", label: "Bullet", icon: "⚡",
    desc: "Lightning fast chess", ratingKey: "bullet_rating",
    timeControls: [{ label: "1 min", ms: 60000 }],
    accent: "#e8a838",
  },
  {
    id: "blitz", label: "Blitz", icon: "🔥",
    desc: "Fast and furious", ratingKey: "blitz_rating",
    timeControls: [{ label: "3 min", ms: 180000 }, { label: "5 min", ms: 300000 }],
    accent: "#81b64c",
  },
  {
    id: "rapid", label: "Rapid", icon: "⏱",
    desc: "Think it through", ratingKey: "rapid_rating",
    timeControls: [{ label: "10 min", ms: 600000 }, { label: "15 min", ms: 900000 }, { label: "30 min", ms: 1800000 }],
    accent: "#6baed6",
  },
];

export default function Home() {
  const navigate = useNavigate();
  const [user, setUser]                 = useState({});
  const [selectedTime, setSelectedTime] = useState({ bullet: 60000, blitz: 180000, rapid: 600000 });
  const [hoveredCard, setHoveredCard]   = useState(null);
  const [hoveredCpu, setHoveredCpu]     = useState(false);
  const [menuOpen, setMenuOpen]         = useState(false);
  const [friendsOpen, setFriendsOpen]   = useState(false);
  const [challengingFriend, setChallengingFriend] = useState(null);

  useEffect(() => {
    const stored = localStorage.getItem("user");
    if (!stored) { navigate("/"); return; }
    setUser(JSON.parse(stored));
    connectSocket();
  }, [navigate]);

  const handlePlay = (format) => {
    localStorage.setItem("selectedFormat", format);
    localStorage.setItem("selectedTimeControl", selectedTime[format]);
    navigate("/lobby");
  };

  const handlePlayCpu = () => {
    navigate("/pvc");
  };

  const handleSendChallenge = ({ friendId, format, timeControl }) => {
    const socket = connectSocket();
    socket.emit("challengeFriend", { friendId, format, timeControl });
    setChallengingFriend(null);
  };

  return (
    <div style={s.root}>
      <GridStyles />
      <ChallengeNotifier />

      <FriendsModal
        isOpen={friendsOpen}
        onClose={() => setFriendsOpen(false)}
        onChallengeFriend={(friend) => setChallengingFriend(friend)}
      />

      <ChallengeModal
        friend={challengingFriend}
        onClose={() => setChallengingFriend(null)}
        onSendChallenge={handleSendChallenge}
      />

      <div style={s.boardBg}>
        {SQUARES.map((i) => {
          const row = Math.floor(i / 8), col = i % 8;
          return <div key={i} style={{ ...s.sq, background: (row + col) % 2 === 1 ? "#b58863" : "#f0d9b5" }} />;
        })}
      </div>
      <div style={s.vignette} />

      {/* NAVBAR */}
<nav style={s.nav}>
  <div style={s.navLogo}>
    <span style={s.logoIcon}>♞</span>
    <span style={s.logoText}>ChessMate</span>
  </div>
  <div style={s.navRight}>
    <button
      onClick={() => setFriendsOpen(true)}
      style={{ padding:"7px 16px", background:"rgba(196,163,90,0.12)", border:"1px solid rgba(196,163,90,0.3)", borderRadius:"4px", color:"#c4a35a", fontSize:"0.82rem", fontWeight:600, cursor:"pointer", display:"flex", alignItems:"center", gap:"6px" }}
    >
      <span>👥</span> Friends
    </button>
    <button
      onClick={() => navigate("/history")}
      style={{ padding:"7px 16px", background:"transparent", border:"1px solid rgba(196,163,90,0.25)", borderRadius:"4px", color:"#c4a882", fontSize:"0.82rem", cursor:"pointer" }}
    >
      History
    </button>
    <div style={s.navUserPill}>
      <span style={s.navUserIcon}>♟</span>
      <span style={s.navUsername}>{user.username}</span>
    </div>
    <button style={s.logoutBtn} onClick={() => { localStorage.clear(); navigate("/"); }}>
      Sign Out
    </button>
  </div>
  <button style={s.hamburger} onClick={() => setMenuOpen(v => !v)}>
    {menuOpen ? "✕" : "☰"}
  </button>
</nav>

      {menuOpen && (
        <div style={s.mobileMenu}>
          <div style={s.mobileUser}>♟ {user.username}</div>
          <button
            onClick={() => { setMenuOpen(false); setFriendsOpen(true); }}
            style={{ padding:"6px 14px", background:"rgba(196,163,90,0.15)", border:"1px solid #c4a35a", borderRadius:"4px", color:"#c4a35a", fontSize:"0.82rem", fontWeight:600, cursor:"pointer" }}
          >
            👥 Friends
          </button>
          <button style={s.mobileLogout} onClick={() => { localStorage.clear(); navigate("/"); }}>
            Sign Out
          </button>
        </div>
      )}

      <div style={s.content}>

        {/* HERO */}
        <div style={s.hero}>
          <p style={s.heroEyebrow}>Ready to play?</p>
          <h1 style={s.heroTitle}>
            Welcome back,{" "}
            <span style={s.heroName}>{user.name ?? user.username}</span>
          </h1>
          <p style={s.heroSub}>Choose your format and find an opponent</p>
        </div>

        {/* STATS BAR */}
        <div style={s.statsBar}>
          {[
            { icon: "⚡", label: "Bullet",       val: user.bullet_rating ?? 800, color: "#e8a838" },
            { icon: "🔥", label: "Blitz",        val: user.blitz_rating  ?? 800, color: "#81b64c" },
            { icon: "⏱", label: "Rapid",        val: user.rapid_rating  ?? 800, color: "#6baed6" },
            { icon: "📅", label: "Member Since", val: user.created_at
                ? new Date(user.created_at).toLocaleDateString("en-IN", { month: "short", year: "numeric" })
                : "—", color: "#c4a35a" },
          ].map((st) => (
            <div key={st.label} style={s.statPill}>
              <span style={s.statPillIcon}>{st.icon}</span>
              <div style={s.statPillText}>
                <span style={{ ...s.statPillVal, color: st.color }}>{st.val}</span>
                <span style={s.statPillLabel}>{st.label}</span>
              </div>
            </div>
          ))}
        </div>

        {/* PVP SECTION */}
        <div style={s.sectionLabel}>
          <div style={s.sectionLine} />
          <span style={s.sectionText}>Player vs Player</span>
          <div style={s.sectionLine} />
        </div>

        {/* FORMAT CARDS */}
        <div style={s.formatGrid} className="fgrid">
          {FORMATS.map((f) => {
            const isHovered = hoveredCard === f.id;
            return (
              <div
                key={f.id}
                style={{
                  ...s.formatCard,
                  border: isHovered ? `1px solid ${f.accent}55` : "1px solid rgba(196,163,90,0.15)",
                  boxShadow: isHovered ? `0 0 0 1px ${f.accent}22, 0 24px 60px rgba(0,0,0,0.5)` : "0 8px 32px rgba(0,0,0,0.3)",
                  transform: isHovered ? "translateY(-4px)" : "translateY(0)",
                  transition: "all 0.25s ease",
                }}
                onMouseEnter={() => setHoveredCard(f.id)}
                onMouseLeave={() => setHoveredCard(null)}
              >
                <div style={s.cardHeader}>
                  <div style={{ ...s.cardIconWrap, background: `${f.accent}18`, border: `1px solid ${f.accent}30` }}>
                    <span style={s.cardIcon}>{f.icon}</span>
                  </div>
                  <div style={s.cardHeaderText}>
                    <div style={{ ...s.cardLabel, color: f.accent }}>{f.label}</div>
                    <div style={s.cardDesc}>{f.desc}</div>
                  </div>
                </div>

                <div style={{ ...s.cardDivider, background: `${f.accent}20` }} />

                <div style={s.ratingBlock}>
                  <span style={s.ratingLabel}>Your Rating</span>
                  <span style={{ ...s.ratingValue, color: f.accent }}>{user[f.ratingKey] ?? 800}</span>
                </div>

                <div style={s.timeRow}>
                  {f.timeControls.map((tc) => (
                    <button
                      key={tc.ms}
                      onClick={() => setSelectedTime(prev => ({ ...prev, [f.id]: tc.ms }))}
                      style={{
                        ...s.timeBtn,
                        ...(selectedTime[f.id] === tc.ms
                          ? { borderColor: f.accent, color: f.accent, background: `${f.accent}18` }
                          : {}),
                      }}
                    >
                      {tc.label}
                    </button>
                  ))}
                </div>

                <button
                  onClick={() => handlePlay(f.id)}
                  style={{
                    ...s.playBtn,
                    background: isHovered ? f.accent : "transparent",
                    color: isHovered ? "#0d1f05" : f.accent,
                    border: `1px solid ${f.accent}`,
                  }}
                >
                  Play {f.label} →
                </button>
              </div>
            );
          })}
        </div>

        {/* PVC SECTION */}
        <div style={{ ...s.sectionLabel, marginTop: "48px" }}>
          <div style={s.sectionLine} />
          <span style={s.sectionText}>Player vs Computer</span>
          <div style={s.sectionLine} />
        </div>

        {/* SINGLE CPU CARD */}
        <div style={s.cpuCardWrap}>
          <div
            className="cpu-card-responsive"
            style={{
              ...s.cpuCard,
              border: hoveredCpu ? "1px solid #c4a35a55" : "1px solid rgba(196,163,90,0.15)",
              boxShadow: hoveredCpu ? "0 0 0 1px #c4a35a22, 0 24px 60px rgba(0,0,0,0.5)" : "0 8px 32px rgba(0,0,0,0.3)",
              transform: hoveredCpu ? "translateY(-4px)" : "translateY(0)",
              transition: "all 0.25s ease",
            }}
            onMouseEnter={() => setHoveredCpu(true)}
            onMouseLeave={() => setHoveredCpu(false)}
          >
            <div style={s.cpuLeft}>
              <div style={s.cpuIconRow}>
                <span style={s.cpuDiffIcon}>🌱</span>
                <span style={s.cpuDiffIcon}>⚔️</span>
                <span style={s.cpuDiffIcon}>👑</span>
              </div>
              <div>
                <div style={s.cpuTitle}>Challenge the Engine</div>
                <div style={s.cpuSubtitle}>Choose your difficulty — from beginner to master</div>
              </div>
            </div>
            <button
              className="cpu-play-btn-responsive"
              onClick={handlePlayCpu}
              style={{
                ...s.cpuPlayBtn,
                background: hoveredCpu ? "#c4a35a" : "transparent",
                color: hoveredCpu ? "#0d1f05" : "#c4a35a",
              }}
            >
              Play vs Computer →
            </button>
          </div>
        </div>

      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600;700&family=DM+Sans:wght@300;400;500;600&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        @keyframes fadeUp { from { opacity:0; transform:translateY(24px); } to { opacity:1; transform:translateY(0); } }

        @media (max-width: 860px) {
          .format-grid-inner { grid-template-columns: 1fr 1fr !important; }
        }
        @media (max-width: 560px) {
          .format-grid-inner { grid-template-columns: 1fr !important; }
          .hero-title-el     { font-size: 1.8rem !important; }
          .stats-bar-el      { gap: 6px !important; }
          .stat-pill-el      { padding: 8px 10px !important; }
          .cpu-card-inner    { flex-direction: column !important; align-items: flex-start !important; gap: 16px !important; }
          .cpu-play-btn-el   { width: 100% !important; }
        }
        @media (min-width: 601px) {
          .hamburger-el  { display: none !important; }
          .mobile-menu-el { display: none !important; }
        }
        @media (max-width: 600px) {
          .nav-right-el { display: none !important; }
          .hamburger-el { display: flex !important; }
        }
      `}</style>
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
  logoIcon: { fontSize: "1.5rem", color: "#81b64c", filter: "drop-shadow(0 0 8px rgba(129,182,76,0.5))" },
  logoText: { fontFamily: "'Playfair Display', serif", fontSize: "1.25rem", fontWeight: 700, color: "#f0e6d3" },
  navRight: { display: "flex", alignItems: "center", gap: "12px", className: "nav-right-el" },
  navUserPill: { display: "flex", alignItems: "center", gap: "7px", background: "rgba(196,163,90,0.1)", border: "1px solid rgba(196,163,90,0.2)", borderRadius: "20px", padding: "6px 14px" },
  navUserIcon: { fontSize: "0.9rem", color: "#c4a35a" },
  navUsername: { fontSize: "0.85rem", color: "#c4a882", fontWeight: 500 },
  logoutBtn: { padding: "7px 16px", background: "transparent", border: "1px solid rgba(196,163,90,0.25)", borderRadius: "4px", color: "#8a7055", fontSize: "0.82rem", cursor: "pointer" },
  hamburger: { display: "none", background: "transparent", border: "none", color: "#c4a882", fontSize: "1.4rem", cursor: "pointer", padding: "4px" },
  mobileMenu: { position: "relative", zIndex: 19, background: "rgba(44,26,14,0.98)", borderBottom: "1px solid rgba(196,163,90,0.15)", padding: "16px 24px", display: "flex", justifyContent: "space-between", alignItems: "center" },
  mobileUser: { fontSize: "0.9rem", color: "#c4a882" },
  mobileLogout: { padding: "6px 14px", background: "transparent", border: "1px solid rgba(196,163,90,0.25)", borderRadius: "4px", color: "#8a7055", fontSize: "0.82rem", cursor: "pointer" },

  content: { position: "relative", zIndex: 10, maxWidth: "1000px", margin: "0 auto", padding: "0 16px 80px" },

  hero: { textAlign: "center", padding: "48px 0 36px", animation: "fadeUp 0.5s ease both" },
  heroEyebrow: { fontSize: "0.72rem", fontWeight: 600, letterSpacing: "0.2em", textTransform: "uppercase", color: "#81b64c", marginBottom: "14px" },
  heroTitle: { fontFamily: "'Playfair Display', serif", fontSize: "2.6rem", fontWeight: 700, color: "#f0e6d3", lineHeight: 1.2, marginBottom: "14px" },
  heroName: { color: "#c4a35a" },
  heroSub: { fontSize: "0.95rem", color: "#8a7055", fontWeight: 300 },

  statsBar: { display: "flex", justifyContent: "center", gap: "8px", marginBottom: "40px", flexWrap: "wrap", animation: "fadeUp 0.55s ease both" },
  statPill: { display: "flex", alignItems: "center", gap: "10px", background: "rgba(44,26,14,0.8)", border: "1px solid rgba(196,163,90,0.15)", borderRadius: "40px", padding: "10px 16px", backdropFilter: "blur(8px)" },
  statPillIcon: { fontSize: "1rem" },
  statPillText: { display: "flex", flexDirection: "column", gap: "1px" },
  statPillVal: { fontSize: "1rem", fontWeight: 700, fontFamily: "'Playfair Display', serif", lineHeight: 1 },
  statPillLabel: { fontSize: "0.62rem", color: "#8a7055", textTransform: "uppercase", letterSpacing: "0.08em" },

  sectionLabel: { display: "flex", alignItems: "center", gap: "16px", marginBottom: "20px" },
  sectionLine: { flex: 1, height: "1px", background: "rgba(196,163,90,0.12)" },
  sectionText: { fontSize: "0.7rem", fontWeight: 600, color: "#8a7055", textTransform: "uppercase", letterSpacing: "0.16em", whiteSpace: "nowrap" },

  formatGrid: { animation: "fadeUp 0.65s ease both" },
  // Inner grid wrapper uses className in JSX
  formatCard: { background: "rgba(44,26,14,0.85)", borderRadius: "8px", padding: "20px 18px", display: "flex", flexDirection: "column", gap: "12px", backdropFilter: "blur(12px)", cursor: "default" },
  cardHeader: { display: "flex", alignItems: "center", gap: "12px" },
  cardHeaderText: { minWidth: 0 },
  cardIconWrap: { width: "40px", height: "40px", borderRadius: "10px", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 },
  cardIcon: { fontSize: "1.2rem" },
  cardLabel: { fontFamily: "'Playfair Display', serif", fontSize: "1.1rem", fontWeight: 700, lineHeight: 1 },
  cardDesc: { fontSize: "0.74rem", color: "#8a7055", fontWeight: 300, marginTop: "3px" },
  cardDivider: { height: "1px", borderRadius: "1px" },
  ratingBlock: { display: "flex", justifyContent: "space-between", alignItems: "center", background: "rgba(0,0,0,0.2)", borderRadius: "6px", padding: "9px 12px" },
  ratingLabel: { fontSize: "0.68rem", color: "#8a7055", fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.08em" },
  ratingValue: { fontSize: "1.35rem", fontWeight: 700, fontFamily: "'Playfair Display', serif", lineHeight: 1 },
  timeRow: { display: "flex", gap: "6px", flexWrap: "wrap" },
  timeBtn: { flex: 1, minWidth: "52px", padding: "7px 4px", background: "rgba(0,0,0,0.2)", border: "1px solid rgba(196,163,90,0.15)", borderRadius: "4px", fontSize: "0.76rem", color: "#8a7055", cursor: "pointer", fontWeight: 500, transition: "all 0.15s", fontFamily: "'DM Sans', sans-serif" },
  playBtn: { width: "100%", padding: "10px", borderRadius: "4px", fontSize: "0.88rem", fontWeight: 700, cursor: "pointer", letterSpacing: "0.04em", transition: "all 0.25s ease", fontFamily: "'DM Sans', sans-serif", marginTop: "2px" },

  // Single CPU card
  cpuCardWrap: { animation: "fadeUp 0.7s ease both" },
  cpuCard: {
    background: "rgba(44,26,14,0.85)",
    borderRadius: "8px",
    padding: "24px 28px",
    display: "flex",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "24px",
    backdropFilter: "blur(12px)",
    cursor: "default",
  },
  cpuLeft: { display: "flex", alignItems: "center", gap: "20px", flexWrap: "wrap" },
  cpuIconRow: { display: "flex", gap: "6px", fontSize: "1.6rem" },
  cpuDiffIcon: { fontSize: "1.5rem" },
  cpuTitle: { fontFamily: "'Playfair Display', serif", fontSize: "1.2rem", fontWeight: 700, color: "#f0e6d3", lineHeight: 1, marginBottom: "5px" },
  cpuSubtitle: { fontSize: "0.8rem", color: "#8a7055", fontWeight: 300 },
  cpuPlayBtn: {
    flexShrink: 0,
    padding: "12px 28px",
    borderRadius: "4px",
    border: "1px solid #c4a35a",
    fontSize: "0.9rem",
    fontWeight: 700,
    cursor: "pointer",
    letterSpacing: "0.04em",
    transition: "all 0.25s ease",
    fontFamily: "'DM Sans', sans-serif",
    whiteSpace: "nowrap",
  },
};

// Inject grid styles as a separate component to avoid inline style limitations
const GridStyles = () => (
  <style>{`
    .fgrid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 16px;
    }
    @media (max-width: 860px) {
      .fgrid { grid-template-columns: repeat(2, 1fr); }
    }
    @media (max-width: 520px) {
      .fgrid { grid-template-columns: 1fr; }
    }
    @media (max-width: 560px) {
      .cpu-card-responsive {
        flex-direction: column !important;
        align-items: flex-start !important;
      }
      .cpu-play-btn-responsive {
        width: 100% !important;
      }
    }
  `}</style>
);