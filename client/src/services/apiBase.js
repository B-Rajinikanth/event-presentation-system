// Derived from the page's own hostname rather than a hardcoded "localhost" URL.
// This lets the Live Camera page work when opened from a phone/tablet on the
// venue LAN (e.g. http://192.168.1.20:5173) — "localhost" on that device
// would otherwise point back at the device itself, not the dev machine.
// Set VITE_API_URL to override this entirely (e.g. for a non-standard deploy).
const API_PORT = import.meta.env.VITE_API_PORT || '5001';

export const API_BASE_URL =
  import.meta.env.VITE_API_URL || `${window.location.protocol}//${window.location.hostname}:${API_PORT}`;
