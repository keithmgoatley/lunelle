/** Pregnancy dating using Naegele's rule (LMP + 280 days). */
import type { ISODate } from '../domain/types';
import { addDays, diffDays } from './dates';

export interface PregnancyStatus {
  dueDate: ISODate;
  week: number;
  day: number;
  daysToGo: number;
  trimester: 1 | 2 | 3;
}

export function pregnancyStatus(lmp: ISODate, today: ISODate): PregnancyStatus {
  const dueDate = addDays(lmp, 280);
  const elapsed = Math.max(0, diffDays(lmp, today));
  const week = Math.floor(elapsed / 7);
  return {
    dueDate,
    week,
    day: elapsed % 7,
    daysToGo: diffDays(today, dueDate),
    trimester: week < 14 ? 1 : week < 28 ? 2 : 3,
  };
}

/** Inverse: LMP from a known due date. */
export function lmpFromDueDate(due: ISODate): ISODate {
  return addDays(due, -280);
}
