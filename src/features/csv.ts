/**
 * Tiny dependency-free CSV helpers plus parsing of past-cycle imports.
 */
import type { DayLog, Period } from '../domain/types';
import { isValidISO, addDays, diffDays } from '../engine/dates';

export const PERIOD_CSV_TEMPLATE =
  'start_date,end_date\n' +
  '# One row per period. Dates as YYYY-MM-DD. end_date is optional (defaults to your usual period length).\n' +
  '2025-01-03,2025-01-07\n' +
  '2025-01-31,2025-02-04\n';

function escape(v: unknown): string {
  const s = v === undefined || v === null ? '' : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function toCsv(rows: unknown[][]): string {
  return rows.map((r) => r.map(escape).join(',')).join('\n') + '\n';
}

/** RFC-4180-ish parser (quotes, escaped quotes, CRLF). */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') { cell += '"'; i++; }
      else if (c === '"') quoted = false;
      else cell += c;
    } else if (c === '"') quoted = true;
    else if (c === ',') { row.push(cell); cell = ''; }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++;
      row.push(cell); rows.push(row); row = []; cell = '';
    } else cell += c;
  }
  if (cell.length || row.length) { row.push(cell); rows.push(row); }
  return rows.filter((r) => r.some((x) => x.trim().length));
}

export interface PeriodImportResult {
  periods: Omit<Period, 'id'>[];
  errors: string[];
}

/** Parses the period template. Lines starting with # and the header are skipped. */
export function parsePeriodCsv(text: string, defaultLength: number): PeriodImportResult {
  const periods: Omit<Period, 'id'>[] = [];
  const errors: string[] = [];
  parseCsv(text).forEach((r, i) => {
    const start = (r[0] ?? '').trim();
    if (!start || start.startsWith('#') || /start/i.test(start)) return;
    const endRaw = (r[1] ?? '').trim();
    if (!isValidISO(start)) return void errors.push(`Row ${i + 1}: "${start}" is not a YYYY-MM-DD date`);
    let end = endRaw && isValidISO(endRaw) ? endRaw : addDays(start, defaultLength - 1);
    if (endRaw && !isValidISO(endRaw)) errors.push(`Row ${i + 1}: end date ignored`);
    const len = diffDays(start, end);
    if (len < 0 || len > 14) {
      errors.push(`Row ${i + 1}: end date must be 0-14 days after start; using default length`);
      end = addDays(start, defaultLength - 1);
    }
    periods.push({ start, end, source: 'import' });
  });
  return { periods, errors };
}

export const LOG_COLUMNS = [
  'date', 'flow', 'symptoms', 'moods', 'energy', 'sleep_hours', 'discharge', 'sex', 'libido',
  'bbt_c', 'weight_kg', 'water_ml', 'ovulation_test', 'pregnancy_test', 'meds', 'pill_taken', 'notes',
];

export function logsToCsv(logs: DayLog[]): string {
  return toCsv([
    LOG_COLUMNS,
    ...logs.map((l) => [
      l.date, l.flow, l.symptoms.join('; '), l.moods.join('; '), l.energy, l.sleepHours, l.discharge, l.sex,
      l.libido, l.bbt, l.weight, l.water, l.ovulationTest, l.pregnancyTest, l.meds.join('; '),
      l.pillTaken === undefined ? '' : l.pillTaken ? 'yes' : 'no', l.notes,
    ]),
  ]);
}

export function periodsToCsv(periods: Period[]): string {
  return toCsv([['start_date', 'end_date', 'source'], ...periods.map((p) => [p.start, p.end, p.source])]);
}
