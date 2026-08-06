import { usePresentationSocket } from '../../hooks/usePresentationSocket.js';
import { API_BASE_URL } from '../../services/apiBase.js';
import CountdownDisplay from '../CountdownDisplay.jsx';

export default function PreviewPane() {
  // Uses role="viewer" (not "display") so it doesn't compete with the real
  // presentation screen for the single-display WebRTC signaling slot.
  const { state } = usePresentationSocket('viewer');

  const layout = state?.layout ?? 'idle';
  const showCountdown = layout === 'countdown' || layout === 'countdown_live';
  const showLive = layout === 'live' || layout === 'countdown_live';
  const posterUrl = state?.activePoster ? `${API_BASE_URL}${state.activePoster.url}` : null;
  const remaining = state?.countdown?.remainingSeconds ?? 0;
  const alertThreshold = state?.countdown?.alertThresholdSeconds ?? 10;
  const isUrgent = state?.countdown?.status === 'running' && remaining <= alertThreshold && remaining > 0;
  const eventTitle = state?.event?.displayTitle || state?.event?.name;
  const subEventTitle = state?.activeSubEvent?.displayTitle || state?.activeSubEvent?.title;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
          Presentation Preview
        </h2>
        <a
          href="/display"
          target="_blank"
          rel="noopener"
          className="text-xs font-medium text-indigo-600 hover:underline dark:text-indigo-400"
        >
          Open Full Screen
        </a>
      </div>

      <div className="relative flex aspect-video w-full items-center justify-center overflow-hidden rounded-lg border border-slate-800 bg-black">
        {layout === 'idle' && <span className="text-sm text-slate-600">No active presentation</span>}

        {posterUrl && layout !== 'idle' && (
          <img
            src={posterUrl}
            alt=""
            aria-hidden="true"
            className={`absolute inset-0 h-full w-full object-cover ${
              layout === 'poster' ? '' : 'scale-105 brightness-[0.35] blur-sm'
            }`}
          />
        )}

        {showCountdown && (
          <div
            className={`relative flex h-full flex-col items-center justify-center px-2 ${
              showLive ? 'w-1/2' : 'w-full'
            } ${posterUrl ? 'bg-slate-950/40' : ''}`}
          >
            {eventTitle && <p className="text-center text-xs text-slate-300">{eventTitle}</p>}
            {subEventTitle && (
              <p className="mb-1 text-center text-sm font-semibold text-white">{subEventTitle}</p>
            )}
            <CountdownDisplay
              remainingSeconds={remaining}
              urgent={isUrgent}
              size="text-xl sm:text-2xl"
              color="text-white"
            />
          </div>
        )}

        {showLive && (
          <div
            className={`absolute inset-y-0 right-0 flex items-center justify-center bg-slate-800/60 ${
              layout === 'countdown_live' ? 'w-1/2' : 'w-full'
            }`}
          >
            <span className="rounded bg-red-600 px-2 py-1 text-xs font-bold uppercase text-white">
              ● Live
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
