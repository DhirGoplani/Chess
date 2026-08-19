export default function Square({
  isLight,
  isSelected,
  isLastMove,
  isCheck,
  isPremove,
  legalMove,      // null | "move" | "capture"
  rank,           // 1-8, show on leftmost file
  file,           // a-h, show on bottom rank
  showRank,       // bool
  showFile,       // bool
  size,           // px — measured sqPx
  onClick,
  children,
}) {
  // Preserved Original Warm Board Colors
  let bg = isLight ? "#f0d9b5" : "#b58863";

  // Active Overlays
  if (isLastMove) bg = isLight ? "#f7f769" : "#baca44";
  if (isSelected) bg = isLight ? "#f7f769" : "#baca44";
  if (isPremove)  bg = isLight ? "#fca5a5" : "#dc2626";
  if (isCheck)    bg = "#e53935";

  return (
    <div
      onClick={onClick}
      style={{ backgroundColor: bg, width: size, height: size }}
      className="relative flex items-center justify-center cursor-pointer transition-[background-color] duration-150 select-none overflow-hidden"
    >
      {/* Rank label — top-left corner */}
      {showRank && (
        <span
          className="absolute top-[2px] left-[4px] text-[10px] font-extrabold leading-none pointer-events-none tracking-tighter select-none"
          style={{ color: isLight ? "#b58863" : "#f0d9b5", opacity: 0.9 }}
        >
          {rank}
        </span>
      )}

      {/* File label — bottom-right corner */}
      {showFile && (
        <span
          className="absolute bottom-[2px] right-[4px] text-[10px] font-extrabold leading-none pointer-events-none tracking-tighter select-none"
          style={{ color: isLight ? "#b58863" : "#f0d9b5", opacity: 0.9 }}
        >
          {file}
        </span>
      )}

      {/* Legal Move Target Dot */}
      {legalMove === "move" && (
        <div
          className="absolute w-[28%] h-[28%] rounded-full pointer-events-none z-10 shadow-sm"
          style={{ background: "rgba(0,0,0,0.22)" }}
        />
      )}

      {/* Legal Capture Ring */}
      {legalMove === "capture" && (
        <div
          className="absolute inset-0 rounded-full pointer-events-none z-10"
          style={{ boxShadow: "inset 0 0 0 7px rgba(0,0,0,0.22)" }}
        />
      )}

      {/* Premove Light Red Pulsing Overlay */}
      {isPremove && (
        <div
          className="absolute inset-0 pointer-events-none z-10 animate-pulse"
          style={{ background: "rgba(239, 68, 68, 0.4)", border: "2px solid #ef4444" }}
        />
      )}

      {/* Check Pulsing Red Glow */}
      {isCheck && (
        <div
          className="absolute inset-0 pointer-events-none z-10 animate-pulse shadow-[inset_0_0_12px_#ef4444]"
          style={{ background: "rgba(239, 68, 68, 0.45)" }}
        />
      )}

      {/* Hover Highlight Overlay */}
      <div
        className="absolute inset-0 opacity-0 hover:opacity-100 pointer-events-none transition-opacity duration-150"
        style={{ background: "rgba(255,255,255,0.12)" }}
      />

      {children}
    </div>
  );
}