import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";

const SQUARES = Array.from({ length: 64 }, (_, i) => i);

export default function ResetPassword() {
  const { token }         = useParams();
  const navigate          = useNavigate();
  const [password, setPassword]         = useState("");
  const [confirm, setConfirm]           = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm]   = useState(false);
  const [loading, setLoading]           = useState(false);
  const [error, setError]               = useState("");
  const [success, setSuccess]           = useState(false);

  const passwordsMatch = confirm.length === 0 || password === confirm;
  const isStrong       = password.length >= 8;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (password !== confirm) return setError("Passwords do not match.");
    if (!isStrong)            return setError("Password must be at least 8 characters.");
    setError("");
    setLoading(true);
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/auth/resetpassword`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.message || data.error || "Something went wrong.");
      } else {
        setSuccess(true);
        setTimeout(() => navigate("/"), 2500);
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="root">
      <div className="board-bg" aria-hidden="true">
        {SQUARES.map((i) => {
          const row = Math.floor(i / 8);
          const col = i % 8;
          const isDark = (row + col) % 2 === 1;
          return <div key={i} className={`sq ${isDark ? "sq-dark" : "sq-light"}`} />;
        })}
      </div>
      <div className="vignette" aria-hidden="true" />

      <div className="logo" aria-label="Chess app logo">
        <span className="logo-icon">♞</span>
        <span className="logo-text">ChessMate</span>
      </div>

      <div className="card">
        <div className="card-header">
          <div className="crown" aria-hidden="true">♛</div>
          <h1 className="title">New Password</h1>
          <p className="subtitle">
            {success ? "You're all set" : "Choose a strong password to protect your account"}
          </p>
        </div>

        {success ? (
          <div className="success-box" role="status">
            <span className="success-icon">✓</span>
            <div>
              <p className="success-title">Password updated</p>
              <p className="success-body">Redirecting you to sign in…</p>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="form" noValidate>
            <div className="field-group">
              <label htmlFor="password" className="label">New Password</label>
              <div className="input-wrap">
                <span className="input-icon">⚿</span>
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 8 characters"
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
              {password.length > 0 && (
                <div className="strength-row">
                  <div className="strength-bar">
                    <div
                      className="strength-fill"
                      style={{
                        width: password.length < 8 ? "33%" : password.length < 12 ? "66%" : "100%",
                        background: password.length < 8 ? "#c0392b" : password.length < 12 ? "#e67e22" : "var(--accent)",
                      }}
                    />
                  </div>
                  <span className="strength-label" style={{
                    color: password.length < 8 ? "#f08080" : password.length < 12 ? "#e0a060" : "var(--accent)"
                  }}>
                    {password.length < 8 ? "Too short" : password.length < 12 ? "Good" : "Strong"}
                  </span>
                </div>
              )}
            </div>

            <div className="field-group">
              <label htmlFor="confirm" className="label">Confirm Password</label>
              <div className="input-wrap">
                <span className="input-icon">⚿</span>
                <input
                  id="confirm"
                  type={showConfirm ? "text" : "password"}
                  autoComplete="new-password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  placeholder="Repeat your password"
                  className={`input ${!passwordsMatch ? "input-error" : ""}`}
                  required
                  disabled={loading}
                />
                <button
                  type="button"
                  className="toggle-pw"
                  onClick={() => setShowConfirm((v) => !v)}
                  aria-label={showConfirm ? "Hide password" : "Show password"}
                >
                  {showConfirm ? "✕" : "👁"}
                </button>
              </div>
              {!passwordsMatch && (
                <span className="field-hint-err">Passwords don't match</span>
              )}
            </div>

            {error && (
              <div className="error" role="alert">
                <span>⚠</span> {error}
              </div>
            )}

            <button
              type="submit"
              className="btn-submit"
              disabled={loading || !password || !confirm || !passwordsMatch}
            >
              {loading
                ? <span className="spinner" aria-label="Loading">◌</span>
                : "Set New Password"
              }
            </button>
          </form>
        )}

        <div className="divider"><span>or</span></div>

        <div className="card-footer">
          <p className="footer-text">
            <a href="/" className="link">Back to Sign In</a>
          </p>
        </div>
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600;700&family=DM+Sans:wght@300;400;500;600&display=swap');

        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        :root {
          --bg:           #1a0e07;
          --bg2:          #2c1a0e;
          --bg3:          #3d2314;
          --board-light:  #f0d9b5;
          --board-dark:   #b58863;
          --accent:       #81b64c;
          --gold:         #c4a35a;
          --text:         #f0e6d3;
          --text-muted:   #c4a882;
          --text-faint:   #8a7055;
          --border:       rgba(196,163,90,0.2);
          --border-focus: rgba(129,182,76,0.5);
          --error-bg:     rgba(200,60,60,0.15);
          --error-border: rgba(200,60,60,0.4);
          --error-text:   #f08080;
          --success-bg:   rgba(129,182,76,0.12);
          --success-border: rgba(129,182,76,0.35);
        }

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

        .form { display: flex; flex-direction: column; gap: 18px; }
        .field-group { display: flex; flex-direction: column; gap: 6px; }
        .label {
          font-size: 0.72rem;
          font-weight: 600;
          color: var(--text-muted);
          letter-spacing: 0.1em;
          text-transform: uppercase;
        }

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
        .input.input-error { border-color: rgba(200,60,60,0.6); }
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

        /* Strength bar */
        .strength-row {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-top: 2px;
        }
        .strength-bar {
          flex: 1;
          height: 3px;
          background: rgba(196,163,90,0.15);
          border-radius: 2px;
          overflow: hidden;
        }
        .strength-fill {
          height: 100%;
          border-radius: 2px;
          transition: width 0.3s, background 0.3s;
        }
        .strength-label {
          font-size: 0.68rem;
          font-weight: 600;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          white-space: nowrap;
        }

        .field-hint-err {
          font-size: 0.7rem;
          color: #f08080;
          letter-spacing: 0.02em;
        }

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

        .success-box {
          background: var(--success-bg);
          border: 1px solid var(--success-border);
          border-radius: 4px;
          padding: 16px;
          display: flex;
          gap: 12px;
          align-items: flex-start;
          margin-bottom: 4px;
        }
        .success-icon {
          color: var(--accent);
          font-size: 1.1rem;
          margin-top: 1px;
          flex-shrink: 0;
        }
        .success-title {
          color: var(--accent);
          font-size: 0.88rem;
          font-weight: 600;
          margin-bottom: 4px;
        }
        .success-body {
          color: var(--text-muted);
          font-size: 0.82rem;
          line-height: 1.5;
        }

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

        .divider {
          display: flex;
          align-items: center;
          gap: 12px;
          margin: 22px 0 0;
          color: var(--text-faint);
          font-size: 0.75rem;
          letter-spacing: 0.08em;
        }
        .divider::before, .divider::after {
          content: '';
          flex: 1;
          height: 1px;
          background: var(--border);
        }

        .card-footer { margin-top: 18px; text-align: center; }
        .footer-text { font-size: 0.82rem; color: var(--text-faint); }
        .link {
          color: var(--accent);
          text-decoration: none;
          font-weight: 500;
          transition: color 0.2s;
        }
        .link:hover { color: #91cc58; }

        @media (max-width: 480px) {
          .card { padding: 32px 22px 26px; }
          .title { font-size: 1.5rem; }
        }
      `}</style>
    </div>
  );
}