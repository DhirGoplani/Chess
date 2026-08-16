import { useState } from "react";

const FORMATS = [
  {
    id: "bullet",
    label: "Bullet",
    icon: "⚡",
    accent: "#e8a838",
    timeControls: [{ label: "1 min", ms: 60000 }],
  },
  {
    id: "blitz",
    label: "Blitz",
    icon: "🔥",
    accent: "#81b64c",
    timeControls: [
      { label: "3 min", ms: 180000 },
      { label: "5 min", ms: 300000 },
    ],
  },
  {
    id: "rapid",
    label: "Rapid",
    icon: "⏱",
    accent: "#6baed6",
    timeControls: [
      { label: "10 min", ms: 600000 },
      { label: "15 min", ms: 900000 },
    ],
  },
];

export default function ChallengeModal({ friend, onClose, onSendChallenge }) {
  const [selectedFormat, setSelectedFormat] = useState("blitz");
  const [selectedTime, setSelectedTime] = useState(300000); // 5 min default

  if (!friend) return null;

  const currentFormatObj = FORMATS.find((f) => f.id === selectedFormat);

  const handleFormatChange = (fmtId) => {
    setSelectedFormat(fmtId);
    const fmt = FORMATS.find((f) => f.id === fmtId);
    if (fmt && fmt.timeControls.length > 0) {
      setSelectedTime(fmt.timeControls[0].ms);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSendChallenge({
      friendId: friend.id,
      friendUsername: friend.username,
      format: selectedFormat,
      timeControl: selectedTime,
    });
  };

  return (
    <div style={s.overlay} onClick={onClose}>
      <div style={s.modal} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div style={s.header}>
          <div style={s.headerLeft}>
            <span style={s.crownIcon}>⚔️</span>
            <div>
              <h2 style={s.title}>Challenge {friend.username}</h2>
              <p style={s.subtitle}>Configure match parameters</p>
            </div>
          </div>
          <button style={s.closeBtn} onClick={onClose}>
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} style={s.body}>
          {/* Format selection */}
          <div style={s.fieldLabel}>Select Game Format</div>
          <div style={s.formatGrid}>
            {FORMATS.map((f) => {
              const isSelected = selectedFormat === f.id;
              return (
                <button
                  type="button"
                  key={f.id}
                  onClick={() => handleFormatChange(f.id)}
                  style={{
                    ...s.formatCard,
                    borderColor: isSelected ? f.accent : "rgba(196,163,90,0.15)",
                    background: isSelected ? `${f.accent}18` : "rgba(0,0,0,0.25)",
                  }}
                >
                  <span style={s.formatIcon}>{f.icon}</span>
                  <span style={{ ...s.formatName, color: isSelected ? f.accent : "#f0e6d3" }}>
                    {f.label}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Time control selection */}
          <div style={s.fieldLabel}>Time Control</div>
          <div style={s.timeRow}>
            {currentFormatObj?.timeControls.map((tc) => {
              const isSelected = selectedTime === tc.ms;
              return (
                <button
                  type="button"
                  key={tc.ms}
                  onClick={() => setSelectedTime(tc.ms)}
                  style={{
                    ...s.timeBtn,
                    borderColor: isSelected ? currentFormatObj.accent : "rgba(196,163,90,0.15)",
                    background: isSelected ? `${currentFormatObj.accent}25` : "rgba(0,0,0,0.2)",
                    color: isSelected ? currentFormatObj.accent : "#c4a882",
                  }}
                >
                  {tc.label}
                </button>
              );
            })}
          </div>

          {/* Summary */}
          <div style={s.summaryBox}>
            <span style={s.summaryLabel}>Match Type:</span>
            <span style={{ ...s.summaryVal, color: currentFormatObj.accent }}>
              {currentFormatObj.icon} {currentFormatObj.label} (
              {Math.round(selectedTime / 60000)} min)
            </span>
          </div>

          {/* Send Challenge Button */}
          <button
            type="submit"
            style={{
              ...s.sendBtn,
              background: currentFormatObj.accent,
              boxShadow: `0 4px 20px ${currentFormatObj.accent}40`,
            }}
          >
            Send Challenge →
          </button>
        </form>
      </div>
    </div>
  );
}

const s = {
  overlay: {
    position: "fixed",
    inset: 0,
    zIndex: 999,
    background: "rgba(10, 5, 2, 0.75)",
    backdropFilter: "blur(8px)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "16px",
  },
  modal: {
    width: "100%",
    maxWidth: "440px",
    background: "rgba(44, 26, 14, 0.95)",
    border: "1px solid rgba(196, 163, 90, 0.25)",
    borderRadius: "10px",
    padding: "24px 28px",
    boxShadow: "0 24px 80px rgba(0, 0, 0, 0.8)",
    fontFamily: "'DM Sans', sans-serif",
    animation: "fadeUp 0.3s ease both",
  },
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: "20px",
    borderBottom: "1px solid rgba(196, 163, 90, 0.15)",
    paddingBottom: "14px",
  },
  headerLeft: { display: "flex", alignItems: "center", gap: "12px" },
  crownIcon: { fontSize: "1.6rem" },
  title: {
    fontFamily: "'Playfair Display', serif",
    fontSize: "1.25rem",
    fontWeight: 700,
    color: "#f0e6d3",
    lineHeight: 1.2,
  },
  subtitle: { fontSize: "0.78rem", color: "#8a7055", marginTop: "2px" },
  closeBtn: {
    background: "transparent",
    border: "none",
    color: "#8a7055",
    fontSize: "1.2rem",
    cursor: "pointer",
    padding: "4px 8px",
  },
  body: { display: "flex", flexDirection: "column", gap: "16px" },
  fieldLabel: {
    fontSize: "0.72rem",
    fontWeight: 600,
    color: "#8a7055",
    textTransform: "uppercase",
    letterSpacing: "0.1em",
  },
  formatGrid: { display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "10px" },
  formatCard: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: "6px",
    padding: "12px 8px",
    borderRadius: "6px",
    border: "1px solid",
    cursor: "pointer",
    transition: "all 0.2s ease",
  },
  formatIcon: { fontSize: "1.3rem" },
  formatName: { fontSize: "0.85rem", fontWeight: 600 },
  timeRow: { display: "flex", gap: "10px" },
  timeBtn: {
    flex: 1,
    padding: "10px",
    borderRadius: "6px",
    border: "1px solid",
    fontSize: "0.85rem",
    fontWeight: 600,
    cursor: "pointer",
    transition: "all 0.2s ease",
    textAlign: "center",
  },
  summaryBox: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    background: "rgba(0,0,0,0.3)",
    padding: "10px 14px",
    borderRadius: "6px",
    border: "1px solid rgba(196, 163, 90, 0.1)",
  },
  summaryLabel: { fontSize: "0.78rem", color: "#8a7055" },
  summaryVal: { fontSize: "0.88rem", fontWeight: 700, fontFamily: "'Playfair Display', serif" },
  sendBtn: {
    width: "100%",
    padding: "12px",
    border: "none",
    borderRadius: "6px",
    color: "#0d1f05",
    fontSize: "0.95rem",
    fontWeight: 700,
    cursor: "pointer",
    letterSpacing: "0.04em",
    marginTop: "4px",
    transition: "all 0.2s ease",
  },
};
