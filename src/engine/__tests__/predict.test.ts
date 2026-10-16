import { emptyLog, DayLog, Period } from '../../domain/types';
import { addDays, diffDays, isValidISO } from '../dates';
import { buildEpisodes, buildCycles } from '../cycles';
import { detectBbtShift, ovulationFromLh } from '../ovulation';
import {
  assessIrregularity, classifyDay, predict, standardDeviation, weightedCycleLength,
} from '../predict';
import { findPatterns } from '../patterns';
import { pregnancyStatus } from '../pregnancy';

const P = (start: string, len = 5): Period => ({ id: start, start, end: addDays(start, len - 1), source: 'manual' });

/** Periods with the given cycle lengths, starting at `first`. */
function series(first: string, lengths: number[], periodLen = 5): Period[] {
  const out = [P(first, periodLen)];
  let s = first;
  for (const l of lengths) {
    s = addDays(s, l);
    out.push(P(s, periodLen));
  }
  return out;
}

const base = { defaultCycleLength: 28, defaultPeriodLength: 5, lutealLength: 14 };

describe('dates', () => {
  it('handles month/leap boundaries and DST-free arithmetic', () => {
    expect(addDays('2024-02-28', 1)).toBe('2024-02-29');
    expect(addDays('2024-03-30', 2)).toBe('2024-04-01');
    expect(diffDays('2024-03-01', '2024-03-31')).toBe(30);
    expect(isValidISO('2024-02-30')).toBe(false);
    expect(isValidISO('2024-02-29')).toBe(true);
  });
});

describe('episodes & cycles', () => {
  it('merges period ranges and flow logs with small gaps', () => {
    const logs: DayLog[] = [
      { ...emptyLog('2024-01-06'), flow: 'light' },
      { ...emptyLog('2024-01-08'), flow: 'light' }, // 1-day gap → same period
      { ...emptyLog('2024-01-20'), flow: 'spotting' }, // spotting ignored
    ];
    const eps = buildEpisodes([P('2024-01-01', 5)], logs);
    expect(eps).toEqual([{ start: '2024-01-01', end: '2024-01-08' }]);
  });

  it('computes cycle lengths between starts', () => {
    const cycles = buildCycles(buildEpisodes(series('2024-01-01', [28, 30]), []));
    expect(cycles.map((c) => c.length)).toEqual([28, 30, undefined]);
  });
});

describe('weighted average', () => {
  it('weights recent cycles more', () => {
    // Oldest 26, newest 32: weighted mean must be above simple mean 29.
    const w = weightedCycleLength([26, 26, 26, 32, 32, 32], 28);
    expect(w).toBeGreaterThan(29);
    expect(w).toBeLessThan(32);
  });

  it('falls back to the prior with no data and blends with little data', () => {
    expect(weightedCycleLength([], 30)).toBe(30);
    const one = weightedCycleLength([24], 30);
    expect(one).toBeGreaterThan(24);
    expect(one).toBeLessThan(30);
  });

  it('ignores the prior once 3+ cycles exist', () => {
    expect(weightedCycleLength([27, 27, 27], 35)).toBeCloseTo(27);
  });
});

describe('predict', () => {
  it('predicts the next period, ovulation and fertile window for regular cycles', () => {
    const periods = series('2024-01-01', [28, 28, 28]); // last start 2024-03-25
    const p = predict({ ...base, periods, logs: [], today: '2024-03-30' });
    expect(p.currentCycleStart).toBe('2024-03-25');
    expect(p.cycleDay).toBe(6);
    expect(p.nextPeriod).toBe('2024-04-22');
    expect(p.ovulation).toBe('2024-04-08');
    expect(p.fertileStart).toBe('2024-04-03');
    expect(p.fertileEnd).toBe('2024-04-08');
    expect(p.daysUntilNextPeriod).toBe(23);
    expect(p.rangeDays).toBe(1);
    expect(p.phase).toBe('follicular');
    expect(p.irregularity.irregular).toBe(false);
  });

  it('widens the confidence range with irregular cycles', () => {
    const regular = predict({ ...base, periods: series('2024-01-01', [28, 28, 29, 28]), logs: [], today: '2024-05-01' });
    const irregular = predict({ ...base, periods: series('2024-01-01', [22, 36, 25, 40]), logs: [], today: '2024-05-20' });
    expect(irregular.rangeDays).toBeGreaterThan(regular.rangeDays);
    expect(irregular.irregularity.irregular).toBe(true);
  });

  it('respects a custom luteal phase length', () => {
    const p = predict({ ...base, lutealLength: 12, periods: series('2024-01-01', [28, 28, 28]), logs: [], today: '2024-03-26' });
    expect(diffDays(p.ovulation!, p.nextPeriod!)).toBe(12);
  });

  it('refines ovulation with a positive LH test', () => {
    const periods = series('2024-01-01', [28, 28, 28]);
    const logs = [{ ...emptyLog('2024-04-04'), ovulationTest: 'positive' as const }];
    const p = predict({ ...base, periods, logs, today: '2024-04-04' });
    expect(p.ovulation).toBe('2024-04-05');
    expect(p.ovulationSource).toBe('lh');
    expect(p.nextPeriod).toBe('2024-04-19');
  });

  it('refines ovulation with a BBT shift', () => {
    const periods = series('2024-01-01', [28, 28, 28]); // cycle starts 03-25
    const temps = [36.3, 36.35, 36.3, 36.4, 36.3, 36.35, 36.3, 36.7, 36.75, 36.7];
    const logs = temps.map((t, i) => ({ ...emptyLog(addDays('2024-03-30', i)), bbt: t }));
    const p = predict({ ...base, periods, logs, today: '2024-04-09' });
    // First raised reading is on 04-06 → ovulation 04-05.
    expect(p.currentOvulation).toBe('2024-04-05');
    expect(p.nextPeriod).toBe('2024-04-19');
    expect(p.ovulationSource).toBe('bbt');
  });

  it('reports lateness and projects future cycles from today', () => {
    const p = predict({ ...base, periods: series('2024-01-01', [28]), logs: [], today: '2024-03-01' });
    expect(p.nextPeriod).toBe('2024-02-26');
    expect(p.lateBy).toBe(4);
    expect(p.upcoming[1].periodStart > '2024-03-01').toBe(true);
  });

  it('returns hasData=false when nothing logged', () => {
    expect(predict({ ...base, periods: [], logs: [], today: '2024-01-01' }).hasData).toBe(false);
  });

  it('classifies calendar days', () => {
    const p = predict({ ...base, periods: series('2024-01-01', [28, 28, 28]), logs: [], today: '2024-03-30' });
    expect(classifyDay('2024-03-26', p, '2024-03-30')).toBe('period');
    expect(classifyDay('2024-04-08', p, '2024-03-30')).toBe('ovulation');
    expect(classifyDay('2024-04-05', p, '2024-03-30')).toBe('fertile');
    expect(classifyDay('2024-04-23', p, '2024-03-30')).toBe('predictedPeriod');
    expect(classifyDay('2024-04-15', p, '2024-03-30')).toBe('none');
  });
});

describe('body signs', () => {
  it('does not detect a shift without three raised readings', () => {
    const logs = [36.3, 36.3, 36.3, 36.3, 36.3, 36.3, 36.6, 36.3, 36.6].map((t, i) => ({ ...emptyLog(addDays('2024-01-01', i)), bbt: t }));
    expect(detectBbtShift(logs)).toBeUndefined();
  });
  it('uses the first positive LH test', () => {
    const logs = [
      { ...emptyLog('2024-01-12'), ovulationTest: 'positive' as const },
      { ...emptyLog('2024-01-11'), ovulationTest: 'positive' as const },
    ];
    expect(ovulationFromLh(logs)).toBe('2024-01-12');
  });
});

describe('irregularity & stats', () => {
  it('computes sample SD', () => {
    expect(standardDeviation([2, 4, 4, 4, 5, 5, 7, 9])).toBeCloseTo(2.138, 2);
  });
  it('flags cycles out of 21-35 range', () => {
    expect(assessIrregularity([28, 45, 28]).irregular).toBe(true);
    expect(assessIrregularity([28, 29, 27]).irregular).toBe(false);
  });
});

describe('patterns', () => {
  it('finds headaches 2 days before period', () => {
    const periods = series('2024-01-01', [28, 28, 28]);
    const cycles = buildCycles(buildEpisodes(periods, []));
    const logs = cycles
      .filter((c) => c.nextStart)
      .map((c) => ({ ...emptyLog(addDays(c.nextStart!, -2)), symptoms: ['headache'] }));
    const pats = findPatterns(cycles, logs);
    expect(pats[0].message).toBe('You often log headache 2 days before your period.');
  });
});

describe('pregnancy', () => {
  it('computes due date and week', () => {
    const s = pregnancyStatus('2024-01-01', '2024-03-04');
    expect(s.dueDate).toBe('2024-10-07');
    expect(s.week).toBe(9);
    expect(s.trimester).toBe(1);
  });
});
