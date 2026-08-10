import { Router } from 'express';
import { verifyOtp } from '../services/otp.js';

const router = Router();

// Basic per-IP brute-force guard: a 4-digit code is only 10,000
// combinations, so an unlimited endpoint would be trivially crackable.
const MAX_ATTEMPTS = 5;
const LOCKOUT_MS = 30 * 1000;
const attempts = new Map(); // ip -> { count, lockedUntil }

// Public (no auth) — /display and /camera connect anonymously by design.
router.post('/verify', (req, res) => {
  const ip = req.ip;
  const entry = attempts.get(ip);

  if (entry?.lockedUntil && Date.now() < entry.lockedUntil) {
    const retryAfterSeconds = Math.ceil((entry.lockedUntil - Date.now()) / 1000);
    return res.status(429).json({ message: `Too many attempts. Try again in ${retryAfterSeconds}s.` });
  }

  const { code } = req.body;
  if (typeof code !== 'string' || !/^\d{4}$/.test(code)) {
    return res.status(400).json({ message: 'Enter a 4-digit code.' });
  }

  if (verifyOtp(code)) {
    attempts.delete(ip);
    return res.json({ ok: true });
  }

  const next = entry || { count: 0, lockedUntil: null };
  next.count += 1;
  if (next.count >= MAX_ATTEMPTS) {
    next.lockedUntil = Date.now() + LOCKOUT_MS;
    next.count = 0;
  }
  attempts.set(ip, next);
  // Use 400, not 401 — the client's axios interceptor treats 401 as an
  // expired admin session and force-redirects to /login, which is wrong
  // for this anonymous, non-JWT endpoint.
  return res.status(400).json({ message: 'Incorrect code.' });
});

export default router;
