import { useState, useEffect } from "react";
import { getApiUrl } from "../utils/apiUrl";

export default function FriendsModal({ isOpen, onClose, onChallengeFriend }) {
  const [activeTab, setActiveTab] = useState("friends"); // "friends" | "requests" | "add"
  const [friendsData, setFriendsData] = useState({ friends: [], incoming: [], outgoing: [] });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Search tab states
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [requestSentIds, setRequestSentIds] = useState(new Set());

  const token = localStorage.getItem("token");

  const fetchFriends = async () => {
    if (!token) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${getApiUrl()}/api/friends/list`, {
        headers: { Authorization: `Bearer ${token}` },
        credentials: "include",
      });
      const data = await res.json();
      if (res.ok) {
        setFriendsData(data);
      } else {
        setError(data.message || "Failed to load friends");
      }
    } catch (err) {
      console.error("[fetchFriends error]:", err);
      setError("Network error fetching friends");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchFriends();
    }
  }, [isOpen]);

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchQuery.trim() || searchQuery.trim().length < 2) return;
    setSearchLoading(true);
    try {
      const res = await fetch(
        `${getApiUrl()}/api/friends/search?username=${encodeURIComponent(
          searchQuery.trim()
        )}`,
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
        fetchFriends();
      } else {
        alert(data.message || "Could not send friend request");
      }
    } catch (err) {
      console.error(err);
      alert("Error sending friend request");
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
        fetchFriends();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleRemoveFriend = async (friendId, username) => {
    if (!window.confirm(`Are you sure you want to remove ${username} from your friends?`)) return;
    try {
      const res = await fetch(`${getApiUrl()}/api/friends/${friendId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
        credentials: "include",
      });
      if (res.ok) {
        fetchFriends();
      }
    } catch (err) {
      console.error(err);
    }
  };

  if (!isOpen) return null;

  const totalPendingRequests = friendsData.incoming.length;

  return (
    <div style={s.overlay} onClick={onClose}>
      <div style={s.modal} onClick={(e) => e.stopPropagation()}>
        {/* Modal Header */}
        <div style={s.header}>
          <div style={s.headerTitleRow}>
            <span style={s.headerIcon}>👥</span>
            <h2 style={s.title}>Social & Friends</h2>
          </div>
          <button style={s.closeBtn} onClick={onClose}>
            ✕
          </button>
        </div>

        {/* Tabs */}
        <div style={s.tabBar}>
          <button
            onClick={() => setActiveTab("friends")}
            style={{
              ...s.tabBtn,
              ...(activeTab === "friends" ? s.tabActive : {}),
            }}
          >
            My Friends ({friendsData.friends.length})
          </button>

          <button
            onClick={() => setActiveTab("requests")}
            style={{
              ...s.tabBtn,
              ...(activeTab === "requests" ? s.tabActive : {}),
            }}
          >
            Requests
            {totalPendingRequests > 0 && (
              <span style={s.badge}>{totalPendingRequests}</span>
            )}
          </button>

          <button
            onClick={() => setActiveTab("add")}
            style={{
              ...s.tabBtn,
              ...(activeTab === "add" ? s.tabActive : {}),
            }}
          >
            ➕ Add Friends
          </button>
        </div>

        {/* Tab Body */}
        <div style={s.body}>
          {loading ? (
            <div style={s.centerState}>
              <span style={s.spinner}>♟</span> Loading...
            </div>
          ) : error ? (
            <div style={s.errorMsg}>{error}</div>
          ) : (
            <>
              {/* TAB 1: FRIENDS LIST */}
              {activeTab === "friends" && (
                <div>
                  {friendsData.friends.length === 0 ? (
                    <div style={s.emptyState}>
                      <span style={s.emptyIcon}>♟️</span>
                      <p style={s.emptyText}>You haven't added any friends yet.</p>
                      <button style={s.linkBtn} onClick={() => setActiveTab("add")}>
                        Search for players to add →
                      </button>
                    </div>
                  ) : (
                    <div style={s.listGroup}>
                      {friendsData.friends.map((friend) => (
                        <div key={friend.id} style={s.userCard}>
                          <div style={s.userInfo}>
                            <div style={s.avatar}>♟</div>
                            <div>
                              <div style={s.userName}>{friend.username}</div>
                              <div style={s.statusRow}>
                                <span
                                  style={{
                                    ...s.statusDot,
                                    background: friend.isOnline ? "#81b64c" : "#8a7055",
                                  }}
                                />
                                <span
                                  style={{
                                    ...s.statusText,
                                    color: friend.isOnline ? "#81b64c" : "#8a7055",
                                  }}
                                >
                                  {friend.isOnline ? "Online" : "Offline"}
                                </span>
                              </div>
                            </div>
                          </div>

                          <div style={s.actionRow}>
                            {friend.isOnline && (
                              <button
                                style={s.challengeBtn}
                                onClick={() => {
                                  onClose();
                                  onChallengeFriend(friend);
                                }}
                              >
                                ⚔️ Challenge
                              </button>
                            )}
                            <button
                              style={s.removeBtn}
                              title="Remove Friend"
                              onClick={() => handleRemoveFriend(friend.id, friend.username)}
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
                <div style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
                  {/* Incoming */}
                  <div>
                    <div style={s.sectionHeader}>Incoming Requests ({friendsData.incoming.length})</div>
                    {friendsData.incoming.length === 0 ? (
                      <div style={s.smallEmpty}>No incoming friend requests.</div>
                    ) : (
                      <div style={s.listGroup}>
                        {friendsData.incoming.map((req) => (
                          <div key={req.request_id} style={s.userCard}>
                            <div style={s.userInfo}>
                              <div style={s.avatar}>📩</div>
                              <div style={s.userName}>{req.username}</div>
                            </div>
                            <div style={s.actionRow}>
                              <button
                                style={s.acceptBtn}
                                onClick={() => handleRespondRequest(req.request_id, true)}
                              >
                                Accept ✓
                              </button>
                              <button
                                style={s.declineBtn}
                                onClick={() => handleRespondRequest(req.request_id, false)}
                              >
                                Decline ✕
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Outgoing */}
                  <div>
                    <div style={s.sectionHeader}>Outgoing Pending ({friendsData.outgoing.length})</div>
                    {friendsData.outgoing.length === 0 ? (
                      <div style={s.smallEmpty}>No pending outgoing requests.</div>
                    ) : (
                      <div style={s.listGroup}>
                        {friendsData.outgoing.map((req) => (
                          <div key={req.request_id} style={s.userCard}>
                            <div style={s.userInfo}>
                              <div style={s.avatar}>⏳</div>
                              <div style={s.userName}>{req.username}</div>
                            </div>
                            <span style={s.pendingPill}>Pending...</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* TAB 3: ADD FRIENDS (SEARCH) */}
              {activeTab === "add" && (
                <div>
                  <form onSubmit={handleSearch} style={s.searchBar}>
                    <input
                      type="text"
                      placeholder="Search player by username..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      style={s.searchInput}
                    />
                    <button type="submit" style={s.searchBtn} disabled={searchLoading}>
                      {searchLoading ? "Searching..." : "Search"}
                    </button>
                  </form>

                  {searchResults.length > 0 && (
                    <div style={s.listGroup}>
                      {searchResults.map((user) => {
                        const isAlreadyFriend = friendsData.friends.some((f) => f.id === user.id);
                        const isPendingOutgoing = friendsData.outgoing.some(
                          (o) => o.receiver_id === user.id
                        );
                        const isPendingIncoming = friendsData.incoming.some(
                          (i) => i.sender_id === user.id
                        );
                        const hasJustSent = requestSentIds.has(user.id);

                        return (
                          <div key={user.id} style={s.userCard}>
                            <div style={s.userInfo}>
                              <div style={s.avatar}>♟</div>
                              <div style={s.userName}>{user.username}</div>
                            </div>

                            <div>
                              {isAlreadyFriend ? (
                                <span style={s.statusTag}>Friends ✓</span>
                              ) : isPendingOutgoing || hasJustSent ? (
                                <span style={s.pendingPill}>Requested ⏳</span>
                              ) : isPendingIncoming ? (
                                <span style={s.statusTag}>Sent you request</span>
                              ) : (
                                <button
                                  style={s.addBtn}
                                  onClick={() => handleSendRequest(user.id)}
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
                    <div style={s.smallEmpty}>No players found matching "{searchQuery}".</div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

const s = {
  overlay: {
    position: "fixed",
    inset: 0,
    zIndex: 999,
    background: "rgba(10, 5, 2, 0.78)",
    backdropFilter: "blur(8px)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "16px",
  },
  modal: {
    width: "100%",
    maxWidth: "520px",
    background: "rgba(44, 26, 14, 0.95)",
    border: "1px solid rgba(196, 163, 90, 0.25)",
    borderRadius: "10px",
    padding: "24px 28px",
    boxShadow: "0 24px 80px rgba(0, 0, 0, 0.8)",
    fontFamily: "'DM Sans', sans-serif",
    animation: "fadeUp 0.3s ease both",
    maxHeight: "85vh",
    display: "flex",
    flexDirection: "column",
  },
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: "16px",
  },
  headerTitleRow: { display: "flex", alignItems: "center", gap: "10px" },
  headerIcon: { fontSize: "1.4rem" },
  title: {
    fontFamily: "'Playfair Display', serif",
    fontSize: "1.35rem",
    fontWeight: 700,
    color: "#f0e6d3",
  },
  closeBtn: {
    background: "transparent",
    border: "none",
    color: "#8a7055",
    fontSize: "1.2rem",
    cursor: "pointer",
    padding: "4px 8px",
  },
  tabBar: {
    display: "flex",
    gap: "6px",
    borderBottom: "1px solid rgba(196, 163, 90, 0.15)",
    paddingBottom: "10px",
    marginBottom: "16px",
  },
  tabBtn: {
    flex: 1,
    padding: "8px 12px",
    background: "transparent",
    border: "none",
    borderRadius: "6px",
    color: "#8a7055",
    fontSize: "0.84rem",
    fontWeight: 600,
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "6px",
    transition: "all 0.2s ease",
  },
  tabActive: {
    background: "rgba(196, 163, 90, 0.15)",
    color: "#c4a35a",
  },
  badge: {
    background: "#e8a838",
    color: "#0d1f05",
    borderRadius: "10px",
    padding: "1px 6px",
    fontSize: "0.72rem",
    fontWeight: 700,
  },
  body: {
    flex: 1,
    overflowY: "auto",
    paddingRight: "4px",
  },
  centerState: {
    textAlign: "center",
    padding: "40px 0",
    color: "#8a7055",
    fontSize: "0.9rem",
  },
  spinner: { display: "inline-block", animation: "spin 1s linear infinite" },
  errorMsg: {
    background: "rgba(200, 60, 60, 0.15)",
    border: "1px solid rgba(200, 60, 60, 0.3)",
    color: "#f08080",
    padding: "10px",
    borderRadius: "6px",
    fontSize: "0.85rem",
  },
  emptyState: {
    textAlign: "center",
    padding: "36px 0",
  },
  emptyIcon: { fontSize: "2rem", display: "block", marginBottom: "8px" },
  emptyText: { color: "#8a7055", fontSize: "0.9rem", marginBottom: "12px" },
  linkBtn: {
    background: "transparent",
    border: "none",
    color: "#c4a35a",
    cursor: "pointer",
    fontSize: "0.88rem",
    fontWeight: 600,
    textDecoration: "underline",
  },
  listGroup: { display: "flex", flexDirection: "column", gap: "10px" },
  userCard: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    background: "rgba(0, 0, 0, 0.25)",
    border: "1px solid rgba(196, 163, 90, 0.1)",
    borderRadius: "6px",
    padding: "10px 14px",
  },
  userInfo: { display: "flex", alignItems: "center", gap: "12px" },
  avatar: {
    width: "36px",
    height: "36px",
    borderRadius: "50%",
    background: "rgba(196, 163, 90, 0.15)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "1.1rem",
    color: "#c4a35a",
  },
  userName: { fontSize: "0.92rem", fontWeight: 600, color: "#f0e6d3" },
  statusRow: { display: "flex", alignItems: "center", gap: "6px", marginTop: "2px" },
  statusDot: { width: "7px", height: "7px", borderRadius: "50%" },
  statusText: { fontSize: "0.72rem", fontWeight: 500 },
  actionRow: { display: "flex", alignItems: "center", gap: "8px" },
  challengeBtn: {
    padding: "6px 14px",
    background: "#81b64c",
    border: "none",
    borderRadius: "4px",
    color: "#0d1f05",
    fontSize: "0.8rem",
    fontWeight: 700,
    cursor: "pointer",
    transition: "all 0.15s ease",
  },
  removeBtn: {
    padding: "6px",
    background: "transparent",
    border: "none",
    cursor: "pointer",
    fontSize: "0.9rem",
    opacity: 0.7,
  },
  sectionHeader: {
    fontSize: "0.74rem",
    fontWeight: 700,
    color: "#8a7055",
    textTransform: "uppercase",
    letterSpacing: "0.08em",
    marginBottom: "8px",
  },
  smallEmpty: {
    fontSize: "0.82rem",
    color: "#8a7055",
    fontStyle: "italic",
    padding: "6px 0",
  },
  acceptBtn: {
    padding: "6px 12px",
    background: "#81b64c",
    border: "none",
    borderRadius: "4px",
    color: "#0d1f05",
    fontSize: "0.78rem",
    fontWeight: 700,
    cursor: "pointer",
  },
  declineBtn: {
    padding: "6px 12px",
    background: "rgba(200,60,60,0.2)",
    border: "1px solid rgba(200,60,60,0.4)",
    borderRadius: "4px",
    color: "#f08080",
    fontSize: "0.78rem",
    fontWeight: 600,
    cursor: "pointer",
  },
  pendingPill: {
    fontSize: "0.75rem",
    color: "#e8a838",
    background: "rgba(232,168,56,0.12)",
    padding: "4px 10px",
    borderRadius: "12px",
    border: "1px solid rgba(232,168,56,0.3)",
  },
  searchBar: { display: "flex", gap: "8px", marginBottom: "16px" },
  searchInput: {
    flex: 1,
    background: "rgba(0,0,0,0.3)",
    border: "1px solid rgba(196, 163, 90, 0.2)",
    borderRadius: "6px",
    padding: "10px 14px",
    color: "#f0e6d3",
    fontSize: "0.88rem",
    outline: "none",
  },
  searchBtn: {
    padding: "10px 18px",
    background: "#c4a35a",
    border: "none",
    borderRadius: "6px",
    color: "#0d1f05",
    fontWeight: 700,
    fontSize: "0.85rem",
    cursor: "pointer",
  },
  statusTag: {
    fontSize: "0.78rem",
    color: "#81b64c",
    fontWeight: 600,
  },
  addBtn: {
    padding: "6px 14px",
    background: "rgba(196,163,90,0.2)",
    border: "1px solid #c4a35a",
    borderRadius: "4px",
    color: "#c4a35a",
    fontSize: "0.8rem",
    fontWeight: 700,
    cursor: "pointer",
  },
};
