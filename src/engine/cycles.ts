/**
 * Turns raw data (explicit period ranges + daily flow logs) into a clean list
 * of bleeding episodes and completed cycles.
 */
import type { DayLog, ISODate, Period } from '../domain/types';
import { addDays, diffDays } from './dates';

export interface Episode {
  start: ISODate;
  end: ISODate;
}

export interface Cycle {
  start: ISODate;
  /** Start of the following period, if known. */
  nextStart?: ISODate;
  /** Length in days (only for completed cycles). */
  length?: number;
  periodLength: number;
}

/** Bleeding days separated by at most this many dry days count as one period. */
const MERGE_GAP = 2;

/**
 * Union of every bleeding day (spotting is ignored for period detection
 * unless it is inside an explicit range), grouped into episodes.
 */
export function buildEpisodes(periods: Period[], logs: DayLog[]): Episode[] {
  const days = new Set<ISODate>();
  for (const p of periods) {
    const len = Math.max(0, diffDays(p.start, p.end));
    for (let i = 0; i <= Math.min(len, 20); i++) days.add(addDays(p.start, i));
  }
  for (const l of logs) {
    if (l.flow && l.flow !== 'spotting') days.add(l.date);
  }
  const sorted = [...days].sort();
  const out: Episode[] = [];
  for (const d of sorted) {
    const last = out[out.length - 1];
    if (last && diffDays(last.end, d) <= MERGE_GAP + 1) last.end = d;
    else out.push({ start: d, end: d });
  }
  return out;
}

/** Cycles run from one episode start to the next. The last one is open. */
export function buildCycles(episodes: Episode[]): Cycle[] {
  return episodes.map((e, i) => {
    const next = episodes[i + 1];
    return {
      start: e.start,
      nextStart: next?.start,
      length: next ? diffDays(e.start, next.start) : undefined,
      periodLength: diffDays(e.start, e.end) + 1,
    };
  });
}

/** Plausible cycle lengths used for statistics (others are treated as gaps in logging). */
export const MIN_CYCLE = 15;
export const MAX_CYCLE = 90;

export function completedLengths(cycles: Cycle[]): number[] {
  return cycles
    .filter((c) => c.length !== undefined && c.length >= MIN_CYCLE && c.length <= MAX_CYCLE)
    .map((c) => c.length as number);
}
