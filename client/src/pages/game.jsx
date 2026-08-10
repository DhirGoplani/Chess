import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Chess } from "chess.js";
import Board from "../components/board";
import { connectSocket } from "../socket/socket";

const formatTime = (ms) => {
  const total = Math.max(0, Math.floor(ms / 1000));
  const m     = Math.floor(total / 60);
  const s     = total % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
};

export default function Game() {
  const { gameId }                      = useParams();
  const navigate                        = useNavigate();
  const [chess]                         = useState(new Chess());
  const [timers, setTimers]             = useState({ white: 0, black: 0 });
  const [lastMove, setLastMove]         = useState(null);
  const [playerColour, setPlayerColour] = useState("white");
  const [, forceUpdate]                 = useState(0);
  const [gameStatus, setGameStatus]     = useState("playing");
  const [result, setResult]             = useState(null);
  const [moveHistory, setMoveHistory]   = useState([]);
  const [opponent, setOpponent]         = useState({});
  const [me, setMe]                     = useState({});
  // Draw offer state: null (none), "sent" (I offered, waiting), "received" (opponent offered)
  const [drawOffer, setDrawOffer]       = useState(null);
  const moveListRef                     = useRef(null);
  const preGameRatingRef                = useRef(null);

  const gameInfo = JSON.parse(localStorage.getItem("gameInfo") || "{}");
  const user     = JSON.parse(localStorage.getItem("user")     || "{}");

  useEffect(() => {
    const colour      = gameInfo.color       || "white";
    const timeControl = gameInfo.timeControl || 600000;
    const format      = gameInfo.format      || "rapid";

    setPlayerColour(colour);
    setOpponent(gameInfo.opponent || {});
    setTimers({ white: timeControl, black: timeControl });

    const token = localStorage.getItem("token");
    fetch(`${import.meta.env.VITE_API_URL}/api/users/me`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => { if (!r.ok) throw new Error(); return r.json(); })
      .then((data) => {
        const freshRating = data[`${format}_rating`] ?? 800;
        const stored = JSON.parse(localStorage.getItem("user") || "{}");
        stored[`${format}_rating`] = freshRating;
        localStorage.setItem("user", JSON.stringify(stored));
        preGameRatingRef.current = freshRating;
        setMe({ username: data.username, rating: freshRating });
      })
      .catch(() => {
        const fallbackRating = user[`${format}_rating`] ?? 800;
        preGameRatingRef.current = fallbackRating;
        setMe({ username: user.username, rating: fallbackRating });
      });

    const socket = connectSocket();

    socket.on("timerUpdate", ({ white, black }) => setTimers({ white, black }));

    socket.on("moveMade", ({ from, to, board, moveHistory: mh }) => {
      chess.load(board);
      setLastMove({ from, to });
      setMoveHistory(mh || []);
      setDrawOffer(null); // any move made voids a pending offer
      forceUpdate((n) => n + 1);
    });

    socket.on("gameOver", ({ status, winner }) => {
      setGameStatus("over");
      setResult({ winner, reason: status });
      setDrawOffer(null);
    });

    // Opponent has offered a draw — show accept/decline prompt
    socket.on("drawOffered", () => setDrawOffer("received"));

    // Server confirmed my offer went through — show "waiting" state
    socket.on("drawOfferSent", () => setDrawOffer("sent"));

    // Server refused to send my offer (already pending, or I must move first)
    socket.on("drawOfferRejected", () => setDrawOffer(null));

    // Opponent declined my offer (or I declined theirs) — reset for both
    socket.on("drawDeclined", () => setDrawOffer(null));

    socket.on("opponentLeft", () => {
      setGameStatus("over");
      setResult({ winner: colour, reason: "disconnect" });
    });

    socket.on("ratingUpdate", ({ newRating, format: fmt }) => {
      setMe((prev) => {
        const stored = JSON.parse(localStorage.getItem("user") || "{}");
        stored[`${fmt}_rating`] = newRating;
        localStorage.setItem("user", JSON.stringify(stored));
        return { ...prev, rating: newRating };
      });
      setResult((prev) =>
        prev ? { ...prev, newRating, oldRating: preGameRatingRef.current } : prev
      );
    });

    return () => {
      socket.off("timerUpdate");
      socket.off("moveMade");
      socket.off("gameOver");
      socket.off("opponentLeft");
      socket.off("ratingUpdate");
      socket.off("drawOffered");
      socket.off("drawOfferSent");
      socket.off("drawOfferRejected");
      socket.off("drawDeclined");
    };
  }, []);

  useEffect(() => {
    if (moveListRef.current)
      moveListRef.current.scrollTop = moveListRef.current.scrollHeight;
  }, [moveHistory]);

  const handleMove   = (from, to, promotion) => connectSocket().emit("makeMove", { gameId, from, to, promotion });
  const handleResign = () => {
    connectSocket().emit("resign", { gameId });
    setGameStatus("over");
    setResult({ winner: playerColour === "white" ? "black" : "white", reason: "resign" });
  };
  const handleBackToLobby = () => navigate("/home");

  const handleOfferDraw   = () => connectSocket().emit("offerDraw", { gameId });
  const handleAcceptDraw  = () => connectSocket().emit("respondDraw", { gameId, accept: true });
  const handleDeclineDraw = () => {
    connectSocket().emit("respondDraw", { gameId, accept: false });
    setDrawOffer(null);
  };

  const pairedMoves = [];
  for (let i = 0; i < moveHistory.length; i += 2)
    pairedMoves.push([moveHistory[i], moveHistory[i + 1] ?? ""]);

  const opponentColour = playerColour === "white" ? "black" : "white";
  const ratingDelta = result?.newRating != null && result?.oldRating != null
    ? result.newRating - result.oldRating : null;

  const myTurn = gameStatus === "playing" && chess.turn() === (playerColour === "white" ? "w" : "b");
  const opTurn = gameStatus === "playing" && chess.turn() === (opponentColour === "white" ? "w" : "b");

  return (
    <div style={s.root}>
      <GlobalStyles />

      {/* ── RESULT POPUP ── */}
      {result && (
        <div style={s.overlay}>
          <div style={s.popup} className="popup-el">
            <div style={{
              ...s.popupGlow,
              background: result.winner === playerColour
                ? "radial-gradient(circle, rgba(129,182,76,0.2) 0%, transparent 70%)"
                : result.winner === "draw"
                ? "radial-gradient(circle, rgba(196,163,90,0.2) 0%, transparent 70%)"
                : "radial-gradient(circle, rgba(200,60,60,0.15) 0%, transparent 70%)",
            }} />

            <div style={s.popupIcon}>
              {result.winner === playerColour ? "🏆" : result.winner === "draw" ? "🤝" : "💀"}
            </div>

            <h2 style={{
              ...s.popupTitle,
              color: result.winner === playerColour ? "#81b64c"
                : result.winner === "draw" ? "#c4a35a" : "#e05555",
            }}>
              {result.winner === "draw" ? "Draw!" : result.winner === playerColour ? "You Win!" : "You Lose!"}
            </h2>

            <p style={s.popupReason}>
              {result.reason === "checkmate"  && "By checkmate"}
              {result.reason === "resign"     && "By resignation"}
              {result.reason === "disconnect" && "Opponent disconnected"}
              {result.reason === "draw"       && "By agreement"}
              {result.reason === "stalemate"  && "By stalemate"}
              {result.reason === "timeout"    && "On time"}
            </p>

            {result.newRating != null && (
              <div style={s.ratingPill}>
                <span style={s.ratingPillLabel}>Rating</span>
                <span style={s.ratingPillValue}>{result.newRating}</span>
                {ratingDelta !== null && (
                  <span style={{ ...s.ratingDelta, color: ratingDelta >= 0 ? "#81b64c" : "#e05555" }}>
                    {ratingDelta >= 0 ? "▲" : "▼"} {Math.abs(ratingDelta)}
                  </span>
                )}
              </div>
            )}

            <button onClick={handleBackToLobby} style={s.popupBtn}>
              ← Back to Home
            </button>
          </div>
        </div>
      )}

      {/* ── MAIN LAYOUT ── */}
      <div style={s.layout} className="layout-el">

        {/* ── LEFT: BOARD + PLAYERS ── */}
        <div style={s.boardCol} className="board-col-el">

          {/* Opponent */}
          <div style={{ ...s.playerBar, ...(opTurn ? s.playerBarActive : {}) }}>
            <div style={{ ...s.colorDot, background: opponentColour === "white" ? "#f0e6d3" : "#2c1a0e", border: opponentColour === "white" ? "2px solid #8a7055" : "2px solid #c4a35a" }} />
            <div style={s.playerInfo}>
              <div style={s.playerName}>{opponent.username ?? "Opponent"}</div>
              <div style={s.playerRating}>{opponent.rating ?? 800}</div>
            </div>
            <div style={{ ...s.timerBox, ...(opTurn ? s.timerActive : {}) }}>
              {formatTime(timers[opponentColour])}
            </div>
          </div>

          {/* Board — capped at 520px, but always fluid down to the container's real width */}
          <div style={s.boardWrap}>
            <Board
              chess={chess}
              playerColour={playerColour}
              onMove={handleMove}
              lastMove={lastMove}
              engineThinking={gameStatus !== "playing"}
              size={520}
            />
          </div>

          {/* Me */}
          <div style={{ ...s.playerBar, ...(myTurn ? s.playerBarActive : {}) }}>
            <div style={{ ...s.colorDot, background: playerColour === "white" ? "#f0e6d3" : "#2c1a0e", border: playerColour === "white" ? "2px solid #8a7055" : "2px solid #c4a35a" }} />
            <div style={s.playerInfo}>
              <div style={s.playerName}>{me.username ?? user.username ?? "You"}</div>
              <div style={s.playerRating}>{me.rating ?? 800}</div>
            </div>
            <div style={{ ...s.timerBox, ...(myTurn ? s.timerActive : {}) }}>
              {formatTime(timers[playerColour])}
            </div>
          </div>
        </div>

        {/* ── RIGHT PANEL ── */}
        <div style={s.sideCol} className="side-col-el">

          {/* Game info header */}
          <div style={s.sideHeader}>
            <span style={s.sideHeaderIcon}>♟</span>
            <div>
              <div style={s.sideHeaderTitle}>
                {gameInfo.format?.charAt(0).toUpperCase() + gameInfo.format?.slice(1) ?? "Game"}
              </div>
              <div style={s.sideHeaderSub}>
                {Math.round((gameInfo.timeControl || 600000) / 60000)} min
              </div>
            </div>
            <div style={{
              ...s.turnIndicator,
              background: chess.turn() === "w" ? "#f0e6d3" : "#2c1a0e",
              border: chess.turn() === "w" ? "2px solid #8a7055" : "2px solid #c4a35a",
              boxShadow: gameStatus === "playing" ? "0 0 8px rgba(196,163,90,0.4)" : "none",
            }} />
          </div>

          {/* Move history */}
          <div style={s.sideCard} className="side-card-el">
            <div style={s.sideCardTitle}>
              <span>Move History</span>
              <span style={s.movesCount}>{moveHistory.length}</span>
            </div>
            <div style={s.moveList} className="move-list-el" ref={moveListRef}>
              {pairedMoves.length === 0 && (
                <p style={s.noMoves}>Waiting for first move…</p>
              )}
              {pairedMoves.map(([white, black], i) => (
                <div key={i} style={{ ...s.moveRow, background: i % 2 === 0 ? "rgba(0,0,0,0.15)" : "transparent" }}>
                  <span style={s.moveNum}>{i + 1}</span>
                  <span style={s.moveWhite}>{white}</span>
                  <span style={s.moveBlack}>{black}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Incoming draw offer */}
          {gameStatus === "playing" && drawOffer === "received" && (
            <div style={s.drawPrompt}>
              <span style={s.drawPromptText}>Opponent offers a draw</span>
              <div style={s.drawPromptBtns}>
                <button onClick={handleAcceptDraw} style={s.drawAcceptBtn}>Accept</button>
                <button onClick={handleDeclineDraw} style={s.drawDeclineBtn}>Decline</button>
              </div>
            </div>
          )}

          {/* Actions */}
          {gameStatus === "playing" && (
            <div style={s.actionRow}>
              <button
                onClick={handleOfferDraw}
                disabled={drawOffer === "sent" || drawOffer === "received"}
                style={{
                  ...s.drawBtn,
                  ...(drawOffer === "sent" ? s.drawBtnDisabled : {}),
                }}
              >
                {drawOffer === "sent" ? "Draw Offer Sent…" : "½ Offer Draw"}
              </button>
              <button onClick={handleResign} style={s.resignBtn}>
                ⚑ Resign
              </button>
            </div>
          )}
          {gameStatus === "over" && (
            <button onClick={handleBackToLobby} style={s.lobbyBtn}>
              ← Back to Home
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

const s = {
  root: {
    minHeight: "100vh",
    background: "#1a0e07",
    display: "flex", alignItems: "center", justifyContent: "center",
    fontFamily: "'DM Sans', sans-serif",
    padding: "24px",
    boxSizing: "border-box",
    overflowX: "hidden",
  },
  layout: { display: "flex", gap: "20px", alignItems: "flex-start", width: "100%", maxWidth: "800px", justifyContent: "center" },

  // BOARD COLUMN
  boardCol: { display: "flex", flexDirection: "column", gap: "8px", width: "100%", maxWidth: "520px", minWidth: 0 },
  boardWrap: { width: "100%" },

  playerBar: {
    display: "flex", alignItems: "center", gap: "12px",
    background: "rgba(44,26,14,0.9)",
    border: "1px solid rgba(196,163,90,0.12)",
    borderRadius: "6px", padding: "10px 14px",
    transition: "border-color 0.2s, box-shadow 0.2s",
  },
  playerBarActive: {
    borderColor: "rgba(196,163,90,0.35)",
    boxShadow: "0 0 0 1px rgba(196,163,90,0.1), 0 4px 20px rgba(0,0,0,0.3)",
  },
  colorDot: { width: "14px", height: "14px", borderRadius: "50%", flexShrink: 0 },
  playerInfo: { flex: 1, minWidth: 0 },
  playerName: { fontWeight: 600, color: "#f0e6d3", fontSize: "0.92rem", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" },
  playerRating: { fontSize: "0.72rem", color: "#8a7055", marginTop: "1px" },

  timerBox: {
    background: "rgba(0,0,0,0.3)",
    border: "1px solid rgba(196,163,90,0.15)",
    borderRadius: "4px", padding: "7px 14px",
    fontFamily: "'Playfair Display', serif",
    fontSize: "1.25rem", fontWeight: 700,
    color: "#c4a882", minWidth: "72px", textAlign: "center",
    transition: "all 0.2s", flexShrink: 0,
  },
  timerActive: {
    background: "rgba(196,163,90,0.12)",
    borderColor: "#c4a35a", color: "#c4a35a",
    boxShadow: "0 0 12px rgba(196,163,90,0.2)",
  },

  // SIDE COLUMN
  sideCol: { width: "210px", flexShrink: 0, display: "flex", flexDirection: "column", gap: "10px" },

  sideHeader: {
    display: "flex", alignItems: "center", gap: "10px",
    background: "rgba(44,26,14,0.9)",
    border: "1px solid rgba(196,163,90,0.12)",
    borderRadius: "6px", padding: "12px 14px",
  },
  sideHeaderIcon: { fontSize: "1.3rem", color: "#c4a35a" },
  sideHeaderTitle: {
    fontFamily: "'Playfair Display', serif",
    fontSize: "0.95rem", fontWeight: 700,
    color: "#f0e6d3", lineHeight: 1,
  },
  sideHeaderSub: { fontSize: "0.7rem", color: "#8a7055", marginTop: "2px" },
  turnIndicator: {
    width: "10px", height: "10px",
    borderRadius: "50%", marginLeft: "auto", flexShrink: 0,
    transition: "all 0.3s",
  },

  sideCard: {
    background: "rgba(44,26,14,0.9)",
    border: "1px solid rgba(196,163,90,0.12)",
    borderRadius: "6px", padding: "14px",
    display: "flex", flexDirection: "column", gap: "8px",
    flex: 1,
  },
  sideCardTitle: {
    display: "flex", justifyContent: "space-between", alignItems: "center",
    fontSize: "0.72rem", fontWeight: 600,
    color: "#8a7055", textTransform: "uppercase", letterSpacing: "0.1em",
  },
  movesCount: { color: "rgba(138,112,85,0.5)", fontWeight: 400 },

  moveList: {
    overflowY: "auto", maxHeight: "420px",
    display: "flex", flexDirection: "column", gap: "2px",
    scrollbarWidth: "thin",
    scrollbarColor: "rgba(196,163,90,0.2) transparent",
  },
  noMoves: { color: "#4a2c18", fontSize: "0.82rem", textAlign: "center", marginTop: "20px", fontStyle: "italic" },
  moveRow: {
    display: "grid", gridTemplateColumns: "20px 1fr 1fr",
    gap: "4px", fontSize: "0.83rem",
    padding: "4px 6px", borderRadius: "3px",
  },
  moveNum: { color: "#4a2c18", fontWeight: 600, fontSize: "0.7rem", paddingTop: "1px" },
  moveWhite: { color: "#c4a882", fontWeight: 500 },
  moveBlack: { color: "#8a7055" },

  actionRow: { display: "flex", flexDirection: "column", gap: "8px" },

  resignBtn: {
    width: "100%", padding: "11px",
    background: "transparent",
    border: "1px solid rgba(200,60,60,0.3)",
    borderRadius: "4px", color: "#c05050",
    fontSize: "0.88rem", cursor: "pointer",
    fontWeight: 500, fontFamily: "'DM Sans', sans-serif",
    transition: "all 0.2s",
  },
  drawBtn: {
    width: "100%", padding: "11px",
    background: "transparent",
    border: "1px solid rgba(196,163,90,0.3)",
    borderRadius: "4px", color: "#c4a35a",
    fontSize: "0.88rem", cursor: "pointer",
    fontWeight: 500, fontFamily: "'DM Sans', sans-serif",
    transition: "all 0.2s",
  },
  drawBtnDisabled: {
    opacity: 0.5, cursor: "default",
  },
  drawPrompt: {
    background: "rgba(196,163,90,0.1)",
    border: "1px solid rgba(196,163,90,0.3)",
    borderRadius: "6px", padding: "12px 14px",
    display: "flex", flexDirection: "column", gap: "8px",
  },
  drawPromptText: {
    color: "#f0e6d3", fontSize: "0.85rem", fontWeight: 500,
    textAlign: "center",
  },
  drawPromptBtns: { display: "flex", gap: "8px" },
  drawAcceptBtn: {
    flex: 1, padding: "9px",
    background: "rgba(129,182,76,0.15)",
    border: "1px solid rgba(129,182,76,0.4)",
    borderRadius: "4px", color: "#81b64c",
    fontSize: "0.82rem", fontWeight: 600, cursor: "pointer",
    fontFamily: "'DM Sans', sans-serif",
  },
  drawDeclineBtn: {
    flex: 1, padding: "9px",
    background: "rgba(200,60,60,0.1)",
    border: "1px solid rgba(200,60,60,0.3)",
    borderRadius: "4px", color: "#c05050",
    fontSize: "0.82rem", fontWeight: 600, cursor: "pointer",
    fontFamily: "'DM Sans', sans-serif",
  },
  lobbyBtn: {
    width: "100%", padding: "11px",
    background: "rgba(129,182,76,0.12)",
    border: "1px solid rgba(129,182,76,0.3)",
    borderRadius: "4px", color: "#81b64c",
    fontSize: "0.88rem", cursor: "pointer",
    fontWeight: 600, fontFamily: "'DM Sans', sans-serif",
    transition: "all 0.2s",
  },

  // POPUP
  overlay: {
    position: "fixed", inset: 0,
    background: "rgba(0,0,0,0.75)",
    backdropFilter: "blur(4px)",
    display: "flex", alignItems: "center", justifyContent: "center",
    zIndex: 100,
    animation: "fadeIn 0.2s ease both",
    padding: "16px",
    boxSizing: "border-box",
  },
  popup: {
    position: "relative",
    background: "#2c1a0e",
    border: "1px solid rgba(196,163,90,0.2)",
    borderRadius: "10px", padding: "44px 40px",
    textAlign: "center", minWidth: "300px", maxWidth: "100%",
    display: "flex", flexDirection: "column",
    alignItems: "center", gap: "14px",
    boxShadow: "0 0 0 1px rgba(196,163,90,0.08), 0 32px 80px rgba(0,0,0,0.7)",
    animation: "popIn 0.3s cubic-bezier(0.34,1.56,0.64,1) both",
    overflow: "hidden",
    boxSizing: "border-box",
  },
  popupGlow: { position: "absolute", inset: 0, pointerEvents: "none" },
  popupIcon: { fontSize: "3.2rem", lineHeight: 1, position: "relative" },
  popupTitle: {
    fontFamily: "'Playfair Display', serif",
    fontSize: "2rem", fontWeight: 700,
    margin: 0, position: "relative",
  },
  popupReason: { color: "#8a7055", fontSize: "0.88rem", margin: 0, position: "relative", letterSpacing: "0.03em" },

  ratingPill: {
    display: "flex", alignItems: "center", gap: "8px",
    background: "rgba(0,0,0,0.3)",
    border: "1px solid rgba(196,163,90,0.15)",
    borderRadius: "30px", padding: "8px 18px",
    position: "relative",
  },
  ratingPillLabel: { fontSize: "0.72rem", color: "#8a7055", textTransform: "uppercase", letterSpacing: "0.08em" },
  ratingPillValue: { fontFamily: "'Playfair Display', serif", fontSize: "1.2rem", fontWeight: 700, color: "#c4a35a" },
  ratingDelta: { fontSize: "0.85rem", fontWeight: 700 },

  popupBtn: {
    marginTop: "4px", padding: "12px 36px",
    background: "rgba(129,182,76,0.12)",
    border: "1px solid rgba(129,182,76,0.35)",
    borderRadius: "4px", color: "#81b64c",
    fontSize: "0.92rem", fontWeight: 600,
    cursor: "pointer", letterSpacing: "0.03em",
    fontFamily: "'DM Sans', sans-serif",
    position: "relative", transition: "all 0.2s",
  },
};

const GlobalStyles = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600;700&family=DM+Sans:wght@300;400;500;600&display=swap');
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    html, body { overflow-x: hidden; }

    @keyframes popIn  { from { opacity:0; transform:scale(0.9) translateY(16px); } to { opacity:1; transform:scale(1) translateY(0); } }
    @keyframes fadeIn { from { opacity:0; } to { opacity:1; } }

    button:not(:disabled):hover { filter: brightness(1.12); }

    .move-list-el::-webkit-scrollbar { width: 5px; }
    .move-list-el::-webkit-scrollbar-thumb { background: rgba(196,163,90,0.25); border-radius: 3px; }
    .move-list-el::-webkit-scrollbar-track { background: transparent; }

    /* Stack board above the side panel once there isn't room for both side by side */
    @media (max-width: 780px) {
      .layout-el { flex-direction: column !important; align-items: center !important; }
      .board-col-el { max-width: 480px !important; }
      .side-col-el { width: 100% !important; max-width: 480px !important; }
      .side-card-el { flex: none !important; }
      .move-list-el { max-height: 220px !important; }
    }

    @media (max-width: 480px) {
      .popup-el { padding: 32px 22px !important; }
    }
  `}</style>
);