import { useCallback, useEffect, useRef, useState } from 'react';
import { usePresentationSocket } from '../hooks/usePresentationSocket.js';
import { RTC_CONFIG } from '../services/webrtcConfig.js';

export default function LiveCamera() {
  const { connected, socket } = usePresentationSocket('camera');
  const localVideoRef = useRef(null);
  const pcRef = useRef(null);
  const localStreamRef = useRef(null);
  const displaySocketIdRef = useRef(null);
  const pendingLocalCandidatesRef = useRef([]);
  const pendingRemoteCandidatesRef = useRef([]);

  const [status, setStatus] = useState('idle'); // idle | starting | connecting | live | error
  const [error, setError] = useState('');

  // Every negotiation attempt gets a brand-new RTCPeerConnection. Reusing a
  // peer connection across a display refresh/reconnect left it stuck in a
  // stale ICE state, which was the main cause of live video failing to
  // (re)connect after the first attempt.
  const negotiate = useCallback(
    async (socketInstance) => {
      const stream = localStreamRef.current;
      if (!stream || !socketInstance) return;

      pcRef.current?.close();
      pendingLocalCandidatesRef.current = [];
      pendingRemoteCandidatesRef.current = [];
      displaySocketIdRef.current = null;

      const pc = new RTCPeerConnection(RTC_CONFIG);
      pcRef.current = pc;
      stream.getTracks().forEach((track) => pc.addTrack(track, stream));

      pc.onicecandidate = (event) => {
        if (!event.candidate) return;
        if (displaySocketIdRef.current) {
          socketInstance.emit('webrtc:ice-candidate', {
            candidate: event.candidate,
            to: displaySocketIdRef.current,
          });
        } else {
          pendingLocalCandidatesRef.current.push(event.candidate);
        }
      };

      pc.onconnectionstatechange = () => {
        if (pc.connectionState === 'connected') setStatus('live');
        if (pc.connectionState === 'connecting') setStatus('connecting');
        if (['failed', 'disconnected'].includes(pc.connectionState)) {
          setStatus('starting');
        }
      };

      setStatus('connecting');
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      socketInstance.emit('webrtc:offer', { offer });
    },
    []
  );

  useEffect(() => {
    if (!socket) return;

    function handleDisplayReady() {
      negotiate(socket);
    }

    async function handleAnswer({ answer, from }) {
      const pc = pcRef.current;
      if (!pc) return;
      displaySocketIdRef.current = from;
      await pc.setRemoteDescription(new RTCSessionDescription(answer));

      // Flush ICE candidates queued on both sides while negotiation was in flight.
      pendingLocalCandidatesRef.current.forEach((candidate) => {
        socket.emit('webrtc:ice-candidate', { candidate, to: from });
      });
      pendingLocalCandidatesRef.current = [];

      for (const candidate of pendingRemoteCandidatesRef.current) {
        await pc.addIceCandidate(new RTCIceCandidate(candidate)).catch(() => {});
      }
      pendingRemoteCandidatesRef.current = [];
    }

    async function handleIceCandidate({ candidate }) {
      const pc = pcRef.current;
      if (!pc?.remoteDescription) {
        pendingRemoteCandidatesRef.current.push(candidate);
        return;
      }
      try {
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
      } catch (err) {
        console.error('[camera] failed to add ICE candidate:', err.message);
      }
    }

    function handleDisplayLeft() {
      // The presentation screen went away mid-call; keep the camera/mic
      // running so we can renegotiate instantly once a display reconnects.
      pcRef.current?.close();
      pcRef.current = null;
      displaySocketIdRef.current = null;
      if (localStreamRef.current) setStatus('starting');
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

      // If a display is already connected, negotiate right away; otherwise
      // wait for the "display-ready" signal once one shows up.
      await negotiate(socket);
    } catch (err) {
      setError(err.message || 'Could not access camera/microphone');
      setStatus('error');
    }
  }

  function stopCamera() {
    pcRef.current?.close();
    pcRef.current = null;
    localStreamRef.current?.getTracks().forEach((track) => track.stop());
    localStreamRef.current = null;
    if (localVideoRef.current) localVideoRef.current.srcObject = null;
    displaySocketIdRef.current = null;
    pendingLocalCandidatesRef.current = [];
    pendingRemoteCandidatesRef.current = [];
    setStatus('idle');
  }

  useEffect(() => stopCamera, []);

  const statusLabel = {
    idle: 'Idle',
    starting: 'Waiting for display screen...',
    connecting: 'Connecting...',
    live: 'Live',
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
