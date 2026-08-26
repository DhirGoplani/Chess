// Returns the API server URL dynamically.
// If VITE_API_URL is set in Vercel, it uses that.
// If accessed on cloud (Vercel on mobile/desktop) without VITE_API_URL, it defaults to the Render production backend.
// If accessed on local dev, it defaults to http://localhost:3000.

export const getApiUrl = () => {
  const envUrl = import.meta.env.VITE_API_URL;

  // 1. If VITE_API_URL is configured in Vercel / build env, always use it
  if (envUrl && envUrl.trim()) {
    return envUrl.trim().replace(/\/$/, "");
  }

  // 2. If running on browser
  if (typeof window !== "undefined") {
    const hostname = window.location.hostname;

    // If running on Vercel or cloud domain, return Production Render Backend URL
    if (
      hostname !== "localhost" &&
      hostname !== "127.0.0.1" &&
      !/^(\d{1,3}\.){3}\d{1,3}$/.test(hostname)
    ) {
      return "https://chess-server-production.onrender.com"; // Render backend URL fallback
    }

    // Check if it's a local LAN IP (e.g., 192.168.x.x) for local mobile testing
    if (/^(\d{1,3}\.){3}\d{1,3}$/.test(hostname)) {
      const protocol = window.location.protocol || "http:";
      const port = import.meta.env.VITE_SERVER_PORT || "3000";
      return `${protocol}//${hostname}:${port}`;
    }
  }

  // 3. Fallback default for local dev
  return "http://localhost:3000";
};
