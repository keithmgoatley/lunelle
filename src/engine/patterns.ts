/**
 * Personal pattern detection: which symptoms tend to show up at the same
 * point in the cycle, and how symptoms/moods distribute across phases.
 */
import type { DayLog } from '../domain/types';
import { MOOD_SCORE } from '../domain/types';
import { diffDays, addDays } from './dates';
import type { Cycle } from './cycles';
import { phaseForDay, Phase } from './predict';

export interface PatternInsight {
  symptom: string;
  message: string;
  /** Share of cycles in which this happened (0..1). */
  share: number;
}

/** Minimum number of completed cycles before we suggest a pattern. */
export const MIN_CYCLES_FOR_PATTERN = 2;

/**
 * For each completed cycle, measure each symptom by "days before the next
 * period" (1..5) or "during period". Report the most consistent timing per
 * symptom if it shows up in at least half of the cycles that have logs.
 */
export function findPatterns(cycles: Cycle[], logs: DayLog[]): PatternInsight[] {
  const completed = cycles.filter((c) => c.nextStart);
  const byDate = new Map(logs.map((l) => [l.date, l]));
  // symptom -> bucket -> set of cycle indexes
  const hits = new Map<string, Map<string, Set<number>>>();
  let cyclesWithLogs = 0;

  completed.forEach((c, idx) => {
    let any = false;
    for (let d = c.start; d < (c.nextStart as string); d = addDays(d, 1)) {
      const log = byDate.get(d);
      if (!log?.symptoms.length) continue;
      any = true;
      const before = diffDays(d, c.nextStart as string);
      const cd = diffDays(c.start, d) + 1;
      const bucket = cd <= c.periodLength ? 'period' : before >= 1 && before <= 5 ? `before:${before}` : null;
      if (!bucket) continue;
      for (const s of log.symptoms) {
        if (!hits.has(s)) hits.set(s, new Map());
        const m = hits.get(s)!;
        if (!m.has(bucket)) m.set(bucket, new Set());
        m.get(bucket)!.add(idx);
      }
    }
    if (any) cyclesWithLogs++;
  });

  if (cyclesWithLogs < MIN_CYCLES_FOR_PATTERN) return [];
  const out: PatternInsight[] = [];
  for (const [symptom, buckets] of hits) {
    let best: [string, number] | null = null;
    for (const [b, set] of buckets) if (!best || set.size > best[1]) best = [b, set.size];
    if (!best) continue;
    const share = best[1] / cyclesWithLogs;
    if (best[1] < MIN_CYCLES_FOR_PATTERN || share < 0.5) continue;
    const when =
      best[0] === 'period'
        ? 'during your period'
        : best[0] === 'before:1'
          ? 'the day before your period'
          : `${best[0].split(':')[1]} days before your period`;
    out.push({ symptom, share, message: `You often log ${symptom} ${when}.` });
  }
  return out.sort((a, b) => b.share - a.share);
}

/** Symptom counts per phase for completed and current cycles. */
export function symptomsByPhase(cycles: Cycle[], logs: DayLog[], luteal: number): Record<Phase, Record<string, number>> {
  const res: Record<Phase, Record<string, number>> = { menstrual: {}, follicular: {}, ovulatory: {}, luteal: {} };
  for (const log of logs) {
    if (!log.symptoms.length) continue;
    const c = [...cycles].reverse().find((cy) => cy.start <= log.date);
    if (!c) continue;
    const next = c.nextStart ?? addDays(c.start, 28);
    const ovu = addDays(next, -luteal);
    const phase = phaseForDay(log.date, c.start, c.periodLength, addDays(ovu, -5), ovu);
    for (const s of log.symptoms) res[phase][s] = (res[phase][s] ?? 0) + 1;
  }
  return res;
}

/** Average mood score per day (only days with moods). */
export function moodSeries(logs: DayLog[]): { date: string; score: number }[] {
  return logs
    .filter((l) => l.moods.length)
    .sort((a, b) => (a.date < b.date ? -1 : 1))
    .map((l) => ({
      date: l.date,
      score: l.moods.reduce((a, m) => a + (MOOD_SCORE[m] ?? 0), 0) / l.moods.length,
    }));
}
