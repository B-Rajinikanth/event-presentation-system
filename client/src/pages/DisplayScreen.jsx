import { useCallback, useEffect, useRef, useState } from 'react';
import { usePresentationSocket } from '../hooks/usePresentationSocket.js';
import { usePageTitle } from '../hooks/usePageTitle.js';
import { RTC_CONFIG } from '../services/webrtcConfig.js';
import { API_BASE_URL } from '../services/apiBase.js';
import CountdownDisplay from '../components/CountdownDisplay.jsx';
import PosterUnveilCountdown from '../components/PosterUnveilCountdown.jsx';
import Confetti from '../components/Confetti.jsx';

const CELEBRATION_DURATION_MS = 4000;

export default function DisplayScreen() {
  usePageTitle('SUH Event: Display Live');
  const { state, socket } = usePresentationSocket('display');
  const videoRef = useRef(null);
  const pcRef = useRef(null);
  const cameraSocketIdRef = useRef(null);
  const streamRef = useRef(null);
  const pendingRemoteCandidatesRef = useRef([]);

  const [needsInteraction, setNeedsInteraction] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [celebrateKey, setCelebrateKey] = useState(0);
  const [celebrating, setCelebrating] = useState(false);

  const layout = state?.layout ?? 'idle';
  const showPoster = layout === 'poster' && state?.activePoster;
  const showCountdown = layout === 'countdown' || layout === 'countdown_live';
  const showLive = layout === 'live' || layout === 'countdown_live';
  const showUnveilCountdown = layout === 'poster_unveil';
  const splitLive = layout === 'countdown_live';
  const posterUrl = state?.activePoster ? `${API_BASE_URL}${state.activePoster.url}` : null;

  const attachAndPlay = useCallback((stream) => {
    if (!videoRef.current) return;
    videoRef.current.srcObject = stream;
    videoRef.current.play().catch(() => {
      // Browsers block autoplay of unmuted video without a user gesture.
      // Surface a tap-to-enable overlay instead of silently failing.
      setNeedsInteraction(true);
    });
  }, []);

  // Re-attach the already-received stream once the <video> element mounts
  // (it only mounts when showLive becomes true, which can happen after the track arrives).
  useEffect(() => {
    if (showLive && streamRef.current) {
      attachAndPlay(streamRef.current);
    }
  }, [showLive, attachAndPlay]);

  useEffect(() => {
    function handleFullscreenChange() {
      setIsFullscreen(Boolean(document.fullscreenElement));
    }
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  // Poster Unveil: the server broadcasts this one-off event the instant the
  // 10s unveil countdown hits zero and switches layout to 'poster'.
  useEffect(() => {
    if (!socket) return;

    function handleUnveiled() {
      setCelebrateKey((k) => k + 1);
      setCelebrating(true);
      const timeout = setTimeout(() => setCelebrating(false), CELEBRATION_DURATION_MS);
      return timeout;
    }

    let timeout;
    const onUnveiled = () => {
      clearTimeout(timeout);
      timeout = handleUnveiled();
    };

    socket.on('poster:unveiled', onUnveiled);
    return () => {
      clearTimeout(timeout);
      socket.off('poster:unveiled', onUnveiled);
    };
  }, [socket]);

  useEffect(() => {
    if (!socket) return;

    function closePeerConnection() {
      pcRef.current?.close();
      pcRef.current = null;
      cameraSocketIdRef.current = null;
      streamRef.current = null;
      pendingRemoteCandidatesRef.current = [];
      if (videoRef.current) videoRef.current.srcObject = null;
    }

    async function handleOffer({ offer, from }) {
      closePeerConnection();

      const pc = new RTCPeerConnection(RTC_CONFIG);
      pcRef.current = pc;
      cameraSocketIdRef.current = from;

      pc.ontrack = (event) => {
        streamRef.current = event.streams[0];
        attachAndPlay(event.streams[0]);
      };

      pc.onicecandidate = (event) => {
        if (event.candidate) {
          socket.emit('webrtc:ice-candidate', { candidate: event.candidate, to: from });
        }
      };

      await pc.setRemoteDescription(new RTCSessionDescription(offer));
      for (const candidate of pendingRemoteCandidatesRef.current) {
        await pc.addIceCandidate(new RTCIceCandidate(candidate)).catch(() => {});
      }
      pendingRemoteCandidatesRef.current = [];

      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      socket.emit('webrtc:answer', { answer, to: from });
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
        console.error('[display] failed to add ICE candidate:', err.message);
      }
    }

    socket.on('webrtc:offer', handleOffer);
    socket.on('webrtc:ice-candidate', handleIceCandidate);
    socket.on('webrtc:camera-left', closePeerConnection);
    socket.on('webrtc:stop', closePeerConnection);

    return () => {
      socket.off('webrtc:offer', handleOffer);
      socket.off('webrtc:ice-candidate', handleIceCandidate);
      socket.off('webrtc:camera-left', closePeerConnection);
      socket.off('webrtc:stop', closePeerConnection);
      closePeerConnection();
    };
  }, [socket, attachAndPlay]);

  function enableInteractionAndFullscreen() {
    setNeedsInteraction(false);
    videoRef.current?.play().catch(() => {});
    document.documentElement.requestFullscreen?.().catch(() => {});
  }

  function toggleFullscreen() {
    if (document.fullscreenElement) {
      document.exitFullscreen?.();
    } else {
      document.documentElement.requestFullscreen?.().catch(() => {});
    }
  }

  const remaining = state?.countdown?.remainingSeconds ?? 0;
  const countdownRunning = state?.countdown?.status === 'running';
  const alertThreshold = state?.countdown?.alertThresholdSeconds ?? 10;
  const isUrgent = countdownRunning && remaining <= alertThreshold && remaining > 0;
  const eventTitle = state?.event?.displayTitle || state?.event?.name;
  const subEventTitle = state?.activeSubEvent?.displayTitle || state?.activeSubEvent?.title;

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-black">
      {posterUrl && layout !== 'idle' && (
        <img
          key={layout === 'poster' && celebrating ? `unveil-${celebrateKey}` : 'poster'}
          src={posterUrl}
          alt=""
          aria-hidden="true"
          className={`absolute inset-0 h-full w-full ${
            layout === 'poster'
              ? `object-contain ${
                  celebrating
                    ? 'animate-poster-unveil-pop scale-100 brightness-100 blur-none'
                    : 'scale-100 brightness-100 blur-none transition-all duration-700'
                }`
              : 'object-cover scale-105 brightness-[0.35] blur-sm transition-all duration-700'
          }`}
        />
      )}

      {celebrating && layout === 'poster' && <Confetti burstKey={celebrateKey} />}

      {(showCountdown || showLive) && (
        <div className="relative flex h-full w-full flex-col sm:flex-row">
          {showCountdown && (
            <div
              className={`flex flex-col items-center justify-center gap-4 px-6 py-4 ${
                splitLive ? 'h-1/2 w-full sm:h-full sm:w-1/2' : 'h-full w-full'
              } ${posterUrl ? 'bg-slate-950/40 backdrop-blur-[2px]' : 'bg-slate-950'}`}
            >
              {eventTitle && (
                <h1 className="text-center text-2xl font-semibold text-slate-200 drop-shadow-lg sm:text-3xl md:text-5xl">
                  {eventTitle}
                </h1>
              )}
              {subEventTitle && (
                <h2 className="text-center text-lg text-indigo-300 drop-shadow-lg sm:text-xl md:text-3xl">
                  {subEventTitle}
                </h2>
              )}
              <CountdownDisplay
                remainingSeconds={remaining}
                urgent={isUrgent}
                size="text-4xl sm:text-6xl md:text-8xl"
                color="text-white"
                showLabels
              />
            </div>
          )}

          {showLive && (
            <div
              className={`relative bg-slate-900/60 ${splitLive ? 'h-1/2 w-full sm:h-full sm:w-1/2' : 'h-full w-full'}`}
            >
              <video ref={videoRef} playsInline className="h-full w-full object-cover" />
              <span className="absolute left-4 top-4 flex items-center gap-2 rounded bg-red-600/90 px-3 py-1 text-sm font-bold uppercase text-white">
                ● Live
              </span>
            </div>
          )}
        </div>
      )}

      {showUnveilCountdown && (
        <div className="relative flex h-full w-full flex-col items-center justify-center gap-6">
          <span className="text-sm font-semibold uppercase tracking-[0.5em] text-emerald-300 drop-shadow-[0_0_0.6em_rgba(52,211,153,0.6)] sm:text-lg">
            Unveiling In
          </span>
          <PosterUnveilCountdown seconds={state?.posterUnveilCountdown?.remainingSeconds} />
        </div>
      )}

      {needsInteraction && (
        <button
          onClick={enableInteractionAndFullscreen}
          className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-3 bg-black/80 text-white"
        >
          <span className="text-2xl font-bold">Tap to enable audio &amp; full screen</span>
          <span className="text-sm text-slate-300">Browsers block autoplaying sound until you interact</span>
        </button>
      )}

      {!isFullscreen && !needsInteraction && (
        <button
          onClick={toggleFullscreen}
          className="absolute right-4 top-4 z-10 rounded-lg border border-white/20 bg-black/50 px-4 py-2 text-sm font-semibold text-white backdrop-blur hover:bg-black/70"
        >
          Enter Full Screen
        </button>
      )}
    </div>
  );
}
