import Logo from "./Logo";

export default function LoadingScreen({ message = "Loading ChessMate..." }) {
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#1a0e07] text-[#f0e6d3] font-['DM_Sans',sans-serif] overflow-hidden">
      {/* Background vignette & grid */}
      <div
        aria-hidden="true"
        className="absolute inset-0 pointer-events-none"
        style={{
          background: "radial-gradient(ellipse at center, rgba(44,26,14,0.6) 0%, #1a0e07 80%)",
        }}
      />

      {/* Rotating Ring & Logo Container */}
      <div className="relative z-10 flex flex-col items-center">
        <div className="relative flex items-center justify-center w-28 h-28 mb-6">
          {/* Outer Rotating Glowing Ring */}
          <div
            className="absolute inset-0 rounded-full border-2 border-transparent border-t-[#e8a838] border-r-[#81b64c] animate-spin"
            style={{ animationDuration: "1.8s" }}
          />
          {/* Inner Counter-Rotating Ring */}
          <div
            className="absolute inset-2 rounded-full border-2 border-transparent border-b-[#c4a35a] border-l-[#e8a838] opacity-60 animate-spin"
            style={{ animationDirection: "reverse", animationDuration: "2.5s" }}
          />

          {/* Pulsing Ambient Glow */}
          <div className="absolute inset-4 rounded-full bg-[rgba(232,168,56,0.15)] blur-xl animate-pulse" />

          {/* Center Animated Logo */}
          <Logo size={48} animated={true} showText={false} />
        </div>

        {/* Text Brand & Message */}
        <h2 className="font-['Playfair_Display',serif] text-2xl font-bold tracking-wide text-[#f0e6d3] mb-2">
          Chess<span className="text-[#e8a838]">Mate</span>
        </h2>

        <p className="text-xs text-[#8a7055] font-medium tracking-widest uppercase animate-pulse">
          {message}
        </p>

        {/* Progress Bar */}
        <div className="w-48 h-1 bg-[rgba(196,163,90,0.15)] rounded-full mt-5 overflow-hidden">
          <div className="h-full bg-gradient-to-r from-[#e8a838] to-[#81b64c] rounded-full animate-[loadingBar_1.5s_infinite_ease-in-out]" />
        </div>
      </div>

      <style>{`
        @keyframes loadingBar {
          0% { width: 0%; transform: translateX(-100%); }
          50% { width: 70%; transform: translateX(30%); }
          100% { width: 100%; transform: translateX(100%); }
        }
      `}</style>
    </div>
  );
}
