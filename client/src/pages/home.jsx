import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

const SQUARES = Array.from({ length: 64 }, (_, i) => i);

const FORMATS = [
  {
    id: "bullet",
    label: "Bullet",
    time: "1+0",
    icon: "⚡",
    desc: "Lightning fast chess",
    ratingKey: "bullet_rating",
  },
  {
    id: "blitz",
    label: "Blitz",
    time: "5+0",
    icon: "🔥",
    desc: "Fast and furious",
    ratingKey: "blitz_rating",
  },
  {
    id: "rapid",
    label: "Rapid",
    time: "10+0",
    icon: "⏱",
    desc: "Think it through",
    ratingKey: "rapid_rating",
  },
];

export default function Home() {
  const navigate = useNavigate();
  const [user, setUser] = useState({});

  useEffect(() => {
    const stored = localStorage.getItem("user");
    if (!stored) {
      navigate("/");
      return;
    }
    setUser(JSON.parse(stored));
  }, []);

  const handlePlay = (format) => {
    localStorage.setItem("selectedFormat", format);
    navigate("/lobby");
  };

  return (
    <div className="relative min-h-screen bg-[#f5f0e8] overflow-hidden font-['DM_Sans',sans-serif]">

      {/* Chessboard background */}
      <div
        aria-hidden="true"
        className="fixed inset-0 grid opacity-[0.12] pointer-events-none rotate-12 scale-150"
        style={{ gridTemplateColumns: "repeat(8,1fr)", gridTemplateRows: "repeat(8,1fr)" }}
      >
        {SQUARES.map((i) => {
          const isDark = (Math.floor(i / 8) + (i % 8)) % 2 === 1;
          return <div key={i} className={isDark ? "bg-[#8b6914]" : "bg-[#e8d5b0]"} />;
        })}
      </div>

      {/* Vignette */}
      <div
        aria-hidden="true"
        className="fixed inset-0 pointer-events-none"
        style={{ background: "radial-gradient(ellipse at center, transparent 20%, #f5f0e8 80%)" }}
      />

      {/* Main content */}
      <div className="relative z-10 max-w-[960px] mx-auto px-6 pb-12">

        {/* ── Navbar ── */}
        <nav className="flex justify-between items-center py-5 border-b border-[rgba(180,140,70,0.2)] mb-12">
          <div className="font-['Playfair_Display',serif] text-[1.4rem] font-bold text-[#2c1f08] tracking-tight">
            ♛ ChessBoard
          </div>
          <div className="flex items-center gap-4">
            <span className="text-[0.88rem] text-[#7a6340] font-medium">
              ♟ {user.username}
            </span>
            <button
              onClick={() => { localStorage.clear(); navigate("/"); }}
              className="px-4 py-1.5 bg-transparent border border-[rgba(180,140,70,0.4)] rounded-sm text-[#7a6340] text-[0.82rem] cursor-pointer transition-colors duration-150 hover:border-[#a07840] hover:text-[#a07840]"
            >
              Logout
            </button>
          </div>
        </nav>

        {/* ── Hero ── */}
        <div className="text-center mb-12 animate-[fadeUp_0.5s_ease_both]">
          <h1 className="font-['Playfair_Display',serif] text-[2.4rem] font-bold text-[#2c1f08] mb-2.5 tracking-tight">
            Welcome back,{" "}
            <span className="text-[#a07840]">{user.name ?? user.username}</span>
          </h1>
          <p className="text-base text-[#9a7f52] font-light">
            Choose your format and find an opponent
          </p>
        </div>

        {/* ── Format cards ── */}
        <div className="grid grid-cols-3 gap-5 mb-8 animate-[fadeUp_0.6s_ease_both]">
          {FORMATS.map((f) => (
            <div
              key={f.id}
              className="flex flex-col gap-3.5 bg-[rgba(255,252,245,0.95)] border border-[rgba(180,140,70,0.2)] rounded-lg p-6 shadow-[0_4px_20px_rgba(120,80,20,0.08)]"
            >
              {/* Card top */}
              <div className="flex items-center gap-3">
                <span className="text-[2rem]">{f.icon}</span>
                <div>
                  <div className="font-['Playfair_Display',serif] text-[1.2rem] font-bold text-[#2c1f08]">
                    {f.label}
                  </div>
                  <div className="text-[0.8rem] text-[#9a7f52]">{f.time}</div>
                </div>
              </div>

              <p className="text-[0.85rem] text-[#9a7f52] font-light">{f.desc}</p>

              {/* Rating strip */}
              <div className="flex justify-between items-center bg-[rgba(160,120,64,0.06)] rounded px-3.5 py-2.5">
                <span className="text-[0.78rem] text-[#7a6340] font-medium uppercase tracking-[0.06em]">
                  Your Rating
                </span>
                <span className="font-['Playfair_Display',serif] text-[1.3rem] font-bold text-[#a07840]">
                  {user[f.ratingKey] ?? 800}
                </span>
              </div>

              <button
                onClick={() => handlePlay(f.id)}
                className="w-full py-3 rounded text-[#1a0f00] text-[0.95rem] font-semibold tracking-wide cursor-pointer transition-opacity duration-150 hover:opacity-[0.88]"
                style={{ background: "linear-gradient(135deg, #c9a96e 0%, #a07840 100%)" }}
              >
                Play {f.label}
              </button>
            </div>
          ))}
        </div>

        {/* ── Stats row ── */}
        <div className="grid grid-cols-4 gap-4 animate-[fadeUp_0.7s_ease_both]">
          {[
            { icon: "⚡", label: "Bullet",       value: user.bullet_rating ?? 800 },
            { icon: "🔥", label: "Blitz",         value: user.blitz_rating  ?? 800 },
            { icon: "⏱",  label: "Rapid",         value: user.rapid_rating  ?? 800 },
            {
              icon: "♟",
              label: "Member Since",
              value: user.created_at
                ? new Date(user.created_at).toLocaleDateString("en-IN", { month: "short", year: "numeric" })
                : "—",
            },
          ].map(({ icon, label, value }) => (
            <div
              key={label}
              className="flex flex-col items-center text-center bg-[rgba(255,252,245,0.95)] border border-[rgba(180,140,70,0.2)] rounded-md p-5 shadow-[0_2px_12px_rgba(120,80,20,0.06)]"
            >
              <span className="text-[1.4rem] mb-1.5">{icon}</span>
              <span className="text-[0.72rem] text-[#9a7f52] uppercase tracking-[0.08em] mb-1">{label}</span>
              <span className="font-['Playfair_Display',serif] text-[1.4rem] font-bold text-[#2c1f08]">
                {value}
              </span>
            </div>
          ))}
        </div>

      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600;700&family=DM+Sans:wght@300;400;500&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(24px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}