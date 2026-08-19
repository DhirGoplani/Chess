import { IconUser, IconZap, IconCrown, IconHistory, IconShield, IconUsers } from "./Icons";

export default function ProfileModal({ isOpen, onClose, user, onNavigateHistory }) {
  if (!isOpen || !user) return null;

  const joinDate = user.createdAt
    ? new Date(user.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
    : "Jul 25, 2024";

  const initialLetter = user.username ? user.username.charAt(0).toUpperCase() : "N";

  const ratings = [
    {
      id: "rapid",
      name: "Rapid",
      icon: "⏱",
      rating: user.rapid_rating ?? 1155,
      color: "#81b64c",
      change: "-35",
      isNegative: true,
    },
    {
      id: "bullet",
      name: "Bullet",
      icon: "⚡",
      rating: user.bullet_rating ?? 805,
      color: "#e8a838",
      change: "+12",
      isNegative: false,
    },
    {
      id: "blitz",
      name: "Blitz",
      icon: "🔥",
      rating: user.blitz_rating ?? 810,
      color: "#6baed6",
      change: "+5",
      isNegative: false,
    },
  ];

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-[9999] bg-[rgba(10,6,3,0.88)] backdrop-blur-md flex items-center justify-center p-3 sm:p-5 animate-[fadeIn_0.15s_ease-out_both]"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl bg-[#1e120a] border border-[rgba(196,163,90,0.35)] shadow-[0_24px_70px_rgba(0,0,0,0.9)] animate-[popIn_0.2s_ease-out_both] relative"
      >
        {/* Top Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 rounded-full bg-[rgba(0,0,0,0.4)] text-[#c4a35a] flex items-center justify-center text-sm hover:bg-[rgba(196,163,90,0.3)] hover:text-white transition-all z-20"
        >
          ✕
        </button>

        {/* 1. CHESS.COM PROFILE HEADER */}
        <div className="p-6 bg-gradient-to-r from-[#2c1a0e] via-[#24150b] to-[#1e120a] border-b border-[rgba(196,163,90,0.2)]">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
            {/* Purple Chess.com Avatar Box */}
            <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-[#7c3aed] to-[#5b21b6] border-2 border-[#a78bfa] flex items-center justify-center shadow-[0_8px_24px_rgba(124,58,237,0.3)] shrink-0">
              <span className="font-['Playfair_Display',serif] text-4xl font-black text-white select-none">
                {initialLetter}
              </span>
            </div>

            {/* Profile Information */}
            <div className="flex-1">
              <div className="flex items-center gap-2.5 flex-wrap mb-1">
                <h2 className="font-['Playfair_Display',serif] text-2xl font-bold text-[#f0e6d3]">
                  {user.username}
                </h2>
                <span className="text-base" title="India">🇮🇳</span>
                <span className="px-2 py-0.5 rounded text-[10px] font-extrabold uppercase bg-[rgba(196,163,90,0.18)] text-[#e8a838] border border-[rgba(196,163,90,0.3)]">
                  PLAYER
                </span>
              </div>

              <p className="text-xs text-[#c4a882] font-medium mb-3">
                {user.email || user.username}
              </p>

              {/* Status Meta Line */}
              <div className="flex items-center gap-4 text-[11px] text-[#8a7055] font-medium flex-wrap pt-2 border-t border-[rgba(196,163,90,0.12)]">
                <span><strong className="text-[#c4a882]">{joinDate}</strong> Joined</span>
                <span>•</span>
                <span className="flex items-center gap-1"><IconUsers size={12} className="text-[#c4a35a]" /> <strong className="text-[#c4a882]">Friends</strong></span>
                <span>•</span>
                <span className="flex items-center gap-1 text-[#81b64c] font-semibold"><span className="w-2 h-2 rounded-full bg-[#81b64c] animate-pulse" /> Online now</span>
              </div>
            </div>
          </div>
        </div>

        {/* 2. CHESS.COM RATING CARDS ROW */}
        <div className="p-6 space-y-6">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#8a7055] mb-3">
              Stats Overview
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {ratings.map((r) => (
                <div
                  key={r.id}
                  className="p-4 rounded-xl bg-[rgba(0,0,0,0.35)] border border-[rgba(196,163,90,0.18)] hover:border-[rgba(196,163,90,0.35)] transition-all relative overflow-hidden group"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-base">{r.icon}</span>
                      <span className="text-xs font-semibold text-[#c4a882]">{r.name}</span>
                    </div>
                    {r.change && (
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${r.isNegative ? "bg-[rgba(229,57,53,0.15)] text-[#e53935]" : "bg-[rgba(129,182,76,0.15)] text-[#81b64c]"}`}>
                        {r.change}
                      </span>
                    )}
                  </div>
                  <div className="text-2xl font-black text-[#f0e6d3] mb-3">
                    {r.rating}
                  </div>
                  {/* Chess.com Sparkline Visual Bar */}
                  <div className="h-2 w-full rounded-full bg-[rgba(255,255,255,0.06)] overflow-hidden flex items-end">
                    <div className="h-full rounded-full transition-all duration-500" style={{ width: `${Math.min(100, (r.rating / 1800) * 100)}%`, background: r.color }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 3. RECENT GAMES PREVIEW */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#8a7055]">
                Recent Games
              </h3>
              <button
                onClick={() => { onClose(); onNavigateHistory(); }}
                className="text-xs text-[#e8a838] hover:underline font-semibold"
              >
                View All →
              </button>
            </div>

            <div className="rounded-xl border border-[rgba(196,163,90,0.15)] overflow-hidden bg-[rgba(0,0,0,0.25)]">
              <table className="w-full text-left text-xs">
                <thead className="bg-[rgba(0,0,0,0.4)] text-[#8a7055] font-semibold uppercase tracking-wider border-b border-[rgba(196,163,90,0.12)]">
                  <tr>
                    <th className="py-2.5 px-4">Players</th>
                    <th className="py-2.5 px-3 text-center">Result</th>
                    <th className="py-2.5 px-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[rgba(196,163,90,0.08)]">
                  <tr className="hover:bg-[rgba(196,163,90,0.06)] transition-colors">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <span className="text-xs">⏱</span>
                        <div>
                          <div className="font-semibold text-[#f0e6d3] flex items-center gap-1.5">
                            {user.username} <span className="text-[10px] text-[#8a7055]">({user.rapid_rating ?? 1155})</span> 🇮🇳
                          </div>
                          <div className="text-[11px] text-[#8a7055] flex items-center gap-1.5">
                            Computer <span className="text-[10px] text-[#8a7055]">(1100)</span>
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-3 text-center">
                      <span className="px-2 py-1 rounded bg-[rgba(129,182,76,0.18)] text-[#81b64c] font-bold text-[11px] border border-[rgba(129,182,76,0.3)]">
                        1 - 0
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right">
                      <button
                        onClick={() => { onClose(); onNavigateHistory(); }}
                        className="py-1 px-3 rounded-lg bg-[rgba(196,163,90,0.12)] border border-[rgba(196,163,90,0.25)] text-[#e8a838] font-semibold text-[11px] hover:bg-[rgba(196,163,90,0.25)] transition-all"
                      >
                        Review
                      </button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* 4. FOOTER ACTION BUTTONS */}
          <div className="flex gap-3 pt-2">
            <button
              onClick={() => { onClose(); onNavigateHistory(); }}
              className="flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-[#c4a35a] to-[#e8a838] text-[#1a0e07] text-xs font-bold hover:brightness-110 transition-all flex items-center justify-center gap-2 shadow-[0_4px_16px_rgba(232,168,56,0.25)]"
            >
              <IconHistory size={16} /> Open Full Match History
            </button>
            <button
              onClick={onClose}
              className="py-3 px-5 rounded-xl bg-[rgba(0,0,0,0.3)] border border-[rgba(196,163,90,0.25)] text-[#c4a882] text-xs font-semibold hover:border-[#c4a35a] hover:text-white transition-all"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
