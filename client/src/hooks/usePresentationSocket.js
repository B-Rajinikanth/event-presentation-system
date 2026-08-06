import { useEffect, useRef, useState } from 'react';
import { createSocket } from '../services/socket.js';

export function usePresentationSocket(role, token) {
  const [state, setState] = useState(null);
  const [connected, setConnected] = useState(false);
  const socketRef = useRef(null);

  useEffect(() => {
    const socket = createSocket({ role, token });
    socketRef.current = socket;

    socket.on('connect', () => setConnected(true));
    socket.on('disconnect', () => setConnected(false));
    socket.on('state:update', (nextState) => setState(nextState));

    return () => {
      socket.disconnect();
      if (socketRef.current === socket) socketRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role, token]);

  return { state, connected, socket: socketRef.current };
}
