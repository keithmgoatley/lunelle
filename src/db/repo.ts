/**
 * Encrypted repository on top of expo-sqlite.
 * Only the row keys (calendar date / random id / setting name) are stored in
 * clear text; every payload is AES-GCM encrypted (see crypto.ts).
 */
import * as SQLite from 'expo-sqlite';
import type { DayLog, Period, Settings } from '../domain/types';
import { DEFAULT_SETTINGS } from '../domain/types';
import { decrypt, destroyKey, encrypt, initKey } from './crypto';

const DB_NAME = 'lunelle.db';
const SCHEMA_VERSION = 1;
let db: SQLite.SQLiteDatabase | null = null;

function conn(): SQLite.SQLiteDatabase {
  if (!db) throw new Error('Database not opened');
  return db;
}

export async function openRepo(): Promise<void> {
  await initKey();
  db = await SQLite.openDatabaseAsync(DB_NAME);
  await db.execAsync(`
    PRAGMA journal_mode = WAL;
    CREATE TABLE IF NOT EXISTS meta (k TEXT PRIMARY KEY NOT NULL, v TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS day_logs (date TEXT PRIMARY KEY NOT NULL, data TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS periods (id TEXT PRIMARY KEY NOT NULL, data TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS settings (k TEXT PRIMARY KEY NOT NULL, data TEXT NOT NULL);
  `);
  await db.runAsync('INSERT OR IGNORE INTO meta (k, v) VALUES (?, ?)', 'schema', String(SCHEMA_VERSION));
}

export interface Snapshot {
  settings: Settings;
  logs: DayLog[];
  periods: Period[];
}

/** Safely decrypts a row; corrupt rows are skipped rather than crashing the app. */
function safe<T>(hex: string): T | null {
  try {
    return decrypt<T>(hex);
  } catch {
    return null;
  }
}

export async function loadAll(): Promise<Snapshot> {
  const d = conn();
  const s = await d.getFirstAsync<{ data: string }>('SELECT data FROM settings WHERE k = ?', 'app');
  const stored = s ? safe<Partial<Settings>>(s.data) : null;
  const settings: Settings = {
    ...DEFAULT_SETTINGS,
    ...(stored ?? {}),
    reminders: { ...DEFAULT_SETTINGS.reminders, ...(stored?.reminders ?? {}) },
  };
  const logs = (await d.getAllAsync<{ data: string }>('SELECT data FROM day_logs ORDER BY date'))
    .map((r) => safe<DayLog>(r.data))
    .filter((x): x is DayLog => !!x);
  const periods = (await d.getAllAsync<{ data: string }>('SELECT data FROM periods'))
    .map((r) => safe<Period>(r.data))
    .filter((x): x is Period => !!x)
    .sort((a, b) => (a.start < b.start ? -1 : 1));
  return { settings, logs, periods };
}

export async function saveSettings(s: Settings): Promise<void> {
  await conn().runAsync('INSERT OR REPLACE INTO settings (k, data) VALUES (?, ?)', 'app', encrypt(s));
}

export async function saveLog(log: DayLog): Promise<void> {
  await conn().runAsync('INSERT OR REPLACE INTO day_logs (date, data) VALUES (?, ?)', log.date, encrypt(log));
}

export async function deleteLog(date: string): Promise<void> {
  await conn().runAsync('DELETE FROM day_logs WHERE date = ?', date);
}

export async function savePeriod(p: Period): Promise<void> {
  await conn().runAsync('INSERT OR REPLACE INTO periods (id, data) VALUES (?, ?)', p.id, encrypt(p));
}

export async function deletePeriod(id: string): Promise<void> {
  await conn().runAsync('DELETE FROM periods WHERE id = ?', id);
}

/** Replaces everything (used by JSON import). */
export async function replaceAll(snap: Snapshot): Promise<void> {
  const d = conn();
  await d.withTransactionAsync(async () => {
    await d.execAsync('DELETE FROM day_logs; DELETE FROM periods; DELETE FROM settings;');
    for (const l of snap.logs) await saveLog(l);
    for (const p of snap.periods) await savePeriod(p);
    await saveSettings(snap.settings);
  });
}

/** Wipes the database file and the encryption key, then starts fresh. */
export async function wipeEverything(): Promise<void> {
  if (db) {
    await db.closeAsync();
    db = null;
  }
  await SQLite.deleteDatabaseAsync(DB_NAME);
  await destroyKey();
  await openRepo();
}
