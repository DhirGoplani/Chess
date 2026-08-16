// Tracks which userId is connected on which socketId, so we can push a
// challenge to a specific friend in real time (rather than broadcasting).
// Not persisted — rebuilt purely from live socket connections.

const userIdToSocketId = new Map();

const setOnline = (userId, socketId) => {
  userIdToSocketId.set(userId, socketId);
};

const setOffline = (userId) => {
  userIdToSocketId.delete(userId);
};

const getSocketId = (userId) => {
  return userIdToSocketId.get(userId) ?? null;
};

const isOnline = (userId) => {
  return userIdToSocketId.has(userId);
};

export default { setOnline, setOffline, getSocketId, isOnline };