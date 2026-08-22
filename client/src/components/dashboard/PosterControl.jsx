import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api.js';
import { API_BASE_URL } from '../../services/apiBase.js';

export default function PosterControl({ state, onShow, onHide, busy }) {
  const [media, setMedia] = useState([]);
  const [loading, setLoading] = useState(true);

  const eventId = state?.event?._id;

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
    // Depend on the poster's id, not the object itself — the server
    // broadcasts a fresh state:update (and a freshly-populated
    // activePoster object) every second while the countdown is running,
    // even when the active poster hasn't changed. Depending on the whole
    // object re-ran this fetch every second, flashing "Loading media..."
    // and reloading every thumbnail continuously.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventId, state?.activePoster?._id]);

  const activeId = state?.activePoster?._id;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
          Poster / Banner
        </h2>
        {activeId && (
          <button
            disabled={busy}
            onClick={onHide}
            className="rounded-lg bg-rose-600/20 px-3 py-1 text-xs font-semibold text-rose-600 hover:bg-rose-600/30 disabled:text-rose-400 disabled:opacity-40"
          >
            Hide Active
          </button>
        )}
      </div>

      {!eventId ? (
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
        <div className="grid max-h-64 grid-cols-3 gap-2 overflow-y-auto sm:grid-cols-4">
          {media.map((item) => (
            <button
              key={item._id}
              disabled={busy}
              onClick={() => onShow(item._id)}
              className={`group relative aspect-video overflow-hidden rounded-lg border-2 transition disabled:opacity-40 ${
                activeId === item._id
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
              <span className="absolute left-0.5 top-0.5 rounded bg-black/60 px-1 text-[9px] uppercase text-slate-200">
                {item.type}
              </span>
              {activeId === item._id && (
                <span className="absolute inset-x-0 bottom-0 bg-indigo-600 py-0.5 text-center text-[10px] font-bold uppercase text-white">
                  Live
                </span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
