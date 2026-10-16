/**
 * Ovulation refinement from body signs.
 */
import type { DayLog, ISODate } from '../domain/types';
import { addDays } from './dates';

/** Minimum rise over baseline (°C) that counts as a thermal shift. */
export const BBT_SHIFT_C = 0.2;

/**
 * Classic "3 over 6" rule: three consecutive readings each at least 0.2 °C
 * above the highest of the previous six readings. Ovulation is estimated as
 * the day before the first raised reading. Returns undefined if no shift.
 */
export function detectBbtShift(logs: DayLog[]): ISODate | undefined {
  const temps = logs
    .filter((l) => typeof l.bbt === 'number' && l.bbt > 30 && l.bbt < 45)
    .sort((a, b) => (a.date < b.date ? -1 : 1));
  for (let i = 6; i + 2 < temps.length; i++) {
    const baseline = Math.max(...temps.slice(i - 6, i).map((t) => t.bbt as number));
    const raised = [0, 1, 2].every((k) => (temps[i + k].bbt as number) >= baseline + BBT_SHIFT_C - 1e-9);
    if (raised) return addDays(temps[i].date, -1);
  }
  return undefined;
}

/** A positive LH test usually precedes ovulation by ~24-36h; we use +1 day. */
export function ovulationFromLh(logs: DayLog[]): ISODate | undefined {
  const firstPositive = logs
    .filter((l) => l.ovulationTest === 'positive')
    .map((l) => l.date)
    .sort()[0];
  return firstPositive ? addDays(firstPositive, 1) : undefined;
}
