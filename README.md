# Event On-Screen Presentation & Live Coverage Management System

A MERN application for running a live event's on-screen presentation from a single
admin control panel: full-screen posters, countdown timers, event/sub-event titles,
and browser-based live camera coverage (WebRTC), all synchronized in real time
(Socket.IO) to a dedicated presentation screen.

Built from the proposal in `Event_On_Screen_Presentation_Live_Coverage_Proposal.docx`,
covering the recommended MVP scope (§20 of the proposal).

## Stack

| Layer | Technology |
|---|---|
| Frontend | React 19 + Vite, Tailwind CSS v4, React Router |
| Backend | Node.js + Express |
| Database | MongoDB (Mongoose) |
| Real-time | Socket.IO |
| Live video | WebRTC (browser-to-browser, signaled over Socket.IO) |
| Auth | JWT + bcrypt |

## Project layout

```
server/   Express API, Socket.IO real-time engine, WebRTC signaling relay
client/   React app: Admin dashboard, /display screen, /camera capture page
```

## Prerequisites

- Node.js 18+
- MongoDB running locally (or a connection string to a hosted instance)

## Setup

### 1. Backend

```bash
cd server
cp .env.example .env   # edit values as needed
npm install
npm run seed            # creates the admin user from ADMIN_EMAIL / ADMIN_PASSWORD
npm run dev              # starts on http://localhost:5001 (nodemon)
```

`.env` variables:

| Variable | Purpose |
|---|---|
| `PORT` | API/Socket.IO port (default 5001; 5000 conflicts with macOS AirPlay Receiver) |
| `MONGO_URI` | MongoDB connection string |
| `JWT_SECRET` | Secret used to sign admin session tokens — change this |
| `JWT_EXPIRES_IN` | Token lifetime, e.g. `12h` |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` | Credentials created by `npm run seed` |

CORS reflects the request's origin rather than a fixed one, since the Live
Camera page (`/camera`) is meant to be opened from phones/tablets on the venue
LAN — see [LAN access for the Live Camera page](#lan-access-for-the-live-camera-page).

### 2. Frontend

```bash
cd client
npm install
npm run dev   # starts on http://localhost:5173, bound to all network interfaces
```

`client/.env` only needs the API port — the client auto-detects the API/socket
host from whatever hostname the page was loaded with (see below):

```
VITE_API_PORT=5001
```

### 3. Log in

Open `http://localhost:5173`, sign in with the seeded admin credentials
(`ADMIN_EMAIL` / `ADMIN_PASSWORD` from `server/.env`).

## LAN access for the Live Camera page

The proposal's live-coverage feature requires a phone/tablet to open `/camera`
on the local network — `localhost` on that device would point at the device
itself, not the dev machine. To support this without per-device configuration:

- `client/src/services/apiBase.js` derives the API/socket URL from
  `window.location.hostname` at runtime, so it automatically points at
  whatever host served the page.
- `npm run dev` runs Vite with `--host`, binding it to all network interfaces
  (not just `localhost`).
- The server's CORS reflects the request origin instead of checking against a
  single fixed origin.

To use it: find your dev machine's LAN IP (shown in the `vite --host` output,
e.g. `http://172.16.x.x:5173`), and open that address — not `localhost` — on
the phone/tablet's browser, navigating to `/camera`. Both devices must be on
the same network. Camera/microphone access requires a secure context, so this
works over plain HTTP only because most mobile browsers treat LAN IPs as
"potentially trustworthy" in development; use HTTPS for anything beyond local
testing (see Production considerations below).

## Routes

| Route | Access | Purpose |
|---|---|---|
| `/login` | Public | Admin sign-in |
| `/dashboard` | Admin only | Control room: quick controls, countdown, poster, layout, event info, live preview |
| `/events` | Admin only | Create/edit/delete events and sub-events, activate an event, jump to that event's media |
| `/media` | Admin only | Upload/rename/delete posters & banners for a specific event (JPG/JPEG/PNG/WebP) |
| `/display` | Public, no login | The presentation screen — open this full-screen on the projector/TV |
| `/camera` | Public, no login | Open on a phone/tablet/laptop to broadcast a live camera feed to `/display` |

The Admin controls everything from `/dashboard`; `/display` and `/camera` are
unauthenticated "endpoint" screens by design (per the proposal's role model —
only the Admin has a login).

Every admin page has a dark/light theme toggle (top right), persisted in
`localStorage` and defaulting to the browser's OS preference. `/display` and
`/camera` are intentionally always dark, matching a presentation/projector
context regardless of the admin's theme choice.

## Media is scoped per event

Posters, banners, and other media belong to exactly one event — there is no
shared/global library. Upload from `/media?event=<id>` (reachable via the
"Media" link on each row in `/events`, or the event selector at the top of
the Media Library page), and the Dashboard's Poster/Banner control only shows
media for the currently active event.

## How the real-time flow works

1. Every client (dashboard, `/display`, `/camera`) opens a Socket.IO connection.
   The server holds a single **presentation state** document (layout, active
   poster, countdown, live status, active event/sub-event) in MongoDB and
   broadcasts it as `state:update` to all connected clients whenever it changes.
2. Admin actions (`control:*` socket events) require a valid JWT passed in the
   socket handshake; `/display` and `/camera` connect without a token.
3. **Live video** is peer-to-camera-to-display WebRTC — the server only relays
   SDP offers/answers and ICE candidates between the camera sender and the
   single active display receiver (`webrtc:*` events). Video/audio never
   passes through the server. The camera always negotiates a fresh
   `RTCPeerConnection` per display connection (rather than reusing a stale
   one), and ICE candidates arriving before the remote description is set are
   buffered on both sides — this makes reconnects (display refresh, camera
   restart) reliable instead of getting stuck.
4. The countdown ticks server-side (one authoritative timer) and broadcasts
   the remaining time every second, so all screens stay in sync even if the
   admin's tab is slow or backgrounded.
5. `/display` explicitly calls `video.play()` for the incoming camera stream
   and shows a "tap to enable audio & full screen" overlay if the browser
   blocks autoplay of unmuted video — tapping it satisfies the browser's
   user-gesture requirement for both audio playback and the Fullscreen API in
   one action.

## Typical operator workflow

1. Sign in, create an event (`/events`) and its sub-events.
2. Upload that event's poster/banner from the "Media" link on the event row.
3. On `/dashboard`: select the active event/sub-event, show the poster
   full-screen, or set a countdown duration and hit **Start**.
4. Open `/display` full-screen (click "Enter Full Screen" on that page — a
   real browser gesture is required) on the presentation output, and `/camera`
   on a phone/tablet for live coverage (see LAN access above).
5. Click **Live** to switch to Countdown+Live (or Full Live) — the camera
   feed appears on `/display` automatically once WebRTC negotiates. The
   active poster renders as a blurred/dimmed background behind the countdown
   and live layouts; in the "Full Poster" layout it fills the entire screen.
6. Click **Close** to end the presentation and reset the screen to idle.

## Notes & production considerations

- **HTTPS is required in production** for `getUserMedia` (camera/mic access)
  to work outside `localhost`/LAN development contexts.
- WebRTC uses a public STUN server only (`client/src/services/webrtcConfig.js`).
  For camera devices behind restrictive NATs/firewalls, add a TURN server.
- The MVP supports **one active display screen and one active camera** at a
  time, matching the proposal's MVP scope. Multi-screen/multi-camera support
  is listed as a future enhancement in the original proposal (§19).
- Uploaded posters are stored on local disk (`server/uploads/posters`); swap
  for S3/Cloud storage before deploying to multiple server instances.
- CORS reflecting the request origin is intended for a trusted-LAN internal
  tool (auth is Bearer-token based, not cookies, so this carries no CSRF
  risk); lock it down to specific origins if deploying beyond a single venue's
  network.
