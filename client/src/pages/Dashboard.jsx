import { useCallback, useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { usePresentationSocket } from '../hooks/usePresentationSocket.js';
import { emitControl } from '../services/controls.js';
import Navbar from '../components/Navbar.jsx';
import QuickControls from '../components/dashboard/QuickControls.jsx';
import CountdownControl from '../components/dashboard/CountdownControl.jsx';
import PosterControl from '../components/dashboard/PosterControl.jsx';
import PosterUnveilControl from '../components/dashboard/PosterUnveilControl.jsx';
import LayoutControl from '../components/dashboard/LayoutControl.jsx';
import EventInfoPanel from '../components/dashboard/EventInfoPanel.jsx';
import PreviewPane from '../components/dashboard/PreviewPane.jsx';

export default function Dashboard() {
  const { token } = useAuth();
  const { state, connected, socket } = usePresentationSocket('admin', token);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const run = useCallback(
    async (event, payload) => {
      setBusy(true);
      setError('');
      try {
        await emitControl(socket, event, payload);
      } catch (err) {
        setError(err.message);
      } finally {
        setBusy(false);
      }
    },
    [socket]
  );

  const handleQuickAction = useCallback(
    (action, arg) => {
      switch (action) {
        case 'layout':
          return run('control:layout:set', { layout: arg });
        case 'liveStart':
          return run('control:live:start');
        case 'liveStop':
          return run('control:live:stop');
        case 'countdownPause':
          return run('control:countdown:pause');
        case 'countdownResume':
          return run('control:countdown:resume');
        case 'countdownReset':
          return run('control:countdown:reset');
        case 'close':
          return run('control:presentation:close');
        default:
          return null;
      }
    },
    [run]
  );

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950">
      <Navbar />

      <main className="mx-auto max-w-7xl space-y-6 p-4 sm:p-6">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">Admin Control Panel</h1>
          <span
            className={`rounded-full px-3 py-1 text-xs font-semibold ${
              connected
                ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400'
                : 'bg-rose-500/20 text-rose-600 dark:text-rose-400'
            }`}
          >
            {connected ? 'Connected' : 'Disconnected'}
          </span>
        </div>

        {error && (
          <div className="rounded-lg border border-rose-300 bg-rose-50 px-4 py-2 text-sm text-rose-600 dark:border-rose-800 dark:bg-rose-950/50 dark:text-rose-300">
            {error}
          </div>
        )}

        <section>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            Quick Controls
          </h2>
          <QuickControls state={state} onAction={handleQuickAction} busy={busy} />
        </section>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <EventInfoPanel
            state={state}
            busy={busy}
            onSetActiveEvent={(eventId) => run('control:event:setActive', { eventId })}
            onSetActiveSubEvent={(subEventId) => run('control:subEvent:setActive', { subEventId })}
          />

          <CountdownControl
            countdown={state?.countdown}
            busy={busy}
            onSetDuration={(durationSeconds) => run('control:countdown:set', { durationSeconds })}
            onStart={() => run('control:countdown:start')}
            onStop={() => run('control:countdown:stop')}
            onSetAlertThreshold={(thresholdSeconds) =>
              run('control:countdown:setAlertThreshold', { thresholdSeconds })
            }
          />

          <PreviewPane />

          <LayoutControl
            layout={state?.layout}
            busy={busy}
            onChange={(layout) => run('control:layout:set', { layout })}
          />

          <PosterControl
            state={state}
            busy={busy}
            onShow={(mediaId) => run('control:poster:show', { mediaId })}
            onHide={() => run('control:poster:hide')}
          />

          <PosterUnveilControl
            state={state}
            busy={busy}
            onStartUnveil={(mediaId, durationSeconds) =>
              run('control:posterUnveil:start', { mediaId, durationSeconds })
            }
            onCancel={() => run('control:posterUnveil:cancel')}
          />
        </div>
      </main>
    </div>
  );
}
