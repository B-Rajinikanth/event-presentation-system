import { useEffect, useState, useCallback } from 'react';
import api from '../../services/api.js';

export default function SubEventPanel({ event }) {
  const [subEvents, setSubEvents] = useState([]);
  const [title, setTitle] = useState('');
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({ title: '', displayTitle: '' });
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await api.get(`/events/${event._id}/sub-events`);
    setSubEvents(data.subEvents);
    setLoading(false);
  }, [event._id]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleAdd(e) {
    e.preventDefault();
    if (!title.trim()) return;
    await api.post(`/events/${event._id}/sub-events`, {
      title: title.trim(),
      order: subEvents.length,
    });
    setTitle('');
    await load();
  }

  async function handleDelete(id) {
    if (editingId === id) setEditingId(null);
    await api.delete(`/events/${event._id}/sub-events/${id}`);
    await load();
  }

  function startEdit(se) {
    setEditingId(se._id);
    setEditForm({ title: se.title, displayTitle: se.displayTitle || '' });
  }

  async function handleSaveEdit(id) {
    if (!editForm.title.trim()) return;
    setSaving(true);
    try {
      await api.put(`/events/${event._id}/sub-events/${id}`, {
        title: editForm.title.trim(),
        displayTitle: editForm.displayTitle.trim(),
      });
      setEditingId(null);
      await load();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
      <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
        Sub-Events for {event.name}
      </h2>

      <form onSubmit={handleAdd} className="mb-4 flex flex-col gap-2 sm:flex-row">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. Welcome Address, Keynote, Award Ceremony"
          className="flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
        />
        <button
          type="submit"
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500"
        >
          Add
        </button>
      </form>

      {loading ? (
        <p className="text-sm text-slate-500">Loading...</p>
      ) : subEvents.length === 0 ? (
        <p className="text-sm text-slate-500">No sub-events yet.</p>
      ) : (
        <ul className="divide-y divide-slate-200 dark:divide-slate-800">
          {subEvents.map((se) =>
            editingId === se._id ? (
              <li key={se._id} className="space-y-2 py-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">
                    Title
                  </label>
                  <input
                    value={editForm.title}
                    onChange={(e) => setEditForm((f) => ({ ...f, title: e.target.value }))}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">
                    Display Title{' '}
                    <span className="normal-case text-slate-400 dark:text-slate-500">
                      (shown on presentation screens — leave blank to use the title)
                    </span>
                  </label>
                  <input
                    value={editForm.displayTitle}
                    onChange={(e) => setEditForm((f) => ({ ...f, displayTitle: e.target.value }))}
                    placeholder={editForm.title}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleSaveEdit(se._id)}
                    disabled={saving}
                    className="rounded-lg bg-indigo-600 px-3 py-1 text-xs font-semibold text-white hover:bg-indigo-500 disabled:opacity-50"
                  >
                    {saving ? 'Saving...' : 'Save'}
                  </button>
                  <button
                    onClick={() => setEditingId(null)}
                    className="rounded-lg border border-slate-300 px-3 py-1 text-xs text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                  >
                    Cancel
                  </button>
                </div>
              </li>
            ) : (
              <li
                key={se._id}
                className="flex flex-col gap-2 py-2 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <span className="text-slate-900 dark:text-white">{se.title}</span>
                  {se.displayTitle && (
                    <span className="ml-2 text-xs text-slate-500 dark:text-slate-500">
                      → "{se.displayTitle}" on screen
                    </span>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => startEdit(se)}
                    className="rounded-lg border border-slate-300 px-2 py-1 text-xs text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(se._id)}
                    className="rounded-lg border border-rose-600 px-2 py-1 text-xs text-rose-600 hover:bg-rose-50 dark:border-rose-800 dark:text-rose-400 dark:hover:bg-rose-950/50"
                  >
                    Remove
                  </button>
                </div>
              </li>
            )
          )}
        </ul>
      )}
    </div>
  );
}
