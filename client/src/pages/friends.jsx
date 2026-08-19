import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Logo from "../components/Logo";
import { IconUsers, IconHistory, IconUser, IconLogOut, IconZap } from "../components/Icons";
import { getApiUrl } from "../utils/apiUrl";
import { showToast } from "../utils/toast";
import ChallengeModal from "../components/ChallengeModal";
import { connectSocket } from "../socket/socket";

export default function Friends() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("friends"); // "friends" | "requests" | "add"
  const [user, setUser] = useState({});

  // Instant load from sessionStorage cache
  const [friendsData, setFriendsData] = useState(() => {
    try {
      const cached = sessionStorage.getItem("cached_friends");
      return cached ? JSON.parse(cached) : { friends: [], incoming: [], outgoing: [] };
    } catch {
      return { friends: [], incoming: [], outgoing: [] };
    }
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Search tab states
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [requestSentIds, setRequestSentIds] = useState(new Set());

  // Challenge modal state
  const [challengingFriend, setChallengingFriend] = useState(null);

  const token = localStorage.getItem("token");

  useEffect(() => {
    const stored = localStorage.getItem("user");
    if (!stored) { navigate("/"); return; }
    setUser(JSON.parse(stored));
    connectSocket();
  }, [navigate]);

  const fetchFriends = async (silent = false) => {
    if (!token) return;
    if (!silent && (!friendsData.friends || friendsData.friends.length === 0)) {
      setLoading(true);
    }
    setError("");
    try {
      const res = await fetch(`${getApiUrl()}/api/friends/list`, {
        headers: { Authorization: `Bearer ${token}` },
        credentials: "include",
      });
      const data = await res.json();
      if (res.ok) {
        setFriendsData(data);
        sessionStorage.setItem("cached_friends", JSON.stringify(data));
      } else {
        if (!silent) setError(data.message || "Failed to load friends");
      }
    } catch (err) {
      console.error("[fetchFriends error]:", err);
      if (!silent) setError("Network error fetching friends");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const isCached = friendsData.friends && friendsData.friends.length > 0;
    fetchFriends(isCached);
  }, []);

  const performSearch = async (query) => {
    if (!query || query.length < 2) return;
    setSearchLoading(true);
    try {
      const res = await fetch(
        `${getApiUrl()}/api/friends/search?username=${encodeURIComponent(query)}`,
        {
          headers: { Authorization: `Bearer ${token}` },
          credentials: "include",
        }
      );
      const data = await res.json();
      if (res.ok) {
        setSearchResults(data.users || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSearchLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab !== "add" || searchQuery.trim().length < 2) {
      if (searchQuery.trim().length === 0) setSearchResults([]);
      return;
    }
    const timer = setTimeout(() => {
      performSearch(searchQuery.trim());
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery, activeTab]);

  const handleSearch = (e) => {
    e.preventDefault();
    performSearch(searchQuery.trim());
  };

  const handleSendRequest = async (receiverId) => {
    try {
      const res = await fetch(`${getApiUrl()}/api/friends/request`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        credentials: "include",
        body: JSON.stringify({ receiverId }),
      });
      const data = await res.json();
      if (res.ok) {
        setRequestSentIds((prev) => new Set([...prev, receiverId]));
        showToast("Friend request sent!", "success");
        fetchFriends(true);
      } else {
        showToast(data.message || "Could not send friend request", "error");
      }
    } catch (err) {
      console.error(err);
      showToast("Error sending friend request", "error");
    }
  };

  const handleRespondRequest = async (requestId, accept) => {
    try {
      const res = await fetch(`${getApiUrl()}/api/friends/respond`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        credentials: "include",
        body: JSON.stringify({ requestId, accept }),
      });
      if (res.ok) {
        showToast(accept ? "Friend request accepted!" : "Request declined", accept ? "success" : "info");
        fetchFriends(true);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleRemoveFriend = async (friendId, username) => {
    try {
      const res = await fetch(`${getApiUrl()}/api/friends/${friendId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
        credentials: "include",
      });
      if (res.ok) {
        showToast(`Removed ${username} from friends`, "info");
        fetchFriends(true);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSendChallenge = ({ friendId, format, timeControl }) => {
    const socket = connectSocket();
    socket.emit("challengeFriend", { friendId, format, timeControl });
    setChallengingFriend(null);
    showToast("Challenge sent to friend!", "game");
  };

  const totalPendingRequests = friendsData.incoming.length;

  return (
    <div className="min-h-screen bg-[#1a0e07] text-[#f0e6d3] font-['DM_Sans',sans-serif] relative overflow-x-hidden">
      {/* Ambient background glow */}
      <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_top,rgba(196,163,90,0.08)_0%,transparent_70%)] pointer-events-none" />

      {/* HEADER NAVBAR */}
      <header className="relative z-20 flex items-center justify-between px-4 sm:px-6 py-4 border-b border-[rgba(196,163,90,0.15)] bg-[rgba(26,14,7,0.85)] backdrop-blur-xl">
        <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate("/home")}>
          <Logo size={32} />
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <button
            onClick={() => navigate("/home")}
            className="py-2 px-3 sm:px-4 rounded-lg bg-[rgba(196,163,90,0.12)] border border-[rgba(196,163,90,0.3)] text-[#e8a838] text-xs font-semibold hover:bg-[rgba(196,163,90,0.25)] transition-all flex items-center gap-1.5"
          >
            ← Home
          </button>
          <button
            onClick={() => navigate("/history")}
            className="hidden sm:flex py-2 px-4 rounded-lg bg-transparent border border-[rgba(196,163,90,0.25)] text-[#c4a882] text-xs font-medium hover:border-[#c4a35a] hover:text-[#f0e6d3] transition-all items-center gap-1.5"
          >
            <IconHistory size={15} /> History
          </button>
          <button
            onClick={() => navigate("/profile")}
            className="py-2 px-3 sm:px-4 rounded-lg bg-transparent border border-[rgba(196,163,90,0.25)] text-[#c4a882] text-xs font-medium hover:border-[#c4a35a] hover:text-[#f0e6d3] transition-all flex items-center gap-1.5"
          >
            <IconUser size={15} className="text-[#c4a35a]" /> {user.username}
          </button>
          <button
            onClick={() => { localStorage.clear(); navigate("/"); showToast("Signed out", "info"); }}
            className="hidden sm:flex py-2 px-4 rounded-lg bg-transparent border border-[rgba(229,57,53,0.3)] text-[#e53935] text-xs font-semibold hover:bg-[rgba(229,57,53,0.15)] transition-all items-center gap-1.5"
          >
            <IconLogOut size={15} /> Sign Out
          </button>
        </div>
      </header>

      {/* MAIN CONTENT */}
      <main className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 py-8">

        {/* HERO TITLE CONTAINER */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8 pb-6 border-b border-[rgba(196,163,90,0.15)]">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-[rgba(196,163,90,0.15)] border border-[rgba(196,163,90,0.3)] flex items-center justify-center text-2xl text-[#e8a838] shadow-[0_8px_20px_rgba(0,0,0,0.4)]">
              👥
            </div>
            <div>
              <h1 className="font-['Playfair_Display',serif] text-2xl sm:text-3xl font-bold text-[#f0e6d3]">
                Social & Friends
              </h1>
              <p className="text-xs text-[#8a7055] font-medium">
                Connect with chess players and challenge friends to live matches
              </p>
            </div>
          </div>

          <button
            onClick={() => fetchFriends()}
            className="py-2 px-4 rounded-xl bg-[rgba(0,0,0,0.3)] border border-[rgba(196,163,90,0.2)] text-[#c4a882] text-xs font-semibold hover:border-[#c4a35a] hover:text-white transition-all flex items-center gap-2"
          >
            ↻ Refresh Friends
          </button>
        </div>

        {/* TABS HEADER */}
        <div className="flex items-center gap-2 mb-6 border-b border-[rgba(196,163,90,0.15)] pb-3 overflow-x-auto">
          <button
            onClick={() => setActiveTab("friends")}
            className={`py-2.5 px-5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap ${
              activeTab === "friends"
                ? "bg-[rgba(196,163,90,0.18)] border border-[rgba(196,163,90,0.35)] text-[#e8a838] shadow-sm"
                : "bg-transparent text-[#8a7055] hover:text-[#c4a882]"
            }`}
          >
            <IconUsers size={15} /> My Friends ({friendsData.friends.length})
          </button>

          <button
            onClick={() => setActiveTab("requests")}
            className={`py-2.5 px-5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap ${
              activeTab === "requests"
                ? "bg-[rgba(196,163,90,0.18)] border border-[rgba(196,163,90,0.35)] text-[#e8a838] shadow-sm"
                : "bg-transparent text-[#8a7055] hover:text-[#c4a882]"
            }`}
          >
            Requests
            {totalPendingRequests > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-[#e8a838] text-[#1a0e07] text-[10px] font-black">
                {totalPendingRequests}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab("add")}
            className={`py-2.5 px-5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap ${
              activeTab === "add"
                ? "bg-[rgba(196,163,90,0.18)] border border-[rgba(196,163,90,0.35)] text-[#e8a838] shadow-sm"
                : "bg-transparent text-[#8a7055] hover:text-[#c4a882]"
            }`}
          >
            ➕ Add Friends
          </button>
        </div>

        {/* TAB CONTENTS */}
        {loading ? (
          <div className="py-20 text-center text-sm text-[#8a7055] font-medium flex items-center justify-center gap-2">
            <span className="animate-spin">♟</span> Loading friends list...
          </div>
        ) : error ? (
          <div className="p-4 rounded-xl bg-[rgba(229,57,53,0.15)] border border-[rgba(229,57,53,0.3)] text-[#e53935] text-xs font-semibold text-center">
            {error}
          </div>
        ) : (
          <div>
            {/* TAB 1: FRIENDS GRID */}
            {activeTab === "friends" && (
              <div>
                {friendsData.friends.length === 0 ? (
                  <div className="py-20 text-center rounded-2xl bg-[rgba(0,0,0,0.25)] border border-[rgba(196,163,90,0.15)] p-8">
                    <span className="text-4xl block mb-3">♟️</span>
                    <h3 className="font-['Playfair_Display',serif] text-xl font-bold text-[#f0e6d3] mb-1">
                      No Friends Added Yet
                    </h3>
                    <p className="text-xs text-[#8a7055] mb-6">
                      Search for players by username and send friend requests!
                    </p>
                    <button
                      onClick={() => setActiveTab("add")}
                      className="py-3 px-6 rounded-xl bg-gradient-to-r from-[#c4a35a] to-[#e8a838] text-[#1a0e07] text-xs font-bold hover:brightness-110 transition-all shadow-[0_4px_16px_rgba(232,168,56,0.25)]"
                    >
                      Search Players →
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {friendsData.friends.map((friend) => (
                      <div
                        key={friend.id}
                        className="p-5 rounded-2xl bg-[rgba(0,0,0,0.3)] border border-[rgba(196,163,90,0.18)] hover:border-[rgba(196,163,90,0.35)] transition-all flex items-center justify-between gap-4 shadow-[0_8px_24px_rgba(0,0,0,0.3)]"
                      >
                        <div className="flex items-center gap-3.5 min-w-0">
                          <div className="w-12 h-12 rounded-xl bg-[rgba(196,163,90,0.12)] border border-[rgba(196,163,90,0.3)] flex items-center justify-center text-xl text-[#c4a35a] shrink-0">
                            ♟
                          </div>
                          <div className="min-w-0">
                            <div className="font-bold text-sm text-[#f0e6d3] truncate">
                              {friend.username}
                            </div>
                            <div className="flex items-center gap-1.5 text-xs mt-1">
                              <span
                                className={`w-2 h-2 rounded-full ${
                                  friend.isOnline ? "bg-[#81b64c] shadow-[0_0_8px_#81b64c]" : "bg-[#8a7055]"
                                }`}
                              />
                              <span className={friend.isOnline ? "text-[#81b64c] font-semibold" : "text-[#8a7055]"}>
                                {friend.isOnline ? "Online" : "Offline"}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          {friend.isOnline && (
                            <button
                              onClick={() => setChallengingFriend(friend)}
                              className="py-2 px-3 rounded-xl bg-[#81b64c] text-[#0d1f05] font-extrabold text-xs hover:brightness-110 transition-all flex items-center gap-1 shadow-sm"
                            >
                              ⚔️ Play
                            </button>
                          )}
                          <button
                            onClick={() => handleRemoveFriend(friend.id, friend.username)}
                            className="p-2 rounded-xl bg-[rgba(229,57,53,0.1)] text-[#e53935] hover:bg-[rgba(229,57,53,0.25)] transition-all text-sm"
                            title="Remove Friend"
                          >
                            🗑️
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* TAB 2: REQUESTS */}
            {activeTab === "requests" && (
              <div className="space-y-8">
                {/* Incoming Requests */}
                <div>
                  <h3 className="text-xs font-extrabold uppercase tracking-widest text-[#8a7055] mb-3">
                    Incoming Requests ({friendsData.incoming.length})
                  </h3>
                  {friendsData.incoming.length === 0 ? (
                    <div className="p-5 rounded-2xl bg-[rgba(0,0,0,0.2)] border border-[rgba(196,163,90,0.1)] text-xs text-[#8a7055] font-medium italic">
                      No incoming friend requests.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {friendsData.incoming.map((req) => (
                        <div
                          key={req.request_id}
                          className="p-4 rounded-2xl bg-[rgba(0,0,0,0.3)] border border-[rgba(196,163,90,0.18)] flex items-center justify-between gap-4"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-[rgba(196,163,90,0.15)] text-[#e8a838] flex items-center justify-center text-lg">
                              📩
                            </div>
                            <span className="font-bold text-sm text-[#f0e6d3]">{req.username}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleRespondRequest(req.request_id, true)}
                              className="py-1.5 px-3 rounded-xl bg-[#81b64c] text-[#0d1f05] font-extrabold text-xs hover:brightness-110 transition-all"
                            >
                              Accept ✓
                            </button>
                            <button
                              onClick={() => handleRespondRequest(req.request_id, false)}
                              className="py-1.5 px-3 rounded-xl bg-[rgba(229,57,53,0.18)] border border-[rgba(229,57,53,0.3)] text-[#e53935] font-semibold text-xs hover:bg-[rgba(229,57,53,0.3)] transition-all"
                            >
                              Decline
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Outgoing Requests */}
                <div>
                  <h3 className="text-xs font-extrabold uppercase tracking-widest text-[#8a7055] mb-3">
                    Outgoing Pending ({friendsData.outgoing.length})
                  </h3>
                  {friendsData.outgoing.length === 0 ? (
                    <div className="p-5 rounded-2xl bg-[rgba(0,0,0,0.2)] border border-[rgba(196,163,90,0.1)] text-xs text-[#8a7055] font-medium italic">
                      No pending outgoing requests.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {friendsData.outgoing.map((req) => (
                        <div
                          key={req.request_id}
                          className="p-4 rounded-2xl bg-[rgba(0,0,0,0.3)] border border-[rgba(196,163,90,0.18)] flex items-center justify-between gap-4"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-[rgba(196,163,90,0.15)] text-[#e8a838] flex items-center justify-center text-lg">
                              ⏳
                            </div>
                            <span className="font-bold text-sm text-[#f0e6d3]">{req.username}</span>
                          </div>
                          <span className="px-3 py-1 rounded-full bg-[rgba(232,168,56,0.15)] border border-[rgba(232,168,56,0.3)] text-[#e8a838] text-xs font-semibold">
                            Pending...
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* TAB 3: ADD FRIENDS (SEARCH) */}
            {activeTab === "add" && (
              <div className="max-w-2xl space-y-6">
                <form onSubmit={handleSearch} className="flex gap-3">
                  <input
                    type="text"
                    placeholder="Search player by username..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="flex-1 px-4 py-3.5 rounded-2xl bg-[rgba(0,0,0,0.35)] border border-[rgba(196,163,90,0.25)] text-[#f0e6d3] text-sm focus:border-[#e8a838] outline-none transition-all placeholder:text-[#8a7055]"
                  />
                  <button
                    type="submit"
                    disabled={searchLoading}
                    className="px-6 py-3.5 rounded-2xl bg-gradient-to-r from-[#c4a35a] to-[#e8a838] text-[#1a0e07] font-bold text-sm hover:brightness-110 transition-all shadow-[0_4px_16px_rgba(232,168,56,0.25)]"
                  >
                    {searchLoading ? "Searching..." : "Search"}
                  </button>
                </form>

                {searchResults.length > 0 && (
                  <div className="space-y-3">
                    {searchResults.map((userResult) => {
                      const isAlreadyFriend = friendsData.friends.some((f) => f.id === userResult.id);
                      const isPendingOutgoing = friendsData.outgoing.some((o) => o.receiver_id === userResult.id);
                      const isPendingIncoming = friendsData.incoming.some((i) => i.sender_id === userResult.id);
                      const hasJustSent = requestSentIds.has(userResult.id);

                      return (
                        <div
                          key={userResult.id}
                          className="p-4 rounded-2xl bg-[rgba(0,0,0,0.3)] border border-[rgba(196,163,90,0.18)] flex items-center justify-between gap-4"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-[rgba(196,163,90,0.15)] text-[#c4a35a] flex items-center justify-center text-lg">
                              ♟
                            </div>
                            <span className="font-bold text-sm text-[#f0e6d3]">{userResult.username}</span>
                          </div>

                          <div>
                            {isAlreadyFriend ? (
                              <span className="text-xs text-[#81b64c] font-bold">Friends ✓</span>
                            ) : isPendingOutgoing || hasJustSent ? (
                              <span className="px-3 py-1 rounded-full bg-[rgba(232,168,56,0.15)] border border-[rgba(232,168,56,0.3)] text-[#e8a838] text-xs font-semibold">
                                Requested ⏳
                              </span>
                            ) : isPendingIncoming ? (
                              <span className="text-xs text-[#81b64c] font-semibold">Sent you request</span>
                            ) : (
                              <button
                                onClick={() => handleSendRequest(userResult.id)}
                                className="py-2 px-4 rounded-xl bg-[rgba(196,163,90,0.18)] border border-[rgba(196,163,90,0.35)] text-[#e8a838] font-bold text-xs hover:bg-[rgba(196,163,90,0.3)] transition-all"
                              >
                                ➕ Add Friend
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {searchResults.length === 0 && searchQuery.trim().length >= 2 && !searchLoading && (
                  <div className="p-6 rounded-2xl bg-[rgba(0,0,0,0.2)] text-center text-xs text-[#8a7055] font-medium italic">
                    No players found matching "{searchQuery}".
                  </div>
                )}
              </div>
            )}
          </div>
        )}

      </main>

      {/* Challenge Modal */}
      {challengingFriend && (
        <ChallengeModal
          friend={challengingFriend}
          onClose={() => setChallengingFriend(null)}
          onSendChallenge={handleSendChallenge}
        />
      )}
    </div>
  );
}
