import { useCallback, useEffect, useRef, useState } from 'react';
import { createSocket } from '../services/socket.js';

export function usePresentationSocket(role, token) {
  const [state, setState] = useState(null);
  const [connected, setConnected] = useState(false);
  const [otp, setOtp] = useState(null);
  const [displays, setDisplays] = useState(null);
  const [connectError, setConnectError] = useState(null);
  const [connectErrorData, setConnectErrorData] = useState(null);
  const [forceLogoutMessage, setForceLogoutMessage] = useState(null);
  const [retryCount, setRetryCount] = useState(0);
  const socketRef = useRef(null);

  useEffect(() => {
    const socket = createSocket({ role, token });
    socketRef.current = socket;

    socket.on('connect', () => {
      setConnected(true);
      setConnectError(null);
      setConnectErrorData(null);
    });
    socket.on('disconnect', () => setConnected(false));
    // The server rejects a duplicate admin/camera (or a display while
    // paused) by failing the handshake itself (io.use -> next(new
    // Error(...))). Deliberately no auto-retry here — a rejected connection
    // stays rejected until the user explicitly asks for a fresh attempt via
    // retry() below, which opens a genuinely new socket rather than
    // resurrecting this one.
    socket.on('connect_error', (err) => {
      setConnectError(err.message);
      setConnectErrorData(err.data || null);
    });
    socket.on('state:update', (nextState) => setState(nextState));
    // Registered synchronously here (not in a component further down the
    // tree that only gets a non-null `socket` prop on a later re-render) —
    // the server pushes this the instant an admin connects, which is
    // otherwise a real race against React re-rendering in time to attach a
    // listener before that first push arrives.
    socket.on('otp:update', (nextOtp) => setOtp(nextOtp));
    socket.on('displays:update', (nextDisplays) => setDisplays(nextDisplays));
    // A superadmin can end this admin's session from /superadmin
    // (deactivate/reset password/remove/force-logout) — the server disconnects
    // this socket right after emitting this, so there's nothing to retry.
    socket.on('force-logout', (payload) => {
      setForceLogoutMessage(payload?.message || 'Your session was ended by a super admin.');
    });

    return () => {
      socket.disconnect();
      if (socketRef.current === socket) socketRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role, token, retryCount]);

  // Bumping retryCount re-runs the effect above, whose cleanup disconnects
  // the rejected socket and createSocket(...) opens a brand new one — a
  // fresh connection attempt with a new session, not a resurrection of the
  // old rejected one.
  const retry = useCallback(() => setRetryCount((c) => c + 1), []);

  return {
    state,
    connected,
    otp,
    displays,
    connectError,
    connectErrorData,
    forceLogoutMessage,
    retry,
    socket: socketRef.current,
  };
}
