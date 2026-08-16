import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { connectSocket } from "../socket/socket";

export default function ChallengeNotifier() {
  const navigate = useNavigate();
  const [incomingChallenge, setIncomingChallenge] = useState(null);
  const [outgoingChallenge, setOutgoingChallenge] = useState(null);
  const [toastMsg, setToastMsg] = useState("");

  useEffect(() => {
    const socket = connectSocket();

    // ── Incoming challenge from a friend
    const handleChallengeReceived = ({ challengeId, from, format, timeControl }) => {
      setIncomingChallenge({ challengeId, from, format, timeControl });
    };

    // ── Challenge sent waiting confirmation
    const handleChallengeSent = ({ challengeId, targetId }) => {
      setOutgoingChallenge({ challengeId, targetId });
    };

    // ── Challenge declined by opponent
    const handleChallengeDeclined = ({ by }) => {
      setOutgoingChallenge(null);
      showToast(`${by} declined your challenge.`);
    };

    // ── Challenge cancelled by sender
    const handleChallengeCancelled = ({ challengeId }) => {
      if (incomingChallenge?.challengeId === challengeId) {
        setIncomingChallenge(null);
        showToast("The challenge was cancelled by opponent.");
      }
    };

    // ── Challenge expired (30s TTL)
    const handleChallengeExpired = ({ challengeId }) => {
      if (incomingChallenge?.challengeId === challengeId) {
        setIncomingChallenge(null);
        showToast("Challenge expired.");
      }
      if (outgoingChallenge?.challengeId === challengeId) {
        setOutgoingChallenge(null);
        showToast("Challenge timed out. Opponent did not respond.");
      }
    };

    // ── Challenge failed
    const handleChallengeFailed = ({ message }) => {
      setOutgoingChallenge(null);
      showToast(message || "Failed to challenge player.");
    };

    // ── Game Start from accepted challenge
    const handleGameStart = ({ gameId, color, format, timeControl, opponent }) => {
      setIncomingChallenge(null);
      setOutgoingChallenge(null);
      localStorage.setItem("gameInfo", JSON.stringify({ gameId, color, format, timeControl, opponent }));
      navigate(`/game/${gameId}`);
    };

    socket.on("challengeReceived", handleChallengeReceived);
    socket.on("challengeSent", handleChallengeSent);
    socket.on("challengeDeclined", handleChallengeDeclined);
    socket.on("challengeCancelled", handleChallengeCancelled);
    socket.on("challengeExpired", handleChallengeExpired);
    socket.on("challengeFailed", handleChallengeFailed);
    socket.on("gameStart", handleGameStart);

    return () => {
      socket.off("challengeReceived", handleChallengeReceived);
      socket.off("challengeSent", handleChallengeSent);
      socket.off("challengeDeclined", handleChallengeDeclined);
      socket.off("challengeCancelled", handleChallengeCancelled);
      socket.off("challengeExpired", handleChallengeExpired);
      socket.off("challengeFailed", handleChallengeFailed);
      socket.off("gameStart", handleGameStart);
    };
  }, [navigate, incomingChallenge, outgoingChallenge]);

  const showToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(""), 4000);
  };

  const handleRespond = (accept) => {
    if (!incomingChallenge) return;
    const socket = connectSocket();
    socket.emit("respondChallenge", {
      challengeId: incomingChallenge.challengeId,
      accept,
    });
    setIncomingChallenge(null);
  };

  const handleCancelOutgoing = () => {
    if (!outgoingChallenge) return;
    const socket = connectSocket();
    socket.emit("cancelChallenge", {
      challengeId: outgoingChallenge.challengeId,
    });
    setOutgoingChallenge(null);
  };

  return (
    <>
      {/* Toast Notification */}
      {toastMsg && (
        <div style={s.toast}>
          <span>🔔</span> {toastMsg}
        </div>
      )}

      {/* Incoming Challenge Modal */}
      {incomingChallenge && (
        <div style={s.overlay}>
          <div style={s.card}>
            <div style={s.header}>
              <span style={s.icon}>⚔️</span>
              <h3 style={s.title}>Game Challenge Received!</h3>
            </div>
            <p style={s.desc}>
              <strong style={{ color: "#c4a35a" }}>{incomingChallenge.from.username}</strong> has
              challenged you to a game:
            </p>
            <div style={s.infoBox}>
              <div style={s.infoRow}>
                <span>Format:</span>
                <strong style={{ color: "#81b64c", textTransform: "capitalize" }}>
                  {incomingChallenge.format}
                </strong>
              </div>
              <div style={s.infoRow}>
                <span>Time Control:</span>
                <strong style={{ color: "#6baed6" }}>
                  {Math.round(incomingChallenge.timeControl / 60000)} min
                </strong>
              </div>
            </div>
            <div style={s.btnRow}>
              <button style={s.acceptBtn} onClick={() => handleRespond(true)}>
                Accept & Play ✓
              </button>
              <button style={s.declineBtn} onClick={() => handleRespond(false)}>
                Decline ✕
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Outgoing Challenge Modal */}
      {outgoingChallenge && (
        <div style={s.overlay}>
          <div style={s.card}>
            <div style={s.header}>
              <span style={s.spinner}>♟</span>
              <h3 style={s.title}>Challenge Sent</h3>
            </div>
            <p style={s.desc}>Waiting for opponent to respond...</p>
            <button style={s.cancelBtn} onClick={handleCancelOutgoing}>
              Cancel Challenge
            </button>
          </div>
        </div>
      )}
    </>
  );
}

const s = {
  toast: {
    position: "fixed",
    bottom: "24px",
    right: "24px",
    zIndex: 10000,
    background: "rgba(44, 26, 14, 0.95)",
    border: "1px solid #c4a35a",
    color: "#f0e6d3",
    padding: "14px 20px",
    borderRadius: "8px",
    boxShadow: "0 10px 30px rgba(0,0,0,0.6)",
    fontFamily: "'DM Sans', sans-serif",
    fontSize: "0.9rem",
    display: "flex",
    alignItems: "center",
    gap: "10px",
    animation: "fadeUp 0.3s ease both",
  },
  overlay: {
    position: "fixed",
    inset: 0,
    zIndex: 9999,
    background: "rgba(10, 5, 2, 0.8)",
    backdropFilter: "blur(8px)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "16px",
  },
  card: {
    width: "100%",
    maxWidth: "400px",
    background: "rgba(44, 26, 14, 0.95)",
    border: "1px solid rgba(196, 163, 90, 0.3)",
    borderRadius: "10px",
    padding: "28px",
    boxShadow: "0 24px 80px rgba(0, 0, 0, 0.85)",
    fontFamily: "'DM Sans', sans-serif",
    textAlign: "center",
  },
  header: { display: "flex", alignItems: "center", justifyContent: "center", gap: "10px", marginBottom: "14px" },
  icon: { fontSize: "1.8rem" },
  spinner: { fontSize: "1.8rem", display: "inline-block", animation: "spin 1.2s linear infinite" },
  title: {
    fontFamily: "'Playfair Display', serif",
    fontSize: "1.3rem",
    fontWeight: 700,
    color: "#f0e6d3",
  },
  desc: { fontSize: "0.9rem", color: "#8a7055", marginBottom: "16px" },
  infoBox: {
    background: "rgba(0,0,0,0.3)",
    borderRadius: "6px",
    padding: "12px 16px",
    marginBottom: "20px",
    display: "flex",
    flexDirection: "column",
    gap: "8px",
  },
  infoRow: { display: "flex", justifyContent: "space-between", fontSize: "0.88rem", color: "#8a7055" },
  btnRow: { display: "flex", gap: "12px" },
  acceptBtn: {
    flex: 1,
    padding: "12px",
    background: "#81b64c",
    border: "none",
    borderRadius: "6px",
    color: "#0d1f05",
    fontWeight: 700,
    fontSize: "0.9rem",
    cursor: "pointer",
  },
  declineBtn: {
    flex: 1,
    padding: "12px",
    background: "rgba(200, 60, 60, 0.2)",
    border: "1px solid rgba(200, 60, 60, 0.4)",
    borderRadius: "6px",
    color: "#f08080",
    fontWeight: 600,
    fontSize: "0.9rem",
    cursor: "pointer",
  },
  cancelBtn: {
    width: "100%",
    padding: "11px",
    background: "transparent",
    border: "1px solid rgba(196, 163, 90, 0.3)",
    borderRadius: "6px",
    color: "#c4a35a",
    fontWeight: 600,
    cursor: "pointer",
  },
};
