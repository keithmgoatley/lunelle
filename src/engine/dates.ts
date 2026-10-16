/**
 * Timezone-safe date helpers. All maths is done in UTC on ISO calendar days,
 * so daylight-saving changes can never shift a date.
 */
import type { ISODate } from '../domain/types';

const DAY = 86_400_000;

export function toISO(d: Date): ISODate {
  return d.toISOString().slice(0, 10);
}

/** Today's calendar date in the device's local timezone. */
export function todayISO(now: Date = new Date()): ISODate {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function parseISO(s: ISODate): number {
  const [y, m, d] = s.split('-').map(Number);
  return Date.UTC(y, m - 1, d);
}

export function addDays(s: ISODate, n: number): ISODate {
  return toISO(new Date(parseISO(s) + n * DAY));
}

/** Whole days from a to b (b - a). */
export function diffDays(a: ISODate, b: ISODate): number {
  return Math.round((parseISO(b) - parseISO(a)) / DAY);
}

export function isValidISO(s: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  return toISO(new Date(parseISO(s))) === s;
}

export function inRange(d: ISODate, start: ISODate, end: ISODate): boolean {
  return d >= start && d <= end;
}

/** Local month grid helpers. */
export function monthDays(year: number, month0: number): number {
  return new Date(Date.UTC(year, month0 + 1, 0)).getUTCDate();
}

export function isoFromParts(year: number, month0: number, day: number): ISODate {
  return toISO(new Date(Date.UTC(year, month0, day)));
}

export function formatPretty(s: ISODate): string {
  const d = new Date(parseISO(s));
  return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', timeZone: 'UTC' });
}
