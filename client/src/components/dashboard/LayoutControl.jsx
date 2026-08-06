const LAYOUTS = [
  { value: 'idle', label: 'Idle' },
  { value: 'poster', label: 'Full Poster' },
  { value: 'countdown', label: 'Countdown' },
  { value: 'countdown_live', label: 'Countdown + Live' },
  { value: 'live', label: 'Full Live Video' },
];

export default function LayoutControl({ layout, onChange, busy }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
      <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
        Screen Layout
      </h2>
      <div className="grid grid-cols-2 gap-2">
        {LAYOUTS.map((l) => (
          <button
            key={l.value}
            disabled={busy}
            onClick={() => onChange(l.value)}
            className={`rounded-lg border px-3 py-2 text-sm font-medium transition disabled:opacity-40 ${
              layout === l.value
                ? 'border-indigo-500 bg-indigo-500/20 text-indigo-700 dark:text-indigo-300'
                : 'border-slate-300 text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800'
            }`}
          >
            {l.label}
          </button>
        ))}
      </div>
    </div>
  );
}
