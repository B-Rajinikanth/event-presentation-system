import { useEffect, useState, useCallback } from 'react';
import api from '../services/api.js';
import Navbar from '../components/Navbar.jsx';
import EventForm from '../components/events/EventForm.jsx';
import EventList from '../components/events/EventList.jsx';
import SubEventPanel from '../components/events/SubEventPanel.jsx';

export default function EventsPage() {
  const [events, setEvents] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadEvents = useCallback(async () => {
    setLoading(true);
    const { data } = await api.get('/events');
    setEvents(data.events);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadEvents();
  }, [loadEvents]);

  async function handleSave(payload) {
    if (editingEvent) {
      await api.put(`/events/${editingEvent._id}`, payload);
    } else {
      await api.post('/events', payload);
    }
    setShowForm(false);
    setEditingEvent(null);
    await loadEvents();
  }

  async function handleDelete(id) {
    if (!window.confirm('Delete this event and all its sub-events?')) return;
    await api.delete(`/events/${id}`);
    if (selectedId === id) setSelectedId(null);
    await loadEvents();
  }

  async function handleActivate(id) {
    await api.post(`/events/${id}/activate`);
    await loadEvents();
  }

  const selectedEvent = events.find((e) => e._id === selectedId) || null;

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950">
      <Navbar />
      <main className="mx-auto max-w-6xl space-y-6 p-4 sm:p-6">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">Event Management</h1>
          <button
            onClick={() => {
              setEditingEvent(null);
              setShowForm(true);
            }}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500"
          >
            + New Event
          </button>
        </div>

        {showForm && (
          <EventForm
            initial={editingEvent}
            onCancel={() => {
              setShowForm(false);
              setEditingEvent(null);
            }}
            onSave={handleSave}
          />
        )}

        {loading ? (
          <p className="text-slate-500">Loading events...</p>
        ) : (
          <EventList
            events={events}
            selectedId={selectedId}
            onSelect={setSelectedId}
            onEdit={(ev) => {
              setEditingEvent(ev);
              setShowForm(true);
            }}
            onDelete={handleDelete}
            onActivate={handleActivate}
          />
        )}

        {selectedEvent && <SubEventPanel event={selectedEvent} />}
      </main>
    </div>
  );
}
