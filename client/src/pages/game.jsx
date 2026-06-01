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
  const moveListRef                     = useRef(null);

  const gameInfo = JSON.parse(localStorage.getItem("gameInfo") || "{}");
  const user     = JSON.parse(localStorage.getItem("user")     || "{}");

  useEffect(() => {
    const colour      = gameInfo.color       || "white";
    const timeControl = gameInfo.timeControl || 600000;

    setPlayerColour(colour);
    setOpponent(gameInfo.opponent || {});
    setMe({ username: user.username, rating: user[`${gameInfo.format}_rating`] ?? 800 });
    setTimers({ white: timeControl, black: timeControl });

    const socket = connectSocket();

    socket.on("timerUpdate", ({ white, black }) => {
      setTimers({ white, black });
    });

    socket.on("moveMade", ({ from, to, board, moveHistory: mh }) => {
      chess.load(board);
      setLastMove({ from, to });
      setMoveHistory(mh || []);
      forceUpdate(n => n + 1);
    });

    // ✅ FIX 1: removed undefined `newRating` reference from here
    socket.on("gameOver", ({ status, winner }) => {
      setGameStatus("over");
      setResult({ winner, reason: status });
    });

    socket.on("opponentLeft", () => {
      setGameStatus("over");
      setResult({ winner: colour, reason: "disconnect" });
    });

    // ✅ FIX 2: added ratingUpdate listener — updates localStorage + popup
    socket.on("ratingUpdate", ({ newRating, format }) => {
      const stored = JSON.parse(localStorage.getItem("user") || "{}");
      stored[`${format}_rating`] = newRating;
      localStorage.setItem("user", JSON.stringify(stored));
      setResult(prev => prev ? { ...prev, newRating } : prev);
    });

    return () => {
      socket.off("timerUpdate");
      socket.off("moveMade");
      socket.off("gameOver");
      socket.off("opponentLeft");
      socket.off("ratingUpdate"); // ✅ FIX 3: cleanup added
    };
  }, []);

  useEffect(() => {
    if (moveListRef.current) {
      moveListRef.current.scrollTop = moveListRef.current.scrollHeight;
    }
  }, [moveHistory]);

  const handleMove = (from, to, promotion) => {
    const socket = connectSocket();
    socket.emit("makeMove", { gameId, from, to, promotion });
  };

  const handleResign = () => {
    const socket = connectSocket();
    socket.emit("resign", { gameId });
    setGameStatus("over");
    setResult({ winner: playerColour === "white" ? "black" : "white", reason: "resign" });
  };

  // ✅ FIX 4: removed broken API fetch — localStorage already updated by ratingUpdate socket
  const handleBackToLobby = () => navigate("/home");

  const pairedMoves = [];
  for (let i = 0; i < moveHistory.length; i += 2) {
    pairedMoves.push([moveHistory[i], moveHistory[i + 1] ?? ""]);
  }

  const opponentColour = playerColour === "white" ? "black" : "white";

  return (
    <div style={styles.root}>

      {/* ── GAME RESULT POPUP ── */}
      {result && (
        <div style={styles.overlay}>
          <div style={styles.popup}>
            <div style={styles.popupIcon}>
              {result.winner === playerColour ? "🏆" : result.winner === "draw" ? "🤝" : "💀"}
            </div>
            <h2 style={styles.popupTitle}>
              {result.winner === "draw"
                ? "Draw!"
                : result.winner === playerColour
                ? "You Win!"
                : "You Lose!"}
            </h2>
            <p style={styles.popupReason}>
              {result.reason === "checkmate"  && "By checkmate"}
              {result.reason === "resign"     && "By resignation"}
              {result.reason === "disconnect" && "Opponent disconnected"}
              {result.reason === "draw"       && "By agreement"}
              {result.reason === "stalemate"  && "By stalemate"}
              {result.reason === "timeout"    && "On time"}
            </p>
            {/* ✅ FIX 5: new rating shown correctly outside <p> tag */}
            {result.newRating && (
              <p style={{ color: "#a07840", fontSize: "0.95rem", fontWeight: 600, margin: 0 }}>
                New Rating: {result.newRating}
              </p>
            )}
            <button onClick={handleBackToLobby} style={styles.popupBtn}>
              Back to Home
            </button>
          </div>
        </div>
      )}

      {/* ── MAIN LAYOUT ── */}
      <div style={styles.layout}>

        {/* ── LEFT: BOARD + PLAYERS ── */}
        <div style={styles.boardCol}>

          {/* Opponent bar */}
          <div style={styles.playerBar}>
            <span style={styles.playerIcon}>
              {opponentColour === "white" ? "♔" : "♚"}
            </span>
            <div style={{ flex: 1 }}>
              <div style={styles.playerName}>{opponent.username ?? "Opponent"}</div>
              <div style={styles.playerRating}>Rating: {opponent.rating ?? 800}</div>
            </div>
            <div style={{
              ...styles.timerBox,
              ...(gameStatus === "playing" && chess.turn() === (opponentColour === "white" ? "w" : "b")
                ? styles.timerActive : {})
            }}>
              {formatTime(timers[opponentColour])}
            </div>
          </div>

          {/* Board */}
          <Board
            chess={chess}
            playerColour={playerColour}
            onMove={handleMove}
            lastMove={lastMove}
            engineThinking={gameStatus !== "playing"}
          />

          {/* My bar */}
          <div style={styles.playerBar}>
            <span style={styles.playerIcon}>
              {playerColour === "white" ? "♔" : "♚"}
            </span>
            <div style={{ flex: 1 }}>
              <div style={styles.playerName}>{me.username ?? user.username ?? "You"}</div>
              <div style={styles.playerRating}>Rating: {me.rating ?? 800}</div>
            </div>
            <div style={{
              ...styles.timerBox,
              ...(gameStatus === "playing" && chess.turn() === (playerColour === "white" ? "w" : "b")
                ? styles.timerActive : {})
            }}>
              {formatTime(timers[playerColour])}
            </div>
          </div>
        </div>

        {/* ── RIGHT: MOVE HISTORY + RESIGN ── */}
        <div style={styles.sideCol}>
          <div style={styles.sideCard}>
            <h3 style={styles.sideTitle}>Moves</h3>
            <div style={styles.moveList} ref={moveListRef}>
              {pairedMoves.length === 0 && (
                <p style={styles.noMoves}>No moves yet</p>
              )}
              {pairedMoves.map(([white, black], i) => (
                <div key={i} style={styles.moveRow}>
                  <span style={styles.moveNum}>{i + 1}.</span>
                  <span style={styles.moveWhite}>{white}</span>
                  <span style={styles.moveBlack}>{black}</span>
                </div>
              ))}
            </div>

            {gameStatus === "playing" && (
              <button onClick={handleResign} style={styles.resignBtn}>
                Resign
              </button>
            )}
            {gameStatus === "over" && (
              <button onClick={handleBackToLobby} style={styles.lobbyBtn}>
                Back to Home
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

const styles = {
  root:        { minHeight:"100vh", background:"#f5f0e8", display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"'DM Sans', sans-serif", padding:"24px" },
  layout:      { display:"flex", gap:"24px", alignItems:"flex-start" },
  boardCol:    { display:"flex", flexDirection:"column", gap:"10px" },
  playerBar:   { display:"flex", alignItems:"center", gap:"10px", background:"rgba(255,252,245,0.95)", border:"1px solid rgba(180,140,70,0.2)", borderRadius:"6px", padding:"10px 16px" },
  playerIcon:  { fontSize:"1.6rem" },
  playerName:  { fontWeight:600, color:"#2c1f08", fontSize:"0.95rem" },
  playerRating:{ fontSize:"0.78rem", color:"#9a7f52" },
  timerBox:    { background:"rgba(160,120,64,0.08)", border:"1px solid rgba(180,140,70,0.2)", borderRadius:"4px", padding:"8px 14px", fontFamily:"'Playfair Display', serif", fontSize:"1.3rem", fontWeight:700, color:"#2c1f08", minWidth:"72px", textAlign:"center" },
  timerActive: { background:"rgba(160,120,64,0.18)", border:"1px solid #a07840", color:"#a07840" },
  sideCol:     { width:"220px" },
  sideCard:    { background:"rgba(255,252,245,0.95)", border:"1px solid rgba(180,140,70,0.2)", borderRadius:"6px", padding:"16px", display:"flex", flexDirection:"column", gap:"12px", minHeight:"400px" },
  sideTitle:   { fontFamily:"'Playfair Display', serif", fontSize:"1.1rem", color:"#2c1f08", margin:0 },
  moveList:    { flex:1, overflowY:"auto", maxHeight:"360px", display:"flex", flexDirection:"column", gap:"4px" },
  noMoves:     { color:"#c4b08a", fontSize:"0.85rem", textAlign:"center", marginTop:"16px" },
  moveRow:     { display:"grid", gridTemplateColumns:"24px 1fr 1fr", gap:"4px", fontSize:"0.88rem", padding:"3px 4px", borderRadius:"3px" },
  moveNum:     { color:"#9a7f52", fontWeight:500 },
  moveWhite:   { color:"#2c1f08", fontWeight:500 },
  moveBlack:   { color:"#2c1f08" },
  resignBtn:   { width:"100%", padding:"10px", background:"transparent", border:"1px solid rgba(180,60,60,0.4)", borderRadius:"4px", color:"#c84040", fontSize:"0.9rem", cursor:"pointer", fontWeight:500 },
  lobbyBtn:    { width:"100%", padding:"10px", background:"linear-gradient(135deg, #c9a96e 0%, #a07840 100%)", border:"none", borderRadius:"4px", color:"#1a0f00", fontSize:"0.9rem", cursor:"pointer", fontWeight:600 },
  overlay:     { position:"fixed", inset:0, background:"rgba(0,0,0,0.5)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:100 },
  popup:       { background:"rgba(255,252,245,0.98)", border:"1px solid rgba(180,140,70,0.3)", borderRadius:"8px", padding:"40px", textAlign:"center", minWidth:"280px", display:"flex", flexDirection:"column", alignItems:"center", gap:"12px" },
  popupIcon:   { fontSize:"3rem" },
  popupTitle:  { fontFamily:"'Playfair Display', serif", fontSize:"1.8rem", color:"#2c1f08", margin:0 },
  popupReason: { color:"#9a7f52", fontSize:"0.9rem", margin:0 },
  popupBtn:    { marginTop:"8px", padding:"12px 32px", background:"linear-gradient(135deg, #c9a96e 0%, #a07840 100%)", border:"none", borderRadius:"4px", color:"#1a0f00", fontSize:"0.95rem", fontWeight:600, cursor:"pointer" },
};