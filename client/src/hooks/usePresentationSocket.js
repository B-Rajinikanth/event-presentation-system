import { useEffect, useRef, useState } from 'react';
import { createSocket } from '../services/socket.js';

export function usePresentationSocket(role, token) {
  const [state, setState] = useState(null);
  const [connected, setConnected] = useState(false);
  const [otp, setOtp] = useState(null);
  const socketRef = useRef(null);

  useEffect(() => {
    const socket = createSocket({ role, token });
    socketRef.current = socket;

    socket.on('connect', () => setConnected(true));
    socket.on('disconnect', () => setConnected(false));
    socket.on('state:update', (nextState) => setState(nextState));
    // Registered synchronously here (not in a component further down the
    // tree that only gets a non-null `socket` prop on a later re-render) —
    // the server pushes this the instant an admin connects, which is
    // otherwise a real race against React re-rendering in time to attach a
    // listener before that first push arrives.
    socket.on('otp:update', (nextOtp) => setOtp(nextOtp));

    return () => {
      socket.disconnect();
      if (socketRef.current === socket) socketRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role, token]);

  return { state, connected, otp, socket: socketRef.current };
}
