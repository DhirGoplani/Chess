import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Chess } from "chess.js";
import Board from "../components/board";
import { connectSocket } from "../socket/socket";

export default function Game() {
  const { gameId }                      = useParams();
  const navigate                        = useNavigate();
  const [chess]                         = useState(new Chess());
  const [lastMove, setLastMove]         = useState(null);
  const [playerColour, setPlayerColour] = useState("white");
  const [, forceUpdate]                 = useState(0);
  const [gameStatus, setGameStatus]     = useState("playing");
  const [result, setResult]             = useState(null);   // { winner, reason }
  const [moveHistory, setMoveHistory]   = useState([]);
  const [opponent, setOpponent]         = useState({});
  const [me, setMe]                     = useState({});
  const moveListRef                     = useRef(null);

  const gameInfo = JSON.parse(localStorage.getItem("gameInfo") || "{}");
  const user     = JSON.parse(localStorage.getItem("user")     || "{}");

  useEffect(() => {
    const colour = gameInfo.color || "white";
    setPlayerColour(colour);
    setOpponent(gameInfo.opponent || {});
    setMe({ username: user.username, rating: user[`${gameInfo.format}_rating`] ?? 800 });

    const socket = connectSocket();

    socket.on("moveMade", ({ from, to, board, moveHistory: mh }) => {
      chess.load(board);
      setLastMove({ from, to });
      setMoveHistory(mh || []);
      forceUpdate(n => n + 1);
    });

    socket.on("gameOver", ({ status, winner }) => {
      setGameStatus("over");
      setResult({ winner, reason: status });
    });

    socket.on("opponentLeft", () => {
      setGameStatus("over");
      setResult({ winner: playerColour, reason: "disconnect" });
    });

    return () => {
      socket.off("moveMade");
      socket.off("gameOver");
      socket.off("opponentLeft");
    };
  }, []);

  // Auto scroll move list
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

  const handleBackToLobby = () => {
    navigate("/lobby");
  };

  // Pair moves into rows: [["e4", "e5"], ["Nf3", "Nc6"], ...]
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
            </p>
            <button onClick={handleBackToLobby} style={styles.popupBtn}>
              Back to Lobby
            </button>
          </div>
        </div>
      )}

      {/* ── MAIN LAYOUT ── */}
      <div style={styles.layout}>

        {/* ── LEFT: BOARD + PLAYERS ── */}
        <div style={styles.boardCol}>
          {/* Opponent info */}
          <div style={styles.playerBar}>
            <span style={styles.playerIcon}>{opponentColour === "white" ? "♔" : "♚"}</span>
            <div>
              <div style={styles.playerName}>{opponent.username ?? "Opponent"}</div>
              <div style={styles.playerRating}>Rating: {opponent.rating ?? 800}</div>
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

          {/* My info */}
          <div style={styles.playerBar}>
            <span style={styles.playerIcon}>{playerColour === "white" ? "♔" : "♚"}</span>
            <div>
              <div style={styles.playerName}>{me.username ?? user.username ?? "You"}</div>
              <div style={styles.playerRating}>Rating: {me.rating ?? 800}</div>
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
                Back to Lobby
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

const styles = {
  root: {
    minHeight: "100vh",
    background: "#f5f0e8",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontFamily: "'DM Sans', sans-serif",
    padding: "24px",
  },
  layout: {
    display: "flex",
    gap: "24px",
    alignItems: "flex-start",
  },
  boardCol: {
    display: "flex",
    flexDirection: "column",
    gap: "10px",
  },
  playerBar: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    background: "rgba(255,252,245,0.95)",
    border: "1px solid rgba(180,140,70,0.2)",
    borderRadius: "6px",
    padding: "10px 16px",
  },
  playerIcon: {
    fontSize: "1.6rem",
  },
  playerName: {
    fontWeight: 600,
    color: "#2c1f08",
    fontSize: "0.95rem",
  },
  playerRating: {
    fontSize: "0.78rem",
    color: "#9a7f52",
  },
  sideCol: {
    width: "220px",
  },
  sideCard: {
    background: "rgba(255,252,245,0.95)",
    border: "1px solid rgba(180,140,70,0.2)",
    borderRadius: "6px",
    padding: "16px",
    display: "flex",
    flexDirection: "column",
    gap: "12px",
    minHeight: "400px",
  },
  sideTitle: {
    fontFamily: "'Playfair Display', serif",
    fontSize: "1.1rem",
    color: "#2c1f08",
    margin: 0,
  },
  moveList: {
    flex: 1,
    overflowY: "auto",
    maxHeight: "360px",
    display: "flex",
    flexDirection: "column",
    gap: "4px",
  },
  noMoves: {
    color: "#c4b08a",
    fontSize: "0.85rem",
    textAlign: "center",
    marginTop: "16px",
  },
  moveRow: {
    display: "grid",
    gridTemplateColumns: "24px 1fr 1fr",
    gap: "4px",
    fontSize: "0.88rem",
    padding: "3px 4px",
    borderRadius: "3px",
  },
  moveNum: {
    color: "#9a7f52",
    fontWeight: 500,
  },
  moveWhite: {
    color: "#2c1f08",
    fontWeight: 500,
  },
  moveBlack: {
    color: "#2c1f08",
  },
  resignBtn: {
    width: "100%",
    padding: "10px",
    background: "transparent",
    border: "1px solid rgba(180,60,60,0.4)",
    borderRadius: "4px",
    color: "#c84040",
    fontSize: "0.9rem",
    cursor: "pointer",
    fontWeight: 500,
  },
  lobbyBtn: {
    width: "100%",
    padding: "10px",
    background: "linear-gradient(135deg, #c9a96e 0%, #a07840 100%)",
    border: "none",
    borderRadius: "4px",
    color: "#1a0f00",
    fontSize: "0.9rem",
    cursor: "pointer",
    fontWeight: 600,
  },
  overlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(0,0,0,0.5)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 100,
  },
  popup: {
    background: "rgba(255,252,245,0.98)",
    border: "1px solid rgba(180,140,70,0.3)",
    borderRadius: "8px",
    padding: "40px",
    textAlign: "center",
    minWidth: "280px",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "12px",
  },
  popupIcon: {
    fontSize: "3rem",
  },
  popupTitle: {
    fontFamily: "'Playfair Display', serif",
    fontSize: "1.8rem",
    color: "#2c1f08",
    margin: 0,
  },
  popupReason: {
    color: "#9a7f52",
    fontSize: "0.9rem",
    margin: 0,
  },
  popupBtn: {
    marginTop: "8px",
    padding: "12px 32px",
    background: "linear-gradient(135deg, #c9a96e 0%, #a07840 100%)",
    border: "none",
    borderRadius: "4px",
    color: "#1a0f00",
    fontSize: "0.95rem",
    fontWeight: 600,
    cursor: "pointer",
  },
};