export default function Logo({ size = 36, animated = true, showText = true, className = "" }) {
  return (
    <div className={`inline-flex items-center gap-2.5 select-none group cursor-pointer ${className}`}>
      {/* Icon Badge Container */}
      <div
        className="relative flex items-center justify-center rounded-xl bg-gradient-to-br from-[#2c1a0e] via-[#1a0e07] to-[#0f0703] border border-[rgba(232,168,56,0.35)] shadow-[0_4px_20px_rgba(0,0,0,0.5)] transition-all duration-300 group-hover:scale-105 group-hover:border-[#e8a838]"
        style={{ width: `${size}px`, height: `${size}px` }}
      >
        {/* Iconic Chess Knight Emblem */}
        <span
          className="relative z-10 font-bold text-[#81b64c]"
          style={{ fontSize: `${size * 0.65}px`, lineHeight: 1 }}
        >
          ♞
        </span>
      </div>

      {/* Brand Text with Metallic Shimmer */}
      {showText && (
        <span
          className="font-['Playfair_Display',serif] font-bold tracking-tight transition-colors duration-300"
          style={{ fontSize: `${size * 0.52}px` }}
        >
          <span className="text-[#f0e6d3] group-hover:text-[#ffffff] transition-colors">Chess</span>
          <span
            className={`ml-0.5 bg-gradient-to-r from-[#e8a838] via-[#f5e6c8] to-[#c4901f] bg-clip-text text-transparent ${
              animated ? "bg-[length:200%_auto] animate-[shimmerText_4s_infinite_linear]" : ""
            }`}
          >
            Mate
          </span>
        </span>
      )}

      <style>{`
        @keyframes shimmerText {
          0% { background-position: 0% center; }
          100% { background-position: 200% center; }
        }
      `}</style>
    </div>
  );
}