// Returns the API server URL dynamically.
// If the app is accessed on mobile via local network IP (e.g., http://192.168.1.15:5173),
// it automatically points API calls to http://192.168.1.15:3000 instead of localhost.

export const getApiUrl = () => {
  const envUrl = import.meta.env.VITE_API_URL;

  if (typeof window !== "undefined") {
    const hostname = window.location.hostname;
    // If accessed via local network IP or custom hostname instead of localhost
    if (hostname !== "localhost" && hostname !== "127.0.0.1") {
      const protocol = window.location.protocol || "http:";
      const port = import.meta.env.VITE_SERVER_PORT || "3000";
      return `${protocol}//${hostname}:${port}`;
    }
  }

  return envUrl || "http://localhost:3000";
};
