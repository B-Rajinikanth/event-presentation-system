import { Link } from 'react-router-dom';

export default function EventList({ events, selectedId, onSelect, onEdit, onDelete, onActivate }) {
  if (events.length === 0) {
    return <p className="text-slate-500">No events yet. Create your first event above.</p>;
  }

  return (
    <div className="divide-y divide-slate-200 overflow-hidden rounded-2xl border border-slate-200 bg-white dark:divide-slate-800 dark:border-slate-800 dark:bg-slate-900">
      {events.map((ev) => (
        <div
          key={ev._id}
          onClick={() => onSelect(ev._id === selectedId ? null : ev._id)}
          className={`flex cursor-pointer flex-col gap-3 px-5 py-3 transition hover:bg-slate-100 dark:hover:bg-slate-800/60 sm:flex-row sm:items-center sm:justify-between ${
            selectedId === ev._id ? 'bg-slate-100 dark:bg-slate-800/60' : ''
          }`}
        >
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="truncate font-semibold text-slate-900 dark:text-white">{ev.name}</span>
              {ev.isActive && (
                <span className="shrink-0 rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-bold uppercase text-emerald-600 dark:text-emerald-400">
                  Active
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500">
              {ev.venue || 'No venue set'}
              {ev.date ? ` • ${new Date(ev.date).toLocaleDateString()}` : ''}
              {ev.displayTitle ? ` • → "${ev.displayTitle}" on screen` : ''}
            </p>
          </div>

          <div className="flex flex-wrap gap-2" onClick={(e) => e.stopPropagation()}>
            {!ev.isActive && (
              <button
                onClick={() => onActivate(ev._id)}
                className="rounded-lg border border-emerald-600 px-3 py-1 text-xs font-medium text-emerald-600 hover:bg-emerald-50 dark:border-emerald-700 dark:text-emerald-400 dark:hover:bg-emerald-900/30"
              >
                Activate
              </button>
            )}
            <Link
              to={`/media?event=${ev._id}`}
              className="rounded-lg border border-indigo-600 px-3 py-1 text-xs font-medium text-indigo-600 hover:bg-indigo-50 dark:border-indigo-700 dark:text-indigo-400 dark:hover:bg-indigo-900/30"
            >
              Media
            </Link>
            <button
              onClick={() => onEdit(ev)}
              className="rounded-lg border border-slate-300 px-3 py-1 text-xs font-medium text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              Edit
            </button>
            <button
              onClick={() => onDelete(ev._id)}
              className="rounded-lg border border-rose-600 px-3 py-1 text-xs font-medium text-rose-600 hover:bg-rose-50 dark:border-rose-800 dark:text-rose-400 dark:hover:bg-rose-950/50"
            >
              Delete
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
