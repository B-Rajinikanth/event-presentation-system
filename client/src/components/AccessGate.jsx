import { useState } from 'react';
import api from '../services/api.js';

const STORAGE_PREFIX = 'access_verified_';

// sessionStorage (not localStorage) is the whole trick here: it survives a
// page reload within the same tab, but is cleared the moment the tab/browser
// closes — exactly "don't ask again on refresh, do ask again next time it's
// opened."
export function isGateUnlocked(gateId) {
  return sessionStorage.getItem(STORAGE_PREFIX + gateId) === 'true';
}

export default function AccessGate({ gateId, title, onUnlocked }) {
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function submit(value) {
    if (value.length !== 4 || submitting) return;
    setSubmitting(true);
    setError('');
    try {
      await api.post('/otp/verify', { code: value });
      sessionStorage.setItem(STORAGE_PREFIX + gateId, 'true');
      onUnlocked();
    } catch (err) {
      setError(err.response?.data?.message || 'Something went wrong. Try again.');
      setCode('');
    } finally {
      setSubmitting(false);
    }
  }

  function handleChange(e) {
    const digitsOnly = e.target.value.replace(/\D/g, '').slice(0, 4);
    setCode(digitsOnly);
    if (digitsOnly.length === 4) submit(digitsOnly);
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-5 bg-slate-950 p-6 text-center">
      <h1 className="text-xl font-bold text-white">{title}</h1>
      <p className="max-w-xs text-sm text-slate-400">
        Enter the 4-digit access code shown on the admin dashboard.
      </p>
      <input
        autoFocus
        inputMode="numeric"
        pattern="[0-9]*"
        maxLength={4}
        value={code}
        onChange={handleChange}
        disabled={submitting}
        aria-label="4-digit access code"
        className="w-40 rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-center text-3xl tracking-[0.5em] text-white focus:border-indigo-500 focus:outline-none disabled:opacity-50"
        placeholder="----"
      />
      {submitting && <p className="text-sm text-slate-500">Checking...</p>}
      {error && <p className="text-sm text-rose-400">{error}</p>}
    </div>
  );
}
