export function emitControl(socket, event, payload = {}) {
  return new Promise((resolve, reject) => {
    if (!socket) return reject(new Error('Socket not connected'));

    socket.emit(event, payload, (ack) => {
      if (!ack) return resolve(null);
      if (ack.ok) return resolve(ack);
      reject(new Error(ack.error?.message || 'Action failed'));
    });
  });
}
