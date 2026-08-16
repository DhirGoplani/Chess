import { useState, useTransition } from "react";
import { useNavigate } from "react-router-dom";
import { getApiUrl } from "../utils/apiUrl";
import Logo from "../components/Logo";

const SQUARES = Array.from({ length: 64 }, (_, i) => i);

export default function Login() {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword]     = useState("");
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const isEmail = identifier.includes("@");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch(`${getApiUrl()}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(
          isEmail
            ? { email: identifier, password }
            : { username: identifier, password }
        ),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.message || "Login failed");
      } else {
        localStorage.setItem("token", data.token);
        localStorage.setItem("user", JSON.stringify(data.user));
        window.location.href = "/home";
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="root">
      {/* Animated chessboard background */}
      <div className="board-bg" aria-hidden="true">
        {SQUARES.map((i) => {
          const row = Math.floor(i / 8);
          const col = i % 8;
          const isDark = (row + col) % 2 === 1;
          return <div key={i} className={`sq ${isDark ? "sq-dark" : "sq-light"}`} />;
        })}
      </div>
      <div className="vignette" aria-hidden="true" />

      {/* Logo top */}
      <div className="logo mb-6" aria-label="Chess app logo">
        <Logo size={42} />
      </div>

      <div className="card">
        <div className="card-header">
          <div className="crown" aria-hidden="true">♔</div>
          <h1 className="title">Welcome Back</h1>
          <p className="subtitle">Sign in to continue your game</p>
        </div>

        <form onSubmit={handleSubmit} className="form" noValidate>
          <div className="field-group">
            <label htmlFor="identifier" className="label">Email or Username</label>
            <div className="input-wrap">
              <span className="input-icon">{isEmail ? "✉" : "♟"}</span>
              <input
                id="identifier"
                type={isEmail ? "email" : "text"}
                autoComplete={isEmail ? "email" : "username"}
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder="player@gmail.com or username"
                className="input"
                required
                disabled={loading}
              />
            </div>
            {identifier.length > 0 && (
              <span className="field-hint">Signing in as {isEmail ? "email" : "username"}</span>
            )}
          </div>

          <div className="field-group">
            <div className="label-row">
              <label htmlFor="password" className="label">Password</label>
              <a href="/forgot-password" className="forgot-link">Forgot password?</a>
            </div>
            <div className="input-wrap">
              <span className="input-icon">⚿</span>
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="input"
                required
                disabled={loading}
              />
              <button
                type="button"
                className="toggle-pw"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? "✕" : "👁"}
              </button>
            </div>
          </div>

          {error && (
            <div className="error" role="alert">
              <span>⚠</span> {error}
            </div>
          )}

          <button type="submit" className="btn-submit" disabled={loading}>
            {loading
              ? <span className="spinner" aria-label="Loading">◌</span>
              : "Sign In"
            }
          </button>
        </form>

        <div className="divider"><span>or</span></div>

        <div className="card-footer">
          <p className="footer-text">
            Don't have an account?{" "}
            <a href="/register" className="link">Create one</a>
          </p>
        </div>
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600;700&family=DM+Sans:wght@300;400;500;600&display=swap');

        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        /* ── TOKENS ─────────────────────────────────────── */
        :root {
          --bg:           #1a0e07;
          --bg2:          #2c1a0e;
          --bg3:          #3d2314;
          --surface:      #4a2c18;
          --board-light:  #f0d9b5;
          --board-dark:   #b58863;
          --accent:       #81b64c;
          --accent-dark:  #5a8a2e;
          --gold:         #c4a35a;
          --text:         #f0e6d3;
          --text-muted:   #c4a882;
          --text-faint:   #8a7055;
          --border:       rgba(196,163,90,0.2);
          --border-focus: rgba(129,182,76,0.5);
          --error-bg:     rgba(200,60,60,0.15);
          --error-border: rgba(200,60,60,0.4);
          --error-text:   #f08080;
        }

        /* ── ROOT ───────────────────────────────────────── */
        .root {
          min-height: 100vh;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          background: var(--bg);
          position: relative;
          overflow: hidden;
          font-family: 'DM Sans', sans-serif;
          padding: 24px 16px;
        }

        /* ── CHESSBOARD BG ──────────────────────────────── */
        .board-bg {
          position: absolute;
          inset: 0;
          display: grid;
          grid-template-columns: repeat(8, 1fr);
          grid-template-rows: repeat(8, 1fr);
          opacity: 0.08;
          transform: rotate(15deg) scale(1.6);
          pointer-events: none;
        }
        .sq { width: 100%; height: 100%; }
        .sq-light { background: var(--board-light); }
        .sq-dark  { background: var(--board-dark); }

        .vignette {
          position: absolute;
          inset: 0;
          background: radial-gradient(ellipse at center, transparent 20%, var(--bg) 80%);
          pointer-events: none;
        }

        /* ── LOGO ───────────────────────────────────────── */
        .logo {
          position: relative;
          z-index: 10;
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 28px;
        }
        .logo-icon {
          font-size: 1.6rem;
          color: var(--accent);
          filter: drop-shadow(0 0 8px rgba(129,182,76,0.5));
        }
        .logo-text {
          font-family: 'Playfair Display', serif;
          font-size: 1.3rem;
          font-weight: 700;
          color: var(--text);
          letter-spacing: 0.02em;
        }

        /* ── CARD ───────────────────────────────────────── */
        .card {
          position: relative;
          z-index: 10;
          width: 100%;
          max-width: 420px;
          background: var(--bg2);
          border: 1px solid var(--border);
          border-radius: 6px;
          padding: 40px 36px 32px;
          box-shadow:
            0 0 0 1px rgba(196,163,90,0.06),
            0 20px 60px rgba(0,0,0,0.6),
            inset 0 1px 0 rgba(196,163,90,0.1);
          animation: fadeUp 0.45s ease both;
        }
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(20px); }
          to   { opacity: 1; transform: translateY(0); }
        }

        /* ── CARD HEADER ────────────────────────────────── */
        .card-header { text-align: center; margin-bottom: 32px; }

        .crown {
          font-size: 2.4rem;
          display: block;
          margin-bottom: 14px;
          color: var(--gold);
          animation: glow 3s ease-in-out infinite;
        }
        @keyframes glow {
          0%,100% { filter: drop-shadow(0 2px 6px rgba(196,163,90,0.2)); }
          50%      { filter: drop-shadow(0 4px 20px rgba(196,163,90,0.6)); }
        }

        .title {
          font-family: 'Playfair Display', serif;
          font-size: 1.75rem;
          font-weight: 700;
          color: var(--text);
          letter-spacing: -0.01em;
          margin-bottom: 6px;
        }
        .subtitle {
          font-size: 0.85rem;
          color: var(--text-muted);
          font-weight: 300;
          letter-spacing: 0.03em;
        }

        /* ── FORM ───────────────────────────────────────── */
        .form { display: flex; flex-direction: column; gap: 18px; }
        .field-group { display: flex; flex-direction: column; gap: 6px; }

        /* Label row with inline forgot link */
        .label-row {
          display: flex;
          align-items: baseline;
          justify-content: space-between;
        }

        .label {
          font-size: 0.72rem;
          font-weight: 600;
          color: var(--text-muted);
          letter-spacing: 0.1em;
          text-transform: uppercase;
        }

        .forgot-link {
          font-size: 0.72rem;
          color: var(--text-faint);
          text-decoration: none;
          letter-spacing: 0.02em;
          transition: color 0.2s;
        }
        .forgot-link:hover { color: var(--accent); }

        .input-wrap { position: relative; display: flex; align-items: center; }

        .input-icon {
          position: absolute;
          left: 13px;
          font-size: 0.95rem;
          color: var(--text-faint);
          pointer-events: none;
          transition: color 0.2s;
        }

        .input {
          width: 100%;
          background: var(--bg3);
          border: 1px solid var(--border);
          border-radius: 4px;
          padding: 11px 42px 11px 40px;
          color: var(--text);
          font-family: 'DM Sans', sans-serif;
          font-size: 0.92rem;
          outline: none;
          transition: border-color 0.2s, box-shadow 0.2s;
        }
        .input::placeholder { color: var(--text-faint); }
        .input:focus {
          border-color: var(--accent);
          box-shadow: 0 0 0 3px var(--border-focus);
        }
        .input-wrap:focus-within .input-icon { color: var(--accent); }
        .input:disabled { opacity: 0.45; cursor: not-allowed; }

        .toggle-pw {
          position: absolute;
          right: 11px;
          background: none;
          border: none;
          cursor: pointer;
          font-size: 0.85rem;
          color: var(--text-faint);
          padding: 4px;
          transition: color 0.2s;
          line-height: 1;
        }
        .toggle-pw:hover { color: var(--text-muted); }

        .field-hint {
          font-size: 0.7rem;
          color: var(--accent);
          letter-spacing: 0.03em;
          opacity: 0.85;
        }

        /* ── ERROR ──────────────────────────────────────── */
        .error {
          background: var(--error-bg);
          border: 1px solid var(--error-border);
          border-radius: 4px;
          padding: 10px 14px;
          color: var(--error-text);
          font-size: 0.83rem;
          display: flex;
          gap: 8px;
          align-items: center;
        }

        /* ── BUTTON ─────────────────────────────────────── */
        .btn-submit {
          width: 100%;
          padding: 13px;
          background: var(--accent);
          border: none;
          border-radius: 4px;
          color: #0d1f05;
          font-family: 'DM Sans', sans-serif;
          font-size: 0.95rem;
          font-weight: 700;
          letter-spacing: 0.05em;
          cursor: pointer;
          transition: background 0.2s, transform 0.15s, box-shadow 0.2s;
          margin-top: 4px;
          text-transform: uppercase;
        }
        .btn-submit:hover:not(:disabled) {
          background: #91cc58;
          transform: translateY(-1px);
          box-shadow: 0 6px 24px rgba(129,182,76,0.35);
        }
        .btn-submit:active:not(:disabled) { transform: translateY(0); }
        .btn-submit:disabled { opacity: 0.4; cursor: not-allowed; }

        .spinner {
          display: inline-block;
          animation: spin 1s linear infinite;
        }
        @keyframes spin { to { transform: rotate(360deg); } }

        /* ── DIVIDER ────────────────────────────────────── */
        .divider {
          display: flex;
          align-items: center;
          gap: 12px;
          margin: 22px 0 0;
          color: var(--text-faint);
          font-size: 0.75rem;
          letter-spacing: 0.08em;
        }
        .divider::before,
        .divider::after {
          content: '';
          flex: 1;
          height: 1px;
          background: var(--border);
        }

        /* ── FOOTER ─────────────────────────────────────── */
        .card-footer { margin-top: 18px; text-align: center; }
        .footer-text { font-size: 0.82rem; color: var(--text-faint); }
        .link {
          color: var(--accent);
          text-decoration: none;
          font-weight: 500;
          transition: color 0.2s;
        }
        .link:hover { color: #91cc58; }

        /* ── RESPONSIVE ─────────────────────────────────── */
        @media (max-width: 480px) {
          .card { padding: 32px 22px 26px; }
          .title { font-size: 1.5rem; }
        }
      `}</style>
    </div>
  );
}