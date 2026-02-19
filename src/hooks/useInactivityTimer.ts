import { useState, useEffect, useCallback, useRef } from 'react';

const INACTIVITY_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes — HIPAA standard
const ACTIVITY_EVENTS: (keyof DocumentEventMap)[] = ['touchstart', 'mousedown', 'keydown', 'scroll'];

/**
 * Hook that tracks user activity and triggers a lock after inactivity.
 * @param enabled Whether the timer should be active (e.g., only when authenticated)
 * @returns {{ isLocked: boolean, resetTimer: () => void }}
 */
export function useInactivityTimer(enabled: boolean) {
  const [isLocked, setIsLocked] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const resetTimer = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (!enabled) return;

    setIsLocked(false);
    timerRef.current = setTimeout(() => {
      setIsLocked(true);
    }, INACTIVITY_TIMEOUT_MS);
  }, [enabled]);

  const unlock = useCallback(() => {
    setIsLocked(false);
    resetTimer();
  }, [resetTimer]);

  useEffect(() => {
    if (!enabled) {
      if (timerRef.current) clearTimeout(timerRef.current);
      setIsLocked(false);
      return;
    }

    // Start initial timer
    resetTimer();

    // Listen for activity events
    const handleActivity = () => {
      if (!isLocked) resetTimer();
    };

    for (const event of ACTIVITY_EVENTS) {
      document.addEventListener(event, handleActivity, { passive: true });
    }

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      for (const event of ACTIVITY_EVENTS) {
        document.removeEventListener(event, handleActivity);
      }
    };
  }, [enabled, isLocked, resetTimer]);

  return { isLocked, unlock, resetTimer };
}
