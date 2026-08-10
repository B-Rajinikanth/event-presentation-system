// Bridges REST routes (admins.routes.js) to the live Socket.IO server, so a
// superadmin action — deactivate, reset password, remove, force-logout —
// can immediately boot someone's connected dashboard session instead of
// only blocking their *next* HTTP request.
const connectedAdminSockets = new Map(); // userId (string) -> Set<socketId>
let ioRef = null;

export function setIO(io) {
  ioRef = io;
}

export function addConnectedAdmin(userId, socketId) {
  const key = String(userId);
  if (!connectedAdminSockets.has(key)) connectedAdminSockets.set(key, new Set());
  connectedAdminSockets.get(key).add(socketId);
}

export function removeConnectedAdmin(userId, socketId) {
  const key = String(userId);
  const set = connectedAdminSockets.get(key);
  if (!set) return;
  set.delete(socketId);
  if (set.size === 0) connectedAdminSockets.delete(key);
}

export function forceLogoutUser(userId, message) {
  if (!ioRef) return;
  const socketIds = connectedAdminSockets.get(String(userId));
  if (!socketIds) return;
  for (const socketId of [...socketIds]) {
    const socket = ioRef.sockets.sockets.get(socketId);
    if (!socket) continue;
    socket.emit('force-logout', { message });
    socket.disconnect(true);
  }
}
