import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api.js';

export default function EventInfoPanel({ state, onSetActiveEvent, onSetActiveSubEvent, busy }) {
  const [events, setEvents] = useState([]);
  const [subEvents, setSubEvents] = useState([]);

  const activeEventId = state?.event?._id || '';
  const activeSubEventId = state?.activeSubEvent?._id || '';

  useEffect(() => {
    api.get('/events').then(({ data }) => setEvents(data.events));
  }, []);

  useEffect(() => {
    if (!activeEventId) {
      setSubEvents([]);
      return;
    }
    api.get(`/events/${activeEventId}/sub-events`).then(({ data }) => setSubEvents(data.subEvents));
  }, [activeEventId]);

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
          Event Information
        </h2>
        <Link to="/events" className="text-xs font-medium text-indigo-600 hover:underline dark:text-indigo-400">
          Manage Events
        </Link>
      </div>

      <label className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">
        Active Event
      </label>
      <select
        disabled={busy}
        value={activeEventId}
        onChange={(e) => onSetActiveEvent(e.target.value)}
        className="mb-4 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 disabled:opacity-40 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
      >
        <option value="">-- Select event --</option>
        {events.map((ev) => (
          <option key={ev._id} value={ev._id}>
            {ev.name}
          </option>
        ))}
      </select>

      <label className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">
        Active Sub-Event
      </label>
      <select
        disabled={busy || !activeEventId}
        value={activeSubEventId}
        onChange={(e) => onSetActiveSubEvent(e.target.value)}
        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 disabled:opacity-40 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
      >
        <option value="">-- None --</option>
        {subEvents.map((se) => (
          <option key={se._id} value={se._id}>
            {se.title}
          </option>
        ))}
      </select>
    </div>
  );
}
