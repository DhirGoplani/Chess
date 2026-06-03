import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { connectSocket } from "../socket/socket";

const FORMAT_LABELS = { bullet: "⚡ Bullet", blitz: "🔥 Blitz", rapid: "⏱ Rapid" };
const FORMAT_ACCENTS = { bullet: "#e8a838", blitz: "#81b64c", rapid: "#6baed6" };
const SQUARES = Array.from({ length: 64 }, (_, i) => i);

export default function Lobby() {
  const navigate                      = useNavigate();
  const [searching, setSearching]     = useState(false);
  const [statusMsg, setStatusMsg]     = useState("");
  const user                          = JSON.parse(localStorage.getItem("user")               || "{}");
  const selectedFormat                = localStorage.getItem("selectedFormat")                || "rapid";
  const selectedTimeControl           = parseInt(localStorage.getItem("selectedTimeControl")) || 600000;

  const formatLabel = FORMAT_LABELS[selectedFormat] ?? selectedFormat;
  const timeLabel   = `${Math.round(selectedTimeControl / 60000)} min`;
  const accent      = FORMAT_ACCENTS[selectedFormat] ?? "#c4a35a";

  useEffect(() => {
    const socket = connectSocket();
    socket.on("waiting",      ({ message }) => setStatusMsg(message));
    socket.on("gameStart",    ({ gameId, color, format, timeControl, opponent }) => {
      localStorage.setItem("gameInfo", JSON.stringify({ gameId, color, format, timeControl, opponent }));
      navigate(`/game/${gameId}`);
    });
    socket.on("connect_error", (err) => {
      setStatusMsg("Connection failed: " + err.message);
      setSearching(false);
    });
    return () => {
      socket.off("waiting");
      socket.off("gameStart");
      socket.off("connect_error");
    };
  }, [navigate]);

  const handleFindGame = () => {
    const socket = connectSocket();
    setSearching(true);
    setStatusMsg("Searching for opponent…");
    socket.emit("findMatch", { format: selectedFormat, timeControl: selectedTimeControl });
  };

  const handleCancel = () => {
    const socket = connectSocket();
    socket.emit("cancelSearch");
    setSearching(false);
    setStatusMsg("");
  };

  return (
    <div style={s.root}>
      {/* Chess board background */}
      <div style={s.boardBg}>
        {SQUARES.map((i) => {
          const row = Math.floor(i / 8), col = i % 8;
          return <div key={i} style={{ ...s.sq, background: (row + col) % 2 === 1 ? "#b58863" : "#f0d9b5" }} />;
        })}
      </div>
      <div style={s.vignette} />

      {/* Card */}
      <div style={s.card}>
        {/* Header */}
        <div style={s.header}>
          <div style={{ ...s.iconWrap, background: `${accent}18`, border: `1px solid ${accent}30` }}>
            <span style={s.icon}>♛</span>
          </div>
          <h1 style={s.title}>Find a Game</h1>
          <p style={s.subtitle}>Welcome, <span style={{ color: accent }}>{user.username ?? "Player"}</span></p>
        </div>

        {/* Divider */}
        <div style={{ ...s.divider, background: `${accent}20` }} />

        {/* Selected format info */}
        <div style={s.infoBox}>
          {[
            { label: "Format",       val: formatLabel },
            { label: "Time Control", val: timeLabel },
            { label: "Your Rating",  val: user[`${selectedFormat}_rating`] ?? 800 },
          ].map(({ label, val }) => (
            <div key={label} style={s.infoRow}>
              <span style={s.infoLabel}>{label}</span>
              <span style={{ ...s.infoVal, color: accent }}>{val}</span>
            </div>
          ))}
        </div>

        {/* Actions */}
        {!searching ? (
          <div style={s.btnGroup}>
            <button
              onClick={handleFindGame}
              style={{ ...s.findBtn, background: accent, boxShadow: `0 4px 24px ${accent}40` }}
            >
              Find Game
            </button>
            <button onClick={() => navigate("/home")} style={s.backBtn}>
              ← Change Format
            </button>
          </div>
        ) : (
          <div style={s.searchingBox}>
            <div style={{ ...s.spinnerWrap, borderColor: `${accent}40`, borderTopColor: accent }}>
              <span style={s.spinnerIcon}>♟</span>
            </div>
            <p style={s.searchingText}>{statusMsg}</p>
            <button onClick={handleCancel} style={{ ...s.cancelBtn, borderColor: `${accent}40`, color: accent }}>
              Cancel Search
            </button>
          </div>
        )}
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600;700&family=DM+Sans:wght@300;400;500;600&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        @keyframes fadeUp  { from { opacity:0; transform:translateY(24px); } to { opacity:1; transform:translateY(0); } }
        @keyframes spin    { to { transform: rotate(360deg); } }
        @keyframes pulse   { 0%,100% { opacity:1; } 50% { opacity:0.5; } }

        @media (max-width: 480px) {
          .lobby-card { padding: 32px 20px !important; margin: 16px !important; }
        }
      `}</style>
    </div>
  );
}

const s = {
  root:    { minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#1a0e07", position: "relative", overflow: "hidden", fontFamily: "'DM Sans', sans-serif", padding: "20px" },
  boardBg: { position: "fixed", inset: 0, display: "grid", gridTemplateColumns: "repeat(8,1fr)", gridTemplateRows: "repeat(8,1fr)", opacity: 0.06, transform: "rotate(12deg) scale(1.5)", pointerEvents: "none" },
  sq:      { width: "100%", height: "100%" },
  vignette:{ position: "fixed", inset: 0, background: "radial-gradient(ellipse at center, transparent 20%, #1a0e07 80%)", pointerEvents: "none" },

  card: {
    position: "relative", zIndex: 10,
    background: "rgba(44,26,14,0.9)",
    border: "1px solid rgba(196,163,90,0.2)",
    borderRadius: "10px",
    padding: "40px 36px",
    width: "100%", maxWidth: "420px",
    boxShadow: "0 24px 80px rgba(0,0,0,0.6)",
    backdropFilter: "blur(16px)",
    animation: "fadeUp 0.5s ease both",
  },

  header:   { textAlign: "center", marginBottom: "24px" },
  iconWrap: { width: "56px", height: "56px", borderRadius: "14px", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" },
  icon:     { fontSize: "1.8rem" },
  title:    { fontFamily: "'Playfair Display', serif", fontSize: "1.8rem", fontWeight: 700, color: "#f0e6d3", marginBottom: "6px", lineHeight: 1.2 },
  subtitle: { fontSize: "0.875rem", color: "#8a7055", fontWeight: 300 },

  divider: { height: "1px", borderRadius: "1px", marginBottom: "24px" },

  infoBox: { background: "rgba(0,0,0,0.25)", borderRadius: "8px", padding: "16px 20px", marginBottom: "28px", display: "flex", flexDirection: "column", gap: "12px", border: "1px solid rgba(196,163,90,0.08)" },
  infoRow:  { display: "flex", justifyContent: "space-between", alignItems: "center" },
  infoLabel:{ fontSize: "0.72rem", color: "#8a7055", textTransform: "uppercase", letterSpacing: "0.1em", fontWeight: 500 },
  infoVal:  { fontSize: "1rem", fontWeight: 700, fontFamily: "'Playfair Display', serif" },

  btnGroup: { display: "flex", flexDirection: "column", gap: "10px" },
  findBtn:  { width: "100%", padding: "14px", border: "none", borderRadius: "5px", color: "#0d1f05", fontSize: "1rem", fontWeight: 700, cursor: "pointer", letterSpacing: "0.05em", fontFamily: "'DM Sans', sans-serif", transition: "opacity 0.2s" },
  backBtn:  { width: "100%", padding: "12px", background: "transparent", border: "1px solid rgba(196,163,90,0.2)", borderRadius: "5px", color: "#8a7055", fontSize: "0.88rem", cursor: "pointer", fontFamily: "'DM Sans', sans-serif", transition: "all 0.2s" },

  searchingBox:  { display: "flex", flexDirection: "column", alignItems: "center", gap: "16px", padding: "8px 0" },
  spinnerWrap:   { width: "52px", height: "52px", borderRadius: "50%", border: "2px solid", display: "flex", alignItems: "center", justifyContent: "center", animation: "spin 1.2s linear infinite" },
  spinnerIcon:   { fontSize: "1.4rem", animation: "pulse 1.2s ease infinite" },
  searchingText: { color: "#8a7055", fontSize: "0.9rem", animation: "pulse 2s ease infinite" },
  cancelBtn:     { padding: "10px 32px", background: "transparent", border: "1px solid", borderRadius: "4px", fontSize: "0.88rem", cursor: "pointer", fontFamily: "'DM Sans', sans-serif", transition: "all 0.2s" },
};