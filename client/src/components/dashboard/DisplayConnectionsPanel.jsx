export default function DisplayConnectionsPanel({ displays, busy, onSetLocked }) {
  const count = displays?.count ?? 0;
  const locked = displays?.locked ?? false;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
        Display Screens
      </h2>
      <div className="flex items-center justify-between rounded-xl bg-slate-100 px-5 py-4 dark:bg-slate-800">
        <div>
          <span className="font-mono text-3xl font-bold text-slate-900 dark:text-white">{count}</span>
          <span className="ml-2 text-sm text-slate-500 dark:text-slate-400">
            {count === 1 ? 'screen connected' : 'screens connected'}
          </span>
        </div>
        <button
          disabled={busy}
          onClick={() => onSetLocked(!locked)}
          className={`rounded-lg px-3 py-2 text-xs font-semibold uppercase tracking-wide disabled:opacity-40 ${
            locked
              ? 'bg-emerald-600 text-white hover:bg-emerald-500'
              : 'bg-rose-600 text-white hover:bg-rose-500'
          }`}
        >
          {locked ? 'Allow new connections' : 'Stop new connections'}
        </button>
      </div>
      {locked && (
        <p className="mt-3 text-xs text-amber-600 dark:text-amber-400">
          New /display connections are currently blocked. Screens already connected are unaffected.
        </p>
      )}
    </div>
  );
}
