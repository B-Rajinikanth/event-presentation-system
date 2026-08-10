import { useEffect, useState, useCallback, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '../services/api.js';
import { API_BASE_URL } from '../services/apiBase.js';
import Navbar from '../components/Navbar.jsx';

const TYPES = ['poster', 'banner', 'sponsor', 'welcome', 'guest', 'schedule', 'other'];

export default function MediaLibraryPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [events, setEvents] = useState([]);
  const [eventsLoading, setEventsLoading] = useState(true);
  const [media, setMedia] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [type, setType] = useState('poster');
  const fileInputRef = useRef(null);

  const eventId = searchParams.get('event') || '';

  // Load the event list once, then default the selection to the URL param,
  // the currently active event, or the first event — in that order.
  useEffect(() => {
    api.get('/events').then(({ data }) => {
      setEvents(data.events);
      setEventsLoading(false);
      if (!searchParams.get('event') && data.events.length > 0) {
        const defaultEvent = data.events.find((e) => e.isActive) || data.events[0];
        setSearchParams({ event: defaultEvent._id }, { replace: true });
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const load = useCallback(async () => {
    if (!eventId) {
      setMedia([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data } = await api.get('/media', { params: { event: eventId } });
    setMedia(data.media);
    setLoading(false);
  }, [eventId]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleUpload(e) {
    const file = e.target.files?.[0];
    if (!file || !eventId) return;
    setError('');
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('type', type);
      formData.append('name', file.name);
      formData.append('event', eventId);
      await api.post('/media', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      await load();
    } catch (err) {
      setError(err.response?.data?.message || 'Upload failed');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  async function handleRename(item) {
    const name = window.prompt('New name', item.name);
    if (!name || name === item.name) return;
    await api.put(`/media/${item._id}`, { name });
    await load();
  }

  async function handleDelete(item) {
    if (!window.confirm(`Delete "${item.name}"?`)) return;
    await api.delete(`/media/${item._id}`);
    await load();
  }

  const selectedEvent = events.find((e) => e._id === eventId);

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950">
      <Navbar />
      <main className="mx-auto max-w-6xl space-y-6 p-4 sm:p-6">
        <h1 className="text-xl font-bold text-slate-900 dark:text-white">Media Library</h1>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
          <label className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">
            Event
          </label>
          {eventsLoading ? (
            <p className="text-sm text-slate-500">Loading events...</p>
          ) : events.length === 0 ? (
            <p className="text-sm text-slate-500">
              No events yet — create one in Event Management before uploading media.
            </p>
          ) : (
            <select
              value={eventId}
              onChange={(e) => setSearchParams({ event: e.target.value })}
              className="w-full max-w-sm rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
            >
              {events.map((ev) => (
                <option key={ev._id} value={ev._id}>
                  {ev.name}
                </option>
              ))}
            </select>
          )}
          <p className="mt-2 text-xs text-slate-500">
            Posters and banners belong to a single event — switch events above to manage a
            different event's media.
          </p>
        </div>

        {eventId && (
          <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
              Upload to {selectedEvent?.name}
            </h2>
            <div className="flex flex-wrap items-center gap-3">
              <select
                value={type}
                onChange={(e) => setType(e.target.value)}
                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
              >
                {TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 disabled:opacity-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 16V4m0 0l-4 4m4-4l4 4" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v3a1 1 0 001 1h14a1 1 0 001-1v-3" />
                </svg>
                Choose File
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/jpg,image/png,image/webp"
                onChange={handleUpload}
                disabled={uploading}
                className="hidden"
              />
              {uploading && <span className="text-sm text-slate-500">Uploading...</span>}
            </div>
            <p className="mt-2 text-xs text-slate-500">Supported formats: JPG, JPEG, PNG, WebP</p>
            {error && <p className="mt-2 text-sm text-rose-500 dark:text-rose-400">{error}</p>}
          </div>
        )}

        {loading ? (
          <p className="text-slate-500">Loading media...</p>
        ) : !eventId ? null : media.length === 0 ? (
          <p className="text-slate-500">No media uploaded yet for {selectedEvent?.name}.</p>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {media.map((item) => (
              <div
                key={item._id}
                className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900"
              >
                <div className="aspect-video bg-black">
                  <img
                    src={`${API_BASE_URL}${item.url}`}
                    alt={item.name}
                    className="h-full w-full object-cover"
                  />
                </div>
                <div className="p-3">
                  <p className="truncate text-sm font-medium text-slate-900 dark:text-white">
                    {item.name}
                  </p>
                  <p className="text-xs text-slate-500">{item.type}</p>
                  <div className="mt-2 flex gap-2">
                    <button
                      onClick={() => handleRename(item)}
                      className="flex-1 rounded-lg border border-slate-300 py-1 text-xs text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                    >
                      Rename
                    </button>
                    <button
                      onClick={() => handleDelete(item)}
                      className="flex-1 rounded-lg border border-rose-600 py-1 text-xs text-rose-600 hover:bg-rose-50 dark:border-rose-800 dark:text-rose-400 dark:hover:bg-rose-950/50"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
