/**
 * Prediction engine. Pure and deterministic: everything it needs is passed in.
 *
 * - Cycle length: exponentially weighted mean of recent cycles (recent = heavier).
 * - Confidence: ± max(1, ceil(SD)) days, widening with irregularity.
 * - Ovulation: next period − luteal length, refined by LH tests or a BBT shift
 *   logged in the current cycle.
 * - Fertile window: 5 days before ovulation through ovulation day.
 *
 * These are estimates only and must never be used as contraception.
 */
import type { DayLog, ISODate, Period } from '../domain/types';
import { addDays, diffDays } from './dates';
import { buildCycles, buildEpisodes, completedLengths, Cycle, Episode } from './cycles';
import { detectBbtShift, ovulationFromLh } from './ovulation';

export type Phase = 'menstrual' | 'follicular' | 'ovulatory' | 'luteal';

export interface PredictInput {
  periods: Period[];
  logs: DayLog[];
  today: ISODate;
  defaultCycleLength: number;
  defaultPeriodLength: number;
  lutealLength: number;
}

export interface PredictedCycle {
  periodStart: ISODate;
  periodEnd: ISODate;
  ovulation: ISODate;
  fertileStart: ISODate;
  fertileEnd: ISODate;
}

export interface Irregularity {
  irregular: boolean;
  reasons: string[];
}

export interface Prediction {
  hasData: boolean;
  episodes: Episode[];
  cycles: Cycle[];
  avgCycleLength: number;
  avgPeriodLength: number;
  sd: number;
  /** ± days around next period start. */
  rangeDays: number;
  currentCycleStart?: ISODate;
  cycleDay?: number;
  phase?: Phase;
  nextPeriod?: ISODate;
  nextPeriodEarliest?: ISODate;
  nextPeriodLatest?: ISODate;
  daysUntilNextPeriod?: number;
  /** Days late, when today is past the predicted start. */
  lateBy: number;
  /** Next relevant ovulation (current cycle if still ahead, else next cycle). */
  ovulation?: ISODate;
  /** Ovulation estimate for the current cycle and how it was derived. */
  currentOvulation?: ISODate;
  ovulationSource: 'calendar' | 'lh' | 'bbt';
  fertileStart?: ISODate;
  fertileEnd?: ISODate;
  /** Current cycle + the next few, for the calendar. */
  upcoming: PredictedCycle[];
  irregularity: Irregularity;
}

/** Weight decay per cycle of age. */
export const DECAY = 0.8;
/** How many recent cycles to consider. */
export const WINDOW = 12;

/**
 * Weighted mean, newest first. With fewer than 3 cycles the user's typical
 * length from onboarding is blended in as a prior.
 */
export function weightedCycleLength(lengthsOldestFirst: number[], fallback: number): number {
  const recent = lengthsOldestFirst.slice(-WINDOW).reverse();
  let sum = 0;
  let wsum = 0;
  recent.forEach((len, i) => {
    const w = Math.pow(DECAY, i);
    sum += len * w;
    wsum += w;
  });
  if (recent.length < 3) {
    const priorWeight = (3 - recent.length) * 0.5;
    sum += fallback * priorWeight;
    wsum += priorWeight;
  }
  return wsum === 0 ? fallback : sum / wsum;
}

export function standardDeviation(values: number[]): number {
  if (values.length < 2) return 0;
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const variance = values.reduce((a, v) => a + (v - mean) ** 2, 0) / (values.length - 1);
  return Math.sqrt(variance);
}

/** Gentle irregularity check based on common clinical rules of thumb. */
export function assessIrregularity(lengths: number[]): Irregularity {
  const recent = lengths.slice(-WINDOW);
  const reasons: string[] = [];
  if (recent.length >= 3) {
    const sd = standardDeviation(recent);
    const spread = Math.max(...recent) - Math.min(...recent);
    if (sd > 4) reasons.push('your cycle lengths vary quite a bit');
    else if (spread > 9) reasons.push('there is a big gap between your shortest and longest cycle');
  }
  if (recent.some((l) => l < 21)) reasons.push('some cycles were shorter than 21 days');
  if (recent.some((l) => l > 35)) reasons.push('some cycles were longer than 35 days');
  return { irregular: reasons.length > 0, reasons };
}

export function phaseForDay(
  day: ISODate,
  cycleStart: ISODate,
  periodLength: number,
  fertileStart: ISODate,
  ovulation: ISODate,
): Phase {
  const cd = diffDays(cycleStart, day) + 1;
  if (cd <= periodLength) return 'menstrual';
  if (day >= fertileStart && day <= addDays(ovulation, 1)) return 'ovulatory';
  if (day < fertileStart) return 'follicular';
  return 'luteal';
}

function cycleFrom(start: ISODate, length: number, periodLength: number, luteal: number, ovuOverride?: ISODate): PredictedCycle {
  const next = addDays(start, length);
  // Never place ovulation inside the period itself on very short cycles.
  let ovulation = ovuOverride ?? addDays(next, -luteal);
  if (diffDays(start, ovulation) < periodLength) ovulation = addDays(start, periodLength);
  return {
    periodStart: start,
    periodEnd: addDays(start, periodLength - 1),
    ovulation,
    fertileStart: addDays(ovulation, -5),
    fertileEnd: ovulation,
  };
}

export function predict(input: PredictInput): Prediction {
  const { periods, logs, today, defaultCycleLength, defaultPeriodLength, lutealLength } = input;
  const episodes = buildEpisodes(periods, logs).filter((e) => e.start <= today);
  const cycles = buildCycles(episodes);
  const lengths = completedLengths(cycles);
  const avgCycle = weightedCycleLength(lengths, defaultCycleLength);
  const periodLens = cycles.slice(-WINDOW).map((c) => c.periodLength).filter((n) => n >= 2 && n <= 10);
  const avgPeriod = periodLens.length
    ? Math.round(periodLens.reduce((a, b) => a + b, 0) / periodLens.length)
    : defaultPeriodLength;
  const sd = standardDeviation(lengths.slice(-WINDOW));
  const rangeDays = lengths.length >= 2 ? Math.max(1, Math.ceil(sd)) : 2;
  const irregularity = assessIrregularity(lengths);

  const base: Prediction = {
    hasData: episodes.length > 0,
    episodes,
    cycles,
    avgCycleLength: Math.round(avgCycle * 10) / 10,
    avgPeriodLength: avgPeriod,
    sd: Math.round(sd * 10) / 10,
    rangeDays,
    lateBy: 0,
    ovulationSource: 'calendar',
    upcoming: [],
    irregularity,
  };
  if (!episodes.length) return base;

  const current = cycles[cycles.length - 1];
  const length = Math.round(avgCycle);
  const nextPeriod = addDays(current.start, length);
  const curPeriodLen = diffDays(current.start, episodes[episodes.length - 1].end) + 1;

  // Body-sign refinement, using only logs from the current cycle.
  const cycleLogs = logs.filter((l) => l.date >= current.start && l.date <= today);
  const lh = ovulationFromLh(cycleLogs);
  const bbt = detectBbtShift(cycleLogs);
  const override = lh ?? bbt;
  const ovulationSource: Prediction['ovulationSource'] = lh ? 'lh' : bbt ? 'bbt' : 'calendar';

  const cur = cycleFrom(current.start, length, Math.max(curPeriodLen, 1), lutealLength, override);
  // A confirmed ovulation also re-anchors the next period: ovulation + luteal.
  const refinedNext = override ? addDays(cur.ovulation, lutealLength) : nextPeriod;

  const upcoming: PredictedCycle[] = [{ ...cur, periodEnd: episodes[episodes.length - 1].end }];
  let s = refinedNext;
  // If the period is late, project future cycles from today.
  if (s <= today) s = addDays(today, 1);
  for (let i = 0; i < 6; i++) {
    upcoming.push(cycleFrom(s, length, avgPeriod, lutealLength));
    s = addDays(s, length);
  }

  const cycleDay = diffDays(current.start, today) + 1;
  const lateBy = Math.max(0, diffDays(refinedNext, today));
  // Fertile window shown is the current one if still ahead, otherwise the next.
  const fw = today <= cur.fertileEnd ? cur : upcoming[1];

  return {
    ...base,
    currentCycleStart: current.start,
    cycleDay,
    phase: phaseForDay(today, current.start, curPeriodLen, cur.fertileStart, cur.ovulation),
    nextPeriod: refinedNext,
    nextPeriodEarliest: addDays(refinedNext, -rangeDays),
    nextPeriodLatest: addDays(refinedNext, rangeDays),
    daysUntilNextPeriod: diffDays(today, refinedNext),
    lateBy,
    ovulation: fw.ovulation,
    currentOvulation: cur.ovulation,
    ovulationSource,
    fertileStart: fw.fertileStart,
    fertileEnd: fw.fertileEnd,
    upcoming,
  };
}

/** Classifies any calendar day for display. */
export type DayKind = 'period' | 'predictedPeriod' | 'ovulation' | 'fertile' | 'none';

export function classifyDay(day: ISODate, p: Prediction, today: ISODate): DayKind {
  if (p.episodes.some((e) => day >= e.start && day <= e.end)) return 'period';
  for (const c of p.upcoming) {
    if (day === c.ovulation) return 'ovulation';
    if (day >= c.fertileStart && day <= c.fertileEnd) return 'fertile';
    if (day > today && day >= c.periodStart && day <= c.periodEnd && c !== p.upcoming[0]) return 'predictedPeriod';
  }
  return 'none';
}
