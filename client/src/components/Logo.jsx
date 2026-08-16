export default function Logo({ size = 36, animated = true, showText = true, className = "" }) {
  return (
    <div className={`inline-flex items-center gap-2.5 select-none group cursor-pointer ${className}`}>
      {/* Icon Badge Container */}
      <div
        className="relative flex items-center justify-center rounded-xl bg-gradient-to-br from-[#2c1a0e] via-[#1a0e07] to-[#0f0703] border border-[rgba(232,168,56,0.35)] shadow-[0_4px_20px_rgba(0,0,0,0.5)] transition-all duration-300 group-hover:scale-105 group-hover:border-[#e8a838] group-hover:shadow-[0_0_25px_rgba(232,168,56,0.4)]"
        style={{ width: `${size}px`, height: `${size}px` }}
      >
        {/* Animated Pulsing Radial Glow */}
        <div
          className={`absolute inset-0 rounded-xl pointer-events-none bg-gradient-to-tr from-[#e8a838] via-[#81b64c] to-[#e8a838] blur-md ${
            animated ? "animate-[glowPulse_2.5s_infinite_alternate_ease-in-out]" : "opacity-30"
          }`}
          style={{ transform: "scale(0.88)" }}
        />

        {/* Iconic Chess Knight Emblem with Floating Animation */}
        <span
          className={`relative z-10 font-bold text-[#81b64c] drop-shadow-[0_0_10px_rgba(129,182,76,0.6)] transition-transform duration-300 ${
            animated ? "animate-[floatIcon_3s_infinite_ease-in-out]" : ""
          }`}
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
        @keyframes floatIcon {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-3px) rotate(2deg); }
        }

        @keyframes glowPulse {
          0% { opacity: 0.25; transform: scale(0.85); }
          100% { opacity: 0.65; transform: scale(1.05); }
        }

        @keyframes shimmerText {
          0% { background-position: 0% center; }
          100% { background-position: 200% center; }
        }
      `}</style>
    </div>
  );
}
