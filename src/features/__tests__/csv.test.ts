import { parseCsv, parsePeriodCsv, PERIOD_CSV_TEMPLATE, toCsv } from '../csv';

describe('csv', () => {
  it('round-trips quoted cells', () => {
    const csv = toCsv([['a', 'b,c', 'say "hi"\nok']]);
    expect(parseCsv(csv)).toEqual([['a', 'b,c', 'say "hi"\nok']]);
  });

  it('parses the bundled template', () => {
    const r = parsePeriodCsv(PERIOD_CSV_TEMPLATE, 5);
    expect(r.errors).toEqual([]);
    expect(r.periods.map((p) => p.start)).toEqual(['2025-01-03', '2025-01-31']);
  });

  it('applies the default length and reports bad rows', () => {
    const r = parsePeriodCsv('start_date,end_date\r\n2025-03-01,\r\nnot-a-date,\r\n', 4);
    expect(r.periods[0]).toEqual({ start: '2025-03-01', end: '2025-03-04', source: 'import' });
    expect(r.errors.length).toBe(1);
  });
});
