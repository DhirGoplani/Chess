// client/src/components/Board/Square.jsx

// Light square  → warm parchment    #F0CFA0
// Dark square   → deep coffee       #8B5A2B

export default function Square({
  isLight,
  isSelected,
  isLastMove,
  isCheck,
  legalMove,      // null | "move" | "capture"
  rank,           // 1-8, show on leftmost file
  file,           // a-h, show on bottom rank
  showRank,       // bool
  showFile,       // bool
  size,           // px — comes from Board.jsx's measured sqPx
  onClick,
  children,
}) {
  // Base square colour
  let bg = isLight ? "#F0CFA0" : "#8B5A2B";

  // Overlays (order matters — check beats selection)
  if (isLastMove) bg = isLight ? "#DAC476" : "#9A7D2E";
  if (isSelected) bg = isLight ? "#E8E04A" : "#C6B829";
  if (isCheck)    bg = "#C84040";

  return (
    <div
      onClick={onClick}
      style={{ backgroundColor: bg, width: size, height: size }}
      className="relative flex items-center justify-center cursor-pointer
                 transition-[background-color] duration-100 select-none"
    >
      {/* Rank label — left edge */}
      {showRank && (
        <span
          className="absolute top-[3px] left-[4px] text-[10px] font-bold leading-none pointer-events-none"
          style={{ color: isLight ? "#8B5A2B" : "#F0CFA0", opacity: 0.75 }}
        >
          {rank}
        </span>
      )}

      {/* File label — bottom edge */}
      {showFile && (
        <span
          className="absolute bottom-[3px] right-[4px] text-[10px] font-bold leading-none pointer-events-none"
          style={{ color: isLight ? "#8B5A2B" : "#F0CFA0", opacity: 0.75 }}
        >
          {file}
        </span>
      )}

      {/* Legal move dot */}
      {legalMove === "move" && (
        <div className="absolute w-[26%] h-[26%] rounded-full pointer-events-none z-10"
             style={{ background: "rgba(0,0,0,0.22)" }} />
      )}

      {/* Legal capture ring */}
      {legalMove === "capture" && (
        <div className="absolute inset-0 rounded-full pointer-events-none z-10"
             style={{ boxShadow: "inset 0 0 0 7px rgba(0,0,0,0.22)" }} />
      )}

      {/* Hover highlight */}
      <div className="absolute inset-0 opacity-0 hover:opacity-100 pointer-events-none
                      transition-opacity duration-100"
           style={{ background: "rgba(255,255,255,0.08)" }} />

      {children}
    </div>
  );
}