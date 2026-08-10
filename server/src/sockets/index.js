import { verifyToken } from '../utils/jwt.js';
import { getState, updateState, updateCountdown, updatePosterUnveilCountdown } from './presentationState.js';
import Event from '../models/Event.js';
import SubEvent from '../models/SubEvent.js';
import Media from '../models/Media.js';
import User from '../models/User.js';
import { startOtpRotation, getOtpSnapshot } from '../services/otp.js';
import { setIO, addConnectedAdmin, removeConnectedAdmin } from './registry.js';

let countdownInterval = null;

// superadmin is a superset of admin: it can additionally manage admin
// accounts (see routes/admins.routes.js) and, unlike a plain admin, is
// exempt from the single-controller exclusivity lock below — it can always
// connect, even alongside an existing admin or another superadmin.
function isAdmin(socket) {
  return ['admin', 'superadmin'].includes(socket.data.user?.role);
}

function isSuperadmin(socket) {
  return socket.data.user?.role === 'superadmin';
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
  const registry = {
    displaySocketIds: new Set(),
    cameraSocketId: null,
    adminSocketId: null,
    adminUser: null,
    displaysLocked: false,
  };

  // Access-code rotation for /display and /camera: runs independently of any
  // admin action, starting the moment the server boots, so the dashboard
  // always has a current code to show.
  startOtpRotation(io);

  // Lets REST routes (admins.routes.js) reach into this live socket server
  // to force-disconnect a specific admin's session.
  setIO(io);

  io.use(async (socket, next) => {
    const token = socket.handshake.auth?.token;
    if (token) {
      try {
        const decoded = verifyToken(token);
        // A superadmin action (deactivate/reset password/remove/force-logout)
        // bumps tokenVersion or flips active — checked here so a stale token
        // can't be used to open a *new* admin connection either, not just to
        // keep an already-open one alive.
        if (socket.handshake.query?.role === 'admin') {
          const user = await User.findById(decoded.id).select('active tokenVersion');
          if (!user || !user.active || user.tokenVersion !== decoded.tokenVersion) {
            return next(new Error('Your session is no longer valid. Please log in again.'));
          }
        }
        socket.data.user = decoded;
      } catch {
        // Invalid token: treat as unauthenticated (display/camera clients don't need auth).
      }
    }
    next();
  });

  // Exclusivity / lockdown gate — runs after the middleware above so
  // socket.data.user is already set for the admin check. Rejecting here
  // (via next(new Error(...))) fails the handshake itself: the client gets
  // a 'connect_error' and never becomes a full connection, so nothing needs
  // to be added to the registry or cleaned up on the reject path. There is
  // deliberately no automatic retry anywhere in this flow (client-side
  // included) — a rejected admin/camera/display must make a fresh manual
  // attempt, not silently reconnect once the slot frees up.
  io.use((socket, next) => {
    const role = socket.handshake.query?.role || 'viewer';

    if (role === 'camera' && registry.cameraSocketId) {
      return next(new Error('Another camera is already connected.'));
    }
    // Superadmin never competes for this slot — it's exempt from the
    // single-controller lock entirely, so it neither blocks nor is blocked.
    if (role === 'admin' && isAdmin(socket) && !isSuperadmin(socket) && registry.adminSocketId) {
      const controller = registry.adminUser;
      const err = new Error(
        controller
          ? `${controller.name} (${controller.email}) is currently controlling the room.`
          : 'Another admin session is already active.'
      );
      // Socket.IO forwards err.data to the client's connect_error handler —
      // lets the UI show who's in control, not just a generic message.
      err.data = { currentAdmin: controller || null };
      return next(err);
    }
    if (role === 'display' && registry.displaysLocked) {
      return next(new Error('The admin has paused new display connections.'));
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
      broadcastDisplaysUpdate(io, registry);
    }

    if (role === 'camera') {
      registry.cameraSocketId = socket.id;
      // Tell the (re)connecting camera about every display that's already
      // up, so it opens a dedicated peer connection to each one.
      for (const displayId of registry.displaySocketIds) {
        socket.emit('webrtc:display-ready', { displayId });
      }
    }

    // The rotating access code (and display count/lock) is admin-only:
    // joining a room lets otp.js/broadcastDisplaysUpdate push with a single
    // io.to('admin').emit(...) rather than tracking admin ids by hand.
    if (isAdmin(socket)) {
      // Tracked for every admin-role socket (plain admin or superadmin) so a
      // superadmin's force-logout/deactivate/reset-password action can reach
      // this exact connection, even though only plain admins occupy the
      // exclusivity slot below.
      addConnectedAdmin(socket.data.user.id, socket.id);
      if (!isSuperadmin(socket)) {
        registry.adminSocketId = socket.id;
      }
      socket.join('admin');
      socket.emit('otp:update', getOtpSnapshot());
      socket.emit('displays:update', { count: registry.displaySocketIds.size, locked: registry.displaysLocked });
      // Fire-and-forget: caches this admin's identity so a rejected
      // duplicate admin connection can be told who's currently in control.
      // Not needed synchronously, so it's fine that this resolves slightly
      // after the listener registrations below. Only plain admins occupy
      // this slot, so a connecting superadmin never overwrites it.
      if (!isSuperadmin(socket)) {
        User.findById(socket.data.user.id)
          .select('name email')
          .then((user) => {
            if (registry.adminSocketId === socket.id) {
              registry.adminUser = user ? { name: user.name, email: user.email } : null;
            }
          })
          .catch(() => {});
      }
    }

    socket.on('disconnect', () => {
      if (registry.displaySocketIds.has(socket.id)) {
        registry.displaySocketIds.delete(socket.id);
        if (registry.cameraSocketId) {
          io.to(registry.cameraSocketId).emit('webrtc:display-left', { displayId: socket.id });
        }
        broadcastDisplaysUpdate(io, registry);
      }
      if (registry.cameraSocketId === socket.id) {
        registry.cameraSocketId = null;
        for (const displayId of registry.displaySocketIds) {
          io.to(displayId).emit('webrtc:camera-left');
        }
      }
      if (isAdmin(socket)) {
        removeConnectedAdmin(socket.data.user.id, socket.id);
      }
      if (registry.adminSocketId === socket.id) {
        registry.adminSocketId = null;
        registry.adminUser = null;
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

    // Pausing new display connections doesn't affect displays already
    // connected — it only changes what the io.use() gate above does with
    // the *next* connection attempt.
    socket.on('control:displays:setLocked', (payload, ack) => {
      if (!requireAdminAck(socket, ack)) return;
      registry.displaysLocked = Boolean(payload?.locked);
      broadcastDisplaysUpdate(io, registry);
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

function broadcastDisplaysUpdate(io, registry) {
  io.to('admin').emit('displays:update', {
    count: registry.displaySocketIds.size,
    locked: registry.displaysLocked,
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
