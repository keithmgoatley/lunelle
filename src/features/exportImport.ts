/**
 * Export (JSON + CSV), import (JSON backup or period CSV) and the CSV template.
 * Files are written to the app cache and handed to the iOS share sheet; the
 * user decides where they go. Nothing is uploaded by the app.
 */
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
import type { DayLog, Period, Settings } from '../domain/types';
import { DEFAULT_SETTINGS } from '../domain/types';
import type { Snapshot } from '../db/repo';
import { logsToCsv, periodsToCsv, PERIOD_CSV_TEMPLATE } from './csv';
import { isValidISO, todayISO } from '../engine/dates';

const FORMAT = 'lunelle-backup';

async function shareText(name: string, content: string, mime: string, uti: string) {
  const f = new File(Paths.cache, name);
  if (f.exists) f.delete();
  f.create();
  f.write(content);
  await Sharing.shareAsync(f.uri, { mimeType: mime, UTI: uti, dialogTitle: name });
}

export async function exportJson(snap: Snapshot) {
  const body = JSON.stringify({ format: FORMAT, version: 1, exportedAt: new Date().toISOString(), ...snap }, null, 2);
  await shareText(`lunelle-backup-${todayISO()}.json`, body, 'application/json', 'public.json');
}

export async function exportCsv(logs: DayLog[], periods: Period[]) {
  await shareText(`lunelle-days-${todayISO()}.csv`, logsToCsv(logs), 'text/csv', 'public.comma-separated-values-text');
  await shareText(`lunelle-periods-${todayISO()}.csv`, periodsToCsv(periods), 'text/csv', 'public.comma-separated-values-text');
}

export async function shareTemplate() {
  await shareText('lunelle-period-template.csv', PERIOD_CSV_TEMPLATE, 'text/csv', 'public.comma-separated-values-text');
}

/** Lets the user pick a file and returns its text, or null if cancelled. */
export async function pickTextFile(): Promise<{ name: string; text: string } | null> {
  const res = await DocumentPicker.getDocumentAsync({
    type: ['application/json', 'text/csv', 'text/comma-separated-values', 'text/plain', 'public.comma-separated-values-text'],
    copyToCacheDirectory: true,
  });
  if (res.canceled || !res.assets?.[0]) return null;
  const a = res.assets[0];
  return { name: a.name, text: await new File(a.uri).text() };
}

/** Validates a JSON backup and turns it into a Snapshot. Throws with a friendly message. */
export function parseBackup(text: string): Snapshot {
  let raw: any;
  try {
    raw = JSON.parse(text);
  } catch {
    throw new Error('This file is not valid JSON.');
  }
  if (raw?.format !== FORMAT) throw new Error('This does not look like a Lunelle backup.');
  const logs: DayLog[] = (Array.isArray(raw.logs) ? raw.logs : [])
    .filter((l: any) => l && isValidISO(l.date))
    .map((l: any) => ({ symptoms: [], moods: [], meds: [], ...l }));
  const periods: Period[] = (Array.isArray(raw.periods) ? raw.periods : []).filter(
    (p: any) => p && p.id && isValidISO(p.start) && isValidISO(p.end),
  );
  const settings: Settings = {
    ...DEFAULT_SETTINGS,
    ...(raw.settings ?? {}),
    reminders: { ...DEFAULT_SETTINGS.reminders, ...(raw.settings?.reminders ?? {}) },
  };
  return { settings, logs, periods };
}
