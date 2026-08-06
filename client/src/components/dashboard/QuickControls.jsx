const BUTTON_BASE =
  'flex flex-col items-center justify-center gap-1 rounded-xl border py-4 text-sm font-bold uppercase tracking-wide transition disabled:opacity-40 disabled:cursor-not-allowed';

export default function QuickControls({ state, onAction, busy }) {
  const countdownStatus = state?.countdown?.status ?? 'stopped';
  const isLive = state?.live?.isLive ?? false;

  const buttons = [
    {
      key: 'poster',
      label: 'Poster',
      color: 'border-amber-500 text-amber-400 hover:bg-amber-500/10',
      onClick: () => onAction('layout', 'poster'),
      disabled: !state?.activePoster,
    },
    {
      key: 'countdown',
      label: 'Countdown',
      color: 'border-sky-500 text-sky-400 hover:bg-sky-500/10',
      onClick: () => onAction('layout', 'countdown'),
    },
    {
      key: 'live',
      label: isLive ? 'Stop Live' : 'Live',
      color: isLive
        ? 'border-red-500 bg-red-500/10 text-red-400 hover:bg-red-500/20'
        : 'border-red-500 text-red-400 hover:bg-red-500/10',
      onClick: () => onAction(isLive ? 'liveStop' : 'liveStart'),
    },
    {
      key: 'fullscreen',
      label: 'Full Screen',
      color: 'border-emerald-500 text-emerald-400 hover:bg-emerald-500/10',
      onClick: () => window.open('/display', '_blank', 'noopener'),
    },
    {
      key: 'pause',
      label: 'Pause',
      color:
        'border-slate-400 text-slate-600 hover:bg-slate-200/60 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700/40',
      onClick: () => onAction('countdownPause'),
      disabled: countdownStatus !== 'running',
    },
    {
      key: 'resume',
      label: 'Resume',
      color:
        'border-slate-400 text-slate-600 hover:bg-slate-200/60 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700/40',
      onClick: () => onAction('countdownResume'),
      disabled: countdownStatus !== 'paused',
    },
    {
      key: 'reset',
      label: 'Reset',
      color:
        'border-slate-400 text-slate-600 hover:bg-slate-200/60 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700/40',
      onClick: () => onAction('countdownReset'),
    },
    {
      key: 'close',
      label: 'Close',
      color: 'border-rose-600 text-rose-400 hover:bg-rose-600/10',
      onClick: () => onAction('close'),
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {buttons.map((btn) => (
        <button
          key={btn.key}
          type="button"
          disabled={busy || btn.disabled}
          onClick={btn.onClick}
          className={`${BUTTON_BASE} ${btn.color}`}
        >
          {btn.label}
        </button>
      ))}
    </div>
  );
}
