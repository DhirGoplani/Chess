import { useState } from "react";
import { useNavigate } from "react-router-dom";

const API = (import.meta.env.VITE_API_URL ?? "http://localhost:3000") + "/api";
const SQUARES = Array.from({ length: 64 }, (_, i) => i);

export default function PvcLobby() {
  const navigate = useNavigate();
  const [colour, setColour] = useState("white");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  async function startGame() {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API}/pvc/create`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ playerColour: colour }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `Server error ${res.status}`);
      }

      const data = await res.json();
      navigate(`/pvc/game/${data.gameId}`, {
        state: {
          playerColour: data.playerColour,
          engineColour: data.engineColour,
          engineFirstMove: data.engineFirstMove ?? null,
        },
      });
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  }

  return (
    <div className="relative min-h-screen flex items-center justify-center bg-[#f5f0e8] overflow-hidden px-6 py-8 font-['DM_Sans',sans-serif]">

      {/* Chessboard background */}
      <div
        aria-hidden="true"
        className="absolute inset-0 grid opacity-[0.22] pointer-events-none rotate-12 scale-[1.4]"
        style={{ gridTemplateColumns: "repeat(8,1fr)", gridTemplateRows: "repeat(8,1fr)" }}
      >
        {SQUARES.map((i) => {
          const isDark = (Math.floor(i / 8) + (i % 8)) % 2 === 1;
          return (
            <div
              key={i}
              className={isDark ? "bg-[#8b6914]" : "bg-[#e8d5b0]"}
            />
          );
        })}
      </div>

      {/* Vignette */}
      <div
        aria-hidden="true"
        className="absolute inset-0 pointer-events-none"
        style={{ background: "radial-gradient(ellipse at center, transparent 30%, #f5f0e8 85%)" }}
      />

      {/* Card */}
      <div className="relative z-10 w-full max-w-[440px] bg-[rgba(255,252,245,0.92)] border border-[rgba(180,140,70,0.2)] rounded-sm px-10 py-11 backdrop-blur-md shadow-[0_8px_40px_rgba(120,80,20,0.12),0_1px_3px_rgba(0,0,0,0.06)] animate-[fadeUp_0.5s_ease_both]">

        {/* Header */}
        <div className="text-center mb-7">
          <span
            className="block text-[2.4rem] mb-2.5 animate-[pulse_3s_ease-in-out_infinite]"
            aria-hidden="true"
            style={{ filter: "drop-shadow(0 2px 8px rgba(160,120,64,0.3))" }}
          >
            ♚
          </span>
          <h1 className="font-['Playfair_Display',serif] text-[1.75rem] font-bold text-[#2c1f08] tracking-tight mb-1">
            Play vs Computer
          </h1>
          <p className="text-sm text-[#9a7f52] tracking-widest font-light">
            Choose your side and face the machine
          </p>
        </div>

        {/* Colour picker label */}
        <div className="text-[0.75rem] font-medium text-[#7a6340] tracking-[0.08em] uppercase mb-2.5">
          Play as
        </div>

        {/* Colour picker */}
        <div className="grid grid-cols-2 gap-3 mb-5">
          {[
            { value: "white", glyph: "♔", label: "White", hint: "You move first", glyphClass: "text-[#d4b87a]" },
            { value: "black", glyph: "♚", label: "Black", hint: "Engine moves first", glyphClass: "text-[#2c1f08]" },
          ].map(({ value, glyph, label, hint, glyphClass }) => {
            const active = colour === value;
            return (
              <button
                key={value}
                onClick={() => setColour(value)}
                aria-pressed={active}
                className={[
                  "relative flex flex-col items-center gap-1 px-3 py-5 rounded-sm border font-['DM_Sans',sans-serif] cursor-pointer transition-all duration-200",
                  active
                    ? "border-[#a07840] bg-[rgba(160,120,64,0.06)] shadow-[0_0_0_3px_rgba(160,120,64,0.1)]"
                    : "border-[#ddd0b8] bg-white text-[#7a6340] hover:border-[#c4a87a] hover:bg-[#fdf8f0] hover:-translate-y-px",
                ].join(" ")}
              >
                <span
                  className={`text-[2.2rem] leading-none mb-1 ${glyphClass}`}
                  style={{ filter: value === "black" ? "drop-shadow(0 1px 3px rgba(0,0,0,0.3))" : "drop-shadow(0 1px 3px rgba(0,0,0,0.15))" }}
                >
                  {glyph}
                </span>
                <span className="text-[0.9rem] font-medium text-[#2c1f08]">{label}</span>
                <span className="text-[0.7rem] text-[#9a7f52] font-light">{hint}</span>
                {active && (
                  <span className="absolute top-2 right-2.5 text-xs text-[#a07840] font-semibold">✓</span>
                )}
              </button>
            );
          })}
        </div>

        {/* Engine strip */}
        <div className="flex items-center gap-3 bg-[#fdf8f0] border border-[#ddd0b8] rounded-sm px-4 py-3 mb-5">
          <span className="text-[1.3rem] text-[#b8976a] shrink-0">⚙</span>
          <div>
            <div className="text-[0.87rem] font-medium text-[#2c1f08]">Chess Engine</div>
            <div className="text-[0.72rem] text-[#9a7f52] font-light">Minimax · depth 4</div>
          </div>
          <div className="ml-auto text-[0.65rem] font-semibold tracking-[0.1em] text-[#a07840] bg-[rgba(160,120,64,0.1)] border border-[rgba(160,120,64,0.25)] rounded-[2px] px-2 py-0.5 uppercase shrink-0">
            CPU
          </div>
        </div>

        {/* Error */}
        {error && (
          <div
            role="alert"
            className="flex items-center gap-1.5 bg-[rgba(180,60,60,0.12)] border border-[rgba(180,60,60,0.3)] rounded-sm px-3 py-2 text-[#c07070] text-[0.83rem] mb-3 animate-[fadeIn_0.2s_ease_both]"
          >
            <span>⚠</span> {error}
          </div>
        )}

        {/* Submit */}
        <button
          onClick={startGame}
          disabled={loading}
          className="relative w-full py-3 rounded-sm text-[#1a0f00] text-[0.95rem] font-semibold tracking-wide cursor-pointer transition-all duration-200 overflow-hidden disabled:opacity-50 disabled:cursor-not-allowed hover:not-disabled:opacity-90 hover:not-disabled:-translate-y-px hover:not-disabled:shadow-[0_6px_24px_rgba(201,169,110,0.3)] active:not-disabled:translate-y-0"
          style={{ background: "linear-gradient(135deg, #c9a96e 0%, #a07840 100%)" }}
        >
          <span
            aria-hidden="true"
            className="absolute inset-0 pointer-events-none"
            style={{ background: "linear-gradient(135deg, rgba(255,255,255,0.15) 0%, transparent 60%)" }}
          />
          {loading ? (
            <span className="inline-block animate-spin">♻</span>
          ) : (
            "Start Game"
          )}
        </button>

        {/* Footer */}
        <div className="mt-5 text-center">
          <a
            href="/home"
            className="text-[0.82rem] text-[#9a7f52] no-underline transition-colors duration-200 hover:text-[#a07840]"
          >
            ← Back to Home
          </a>
        </div>
      </div>

      {/* Keyframe styles (Tailwind can't express these natively) */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600;700&family=DM+Sans:wght@300;400;500&display=swap');
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(24px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes pulse {
          0%, 100% { filter: drop-shadow(0 2px 8px rgba(160,120,64,0.2)); }
          50%       { filter: drop-shadow(0 4px 16px rgba(160,120,64,0.5)); }
        }
      `}</style>
    </div>
  );
}