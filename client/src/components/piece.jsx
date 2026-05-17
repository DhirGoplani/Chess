const PIECE_FILES = {
  wK: "wking", wQ: "wqueen", wR: "wrook", wB: "wbishop", wN: "wknight", wP: "wpawn",
  bK: "bking", bQ: "bqueen", bR: "brook", bB: "bbishop", bN: "bknight", bP: "bpawn",
};

export default function Piece({ type, color, isDragging = false }) {
  const code = `${color === "white" ? "w" : "b"}${type}`;
  const file = PIECE_FILES[code];
  if (!file) return null;

  return (
    <img
      src={`/${file}.png`}
      alt={`${color} ${type}`}
      draggable={false}
      className={`
        w-[88%] h-[88%] object-contain select-none pointer-events-none
        drop-shadow-[0_3px_6px_rgba(0,0,0,0.5)]
        transition-transform duration-100
        ${isDragging ? "scale-110 opacity-80" : ""}
      `}
    />
  );
}
