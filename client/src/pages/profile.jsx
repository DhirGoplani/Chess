import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Logo from "../components/Logo";
import { IconUser, IconUsers, IconHistory, IconLogOut, IconCrown, IconShield } from "../components/Icons";
import { showToast } from "../utils/toast";
import { getApiUrl } from "../utils/apiUrl";

export default function Profile() {
  const navigate = useNavigate();
  const [user, setUser] = useState({});
  const [friendsList, setFriendsList] = useState(() => {
    try {
      const cached = sessionStorage.getItem("cached_friends");
      return cached ? (JSON.parse(cached).friends || []) : [];
    } catch {
      return [];
    }
  });

  const [recentGames, setRecentGames] = useState(() => {
    try {
      const cached = sessionStorage.getItem("cached_history");
      return cached ? JSON.parse(cached).slice(0, 3) : [];
    } catch {
      return [];
    }
  });

  const [loadingGames, setLoadingGames] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem("user");
    if (!stored) {
      navigate("/");
      return;
    }
    setUser(JSON.parse(stored));

    const token = localStorage.getItem("token");
    if (token) {
      // 1. Fetch Real Friends List
      fetch(`${getApiUrl()}/api/friends/list`, {
        headers: { Authorization: `Bearer ${token}` },
        credentials: "include",
      })
        .then((res) => res.json())
        .then((data) => {
          if (data && data.friends) {
            setFriendsList(data.friends);
            sessionStorage.setItem("cached_friends", JSON.stringify(data));
          }
        })
        .catch(() => {});

      // 2. Fetch Real Games History
      setLoadingGames(true);
      fetch(`${getApiUrl()}/api/games/history`, {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then((res) => res.json())
        .then((data) => {
          if (data && data.games) {
            setRecentGames(data.games.slice(0, 3));
            sessionStorage.setItem("cached_history", JSON.stringify(data.games));
          }
        })
        .catch(() => {})
        .finally(() => setLoadingGames(false));
    }
  }, [navigate]);

  const joinDate = user.createdAt
    ? new Date(user.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
    : user.created_at
    ? new Date(user.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
    : "Member";

  const initialLetter = user.username ? user.username.charAt(0).toUpperCase() : "U";

  const ratings = [
    { id: "rapid", name: "Rapid", icon: "⏱", rating: user.rapid_rating ?? 800, color: "#81b64c" },
    { id: "bullet", name: "Bullet", icon: "⚡", rating: user.bullet_rating ?? 800, color: "#e8a838" },
    { id: "blitz", name: "Blitz", icon: "🔥", rating: user.blitz_rating ?? 800, color: "#6baed6" },
  ];

  return (
    <div className="min-h-screen bg-[#1a0e07] text-[#f0e6d3] font-['DM_Sans',sans-serif] relative overflow-x-hidden">
      {/* Ambient background glow */}
      <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_top,rgba(196,163,90,0.08)_0%,transparent_70%)] pointer-events-none" />

      {/* NAVBAR */}
      <header className="relative z-20 flex items-center justify-between px-6 py-4 border-b border-[rgba(196,163,90,0.15)] bg-[rgba(26,14,7,0.85)] backdrop-blur-xl">
        <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate("/home")}>
          <Logo size={32} />
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate("/home")}
            className="py-2 px-4 rounded-lg bg-[rgba(196,163,90,0.12)] border border-[rgba(196,163,90,0.3)] text-[#e8a838] text-xs font-semibold hover:bg-[rgba(196,163,90,0.25)] transition-all flex items-center gap-1.5"
          >
            ← Back to Home
          </button>
          <button
            onClick={() => navigate("/history")}
            className="py-2 px-4 rounded-lg bg-transparent border border-[rgba(196,163,90,0.25)] text-[#c4a882] text-xs font-medium hover:border-[#c4a35a] hover:text-[#f0e6d3] transition-all flex items-center gap-1.5"
          >
            <IconHistory size={15} /> Match History
          </button>
          <button
            onClick={() => { localStorage.clear(); navigate("/"); showToast("Signed out", "info"); }}
            className="py-2 px-4 rounded-lg bg-transparent border border-[rgba(229,57,53,0.3)] text-[#e53935] text-xs font-semibold hover:bg-[rgba(229,57,53,0.15)] transition-all flex items-center gap-1.5"
          >
            <IconLogOut size={15} /> Sign Out
          </button>
        </div>
      </header>

      {/* MAIN CONTAINER */}
      <main className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 py-8">

        {/* 1. TOP CHESS.COM PROFILE CARD BANNER */}
        <div className="rounded-2xl bg-gradient-to-b from-[#2c1a0e] via-[#22130a] to-[#1e120a] border border-[rgba(196,163,90,0.3)] shadow-[0_20px_50px_rgba(0,0,0,0.8)] p-6 sm:p-8 mb-8 overflow-hidden relative">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
            <div className="flex items-center gap-6">
              {/* Avatar Box */}
              <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl bg-gradient-to-br from-[#7c3aed] to-[#5b21b6] border-4 border-[#a78bfa] flex items-center justify-center shadow-[0_12px_32px_rgba(124,58,237,0.4)] shrink-0">
                <span className="font-['Playfair_Display',serif] text-5xl font-black text-white select-none">
                  {initialLetter}
                </span>
              </div>

              <div>
                <div className="flex items-center gap-3 flex-wrap mb-1">
                  <h1 className="font-['Playfair_Display',serif] text-3xl sm:text-4xl font-bold text-[#f0e6d3]">
                    {user.username}
                  </h1>
                  <span className="px-2.5 py-1 rounded-md text-xs font-extrabold uppercase bg-[rgba(196,163,90,0.18)] text-[#e8a838] border border-[rgba(196,163,90,0.3)]">
                    PLAYER
                  </span>
                </div>

                <p className="text-sm text-[#c4a882] font-medium mb-3">
                  {user.email || user.username}
                </p>

                <div className="flex items-center gap-4 text-xs text-[#8a7055] font-medium flex-wrap pt-2 border-t border-[rgba(196,163,90,0.12)]">
                  {joinDate !== "Member" && (
                    <>
                      <span>Joined <strong className="text-[#c4a882]">{joinDate}</strong></span>
                      <span>•</span>
                    </>
                  )}
                  <span className="flex items-center gap-1.5 cursor-pointer hover:text-[#e8a838]" onClick={() => navigate("/friends")}>
                    <IconUsers size={14} className="text-[#c4a35a]" /> <strong className="text-[#c4a882]">{friendsList.length} {friendsList.length === 1 ? "Friend" : "Friends"}</strong>
                  </span>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2 w-full sm:w-auto">
              <button
                onClick={() => navigate("/history")}
                className="flex-1 sm:flex-initial py-3 px-5 rounded-xl bg-gradient-to-r from-[#c4a35a] to-[#e8a838] text-[#1a0e07] font-bold text-xs hover:brightness-110 transition-all flex items-center justify-center gap-2 shadow-[0_4px_16px_rgba(232,168,56,0.25)]"
              >
                <IconHistory size={16} /> Full Match History
              </button>
            </div>
          </div>

          {/* Sub Navigation Tabs */}
          <div className="flex items-center gap-6 mt-8 pt-4 border-t border-[rgba(196,163,90,0.15)] text-xs font-bold text-[#8a7055]">
            <span className="text-[#e8a838] pb-1 border-b-2 border-[#e8a838] cursor-pointer">Overview</span>
            <span className="hover:text-[#c4a882] cursor-pointer transition-colors" onClick={() => navigate("/history")}>Games</span>
            <span className="hover:text-[#c4a882] cursor-pointer transition-colors" onClick={() => navigate("/friends")}>Friends</span>
          </div>
        </div>

        {/* 2. MAIN CONTENT LAYOUT (Two Columns) */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

          {/* LEFT COLUMN (2 Cols) — Ratings & Real Recent Games */}
          <div className="lg:col-span-2 space-y-8">

            {/* Rating Cards */}
            <div>
              <h2 className="text-xs font-extrabold uppercase tracking-widest text-[#8a7055] mb-4">
                Ratings Overview
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {ratings.map((r) => (
                  <div
                    key={r.id}
                    className="p-5 rounded-2xl bg-[rgba(0,0,0,0.35)] border border-[rgba(196,163,90,0.18)] hover:border-[rgba(196,163,90,0.4)] transition-all relative overflow-hidden group shadow-[0_8px_24px_rgba(0,0,0,0.4)]"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <span className="text-xl">{r.icon}</span>
                        <span className="text-xs font-bold text-[#c4a882]">{r.name}</span>
                      </div>
                    </div>

                    <div className="text-3xl font-black text-[#f0e6d3] mb-4">
                      {r.rating}
                    </div>

                    {/* Sparkline Rating Bar */}
                    <div className="h-2 w-full rounded-full bg-[rgba(255,255,255,0.06)] overflow-hidden">
                      <div className="h-full rounded-full transition-all duration-700" style={{ width: `${Math.min(100, (r.rating / 1800) * 100)}%`, background: r.color }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* REAL Recent Games History Table */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xs font-extrabold uppercase tracking-widest text-[#8a7055]">
                  Recent Games
                </h2>
                <button
                  onClick={() => navigate("/history")}
                  className="text-xs text-[#e8a838] hover:underline font-bold"
                >
                  View All History →
                </button>
              </div>

              <div className="rounded-2xl border border-[rgba(196,163,90,0.2)] overflow-hidden bg-[rgba(0,0,0,0.3)] shadow-[0_12px_32px_rgba(0,0,0,0.5)]">
                {loadingGames ? (
                  <div className="py-8 text-center text-xs text-[#8a7055]">Loading recent matches...</div>
                ) : recentGames.length === 0 ? (
                  <div className="py-8 text-center text-xs text-[#8a7055] italic">
                    No games played yet. Play a match to see your history here!
                  </div>
                ) : (
                  <table className="w-full text-left text-xs">
                    <thead className="bg-[rgba(0,0,0,0.5)] text-[#8a7055] font-extrabold uppercase tracking-wider border-b border-[rgba(196,163,90,0.15)]">
                      <tr>
                        <th className="py-3 px-5">Players</th>
                        <th className="py-3 px-4 text-center">Result</th>
                        <th className="py-3 px-4 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[rgba(196,163,90,0.08)]">
                      {recentGames.map((game) => {
                        const isWin = game.winner_id === user.id;
                        const isDraw = game.result === "draw" || !game.winner_id;
                        return (
                          <tr key={game.id} className="hover:bg-[rgba(196,163,90,0.06)] transition-colors">
                            <td className="py-4 px-5">
                              <div className="flex items-center gap-3">
                                <span className="text-base">♟</span>
                                <div>
                                  <div className="font-bold text-[#f0e6d3] flex items-center gap-2">
                                    {game.white_username || "White"} vs {game.black_username || "Black"}
                                  </div>
                                  <div className="text-[11px] text-[#8a7055] mt-0.5">
                                    {game.format ? game.format.toUpperCase() : "CHESS"}
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td className="py-4 px-4 text-center">
                              <span className={`px-2.5 py-1 rounded-md font-black text-xs border ${
                                isWin
                                  ? "bg-[rgba(129,182,76,0.18)] text-[#81b64c] border-[rgba(129,182,76,0.3)]"
                                  : isDraw
                                  ? "bg-[rgba(196,163,90,0.18)] text-[#c4a35a] border-[rgba(196,163,90,0.3)]"
                                  : "bg-[rgba(229,57,53,0.18)] text-[#e53935] border-[rgba(229,57,53,0.3)]"
                              }`}>
                                {isWin ? "WIN" : isDraw ? "DRAW" : "LOSS"}
                              </span>
                            </td>
                            <td className="py-4 px-4 text-right">
                              <button
                                onClick={() => navigate(`/analysis/${game.id}`)}
                                className="py-1.5 px-4 rounded-xl bg-[rgba(196,163,90,0.12)] border border-[rgba(196,163,90,0.3)] text-[#e8a838] font-bold text-xs hover:bg-[rgba(196,163,90,0.25)] transition-all"
                              >
                                Review
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            </div>

          </div>

          {/* RIGHT COLUMN (1 Col) — Friends & Account Info */}
          <div className="space-y-6">

            {/* Friends Card */}
            <div className="p-5 rounded-2xl bg-[rgba(0,0,0,0.35)] border border-[rgba(196,163,90,0.18)]">
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-xs font-extrabold uppercase tracking-widest text-[#8a7055]">
                  Friends ({friendsList.length})
                </h4>
                <button
                  onClick={() => navigate("/friends")}
                  className="text-xs font-bold text-[#e8a838] hover:underline"
                >
                  Manage →
                </button>
              </div>

              {friendsList.filter((f) => f.isOnline).length > 0 ? (
                <div className="grid grid-cols-2 gap-2.5">
                  {friendsList.filter((f) => f.isOnline).slice(0, 4).map((friend) => (
                    <div
                      key={friend.id}
                      onClick={() => navigate("/friends")}
                      className="p-2.5 rounded-xl bg-[rgba(196,163,90,0.1)] border border-[rgba(196,163,90,0.2)] hover:border-[#c4a35a] transition-all cursor-pointer flex items-center gap-2"
                    >
                      <div className="w-7 h-7 rounded-lg bg-[rgba(196,163,90,0.2)] text-[#c4a35a] flex items-center justify-center font-bold text-xs shrink-0 relative">
                        {friend.username ? friend.username.charAt(0).toUpperCase() : "♟"}
                        <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-[#81b64c]" />
                      </div>
                      <span className="text-xs font-semibold text-[#f0e6d3] truncate">
                        {friend.username}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-4">
                  <p className="text-xs text-[#8a7055] mb-2 italic">
                    {friendsList.length > 0 ? "No friends online right now." : "No friends added yet."}
                  </p>
                  <button
                    onClick={() => navigate("/friends")}
                    className="py-1.5 px-3 rounded-lg bg-[rgba(196,163,90,0.15)] border border-[rgba(196,163,90,0.3)] text-[#e8a838] text-xs font-semibold hover:bg-[rgba(196,163,90,0.25)] transition-all"
                  >
                    Manage Friends
                  </button>
                </div>
              )}
            </div>

            {/* Account Details Box */}
            <div className="p-5 rounded-2xl bg-[rgba(0,0,0,0.35)] border border-[rgba(196,163,90,0.18)] space-y-3">
              <h4 className="text-xs font-extrabold uppercase tracking-widest text-[#8a7055]">
                Account Info
              </h4>
              <div className="flex items-center justify-between text-xs pt-1">
                <span className="text-[#8a7055]">Membership</span>
                <span className="font-bold text-[#81b64c] flex items-center gap-1">
                  <IconShield size={14} /> Free Player
                </span>
              </div>
              {user.email && (
                <div className="flex items-center justify-between text-xs pt-2 border-t border-[rgba(196,163,90,0.1)]">
                  <span className="text-[#8a7055]">Email</span>
                  <span className="font-semibold text-[#c4a882]">{user.email}</span>
                </div>
              )}
            </div>

          </div>

        </div>

      </main>
    </div>
  );
}
