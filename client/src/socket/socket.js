import { io } from "socket.io-client";
import { getApiUrl } from "../utils/apiUrl";

let socket = null;

export const getSocket = () => {
  if (socket) return socket;

  const token = localStorage.getItem("token");

  socket = io(getApiUrl(), {
    auth: { token },
    autoConnect: false,
  });

  return socket;
};

export const connectSocket = () => {
  const s = getSocket();
  if (!s.connected) s.connect();
  return s;
};

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};