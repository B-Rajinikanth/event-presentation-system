export function emitControl(socket, event, payload = {}, timeoutMs = 8000) {
  return new Promise((resolve, reject) => {
    if (!socket) return reject(new Error('Socket not connected'));

    const timer = setTimeout(() => {
      reject(new Error('Request timed out — check your connection and try again'));
    }, timeoutMs);

    socket.emit(event, payload, (ack) => {
      clearTimeout(timer);
      if (!ack) return resolve(null);
      if (ack.ok) return resolve(ack);
      reject(new Error(ack.error?.message || 'Action failed'));
    });
  });
}
