import { useCallback, useEffect, useRef, useState } from 'react';
import { usePresentationSocket } from '../hooks/usePresentationSocket.js';
import { RTC_CONFIG } from '../services/webrtcConfig.js';

export default function LiveCamera() {
  const { connected, socket } = usePresentationSocket('camera');
  const localVideoRef = useRef(null);
  const localStreamRef = useRef(null);

  // One RTCPeerConnection per connected display — WebRTC has no built-in
  // fan-out, so broadcasting to N displays means N independent peer
  // connections, each with its own offer/answer/ICE exchange, all carrying
  // the same local tracks. Keyed by the display's socket id.
  const peersRef = useRef(new Map()); // displayId -> { pc, pendingRemoteCandidates }
  // Displays the server has told us about, kept even before we have a local
  // stream so we know who to negotiate with the moment the camera starts.
  const knownDisplayIdsRef = useRef(new Set());

  const [status, setStatus] = useState('idle'); // idle | starting | connecting | live | error
  const [error, setError] = useState('');
  const [liveCount, setLiveCount] = useState(0);

  const recomputeStatus = useCallback(() => {
    const states = [...peersRef.current.values()].map((p) => p.pc.connectionState);
    const live = states.filter((s) => s === 'connected').length;
    setLiveCount(live);
    if (live > 0) setStatus('live');
    else if (states.some((s) => s === 'connecting' || s === 'new')) setStatus('connecting');
    else if (localStreamRef.current) setStatus('starting');
    else setStatus('idle');
  }, []);

  // Opens a fresh, dedicated peer connection to one display. Always torn
  // down and rebuilt rather than reused on renegotiation — a reused
  // connection was the main cause of live video getting stuck after a
  // display refresh/reconnect.
  const negotiate = useCallback(
    async (socketInstance, displayId) => {
      const stream = localStreamRef.current;
      if (!stream || !socketInstance) return;

      peersRef.current.get(displayId)?.pc.close();

      const pc = new RTCPeerConnection(RTC_CONFIG);
      const peer = { pc, pendingRemoteCandidates: [] };
      peersRef.current.set(displayId, peer);
      stream.getTracks().forEach((track) => pc.addTrack(track, stream));

      pc.onicecandidate = (event) => {
        if (!event.candidate) return;
        socketInstance.emit('webrtc:ice-candidate', { candidate: event.candidate, to: displayId });
      };

      pc.onconnectionstatechange = () => {
        recomputeStatus();
        if (['failed', 'disconnected', 'closed'].includes(pc.connectionState)) {
          peersRef.current.delete(displayId);
          recomputeStatus();
        }
      };

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      socketInstance.emit('webrtc:offer', { offer, to: displayId });
      recomputeStatus();
    },
    [recomputeStatus]
  );

  useEffect(() => {
    if (!socket) return;

    function handleDisplayReady({ displayId }) {
      knownDisplayIdsRef.current.add(displayId);
      if (localStreamRef.current) negotiate(socket, displayId);
    }

    async function handleAnswer({ answer, from }) {
      const peer = peersRef.current.get(from);
      if (!peer) return;
      await peer.pc.setRemoteDescription(new RTCSessionDescription(answer));
      for (const candidate of peer.pendingRemoteCandidates) {
        await peer.pc.addIceCandidate(new RTCIceCandidate(candidate)).catch(() => {});
      }
      peer.pendingRemoteCandidates = [];
    }

    async function handleIceCandidate({ candidate, from }) {
      const peer = peersRef.current.get(from);
      if (!peer?.pc.remoteDescription) {
        peer?.pendingRemoteCandidates.push(candidate);
        return;
      }
      try {
        await peer.pc.addIceCandidate(new RTCIceCandidate(candidate));
      } catch (err) {
        console.error('[camera] failed to add ICE candidate:', err.message);
      }
    }

    function handleDisplayLeft({ displayId }) {
      knownDisplayIdsRef.current.delete(displayId);
      peersRef.current.get(displayId)?.pc.close();
      peersRef.current.delete(displayId);
      recomputeStatus();
    }

    function handleStop() {
      stopCamera();
    }

    socket.on('webrtc:display-ready', handleDisplayReady);
    socket.on('webrtc:answer', handleAnswer);
    socket.on('webrtc:ice-candidate', handleIceCandidate);
    socket.on('webrtc:display-left', handleDisplayLeft);
    socket.on('webrtc:stop', handleStop);

    return () => {
      socket.off('webrtc:display-ready', handleDisplayReady);
      socket.off('webrtc:answer', handleAnswer);
      socket.off('webrtc:ice-candidate', handleIceCandidate);
      socket.off('webrtc:display-left', handleDisplayLeft);
      socket.off('webrtc:stop', handleStop);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [socket, negotiate]);

  async function startCamera() {
    setError('');
    setStatus('starting');
    try {
      // Prefer the rear/environment-facing camera — this is a live coverage
      // tool meant to film the event, not a selfie cam. `ideal` (not `exact`)
      // so it still falls back gracefully on devices with only one camera
      // (laptops, desktops).
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' } },
        audio: true,
      });
      localStreamRef.current = stream;
      if (localVideoRef.current) localVideoRef.current.srcObject = stream;

      // Negotiate with every display already known about; any display that
      // connects later triggers its own negotiation via handleDisplayReady.
      recomputeStatus();
      await Promise.all(
        [...knownDisplayIdsRef.current].map((displayId) => negotiate(socket, displayId))
      );
    } catch (err) {
      setError(err.message || 'Could not access camera/microphone');
      setStatus('error');
    }
  }

  function stopCamera() {
    for (const peer of peersRef.current.values()) peer.pc.close();
    peersRef.current.clear();
    localStreamRef.current?.getTracks().forEach((track) => track.stop());
    localStreamRef.current = null;
    if (localVideoRef.current) localVideoRef.current.srcObject = null;
    setLiveCount(0);
    setStatus('idle');
  }

  useEffect(() => stopCamera, []);

  const statusLabel = {
    idle: 'Idle',
    starting: 'Waiting for display screen...',
    connecting: 'Connecting...',
    live: liveCount > 1 ? `Live to ${liveCount} screens` : 'Live',
    error: 'Error',
  }[status];

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-slate-950 p-6">
      <h1 className="text-xl font-bold text-white">Live Camera</h1>
      <p className="text-sm text-slate-400">
        Socket: {connected ? 'connected' : 'connecting...'}
      </p>

      <div className="relative aspect-video w-full max-w-md overflow-hidden rounded-2xl border border-slate-800 bg-black">
        <video ref={localVideoRef} autoPlay playsInline muted className="h-full w-full object-cover" />
        {status === 'live' && (
          <span className="absolute left-3 top-3 flex items-center gap-1.5 rounded bg-red-600/90 px-2 py-1 text-xs font-bold uppercase text-white">
            ● Live
          </span>
        )}
      </div>

      {error && <p className="text-sm text-rose-400">{error}</p>}

      {status === 'idle' || status === 'error' ? (
        <button
          onClick={startCamera}
          className="rounded-xl bg-red-600 px-6 py-3 text-lg font-bold text-white hover:bg-red-500"
        >
          Start Live Camera
        </button>
      ) : (
        <button
          onClick={stopCamera}
          className="rounded-xl bg-slate-700 px-6 py-3 text-lg font-bold text-white hover:bg-slate-600"
        >
          Stop Camera
        </button>
      )}

      <p className="text-xs uppercase tracking-wide text-slate-500">
        Status: <span className="font-semibold text-slate-300">{statusLabel}</span>
      </p>
    </div>
  );
}
