import { useState } from "react";
import { getSoundMode, setSoundMode, playSound } from "../utils/sound";
// getSoundMode/setSoundMode manage the persisted preference; playSound
// previews the newly chosen pack immediately below.

const SOUND_OPTIONS = [
  {
    id: "classic",
    label: "Classic",
    desc: "Traditional, understated chess sounds",
    icon: "♟",
    accent: "#6baed6",
  },
  {
    id: "goofy",
    label: "Goofy",
    desc: "The originals — memes and reaction sounds",
    icon: "🤪",
    accent: "#e8a838",
  },
  {
    id: "off",
    label: "Off",
    desc: "No sound effects during games",
    icon: "🔇",
    accent: "#8a7055",
  },
];

export default function SettingsModal({ isOpen, onClose }) {
  const [mode, setMode] = useState(getSoundMode());

  if (!isOpen) return null;

  const handleSelect = (id) => {
    setMode(id);
    setSoundMode(id); // persists to localStorage synchronously, so the preview below reads the new mode
    playSound("check"); // quick preview so the change is audible — "check" differs per pack, unlike move/capture (no-ops if "off")
  };

  return (
    <div style={s.overlay} onClick={onClose}>
      <div style={s.modal} onClick={(e) => e.stopPropagation()}>
        <div style={s.header}>
          <div style={s.headerLeft}>
            <span style={s.gearIcon}>⚙️</span>
            <div>
              <h2 style={s.title}>Settings</h2>
              <p style={s.subtitle}>Sound effects</p>
            </div>
          </div>
          <button style={s.closeBtn} onClick={onClose}>
            ✕
          </button>
        </div>

        <div style={s.body}>
          <div style={s.fieldLabel}>Move & Game Sounds</div>
          <div style={s.optionsList}>
            {SOUND_OPTIONS.map((opt) => {
              const isSelected = mode === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => handleSelect(opt.id)}
                  style={{
                    ...s.optionCard,
                    borderColor: isSelected ? opt.accent : "rgba(196,163,90,0.15)",
                    background: isSelected ? `${opt.accent}18` : "rgba(0,0,0,0.25)",
                  }}
                >
                  <span style={s.optionIcon}>{opt.icon}</span>
                  <div style={s.optionText}>
                    <span style={{ ...s.optionLabel, color: isSelected ? opt.accent : "#f0e6d3" }}>
                      {opt.label}
                    </span>
                    <span style={s.optionDesc}>{opt.desc}</span>
                  </div>
                  <span
                    style={{
                      ...s.radioDot,
                      borderColor: isSelected ? opt.accent : "rgba(196,163,90,0.3)",
                      background: isSelected ? opt.accent : "transparent",
                    }}
                  />
                </button>
              );
            })}
          </div>
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
  gearIcon: { fontSize: "1.6rem" },
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
  body: { display: "flex", flexDirection: "column", gap: "12px" },
  fieldLabel: {
    fontSize: "0.72rem",
    fontWeight: 600,
    color: "#8a7055",
    textTransform: "uppercase",
    letterSpacing: "0.1em",
  },
  optionsList: { display: "flex", flexDirection: "column", gap: "10px" },
  optionCard: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    padding: "12px 14px",
    borderRadius: "8px",
    border: "1px solid",
    cursor: "pointer",
    transition: "all 0.2s ease",
    textAlign: "left",
  },
  optionIcon: { fontSize: "1.3rem", flexShrink: 0 },
  optionText: { display: "flex", flexDirection: "column", gap: "2px", flex: 1 },
  optionLabel: { fontSize: "0.9rem", fontWeight: 700 },
  optionDesc: { fontSize: "0.76rem", color: "#8a7055" },
  radioDot: {
    width: "16px",
    height: "16px",
    borderRadius: "50%",
    border: "2px solid",
    flexShrink: 0,
    transition: "all 0.2s ease",
  },
};