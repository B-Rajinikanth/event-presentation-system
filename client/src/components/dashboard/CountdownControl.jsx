import { useState } from 'react';
import CountdownDisplay from '../CountdownDisplay.jsx';

export default function CountdownControl({
  countdown,
  onSetDuration,
  onStart,
  onStop,
  onSetAlertThreshold,
  busy,
}) {
  const [hours, setHours] = useState(0);
  const [minutes, setMinutes] = useState(5);
  const [seconds, setSeconds] = useState(0);
  const [alertMinutes, setAlertMinutes] = useState(Math.floor((countdown?.alertThresholdSeconds ?? 10) / 60));
  const [alertSeconds, setAlertSeconds] = useState((countdown?.alertThresholdSeconds ?? 10) % 60);

  const status = countdown?.status ?? 'stopped';
  const remaining = countdown?.remainingSeconds ?? 0;
  const alertThreshold = countdown?.alertThresholdSeconds ?? 10;
  const isUrgent = status === 'running' && remaining <= alertThreshold && remaining > 0;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
      <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
        Countdown Timer
      </h2>

      <div className="mb-4">
        <CountdownDisplay
          remainingSeconds={remaining}
          urgent={isUrgent}
          size="text-3xl sm:text-4xl"
          color="text-slate-900 dark:text-white"
          showLabels
        />
      </div>

      <div className="mb-3 flex items-center justify-center gap-2 text-xs">
        <span
          className={`rounded-full px-2 py-1 font-semibold uppercase ${
            status === 'running'
              ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400'
              : status === 'paused'
                ? 'bg-amber-500/20 text-amber-600 dark:text-amber-400'
                : 'bg-slate-500/20 text-slate-600 dark:text-slate-400'
          }`}
        >
          {status}
        </span>
      </div>

      <div className="mb-3 flex flex-wrap items-center justify-center gap-2">
        <input
          type="number"
          min="0"
          value={hours}
          onChange={(e) => setHours(Number(e.target.value))}
          className="w-14 rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-center text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
        />
        <span className="text-slate-500 dark:text-slate-400">hr</span>
        <input
          type="number"
          min="0"
          value={minutes}
          onChange={(e) => setMinutes(Number(e.target.value))}
          className="w-14 rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-center text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
        />
        <span className="text-slate-500 dark:text-slate-400">min</span>
        <input
          type="number"
          min="0"
          max="59"
          value={seconds}
          onChange={(e) => setSeconds(Number(e.target.value))}
          className="w-14 rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-center text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
        />
        <span className="text-slate-500 dark:text-slate-400">sec</span>
        <button
          disabled={busy}
          onClick={() => onSetDuration(hours * 3600 + minutes * 60 + seconds)}
          className="rounded-lg bg-slate-200 px-3 py-1.5 text-sm font-medium text-slate-800 hover:bg-slate-300 disabled:opacity-40 dark:bg-slate-700 dark:text-white dark:hover:bg-slate-600"
        >
          Set
        </button>
      </div>

      <div className="mb-4 flex flex-wrap items-center justify-center gap-2 border-t border-slate-200 pt-3 dark:border-slate-800">
        <label className="text-xs text-slate-500 dark:text-slate-400" htmlFor="alert-threshold">
          Red alert at last
        </label>
        <input
          id="alert-threshold-min"
          type="number"
          min="0"
          value={alertMinutes}
          onChange={(e) => setAlertMinutes(Number(e.target.value))}
          className="w-14 rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-center text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
        />
        <span className="text-xs text-slate-500 dark:text-slate-400">min</span>
        <input
          id="alert-threshold"
          type="number"
          min="0"
          max="59"
          value={alertSeconds}
          onChange={(e) => setAlertSeconds(Number(e.target.value))}
          className="w-16 rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-center text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
        />
        <span className="text-xs text-slate-500 dark:text-slate-400">sec</span>
        <button
          disabled={busy}
          onClick={() => onSetAlertThreshold(alertMinutes * 60 + alertSeconds)}
          className="rounded-lg bg-slate-200 px-3 py-1.5 text-sm font-medium text-slate-800 hover:bg-slate-300 disabled:opacity-40 dark:bg-slate-700 dark:text-white dark:hover:bg-slate-600"
        >
          Set
        </button>
      </div>

      <div className="flex gap-2">
        <button
          disabled={busy || status === 'running'}
          onClick={onStart}
          className="flex-1 rounded-lg bg-emerald-600 py-2 font-semibold text-white hover:bg-emerald-500 disabled:opacity-40"
        >
          Start
        </button>
        <button
          disabled={busy || status === 'stopped'}
          onClick={onStop}
          className="flex-1 rounded-lg bg-slate-200 py-2 font-semibold text-slate-800 hover:bg-slate-300 disabled:opacity-40 dark:bg-slate-700 dark:text-white dark:hover:bg-slate-600"
        >
          Stop
        </button>
      </div>
    </div>
  );
}
