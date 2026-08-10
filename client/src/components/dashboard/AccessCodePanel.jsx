import { useEffect, useState } from 'react';

const ROTATION_MS = 60 * 1000;

export default function AccessCodePanel({ otp }) {
  const [secondsLeft, setSecondsLeft] = useState(null);

  // Purely local countdown display between server pushes — the server is
  // still the only source of truth for the code itself.
  useEffect(() => {
    if (!otp?.generatedAt) return;
    const tick = () => {
      const remaining = Math.max(0, ROTATION_MS - (Date.now() - otp.generatedAt));
      setSecondsLeft(Math.ceil(remaining / 1000));
    };
    tick();
    const interval = setInterval(tick, 250);
    return () => clearInterval(interval);
  }, [otp?.generatedAt]);

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
        Display / Camera Access Code
      </h2>
      <p className="mb-4 text-sm text-slate-500 dark:text-slate-400">
        Share this code with whoever is opening the presentation screen or live camera page.
        It refreshes every minute.
      </p>
      <div className="flex items-center justify-between rounded-xl bg-slate-100 px-5 py-4 dark:bg-slate-800">
        <span className="font-mono text-4xl font-bold tracking-[0.3em] text-slate-900 dark:text-white">
          {otp?.otp ?? '----'}
        </span>
        <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
          {secondsLeft !== null ? `refreshes in ${secondsLeft}s` : ''}
        </span>
      </div>
    </div>
  );
}
