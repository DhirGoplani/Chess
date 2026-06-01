import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

const SQUARES = Array.from({ length: 64 }, (_, i) => i);

const FORMATS = [
  {
    id: "bullet",
    label: "Bullet",
    icon: "⚡",
    desc: "Lightning fast chess",
    ratingKey: "bullet_rating",
    timeControls: [{ label: "1 min", ms: 60000 }],
  },
  {
    id: "blitz",
    label: "Blitz",
    icon: "🔥",
    desc: "Fast and furious",
    ratingKey: "blitz_rating",
    timeControls: [
      { label: "3 min", ms: 180000 },
      { label: "5 min", ms: 300000 },
    ],
  },
  {
    id: "rapid",
    label: "Rapid",
    icon: "⏱",
    desc: "Think it through",
    ratingKey: "rapid_rating",
    timeControls: [
      { label: "10 min", ms: 600000  },
      { label: "15 min", ms: 900000  },
      { label: "30 min", ms: 1800000 },
    ],
  },
];

export default function Home() {
  const navigate = useNavigate();
  const [user, setUser]                   = useState({});
  const [selectedTime, setSelectedTime]   = useState({
    bullet: 60000,
    blitz:  180000,
    rapid:  600000,
  });

useEffect(() => {
  const stored = localStorage.getItem("user");
  if (!stored) { navigate("/"); return; }
  setUser(JSON.parse(stored));
}, []);

  const handlePlay = (format) => {
    localStorage.setItem("selectedFormat",      format);
    localStorage.setItem("selectedTimeControl", selectedTime[format]);
    navigate("/lobby");
  };

  return (
    <div style={styles.root}>
      <div style={styles.chessboard}>
        {SQUARES.map((i) => {
          const row = Math.floor(i / 8);
          const col = i % 8;
          const isDark = (row + col) % 2 === 1;
          return <div key={i} style={{ ...styles.sq, background: isDark ? "#8b6914" : "#e8d5b0" }} />;
        })}
      </div>

      {/* Vignette */}
      <div
        aria-hidden="true"
        className="fixed inset-0 pointer-events-none"
        style={{ background: "radial-gradient(ellipse at center, transparent 20%, #f5f0e8 80%)" }}
      />

      <div style={styles.content}>
        {/* NAVBAR */}
        <nav style={styles.nav}>
          <div style={styles.navLogo}>♛ ChessBoard</div>
          <div style={styles.navRight}>
            <span style={styles.navUser}>♟ {user.username}</span>
            <button style={styles.logoutBtn} onClick={() => { localStorage.clear(); navigate("/"); }}>
              Logout
            </button>
          </div>
        </nav>

        {/* HERO */}
        <div style={styles.hero}>
          <h1 style={styles.heroTitle}>
            Welcome back, <span style={styles.heroName}>{user.name ?? user.username}</span>
          </h1>
          <p style={styles.heroSub}>Choose your format and find an opponent</p>
        </div>

        {/* FORMAT CARDS */}
        <div style={styles.formatGrid}>
          {FORMATS.map((f) => (
            <div
              key={f.id}
              className="flex flex-col gap-3.5 bg-[rgba(255,252,245,0.95)] border border-[rgba(180,140,70,0.2)] rounded-lg p-6 shadow-[0_4px_20px_rgba(120,80,20,0.08)]"
            >
              {/* Card top */}
              <div className="flex items-center gap-3">
                <span className="text-[2rem]">{f.icon}</span>
                <div>
                  <div style={styles.formatLabel}>{f.label}</div>
                  <div style={styles.formatDesc}>{f.desc}</div>
                </div>
              </div>

              {/* Rating */}
              <div style={styles.formatRating}>
                <span style={styles.ratingLabel}>Your Rating</span>
                <span style={styles.ratingValue}>{user[f.ratingKey] ?? 800}</span>
              </div>

              {/* Time control selector */}
              <div style={styles.timeRow}>
                {f.timeControls.map((tc) => (
                  <button
                    key={tc.ms}
                    onClick={() => setSelectedTime(prev => ({ ...prev, [f.id]: tc.ms }))}
                    style={{
                      ...styles.timeBtn,
                      ...(selectedTime[f.id] === tc.ms ? styles.timeBtnActive : {}),
                    }}
                  >
                    {tc.label}
                  </button>
                ))}
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

        {/* STATS ROW */}
        <div style={styles.statsRow}>
          {[
            { icon: "⚡", label: "Bullet", val: user.bullet_rating ?? 800 },
            { icon: "🔥", label: "Blitz",  val: user.blitz_rating  ?? 800 },
            { icon: "⏱", label: "Rapid",  val: user.rapid_rating  ?? 800 },
            { icon: "♟", label: "Member Since", val: user.created_at
                ? new Date(user.created_at).toLocaleDateString("en-IN", { month: "short", year: "numeric" })
                : "—" },
          ].map((s) => (
            <div key={s.label} style={styles.statCard}>
              <div style={styles.statIcon}>{s.icon}</div>
              <div style={styles.statLabel}>{s.label}</div>
              <div style={styles.statVal}>{s.val}</div>
            </div>
          ))}
        </div>
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600;700&family=DM+Sans:wght@300;400;500&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        @keyframes fadeUp { from { opacity:0; transform:translateY(24px); } to { opacity:1; transform:translateY(0); } }
      `}</style>
    </div>
  );
}

const styles = {
  root:       { minHeight:"100vh", background:"#f5f0e8", position:"relative", overflow:"hidden", fontFamily:"'DM Sans', sans-serif" },
  chessboard: { position:"fixed", inset:0, display:"grid", gridTemplateColumns:"repeat(8,1fr)", gridTemplateRows:"repeat(8,1fr)", opacity:0.12, transform:"rotate(12deg) scale(1.5)", pointerEvents:"none" },
  sq:         { width:"100%", height:"100%" },
  vignette:   { position:"fixed", inset:0, background:"radial-gradient(ellipse at center, transparent 20%, #f5f0e8 80%)", pointerEvents:"none" },
  content:    { position:"relative", zIndex:10, maxWidth:"960px", margin:"0 auto", padding:"0 24px 48px" },
  nav:        { display:"flex", justifyContent:"space-between", alignItems:"center", padding:"20px 0", borderBottom:"1px solid rgba(180,140,70,0.2)", marginBottom:"48px" },
  navLogo:    { fontFamily:"'Playfair Display', serif", fontSize:"1.4rem", fontWeight:700, color:"#2c1f08" },
  navRight:   { display:"flex", alignItems:"center", gap:"16px" },
  navUser:    { fontSize:"0.88rem", color:"#7a6340", fontWeight:500 },
  logoutBtn:  { padding:"6px 16px", background:"transparent", border:"1px solid rgba(180,140,70,0.4)", borderRadius:"3px", color:"#7a6340", fontSize:"0.82rem", cursor:"pointer" },
  hero:       { textAlign:"center", marginBottom:"48px", animation:"fadeUp 0.5s ease both" },
  heroTitle:  { fontFamily:"'Playfair Display', serif", fontSize:"2.4rem", fontWeight:700, color:"#2c1f08", marginBottom:"10px" },
  heroName:   { color:"#a07840" },
  heroSub:    { fontSize:"1rem", color:"#9a7f52", fontWeight:300 },
  formatGrid: { display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:"20px", marginBottom:"32px", animation:"fadeUp 0.6s ease both" },
  formatCard: { background:"rgba(255,252,245,0.95)", border:"1px solid rgba(180,140,70,0.2)", borderRadius:"8px", padding:"24px", display:"flex", flexDirection:"column", gap:"14px", boxShadow:"0 4px 20px rgba(120,80,20,0.08)" },
  formatTop:  { display:"flex", alignItems:"center", gap:"12px" },
  formatIcon: { fontSize:"2rem" },
  formatLabel:{ fontFamily:"'Playfair Display', serif", fontSize:"1.2rem", fontWeight:700, color:"#2c1f08" },
  formatDesc: { fontSize:"0.82rem", color:"#9a7f52", fontWeight:300 },
  formatRating:{ display:"flex", justifyContent:"space-between", alignItems:"center", background:"rgba(160,120,64,0.06)", borderRadius:"4px", padding:"10px 14px" },
  ratingLabel:{ fontSize:"0.78rem", color:"#7a6340", fontWeight:500, textTransform:"uppercase", letterSpacing:"0.06em" },
  ratingValue:{ fontSize:"1.3rem", fontWeight:700, color:"#a07840", fontFamily:"'Playfair Display', serif" },
  timeRow:    { display:"flex", gap:"8px" },
  timeBtn:    { flex:1, padding:"8px 4px", background:"#fff", border:"1px solid #ddd0b8", borderRadius:"4px", fontSize:"0.82rem", color:"#7a6340", cursor:"pointer", fontWeight:500 },
  timeBtnActive:{ border:"1px solid #a07840", background:"rgba(160,120,64,0.1)", color:"#a07840" },
  playBtn:    { width:"100%", padding:"12px", background:"linear-gradient(135deg, #c9a96e 0%, #a07840 100%)", border:"none", borderRadius:"4px", color:"#1a0f00", fontSize:"0.95rem", fontWeight:600, cursor:"pointer", letterSpacing:"0.04em" },
  statsRow:   { display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:"16px", animation:"fadeUp 0.7s ease both" },
  statCard:   { background:"rgba(255,252,245,0.95)", border:"1px solid rgba(180,140,70,0.2)", borderRadius:"6px", padding:"20px", textAlign:"center", boxShadow:"0 2px 12px rgba(120,80,20,0.06)" },
  statIcon:   { fontSize:"1.4rem", marginBottom:"6px" },
  statLabel:  { fontSize:"0.72rem", color:"#9a7f52", textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:"4px" },
  statVal:    { fontSize:"1.4rem", fontWeight:700, color:"#2c1f08", fontFamily:"'Playfair Display', serif" },
};
