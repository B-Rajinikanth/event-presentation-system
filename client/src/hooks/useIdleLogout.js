import { useEffect } from 'react';

const ACTIVITY_EVENTS = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll'];

// Logs the user out after `timeoutMs` with no mouse/keyboard/touch/scroll
// activity anywhere on the page. Any of those events resets the timer.
export function useIdleLogout(timeoutMs, onIdle) {
  useEffect(() => {
    let timer = setTimeout(onIdle, timeoutMs);

    function reset() {
      clearTimeout(timer);
      timer = setTimeout(onIdle, timeoutMs);
    }

    ACTIVITY_EVENTS.forEach((event) => window.addEventListener(event, reset));
    return () => {
      clearTimeout(timer);
      ACTIVITY_EVENTS.forEach((event) => window.removeEventListener(event, reset));
    };
  }, [timeoutMs, onIdle]);
}
