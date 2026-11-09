import { useState, useEffect, useRef } from 'react';

const isSameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth() &&
  a.getDate() === b.getDate();

/**
 * Today's date, kept up to date while the page stays open.
 *
 * People leave the tab (or the iOS home-screen app) open for days, so a date
 * read once on load goes stale after midnight. This re-checks at midnight and
 * whenever the page comes back into view (timers are paused in background
 * tabs and while the phone sleeps, so the midnight timer alone isn't enough).
 *
 * `onDayChange` runs once each time the date rolls over, from an event
 * handler rather than an effect, so it may set state.
 */
export function useToday(onDayChange?: (previous: Date, next: Date) => void): Date {
  const [today, setToday] = useState(() => new Date());
  const todayRef = useRef(today);
  const onDayChangeRef = useRef(onDayChange);

  useEffect(() => {
    onDayChangeRef.current = onDayChange;
  });

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;

    const check = () => {
      const now = new Date();
      const previous = todayRef.current;
      if (isSameDay(previous, now)) return;
      todayRef.current = now;
      setToday(now);
      onDayChangeRef.current?.(previous, now);
    };

    // Fire shortly after the next local midnight, then re-arm.
    const scheduleMidnightCheck = () => {
      clearTimeout(timer);
      const now = new Date();
      const nextMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
      timer = setTimeout(() => {
        check();
        scheduleMidnightCheck();
      }, nextMidnight.getTime() - now.getTime() + 1000);
    };

    const handleBackInView = () => {
      if (document.visibilityState !== 'visible') return;
      check();
      scheduleMidnightCheck();
    };

    scheduleMidnightCheck();
    document.addEventListener('visibilitychange', handleBackInView);
    window.addEventListener('focus', handleBackInView);
    window.addEventListener('pageshow', handleBackInView);

    return () => {
      clearTimeout(timer);
      document.removeEventListener('visibilitychange', handleBackInView);
      window.removeEventListener('focus', handleBackInView);
      window.removeEventListener('pageshow', handleBackInView);
    };
  }, []);

  return today;
}
