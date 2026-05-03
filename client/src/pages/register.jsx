import { useState } from "react";
import { Eye, EyeOff } from 'lucide-react';
import { Link } from 'react-router-dom';

const SQUARES = Array.from({ length: 64 }, (_, i) => i);

function getPasswordStrength(password) {
  if (!password) return { score: 0, label: "", color: "" };
  let score = 0;
  if (password.length >= 8) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;
  const colors = ["#e08080", "#d4a060", "#c9a96e", "#7aab6e"];
  const labels = ["Weak", "Fair", "Good", "Strong"];
  return { score, label: labels[score - 1] || "Weak", color: colors[score - 1] || colors[0] };
}

export default function Register() {
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const strength = getPasswordStrength(password);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ name, username, email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.message || "Registration failed");
      } else {
        console.log("Registered:", data.user);
        // e.g. navigate("/dashboard");
      }
    } catch (err) {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="register-root">
      <div className="chessboard" aria-hidden="true">
        {SQUARES.map((i) => {
          const row = Math.floor(i / 8);
          const col = i % 8;
          const isDark = (row + col) % 2 === 1;
          return <div key={i} className={`sq ${isDark ? "sq-dark" : "sq-light"}`} />;
        })}
      </div>
      <div className="vignette" aria-hidden="true" />

      <div className="card">
        <div className="card-header">
          <div className="queen-icon" aria-hidden="true">♛</div>
          <h1 className="title">Join the Board</h1>
          <p className="subtitle">Create your account and start playing</p>
        </div>

        <form onSubmit={handleSubmit} className="form" noValidate>
          {/* Name + Username row */}
          <div className="row">
            <div className="field-group">
              <label htmlFor="name" className="label">Full Name</label>
              <div className="input-wrap">
                <span className="input-icon">♙</span>
                <input
                  id="name"
                  type="text"
                  autoComplete="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Peter Parker"
                  className="input"
                  required
                  disabled={loading}
                />
              </div>
            </div>

            <div className="field-group">
              <label htmlFor="username" className="label">Username</label>
              <div className="input-wrap">
                <span className="input-icon">♟</span>
                <input
                  id="username"
                  type="text"
                  autoComplete="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="chesswizard99"
                  className="input"
                  required
                  disabled={loading}
                />
              </div>
              {username.length > 0 && (
                <span className="field-hint" style={{ color: username.length < 3 ? "#e08080" : "#a07840" }}>
                  {username.length < 3 ? "Too short" : `@${username}`}
                </span>
              )}
            </div>
          </div>

          {/* Email */}
          <div className="field-group">
            <label htmlFor="email" className="label">Email</label>
            <div className="input-wrap">
              <span className="input-icon">✉</span>
              <input
                id="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="player@gmail.com"
                className="input"
                required
                disabled={loading}
              />
            </div>
          </div>

          {/* Password */}
          <div className="field-group">
            <label htmlFor="password" className="label">Password</label>
            <div className="input-wrap">
              <span className="input-icon">⚿</span>
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                autoComplete="new-password"
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
            {password.length > 0 && (
              <>
                <div className="strength-bar">
                  <div
                    className="strength-fill"
                    style={{ width: `${(strength.score / 4) * 100}%`, background: strength.color }}
                  />
                </div>
                <span className="strength-label" style={{ color: strength.color }}>
                  {strength.label}
                </span>
              </>
            )}
          </div>

          {error && (
            <div className="error" role="alert">
              <span>⚠</span> {error}
            </div>
          )}

          <button type="submit" className="btn-submit" disabled={loading}>
            {loading ? (
              <span className="spinner" aria-label="Loading">♻</span>
            ) : (
              "Create Account"
            )}
          </button>


        </form>

        <div className="card-footer">
            <a href="/" className="link">Already have an account? Sign in</a>
        </div>
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600;700&family=DM+Sans:wght@300;400;500&display=swap');

        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        .register-root {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #f5f0e8;
          position: relative;
          overflow: hidden;
          font-family: 'DM Sans', sans-serif;
        }

        .chessboard {
          position: absolute;
          inset: 0;
          display: grid;
          grid-template-columns: repeat(8, 1fr);
          grid-template-rows: repeat(8, 1fr);
          opacity: 0.22;
          transform: rotate(12deg) scale(1.4);
          pointer-events: none;
        }
        .sq { width: 100%; height: 100%; }
        .sq-light { background: #e8d5b0; }
        .sq-dark  { background: #8b6914; }

        .vignette {
          position: absolute;
          inset: 0;
          background: radial-gradient(ellipse at center, transparent 30%, #f5f0e8 85%);
          pointer-events: none;
        }

        .card {
          position: relative;
          z-index: 10;
          width: 100%;
          max-width: 460px;
          background: rgba(255, 252, 245, 0.92);
          border: 1px solid rgba(180, 140, 70, 0.2);
          border-radius: 4px;
          padding: 44px 40px 32px;
          backdrop-filter: blur(16px);
          box-shadow: 0 8px 40px rgba(120, 80, 20, 0.12), 0 1px 3px rgba(0,0,0,0.06);
          animation: fadeUp 0.5s ease both;
        }
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(24px); }
          to   { opacity: 1; transform: translateY(0); }
        }

        .card-header { text-align: center; margin-bottom: 28px; }

        .queen-icon {
          font-size: 2.4rem;
          display: block;
          margin-bottom: 10px;
          filter: drop-shadow(0 2px 8px rgba(160,120,64,0.3));
          animation: pulse 3s ease-in-out infinite;
        }
        @keyframes pulse {
          0%, 100% { filter: drop-shadow(0 2px 8px rgba(160,120,64,0.2)); }
          50%       { filter: drop-shadow(0 4px 16px rgba(160,120,64,0.5)); }
        }

        .title {
          font-family: 'Playfair Display', serif;
          font-size: 1.75rem;
          font-weight: 700;
          color: #2c1f08;
          letter-spacing: -0.02em;
          margin-bottom: 5px;
        }
        .subtitle {
          font-size: 0.875rem;
          color: #9a7f52;
          letter-spacing: 0.04em;
          font-weight: 300;
        }

        .form { display: flex; flex-direction: column; gap: 16px; }

        .row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 14px;
        }

        .field-group { display: flex; flex-direction: column; gap: 6px; }

        .label {
          font-size: 0.75rem;
          font-weight: 500;
          color: #7a6340;
          letter-spacing: 0.08em;
          text-transform: uppercase;
        }

        .input-wrap { position: relative; display: flex; align-items: center; }

        .input-icon {
          position: absolute;
          left: 12px;
          font-size: 0.95rem;
          color: #b8976a;
          pointer-events: none;
          transition: color 0.2s;
        }
        .input {
          width: 100%;
          background: #fff;
          border: 1px solid #ddd0b8;
          border-radius: 3px;
          padding: 11px 40px 11px 38px;
          color: #2c1f08;
          font-family: 'DM Sans', sans-serif;
          font-size: 0.92rem;
          font-weight: 400;
          outline: none;
          transition: border-color 0.2s, box-shadow 0.2s;
        }
        .input::placeholder { color: #c4b08a; }
        .input:focus {
          border-color: #a07840;
          box-shadow: 0 0 0 3px rgba(160,120,64,0.1);
        }
        .input:focus ~ .input-icon,
        .input-wrap:focus-within .input-icon { color: #a07840; }
        .input:disabled { opacity: 0.5; cursor: not-allowed; }

        .toggle-pw {
          position: absolute;
          right: 10px;
          background: none;
          border: none;
          cursor: pointer;
          font-size: 0.9rem;
          color: #b8976a;
          padding: 4px;
          transition: color 0.2s;
          line-height: 1;
        }
        .toggle-pw:hover { color: #a07840; }

        .field-hint {
          font-size: 0.7rem;
          letter-spacing: 0.03em;
          animation: fadeIn 0.2s ease;
        }
        @keyframes fadeIn { from { opacity: 0 } to { opacity: 1 } }

        /* Password strength */
        .strength-bar {
          height: 3px;
          border-radius: 2px;
          background: #ddd0b8;
          overflow: hidden;
          margin-top: 2px;
        }
        .strength-fill {
          height: 100%;
          border-radius: 2px;
          transition: width 0.3s ease, background 0.3s ease;
        }
        .strength-label {
          font-size: 0.68rem;
          font-weight: 500;
          letter-spacing: 0.06em;
          text-transform: uppercase;
        }

        /* Error */
        .error {
          background: rgba(180, 60, 60, 0.12);
          border: 1px solid rgba(180, 60, 60, 0.3);
          border-radius: 3px;
          padding: 9px 12px;
          color: #c07070;
          font-size: 0.83rem;
          display: flex;
          gap: 7px;
          align-items: center;
          animation: fadeIn 0.2s ease both;
        }

        /* Submit */
        .btn-submit {
          width: 100%;
          padding: 13px;
          background: linear-gradient(135deg, #c9a96e 0%, #a07840 100%);
          border: none;
          border-radius: 3px;
          color: #1a0f00;
          font-family: 'DM Sans', sans-serif;
          font-size: 0.95rem;
          font-weight: 600;
          letter-spacing: 0.04em;
          cursor: pointer;
          transition: opacity 0.2s, transform 0.15s, box-shadow 0.2s;
          margin-top: 4px;
          position: relative;
          overflow: hidden;
        }
        .btn-submit::before {
          content: '';
          position: absolute;
          inset: 0;
          background: linear-gradient(135deg, rgba(255,255,255,0.15) 0%, transparent 60%);
          pointer-events: none;
        }
        .btn-submit:hover:not(:disabled) {
          opacity: 0.92;
          transform: translateY(-1px);
          box-shadow: 0 6px 24px rgba(201,169,110,0.3);
        }
        .btn-submit:active:not(:disabled) { transform: translateY(0); }
        .btn-submit:disabled { opacity: 0.5; cursor: not-allowed; }

        .spinner {
          display: inline-block;
          animation: spin 1s linear infinite;
        }
        @keyframes spin { to { transform: rotate(360deg); } }

/* Footer */
        .card-footer {
          margin-top: 20px;
          text-align: center;
          display: flex;
          justify-content: center;
          align-items: center;
          gap: 10px;
        }
        .link {
          font-size: 0.82rem;
          color: #9a7f52;
          text-decoration: none;
          transition: color 0.2s;
        }
        .link:hover { color: #a07840; }
        .divider { color: #c4b08a; font-size: 0.8rem; }

        @media (max-width: 520px) {
          .card { padding: 36px 20px 28px; margin: 16px; }
          .title { font-size: 1.5rem; }
          .row { grid-template-columns: 1fr; }
        }
      `}</style>
    </div>
  );
}
