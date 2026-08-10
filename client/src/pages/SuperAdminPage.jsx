import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { usePageTitle } from '../hooks/usePageTitle.js';
import { useIdleLogout } from '../hooks/useIdleLogout.js';
import api from '../services/api.js';
import Navbar from '../components/Navbar.jsx';

const IDLE_LOGOUT_MS = 5 * 60 * 1000;

export default function SuperAdminPage() {
  usePageTitle('SUH Super Admin: Manage Admins');
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  // This page only, not the regular Dashboard: it's a management console
  // for account access, not something meant to stay open unattended on a
  // control-room laptop during a live event the way Dashboard is.
  useIdleLogout(IDLE_LOGOUT_MS, () => {
    logout();
    navigate('/login', { replace: true });
  });

  const [admins, setAdmins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [submitting, setSubmitting] = useState(false);

  async function loadAdmins() {
    setLoading(true);
    try {
      const { data } = await api.get('/admins');
      setAdmins(data.admins);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load admins');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAdmins();
  }, []);

  async function handleCreate(e) {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await api.post('/admins', form);
      setForm({ name: '', email: '', password: '' });
      await loadAdmins();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create admin');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id) {
    setError('');
    try {
      await api.delete(`/admins/${id}`);
      await loadAdmins();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete admin');
    }
  }

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950">
      <Navbar />
      <main className="mx-auto max-w-3xl space-y-6 p-4 sm:p-6">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">Manage Admins</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            This page logs out after 5 minutes of inactivity.
          </p>
        </div>

        {error && (
          <div className="rounded-lg border border-rose-300 bg-rose-50 px-4 py-2 text-sm text-rose-600 dark:border-rose-800 dark:bg-rose-950/50 dark:text-rose-300">
            {error}
          </div>
        )}

        <section className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            Add Admin
          </h2>
          <form onSubmit={handleCreate} className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <input
              type="text"
              placeholder="Name"
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
            />
            <input
              type="email"
              placeholder="Email"
              required
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
            />
            <input
              type="password"
              placeholder="Password (min 8 chars)"
              required
              minLength={8}
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
            />
            <button
              type="submit"
              disabled={submitting}
              className="rounded-lg bg-indigo-600 py-2 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-40 sm:col-span-3"
            >
              Add Admin
            </button>
          </form>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            All Accounts
          </h2>
          {loading ? (
            <p className="text-sm text-slate-500">Loading...</p>
          ) : (
            <ul className="divide-y divide-slate-200 dark:divide-slate-800">
              {admins.map((admin) => (
                <li key={admin.id} className="flex items-center justify-between gap-3 py-3">
                  <div className="min-w-0">
                    <p className="flex flex-wrap items-center gap-2 text-sm font-semibold text-slate-900 dark:text-white">
                      {admin.name}
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-medium uppercase ${
                          admin.role === 'superadmin'
                            ? 'bg-violet-500/20 text-violet-600 dark:text-violet-400'
                            : 'bg-slate-500/20 text-slate-600 dark:text-slate-400'
                        }`}
                      >
                        {admin.role}
                      </span>
                    </p>
                    <p className="truncate text-xs text-slate-500 dark:text-slate-400">{admin.email}</p>
                  </div>
                  {admin.role !== 'superadmin' && admin.id !== user.id && (
                    <button
                      onClick={() => handleDelete(admin.id)}
                      className="shrink-0 rounded-lg border border-rose-300 px-3 py-1.5 text-xs font-medium text-rose-600 hover:bg-rose-50 dark:border-rose-800 dark:text-rose-400 dark:hover:bg-rose-950/50"
                    >
                      Remove
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
    </div>
  );
}
