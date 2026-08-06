import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api.js';
import { API_BASE_URL } from '../../services/apiBase.js';

export default function PosterUnveilControl({ state, onStartUnveil, onCancel, busy }) {
  const [media, setMedia] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState(null);

  const eventId = state?.event?._id;
  const pending = Boolean(state?.pendingUnveil);
  const remaining = state?.countdown?.remainingSeconds ?? 0;

  useEffect(() => {
    if (!eventId) {
      setMedia([]);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    api
      .get('/media', { params: { event: eventId } })
      .then(({ data }) => {
        if (!cancelled) setMedia(data.media);
      })
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [eventId]);

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
      <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
        🎉 Poster Unveil
      </h2>

      {pending ? (
        <div className="flex flex-col items-center gap-3 rounded-lg bg-indigo-50 py-6 dark:bg-indigo-950/30">
          <p className="text-sm font-semibold text-indigo-700 dark:text-indigo-300">
            Unveiling in {remaining}s...
          </p>
          <button
            disabled={busy}
            onClick={onCancel}
            className="rounded-lg border border-rose-600 px-3 py-1.5 text-xs font-medium text-rose-600 hover:bg-rose-50 disabled:opacity-40 dark:border-rose-800 dark:text-rose-400 dark:hover:bg-rose-950/50"
          >
            Cancel
          </button>
        </div>
      ) : !eventId ? (
        <p className="text-sm text-slate-500 dark:text-slate-500">
          Select an active event above to manage its media.
        </p>
      ) : loading ? (
        <p className="text-sm text-slate-500">Loading media...</p>
      ) : media.length === 0 ? (
        <p className="text-sm text-slate-500">
          No media for this event yet.{' '}
          <Link to={`/media?event=${eventId}`} className="text-indigo-600 hover:underline dark:text-indigo-400">
            Upload some
          </Link>
          .
        </p>
      ) : (
        <>
          <div className="mb-3 grid max-h-56 grid-cols-3 gap-2 overflow-y-auto sm:grid-cols-4">
            {media.map((item) => (
              <button
                key={item._id}
                disabled={busy}
                onClick={() => setSelectedId(item._id)}
                className={`group relative aspect-video overflow-hidden rounded-lg border-2 transition disabled:opacity-40 ${
                  selectedId === item._id
                    ? 'border-indigo-500'
                    : 'border-slate-300 hover:border-slate-400 dark:border-slate-700 dark:hover:border-slate-500'
                }`}
                title={item.name}
              >
                <img
                  src={`${API_BASE_URL}${item.url}`}
                  alt={item.name}
                  className="h-full w-full object-cover"
                />
              </button>
            ))}
          </div>
          <button
            disabled={busy || !selectedId}
            onClick={() => onStartUnveil(selectedId)}
            className="w-full rounded-lg bg-gradient-to-r from-fuchsia-600 to-indigo-600 py-2 font-semibold text-white transition hover:from-fuchsia-500 hover:to-indigo-500 disabled:opacity-40"
          >
            Start Unveil (10s)
          </button>
        </>
      )}
    </div>
  );
}
