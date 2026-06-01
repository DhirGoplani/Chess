import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { connectSocket } from "../socket/socket";

const FORMAT_LABELS = { bullet: "⚡ Bullet", blitz: "🔥 Blitz", rapid: "⏱ Rapid" };

export default function Lobby() {
  const navigate                          = useNavigate();
  const [searching, setSearching]         = useState(false);
  const [statusMsg, setStatusMsg]         = useState("");
  const user                              = JSON.parse(localStorage.getItem("user")               || "{}");
  const selectedFormat                    = localStorage.getItem("selectedFormat")                || "rapid";
  const selectedTimeControl               = parseInt(localStorage.getItem("selectedTimeControl")) || 600000;

  const formatLabel    = FORMAT_LABELS[selectedFormat] ?? selectedFormat;
  const timeLabel      = `${Math.round(selectedTimeControl / 60000)} min`;

  useEffect(() => {
    const socket = connectSocket();

    socket.on("waiting", ({ message }) => setStatusMsg(message));

    socket.on("gameStart", ({ gameId, color, format, timeControl, opponent }) => {
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
    setStatusMsg("Searching for opponent...");
    socket.emit("findMatch", { format: selectedFormat, timeControl: selectedTimeControl });
  };

  const handleCancel = () => {
    const socket = connectSocket();
    socket.emit("cancelSearch");
    setSearching(false);
    setStatusMsg("");
  };

  return (
    <div style={styles.root}>
      <div style={styles.card}>
        <div style={styles.header}>
          <span style={styles.icon}>♛</span>
          <h1 style={styles.title}>Find a Game</h1>
          <p style={styles.subtitle}>Welcome, {user.username ?? "Player"}</p>
        </div>

        {/* Selected format info */}
        <div style={styles.selectedInfo}>
          <div style={styles.selectedRow}>
            <span style={styles.selectedLabel}>Format</span>
            <span style={styles.selectedVal}>{formatLabel}</span>
          </div>
          <div style={styles.selectedRow}>
            <span style={styles.selectedLabel}>Time Control</span>
            <span style={styles.selectedVal}>{timeLabel}</span>
          </div>
          <div style={styles.selectedRow}>
            <span style={styles.selectedLabel}>Your Rating</span>
            <span style={styles.selectedVal}>{user[`${selectedFormat}_rating`] ?? 800}</span>
          </div>
        </div>

        {!searching ? (
          <div style={styles.btnGroup}>
            <button onClick={handleFindGame} style={styles.findBtn}>
              Find Game
            </button>
            <button onClick={() => navigate("/home")} style={styles.backBtn}>
              Change Format
            </button>
          </div>
        ) : (
          <div style={styles.searchingBox}>
            <div style={styles.spinner}>♟</div>
            <p style={styles.searchingText}>{statusMsg}</p>
            <button onClick={handleCancel} style={styles.cancelBtn}>Cancel</button>
          </div>
        )}
      </div>

      <style>{`
        @keyframes spin    { to { transform: rotate(360deg); } }
        @keyframes fadeUp  { from { opacity:0; transform:translateY(24px); } to { opacity:1; transform:translateY(0); } }
      `}</style>
    </div>
  );
}

const styles = {
  root:         { minHeight:"100vh", display:"flex", alignItems:"center", justifyContent:"center", background:"#f5f0e8", fontFamily:"'DM Sans', sans-serif" },
  card:         { background:"rgba(255,252,245,0.95)", border:"1px solid rgba(180,140,70,0.2)", borderRadius:"8px", padding:"48px 40px", width:"100%", maxWidth:"420px", boxShadow:"0 8px 40px rgba(120,80,20,0.12)", animation:"fadeUp 0.5s ease both" },
  header:       { textAlign:"center", marginBottom:"32px" },
  icon:         { fontSize:"2.6rem", display:"block", marginBottom:"12px" },
  title:        { fontFamily:"'Playfair Display', serif", fontSize:"1.85rem", fontWeight:700, color:"#2c1f08", marginBottom:"6px" },
  subtitle:     { fontSize:"0.875rem", color:"#9a7f52" },
  selectedInfo: { background:"rgba(160,120,64,0.06)", borderRadius:"6px", padding:"16px 20px", marginBottom:"24px", display:"flex", flexDirection:"column", gap:"10px" },
  selectedRow:  { display:"flex", justifyContent:"space-between", alignItems:"center" },
  selectedLabel:{ fontSize:"0.78rem", color:"#7a6340", textTransform:"uppercase", letterSpacing:"0.06em", fontWeight:500 },
  selectedVal:  { fontSize:"0.95rem", fontWeight:700, color:"#2c1f08" },
  btnGroup:     { display:"flex", flexDirection:"column", gap:"10px" },
  findBtn:      { width:"100%", padding:"14px", background:"linear-gradient(135deg, #c9a96e 0%, #a07840 100%)", border:"none", borderRadius:"4px", color:"#1a0f00", fontSize:"1rem", fontWeight:600, cursor:"pointer", letterSpacing:"0.04em" },
  backBtn:      { width:"100%", padding:"12px", background:"transparent", border:"1px solid rgba(180,140,70,0.4)", borderRadius:"4px", color:"#7a6340", fontSize:"0.9rem", cursor:"pointer" },
  searchingBox: { display:"flex", flexDirection:"column", alignItems:"center", gap:"12px" },
  spinner:      { fontSize:"2rem", animation:"spin 1s linear infinite", display:"inline-block" },
  searchingText:{ color:"#7a6340", fontSize:"0.95rem" },
  cancelBtn:    { padding:"10px 32px", background:"transparent", border:"1px solid #ddd0b8", borderRadius:"4px", color:"#7a6340", fontSize:"0.9rem", cursor:"pointer" },
};