import { useState } from "react";
import { useNavigate } from "react-router-dom";

const API = (import.meta.env.VITE_API_URL) + "/api";
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
        body: JSON.stringify({
          playerColour: colour,
        }),
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
    <div className="relative min-h-screen flex items-center justify-center bg-[#1a0e07] overflow-hidden px-6 py-8 font-['DM_Sans',sans-serif]">

      {/* Chessboard background */}
      <div
        aria-hidden="true"
        className="absolute inset-0 grid opacity-[0.06] pointer-events-none rotate-12 scale-[1.5]"
        style={{
          gridTemplateColumns: "repeat(8,1fr)",
          gridTemplateRows: "repeat(8,1fr)",
        }}
      >
        {SQUARES.map((i) => {
          const isDark =
            (Math.floor(i / 8) + (i % 8)) % 2 === 1;

          return (
            <div
              key={i}
              className={
                isDark
                  ? "bg-[#b58863]"
                  : "bg-[#f0d9b5]"
              }
            />
          );
        })}
      </div>

      {/* Vignette */}
      <div
        aria-hidden="true"
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse at center, transparent 20%, #1a0e07 80%)",
        }}
      />

      {/* Card */}
      <div className="relative z-10 w-full max-w-[440px] bg-[rgba(44,26,14,0.9)] border border-[rgba(196,163,90,0.2)] rounded-[10px] px-10 py-11 backdrop-blur-md shadow-[0_24px_80px_rgba(0,0,0,0.6)] animate-[fadeUp_0.5s_ease_both]">

        {/* Header */}
        <div className="text-center mb-7">
          <div className="w-[58px] h-[58px] rounded-[14px] bg-[rgba(232,168,56,0.12)] border border-[rgba(232,168,56,0.2)] flex items-center justify-center mx-auto mb-4">
            <span className="text-[1.8rem] text-[#e8a838]">
              ♛
            </span>
          </div>

          <h1 className="font-['Playfair_Display',serif] text-[1.85rem] font-bold text-[#f0e6d3] tracking-tight mb-1">
            Play vs Computer
          </h1>

          <p className="text-sm text-[#8a7055] font-light tracking-wide">
            Challenge the engine and sharpen your tactics
          </p>
        </div>

        {/* Divider */}
        <div className="h-px bg-[rgba(196,163,90,0.15)] mb-6 rounded-full" />

        {/* Label */}
        <div className="text-[0.72rem] font-medium text-[#8a7055] tracking-[0.12em] uppercase mb-3">
          Choose Your Side
        </div>

        {/* Colour Picker */}
        <div className="grid grid-cols-2 gap-3 mb-6">

          {[
            {
              value: "white",
              glyph: "♔",
              label: "White",
              hint: "Move First",
              glyphClass: "text-[#f5e6c8]",
            },
            {
              value: "black",
              glyph: "♚",
              label: "Black",
              hint: "Engine Starts",
              glyphClass: "text-[#111]",
            },
          ].map(({ value, glyph, label, hint, glyphClass }) => {

            const active = colour === value;

            return (
              <button
                key={value}
                onClick={() => setColour(value)}
                aria-pressed={active}
                className={[
                  "relative flex flex-col items-center gap-1 px-3 py-5 rounded-[8px] border transition-all duration-200",

                  active
                    ? "border-[#c4a35a] bg-[rgba(196,163,90,0.08)] shadow-[0_0_0_3px_rgba(196,163,90,0.12)]"
                    : "border-[rgba(196,163,90,0.15)] bg-[rgba(0,0,0,0.2)] hover:border-[#c4a35a] hover:bg-[rgba(196,163,90,0.05)]",
                ].join(" ")}
              >
                <span
                  className={`text-[2.2rem] leading-none mb-1 ${glyphClass}`}
                  style={{
                    filter:
                      value === "black"
                        ? "drop-shadow(0 2px 4px rgba(0,0,0,0.5))"
                        : "drop-shadow(0 2px 4px rgba(255,255,255,0.15))",
                  }}
                >
                  {glyph}
                </span>

                <span className="text-[0.95rem] font-semibold text-[#f0e6d3]">
                  {label}
                </span>

                <span className="text-[0.72rem] text-[#8a7055] font-light">
                  {hint}
                </span>

                {active && (
                  <span className="absolute top-2 right-2 text-xs text-[#e8a838] font-semibold">
                    ✓
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Engine Box */}
        <div className="flex items-center gap-3 bg-[rgba(0,0,0,0.25)] border border-[rgba(196,163,90,0.08)] rounded-[8px] px-4 py-3 mb-5">

          <span className="text-[1.3rem] text-[#e8a838] shrink-0">
            ⚙
          </span>

          <div>
            <div className="text-[0.9rem] font-semibold text-[#f0e6d3]">
              Chess Engine
            </div>

            <div className="text-[0.72rem] text-[#8a7055] font-light">
              Minimax · depth 4
            </div>
          </div>

          <div className="ml-auto text-[0.65rem] font-semibold tracking-[0.12em] text-[#e8a838] bg-[rgba(232,168,56,0.08)] border border-[rgba(232,168,56,0.2)] rounded-[4px] px-2 py-0.5 uppercase shrink-0">
            CPU
          </div>
        </div>

        {/* Error */}
        {error && (
          <div
            role="alert"
            className="flex items-center gap-2 bg-[rgba(180,60,60,0.12)] border border-[rgba(180,60,60,0.25)] rounded-[6px] px-3 py-2 text-[#d98b8b] text-[0.83rem] mb-4 animate-[fadeIn_0.2s_ease_both]"
          >
            <span>⚠</span>
            {error}
          </div>
        )}

        {/* Start Button */}
        <button
          onClick={startGame}
          disabled={loading}
          className="relative w-full py-3 rounded-[6px] text-[#0d1f05] text-[0.96rem] font-bold tracking-[0.04em] transition-all duration-200 overflow-hidden disabled:opacity-50 disabled:cursor-not-allowed hover:not-disabled:opacity-95 hover:not-disabled:-translate-y-px active:not-disabled:translate-y-0"
          style={{
            background:
              "linear-gradient(135deg, #e8a838 0%, #c4901f 100%)",
            boxShadow:
              "0 4px 24px rgba(232,168,56,0.35)",
          }}
        >
          <span
            aria-hidden="true"
            className="absolute inset-0 pointer-events-none"
            style={{
              background:
                "linear-gradient(135deg, rgba(255,255,255,0.15) 0%, transparent 60%)",
            }}
          />

          {loading ? (
            <span className="inline-block animate-spin">
              ♻
            </span>
          ) : (
            "Start Game"
          )}
        </button>

        {/* Footer */}
        <div className="mt-5 text-center">
          <a
            href="/home"
            className="text-[0.82rem] text-[#8a7055] no-underline transition-colors duration-200 hover:text-[#e8a838]"
          >
            ← Back to Home
          </a>
        </div>
      </div>

      {/* Styles */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600;700&family=DM+Sans:wght@300;400;500;600&display=swap');

        @keyframes fadeUp {
          from {
            opacity: 0;
            transform: translateY(24px);
          }

          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes fadeIn {
          from {
            opacity: 0;
          }

          to {
            opacity: 1;
          }
        }

        @media (max-width: 480px) {
          .pvc-card {
            padding: 32px 20px !important;
          }
        }
      `}</style>
    </div>
  );
}