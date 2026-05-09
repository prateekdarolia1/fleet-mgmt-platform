import { useEffect, useRef } from 'react';

/**
 * Polls `callback` on an interval while the document is visible.
 * Also fires once when the tab regains visibility (parity with TanStack
 * Query's refetchOnWindowFocus behaviour). Used by useState-based data
 * hooks that don't benefit from QueryClient defaults.
 */
export function usePolling(callback: () => void, intervalMs: number, enabled = true) {
  const cbRef = useRef(callback);
  cbRef.current = callback;

  useEffect(() => {
    if (!enabled) return;

    let timer: ReturnType<typeof setInterval> | null = null;

    const start = () => {
      if (timer != null) return;
      timer = setInterval(() => cbRef.current(), intervalMs);
    };
    const stop = () => {
      if (timer == null) return;
      clearInterval(timer);
      timer = null;
    };

    const onVisibility = () => {
      if (document.visibilityState === 'visible') {
        cbRef.current();
        start();
      } else {
        stop();
      }
    };

    if (document.visibilityState === 'visible') start();
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      stop();
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [intervalMs, enabled]);
}
