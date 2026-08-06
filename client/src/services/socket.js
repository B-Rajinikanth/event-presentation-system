import { io } from 'socket.io-client';
import { API_BASE_URL } from './apiBase.js';

// Each caller gets its own independent connection. A shared module-level
// singleton doesn't work here: the Dashboard page has two simultaneous
// usePresentationSocket consumers (the dashboard itself as "admin", and
// PreviewPane as "viewer") — a single shared socket meant whichever one
// connected last would silently steal the connection out from under the
// other, so admin control clicks could end up firing on an unauthenticated
// socket and get silently rejected by the server.
export function createSocket({ role, token } = {}) {
  return io(API_BASE_URL, {
    query: { role: role || 'viewer' },
    auth: token ? { token } : {},
    transports: ['websocket', 'polling'],
  });
}
