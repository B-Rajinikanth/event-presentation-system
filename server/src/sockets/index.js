import { verifyToken } from '../utils/jwt.js';
import { getState, updateState, updateCountdown, updatePosterUnveilCountdown } from './presentationState.js';
import Event from '../models/Event.js';
import SubEvent from '../models/SubEvent.js';
import Media from '../models/Media.js';

let countdownInterval = null;

function isAdmin(socket) {
  return socket.data.user?.role === 'admin';
}

function requireAdminAck(socket, ack) {
  if (!isAdmin(socket)) {
    const error = { message: 'Admin authentication required for this action' };
    if (typeof ack === 'function') ack({ ok: false, error });
    return false;
  }
  return true;
}

export function initSocket(io) {
  // WebRTC signaling registry: any number of displays + a single active
  // camera (MVP scope). The camera opens one dedicated RTCPeerConnection per
  // display, so signaling is routed point-to-point by socket id rather than
  // broadcast — each display only ever hears about its own connection.
  const registry = { displaySocketIds: new Set(), cameraSocketId: null };

  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (token) {
      try {
        socket.data.user = verifyToken(token);
      } catch {
        // Invalid token: treat as unauthenticated (display/camera clients don't need auth).
      }
    }
    next();
  });

  io.on('connection', (socket) => {
    const role = socket.handshake.query?.role || 'viewer';
    socket.data.role = role;

    // ---- Presentation registry (display / camera) for WebRTC signaling ----
    if (role === 'display') {
      registry.displaySocketIds.add(socket.id);
      if (registry.cameraSocketId) {
        io.to(registry.cameraSocketId).emit('webrtc:display-ready', { displayId: socket.id });
      }
    }

    if (role === 'camera') {
      registry.cameraSocketId = socket.id;
      // Tell the (re)connecting camera about every display that's already
      // up, so it opens a dedicated peer connection to each one.
      for (const displayId of registry.displaySocketIds) {
        socket.emit('webrtc:display-ready', { displayId });
      }
    }

    socket.on('disconnect', () => {
      if (registry.displaySocketIds.has(socket.id)) {
        registry.displaySocketIds.delete(socket.id);
        if (registry.cameraSocketId) {
          io.to(registry.cameraSocketId).emit('webrtc:display-left', { displayId: socket.id });
        }
      }
      if (registry.cameraSocketId === socket.id) {
        registry.cameraSocketId = null;
        for (const displayId of registry.displaySocketIds) {
          io.to(displayId).emit('webrtc:camera-left');
        }
      }
    });

    // ---- WebRTC signaling relay ----
    // Offer is now targeted (camera addresses each display individually,
    // since it holds a separate RTCPeerConnection per display).
    socket.on('webrtc:offer', ({ offer, to }) => {
      if (to) {
        io.to(to).emit('webrtc:offer', { offer, from: socket.id });
      }
    });

    socket.on('webrtc:answer', ({ answer, to }) => {
      io.to(to).emit('webrtc:answer', { answer, from: socket.id });
    });

    socket.on('webrtc:ice-candidate', ({ candidate, to }) => {
      io.to(to).emit('webrtc:ice-candidate', { candidate, from: socket.id });
    });

    // ---- Admin control events ----

    socket.on('control:event:setActive', async ({ eventId }, ack) => {
      if (!requireAdminAck(socket, ack)) return;
      const event = await Event.findById(eventId);
      if (!event) return ack?.({ ok: false, error: { message: 'Event not found' } });
      await Event.updateMany({}, { isActive: false });
      event.isActive = true;
      await event.save();
      const state = await updateState({ event: event._id });
      io.emit('state:update', state);
      ack?.({ ok: true });
    });

    socket.on('control:subEvent:setActive', async ({ subEventId }, ack) => {
      if (!requireAdminAck(socket, ack)) return;
      const subEvent = subEventId ? await SubEvent.findById(subEventId) : null;
      const state = await updateState({ activeSubEvent: subEvent ? subEvent._id : null });
      io.emit('state:update', state);
      ack?.({ ok: true });
    });

    socket.on('control:poster:show', async ({ mediaId }, ack) => {
      if (!requireAdminAck(socket, ack)) return;
      const media = await Media.findById(mediaId);
      if (!media) return ack?.({ ok: false, error: { message: 'Media not found' } });
      stopUnveilTicking();
      await updatePosterUnveilCountdown({ status: 'stopped' });
      const state = await updateState({ activePoster: media._id, layout: 'poster' });
      io.emit('state:update', state);
      ack?.({ ok: true });
    });

    socket.on('control:poster:hide', async (_payload, ack) => {
      if (!requireAdminAck(socket, ack)) return;
      stopUnveilTicking();
      await updatePosterUnveilCountdown({ status: 'stopped' });
      const state = await updateState({ activePoster: null, layout: 'idle' });
      io.emit('state:update', state);
      ack?.({ ok: true });
    });

    socket.on('control:layout:set', async ({ layout }, ack) => {
      if (!requireAdminAck(socket, ack)) return;
      const allowed = ['idle', 'poster', 'countdown', 'countdown_live', 'live'];
      if (!allowed.includes(layout)) {
        return ack?.({ ok: false, error: { message: 'Invalid layout' } });
      }
      stopUnveilTicking();
      await updatePosterUnveilCountdown({ status: 'stopped' });
      const state = await updateState({ layout });
      io.emit('state:update', state);
      ack?.({ ok: true });
    });

    // ---- Poster Unveil: a customizable, seconds-only countdown (kept in its
    // own posterUnveilCountdown state, separate from the main event
    // countdown) that auto-reveals a poster with a celebration effect on the
    // presentation screen when it reaches zero. ----

    socket.on('control:posterUnveil:start', async ({ mediaId, durationSeconds }, ack) => {
      if (!requireAdminAck(socket, ack)) return;
      const media = await Media.findById(mediaId);
      if (!media) return ack?.({ ok: false, error: { message: 'Media not found' } });

      const requested = Number(durationSeconds);
      // Clamp to a sane range rather than trusting the client outright — 5
      // minutes is far more than a "reveal countdown" should ever need.
      const duration = Number.isFinite(requested) && requested > 0 ? Math.min(Math.round(requested), 300) : 10;

      await updateState({ activePoster: media._id, layout: 'poster_unveil' });
      const state = await updatePosterUnveilCountdown({
        durationSeconds: duration,
        remainingSeconds: duration,
        status: 'running',
      });
      io.emit('state:update', state);
      startUnveilTicking(io);
      ack?.({ ok: true });
    });

    socket.on('control:posterUnveil:cancel', async (_payload, ack) => {
      if (!requireAdminAck(socket, ack)) return;
      stopUnveilTicking();
      await updateState({ layout: 'idle' });
      const state = await updatePosterUnveilCountdown({ status: 'stopped', remainingSeconds: 0 });
      io.emit('state:update', state);
      ack?.({ ok: true });
    });

    // ---- Countdown control ----

    socket.on('control:countdown:set', async ({ durationSeconds }, ack) => {
      if (!requireAdminAck(socket, ack)) return;
      const state = await updateCountdown({
        durationSeconds,
        remainingSeconds: durationSeconds,
        status: 'stopped',
      });
      io.emit('state:update', state);
      ack?.({ ok: true });
    });

    socket.on('control:countdown:setAlertThreshold', async ({ thresholdSeconds }, ack) => {
      if (!requireAdminAck(socket, ack)) return;
      if (!Number.isFinite(thresholdSeconds) || thresholdSeconds < 0) {
        return ack?.({ ok: false, error: { message: 'Invalid threshold' } });
      }
      const state = await updateCountdown({ alertThresholdSeconds: thresholdSeconds });
      io.emit('state:update', state);
      ack?.({ ok: true });
    });

    socket.on('control:countdown:start', async (_payload, ack) => {
      if (!requireAdminAck(socket, ack)) return;
      const current = await getState();
      const remaining = current.countdown.remainingSeconds || current.countdown.durationSeconds;
      const state = await updateCountdown({
        status: 'running',
        remainingSeconds: remaining,
        startedAt: new Date(),
      });
      io.emit('state:update', state);
      startTicking(io);
      ack?.({ ok: true });
    });

    socket.on('control:countdown:pause', async (_payload, ack) => {
      if (!requireAdminAck(socket, ack)) return;
      const state = await updateCountdown({ status: 'paused' });
      io.emit('state:update', state);
      ack?.({ ok: true });
    });

    socket.on('control:countdown:resume', async (_payload, ack) => {
      if (!requireAdminAck(socket, ack)) return;
      const state = await updateCountdown({ status: 'running', startedAt: new Date() });
      io.emit('state:update', state);
      startTicking(io);
      ack?.({ ok: true });
    });

    socket.on('control:countdown:reset', async (_payload, ack) => {
      if (!requireAdminAck(socket, ack)) return;
      const current = await getState();
      const state = await updateCountdown({
        status: 'stopped',
        remainingSeconds: current.countdown.durationSeconds,
      });
      io.emit('state:update', state);
      ack?.({ ok: true });
    });

    socket.on('control:countdown:stop', async (_payload, ack) => {
      if (!requireAdminAck(socket, ack)) return;
      const state = await updateCountdown({ status: 'stopped', remainingSeconds: 0 });
      io.emit('state:update', state);
      ack?.({ ok: true });
    });

    // ---- Live video control ----

    socket.on('control:live:start', async (_payload, ack) => {
      if (!requireAdminAck(socket, ack)) return;
      stopUnveilTicking();
      await updatePosterUnveilCountdown({ status: 'stopped' });
      const current = await getState();
      const nextLayout = current.countdown.status !== 'stopped' ? 'countdown_live' : 'live';
      const state = await updateState({ 'live.isLive': true, layout: nextLayout });
      io.emit('state:update', state);
      ack?.({ ok: true });
    });

    socket.on('control:live:stop', async (_payload, ack) => {
      if (!requireAdminAck(socket, ack)) return;
      const current = await getState();
      const nextLayout = current.countdown.status !== 'stopped' ? 'countdown' : 'idle';
      const state = await updateState({ 'live.isLive': false, layout: nextLayout });
      io.emit('state:update', state);
      io.emit('webrtc:stop');
      ack?.({ ok: true });
    });

    // ---- Presentation lifecycle ----

    socket.on('control:presentation:close', async (_payload, ack) => {
      if (!requireAdminAck(socket, ack)) return;
      stopTicking();
      stopUnveilTicking();
      const state = await updateState({
        layout: 'idle',
        activePoster: null,
        'live.isLive': false,
      });
      await updateCountdown({ status: 'stopped', remainingSeconds: 0 });
      await updatePosterUnveilCountdown({ status: 'stopped', remainingSeconds: 0 });
      const finalState = await getState();
      io.emit('state:update', finalState);
      io.emit('webrtc:stop');
      ack?.({ ok: true });
    });

    // Send current state once connected. This runs last and is fire-and-
    // forget on purpose: every socket.on(...) above must be registered
    // synchronously, in the same tick as the 'connection' event, or a
    // control event sent immediately after connecting can arrive before its
    // listener exists and be silently dropped. Awaiting this DB round-trip
    // any earlier (as this used to do, at the top of the handler) created
    // exactly that race — invisible on a local Mongo instance's near-zero
    // latency, but a real gap against a networked database like Atlas.
    getState()
      .then((state) => socket.emit('state:update', state))
      .catch((err) => console.error('[socket] failed to send initial state:', err.message));
  });
}

function startTicking(io) {
  if (countdownInterval) return;
  countdownInterval = setInterval(async () => {
    try {
      const current = await getState();
      if (current.countdown.status !== 'running') {
        stopTicking();
        return;
      }
      const remaining = Math.max(0, current.countdown.remainingSeconds - 1);
      const status = remaining === 0 ? 'stopped' : 'running';
      const state = await updateCountdown({ remainingSeconds: remaining, status });
      io.emit('state:update', state);

      if (remaining === 0) {
        stopTicking();
      }
    } catch (err) {
      console.error('[socket] countdown tick error:', err.message);
    }
  }, 1000);
}

function stopTicking() {
  if (countdownInterval) {
    clearInterval(countdownInterval);
    countdownInterval = null;
  }
}

let unveilCountdownInterval = null;

function startUnveilTicking(io) {
  if (unveilCountdownInterval) return;
  unveilCountdownInterval = setInterval(async () => {
    try {
      const current = await getState();
      if (current.posterUnveilCountdown.status !== 'running') {
        stopUnveilTicking();
        return;
      }
      const remaining = Math.max(0, current.posterUnveilCountdown.remainingSeconds - 1);
      const status = remaining === 0 ? 'stopped' : 'running';
      const state = await updatePosterUnveilCountdown({ remainingSeconds: remaining, status });
      io.emit('state:update', state);

      if (remaining === 0) {
        stopUnveilTicking();
        const revealState = await updateState({ layout: 'poster' });
        io.emit('state:update', revealState);
        io.emit('poster:unveiled');
      }
    } catch (err) {
      console.error('[socket] poster unveil tick error:', err.message);
    }
  }, 1000);
}

function stopUnveilTicking() {
  if (unveilCountdownInterval) {
    clearInterval(unveilCountdownInterval);
    unveilCountdownInterval = null;
  }
}
