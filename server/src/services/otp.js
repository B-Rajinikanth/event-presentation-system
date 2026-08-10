// A 4-digit access code for /display and /camera, rotated every 60s. Kept
// in-memory (not the DB) — it's meant to expire on its own, and every
// server restart naturally invalidating old codes is a feature, not a bug.
// (Single-instance deployment; a horizontally-scaled setup would need this
// moved to Redis/DB so all instances agree on the current code.)

const ROTATION_MS = 60 * 1000;
const GRACE_MS = 10 * 1000; // previous code still accepted for this long after rotating

let currentOtp = null;
let previousOtp = null;
let currentOtpGeneratedAt = null;
let rotationInterval = null;

function generateOtp() {
  return String(Math.floor(1000 + Math.random() * 9000));
}

function rotate(io) {
  previousOtp = currentOtp;
  currentOtp = generateOtp();
  currentOtpGeneratedAt = Date.now();
  io.to('admin').emit('otp:update', { otp: currentOtp, generatedAt: currentOtpGeneratedAt });
}

export function startOtpRotation(io) {
  if (rotationInterval) return;
  rotate(io); // seed immediately so the first admin connection has a code to show
  rotationInterval = setInterval(() => rotate(io), ROTATION_MS);
}

export function getOtpSnapshot() {
  return { otp: currentOtp, generatedAt: currentOtpGeneratedAt };
}

export function verifyOtp(code) {
  if (code === currentOtp) return true;
  if (code === previousOtp && Date.now() - currentOtpGeneratedAt < GRACE_MS) return true;
  return false;
}
