import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { connectSocket, disconnectSocket } from "../socket/socket";

const FORMATS = [
  { id: "bullet", label: "Bullet", time: "1+0", icon: "⚡" },
  { id: "blitz",  label: "Blitz",  time: "5+0", icon: "🔥" },
  { id: "rapid",  label: "Rapid",  time: "10+0", icon: "⏱" },
];

export default function Lobby() {
  const navigate  = useNavigate();
  const [selectedFormat, setSelectedFormat] = useState("rapid");
  const [searching, setSearching]           = useState(false);
  const [statusMsg, setStatusMsg]           = useState("");
  const user = JSON.parse(localStorage.getItem("user") || "{}");

  useEffect(() => {
    const socket = connectSocket();

    socket.on("waiting", ({ message }) => {
      setStatusMsg(message);
    });

    socket.on("gameStart", ({ gameId, color, format, opponent }) => {
      // Save game info for the game page
      localStorage.setItem("gameInfo", JSON.stringify({ gameId, color, format, opponent }));
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
    socket.emit("findMatch", { format: selectedFormat });
  };

  const handleCancel = () => {
    const socket = connectSocket();
    socket.emit("cancelSearch");
    setSearching(false);
    setStatusMsg("");
  };

  const getRating = (format) => {
    return user[`${format}_rating`] ?? 800;
  };

  return (
    <div style={styles.root}>
      <div style={styles.card}>
        {/* Header */}
        <div style={styles.header}>
          <span style={styles.icon}>♛</span>
          <h1 style={styles.title}>Play Chess</h1>
          <p style={styles.subtitle}>Welcome, {user.username ?? "Player"}</p>
        </div>

        {/* Format selector */}
        <div style={styles.formatGrid}>
          {FORMATS.map((f) => (
            <button
              key={f.id}
              onClick={() => !searching && setSelectedFormat(f.id)}
              style={{
                ...styles.formatBtn,
                ...(selectedFormat === f.id ? styles.formatBtnActive : {}),
              }}
              disabled={searching}
            >
              <span style={styles.formatIcon}>{f.icon}</span>
              <span style={styles.formatLabel}>{f.label}</span>
              <span style={styles.formatTime}>{f.time}</span>
              <span style={styles.formatRating}>Rating: {getRating(f.id)}</span>
            </button>
          ))}
        </div>

        {/* Action button */}
        {!searching ? (
          <button onClick={handleFindGame} style={styles.findBtn}>
            Find Game
          </button>
        ) : (
          <div style={styles.searchingBox}>
            <div style={styles.spinner}>♟</div>
            <p style={styles.searchingText}>{statusMsg}</p>
            <button onClick={handleCancel} style={styles.cancelBtn}>
              Cancel
            </button>
          </div>
        )}
      </div>

      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(24px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}

const styles = {
  root: {
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "#f5f0e8",
    fontFamily: "'DM Sans', sans-serif",
  },
  card: {
    background: "rgba(255,252,245,0.95)",
    border: "1px solid rgba(180,140,70,0.2)",
    borderRadius: "8px",
    padding: "48px 40px",
    width: "100%",
    maxWidth: "480px",
    boxShadow: "0 8px 40px rgba(120,80,20,0.12)",
    animation: "fadeUp 0.5s ease both",
  },
  header: {
    textAlign: "center",
    marginBottom: "36px",
  },
  icon: {
    fontSize: "2.6rem",
    display: "block",
    marginBottom: "12px",
  },
  title: {
    fontFamily: "'Playfair Display', serif",
    fontSize: "1.85rem",
    fontWeight: 700,
    color: "#2c1f08",
    marginBottom: "6px",
  },
  subtitle: {
    fontSize: "0.875rem",
    color: "#9a7f52",
  },
  formatGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(3, 1fr)",
    gap: "12px",
    marginBottom: "28px",
  },
  formatBtn: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "4px",
    padding: "16px 8px",
    background: "#fff",
    border: "2px solid #ddd0b8",
    borderRadius: "6px",
    cursor: "pointer",
    transition: "all 0.2s",
  },
  formatBtnActive: {
    border: "2px solid #a07840",
    background: "rgba(160,120,64,0.08)",
  },
  formatIcon: {
    fontSize: "1.5rem",
  },
  formatLabel: {
    fontSize: "0.95rem",
    fontWeight: 600,
    color: "#2c1f08",
  },
  formatTime: {
    fontSize: "0.8rem",
    color: "#9a7f52",
  },
  formatRating: {
    fontSize: "0.75rem",
    color: "#a07840",
    fontWeight: 500,
  },
  findBtn: {
    width: "100%",
    padding: "14px",
    background: "linear-gradient(135deg, #c9a96e 0%, #a07840 100%)",
    border: "none",
    borderRadius: "4px",
    color: "#1a0f00",
    fontSize: "1rem",
    fontWeight: 600,
    cursor: "pointer",
    letterSpacing: "0.04em",
  },
  searchingBox: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "12px",
  },
  spinner: {
    fontSize: "2rem",
    animation: "spin 1s linear infinite",
    display: "inline-block",
  },
  searchingText: {
    color: "#7a6340",
    fontSize: "0.95rem",
  },
  cancelBtn: {
    padding: "10px 32px",
    background: "transparent",
    border: "1px solid #ddd0b8",
    borderRadius: "4px",
    color: "#7a6340",
    fontSize: "0.9rem",
    cursor: "pointer",
  },
};