import { describe, it, expect } from 'vitest';
import { getISOWeek, getDateFromISOWeek, getRelativeISOWeek, getMonthFirstWeek } from './dateUtils';

// Compare calendar dates in local time, ignoring the time of day.
const ymd = (d: Date) => [d.getFullYear(), d.getMonth() + 1, d.getDate()];

describe('getISOWeek', () => {
  it('handles dates near the year boundary', () => {
    expect(getISOWeek(new Date(2026, 11, 31))).toBe('2026-W53'); // Thu
    expect(getISOWeek(new Date(2027, 0, 1))).toBe('2026-W53'); // Fri, still last week of 2026
    expect(getISOWeek(new Date(2027, 0, 4))).toBe('2027-W01'); // Mon
    expect(getISOWeek(new Date(2024, 11, 30))).toBe('2025-W01'); // Mon, already 2025's week 1
    expect(getISOWeek(new Date(2021, 0, 3))).toBe('2020-W53'); // Sun
  });
});

describe('getDateFromISOWeek', () => {
  it('returns the Monday of the week', () => {
    expect(ymd(getDateFromISOWeek('2027-W01'))).toEqual([2027, 1, 4]);
    expect(ymd(getDateFromISOWeek('2026-W01'))).toEqual([2025, 12, 29]);
    expect(ymd(getDateFromISOWeek('2026-W53'))).toEqual([2026, 12, 28]);
  });

  it('round-trips with getISOWeek for every week of 2020-2032', () => {
    for (let year = 2020; year <= 2032; year++) {
      // Dec 28 is always in the last ISO week of its year.
      const lastWeek = Number(getISOWeek(new Date(year, 11, 28)).split('-W')[1]);
      for (let week = 1; week <= lastWeek; week++) {
        const iso = `${year}-W${String(week).padStart(2, '0')}`;
        const monday = getDateFromISOWeek(iso);
        expect(monday.getDay()).toBe(1);
        expect(getISOWeek(monday)).toBe(iso);
      }
    }
  });
});

describe('getRelativeISOWeek', () => {
  it('crosses the year boundary in both directions', () => {
    expect(getRelativeISOWeek('2026-W53', 1)).toBe('2027-W01');
    expect(getRelativeISOWeek('2027-W01', -1)).toBe('2026-W53');
    expect(getRelativeISOWeek('2025-W52', 1)).toBe('2026-W01');
  });

  it('never gets stuck when stepping forward week by week', () => {
    // Regression for the 2027 bug: "next week" kept landing on the same week.
    let week = '2024-W01';
    for (let i = 0; i < 52 * 8; i++) {
      const next = getRelativeISOWeek(week, 1);
      expect(next > week).toBe(true);
      expect(getRelativeISOWeek(next, -1)).toBe(week);
      week = next;
    }
  });
});

describe('getMonthFirstWeek', () => {
  it('returns the ISO week containing the 1st of the month', () => {
    expect(getMonthFirstWeek(2027, 0)).toBe('2026-W53');
    expect(getMonthFirstWeek(2026, 0)).toBe('2026-W01');
  });
});
