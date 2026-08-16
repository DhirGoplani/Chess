// Returns the API server URL dynamically.
// If the app is accessed on mobile via local network IP (e.g., http://192.168.1.15:5173),
// it automatically points API calls to http://192.168.1.15:3000 instead of localhost.

export const getApiUrl = () => {
  const envUrl = import.meta.env.VITE_API_URL;

  // 1. If VITE_API_URL is configured in Vercel / build env, always use it
  if (envUrl) {
    return envUrl.replace(/\/$/, "");
  }

  // 2. If running locally on browser
  if (typeof window !== "undefined") {
    const hostname = window.location.hostname;
    // Check if it's a local LAN IP (e.g., 192.168.x.x) for local mobile testing
    if (
      hostname !== "localhost" &&
      hostname !== "127.0.0.1" &&
      /^(\d{1,3}\.){3}\d{1,3}$/.test(hostname)
    ) {
      const protocol = window.location.protocol || "http:";
      const port = import.meta.env.VITE_SERVER_PORT || "3000";
      return `${protocol}//${hostname}:${port}`;
    }
  }

  // 3. Fallback default for local dev
  return "http://localhost:3000";
};
