import { useEffect, useRef, useState } from 'react';
import { createSocket } from '../services/socket.js';

export function usePresentationSocket(role, token) {
  const [state, setState] = useState(null);
  const [connected, setConnected] = useState(false);
  const [otp, setOtp] = useState(null);
  const [displays, setDisplays] = useState(null);
  const [connectError, setConnectError] = useState(null);
  const socketRef = useRef(null);

  useEffect(() => {
    const socket = createSocket({ role, token });
    socketRef.current = socket;
    let retryTimeout;

    socket.on('connect', () => {
      setConnected(true);
      setConnectError(null);
    });
    socket.on('disconnect', () => setConnected(false));
    // The server rejects a second admin/camera (or a display while paused)
    // by failing the handshake itself (io.use -> next(new Error(...))).
    // socket.io-client's automatic reconnection is built for recovering a
    // connection that dropped *after* connecting — it does not reliably
    // keep retrying a connection that a server-side middleware rejected
    // outright (verified: only one attempt was ever made, no backoff
    // loop), so retry manually. socket.connect() is safe to call again on
    // an already-created socket.
    socket.on('connect_error', (err) => {
      setConnectError(err.message);
      clearTimeout(retryTimeout);
      retryTimeout = setTimeout(() => socket.connect(), 3000);
    });
    socket.on('state:update', (nextState) => setState(nextState));
    // Registered synchronously here (not in a component further down the
    // tree that only gets a non-null `socket` prop on a later re-render) —
    // the server pushes this the instant an admin connects, which is
    // otherwise a real race against React re-rendering in time to attach a
    // listener before that first push arrives.
    socket.on('otp:update', (nextOtp) => setOtp(nextOtp));
    socket.on('displays:update', (nextDisplays) => setDisplays(nextDisplays));

    return () => {
      clearTimeout(retryTimeout);
      socket.disconnect();
      if (socketRef.current === socket) socketRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role, token]);

  return { state, connected, otp, displays, connectError, socket: socketRef.current };
}
