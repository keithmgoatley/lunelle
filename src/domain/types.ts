/**
 * Core domain types. Dates are always ISO calendar strings ("YYYY-MM-DD")
 * so they are timezone-safe and sort lexically.
 */
export type ISODate = string;

export type Flow = 'spotting' | 'light' | 'medium' | 'heavy';
export type Discharge = 'none' | 'sticky' | 'creamy' | 'watery' | 'eggwhite' | 'unusual';
export type SexLog = 'none' | 'protected' | 'unprotected';
export type Level = 'low' | 'medium' | 'high';
export type TestResult = 'negative' | 'positive';
export type Goal = 'cycle' | 'ttc' | 'pregnancy';
export type ThemePref = 'system' | 'light' | 'dark';

/** Everything that can be logged for one calendar day. */
export interface DayLog {
  date: ISODate;
  flow?: Flow;
  symptoms: string[];
  moods: string[];
  /** 1 (drained) … 5 (energised) */
  energy?: number;
  sleepHours?: number;
  discharge?: Discharge;
  sex?: SexLog;
  libido?: Level;
  /** Basal body temperature, always stored in °C. */
  bbt?: number;
  /** Always stored in kg. */
  weight?: number;
  /** Always stored in ml. */
  water?: number;
  ovulationTest?: TestResult;
  pregnancyTest?: TestResult;
  meds: string[];
  pillTaken?: boolean;
  notes?: string;
}

/** A bleeding episode. `end` is inclusive. */
export interface Period {
  id: string;
  start: ISODate;
  end: ISODate;
  source: 'log' | 'manual' | 'import' | 'onboarding';
}

export interface ReminderSetting {
  enabled: boolean;
  hour: number;
  minute: number;
  /** Only used by the period reminder. */
  daysBefore?: number;
}

export interface Settings {
  onboarded: boolean;
  goal: Goal;
  birthControl: string;
  cycleLength: number;
  periodLength: number;
  lutealLength: number;
  tempUnit: 'C' | 'F';
  weightUnit: 'kg' | 'lb';
  waterUnit: 'ml' | 'oz';
  theme: ThemePref;
  lockEnabled: boolean;
  /** First day of last menstrual period for pregnancy mode. */
  pregnancyLmp?: ISODate;
  reminders: {
    period: ReminderSetting;
    fertile: ReminderSetting;
    pill: ReminderSetting;
    daily: ReminderSetting;
  };
}

export const DEFAULT_SETTINGS: Settings = {
  onboarded: false,
  goal: 'cycle',
  birthControl: 'none',
  cycleLength: 28,
  periodLength: 5,
  lutealLength: 14,
  tempUnit: 'C',
  weightUnit: 'kg',
  waterUnit: 'ml',
  theme: 'system',
  lockEnabled: false,
  reminders: {
    period: { enabled: true, hour: 9, minute: 0, daysBefore: 2 },
    fertile: { enabled: false, hour: 9, minute: 0 },
    pill: { enabled: false, hour: 21, minute: 0 },
    daily: { enabled: false, hour: 20, minute: 30 },
  },
};

export const emptyLog = (date: ISODate): DayLog => ({ date, symptoms: [], moods: [], meds: [] });

export const SYMPTOMS = [
  'cramps', 'headache', 'bloating', 'acne', 'tender breasts', 'fatigue', 'backache',
  'nausea', 'cravings', 'insomnia', 'dizziness', 'diarrhoea', 'constipation', 'hot flushes',
] as const;

export const MOODS = [
  'calm', 'happy', 'energetic', 'sensitive', 'sad', 'anxious', 'irritable', 'low', 'confident', 'stressed',
] as const;

/** Rough valence used to plot mood trends (-2 … +2). */
export const MOOD_SCORE: Record<string, number> = {
  calm: 1, happy: 2, energetic: 2, confident: 2, sensitive: -1, sad: -2,
  anxious: -1, irritable: -1, low: -2, stressed: -1,
};

export const BIRTH_CONTROL = ['none', 'pill', 'iud (hormonal)', 'iud (copper)', 'implant', 'injection', 'ring', 'patch', 'condoms', 'other'];
