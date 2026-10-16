/**
 * Single in-memory store for the whole app. Data is tiny (a few KB per year),
 * so it is loaded once from the encrypted DB and every write goes through here
 * so the UI and the database never drift apart.
 */
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { randomUUID } from 'expo-crypto';
import type { DayLog, Period, Settings } from '../domain/types';
import { DEFAULT_SETTINGS } from '../domain/types';
import * as repo from '../db/repo';
import { predict, Prediction } from '../engine/predict';
import { todayISO, addDays, diffDays } from '../engine/dates';
import { rescheduleAll } from '../features/notifications';

interface AppState {
  ready: boolean;
  error?: string;
  settings: Settings;
  logs: DayLog[];
  logsByDate: Map<string, DayLog>;
  periods: Period[];
  prediction: Prediction;
  today: string;
  updateSettings: (patch: Partial<Settings>) => Promise<void>;
  saveLog: (log: DayLog) => Promise<void>;
  addPeriod: (p: Omit<Period, 'id'>) => Promise<void>;
  updatePeriod: (p: Period) => Promise<void>;
  removePeriod: (id: string) => Promise<void>;
  /** Marks `date` as a period start (creates a default-length range). */
  startPeriodOn: (date: string) => Promise<void>;
  /** Ends the period that contains/precedes `date` on that date. */
  endPeriodOn: (date: string) => Promise<void>;
  replaceAll: (snap: repo.Snapshot) => Promise<void>;
  wipe: () => Promise<void>;
}

const Ctx = createContext<AppState | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string>();
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [logs, setLogs] = useState<DayLog[]>([]);
  const [periods, setPeriods] = useState<Period[]>([]);
  const [today, setToday] = useState(todayISO());

  useEffect(() => {
    (async () => {
      try {
        await repo.openRepo();
        const snap = await repo.loadAll();
        setSettings(snap.settings);
        setLogs(snap.logs);
        setPeriods(snap.periods);
      } catch (e) {
        setError(String(e));
      } finally {
        setReady(true);
      }
    })();
    // Refresh "today" every minute so the ring rolls over at midnight.
    const t = setInterval(() => setToday(todayISO()), 60_000);
    return () => clearInterval(t);
  }, []);

  const prediction = useMemo(
    () =>
      predict({
        periods,
        logs,
        today,
        defaultCycleLength: settings.cycleLength,
        defaultPeriodLength: settings.periodLength,
        lutealLength: settings.lutealLength,
      }),
    [periods, logs, today, settings.cycleLength, settings.periodLength, settings.lutealLength],
  );

  // Keep local notifications in sync with predictions and preferences.
  useEffect(() => {
    if (ready && settings.onboarded) rescheduleAll(settings, prediction, today).catch(() => {});
  }, [ready, settings, prediction, today]);

  const logsByDate = useMemo(() => new Map(logs.map((l) => [l.date, l])), [logs]);

  // Ref mirrors the latest settings so rapid successive patches never lose data.
  const settingsRef = useRef(settings);
  settingsRef.current = settings;
  const updateSettings = useCallback(async (patch: Partial<Settings>) => {
    const next = { ...settingsRef.current, ...patch };
    settingsRef.current = next;
    setSettings(next);
    await repo.saveSettings(next);
  }, []);

  const saveLog = useCallback(async (log: DayLog) => {
    const empty =
      !log.flow && !log.symptoms.length && !log.moods.length && !log.meds.length && log.energy === undefined &&
      log.sleepHours === undefined && !log.discharge && !log.sex && !log.libido && log.bbt === undefined &&
      log.weight === undefined && log.water === undefined && !log.ovulationTest && !log.pregnancyTest &&
      log.pillTaken === undefined && !log.notes;
    if (empty) await repo.deleteLog(log.date);
    else await repo.saveLog(log);
    setLogs((ls) => {
      const rest = ls.filter((l) => l.date !== log.date);
      return empty ? rest : [...rest, log].sort((a, b) => (a.date < b.date ? -1 : 1));
    });
  }, []);

  const addPeriod = useCallback(async (p: Omit<Period, 'id'>) => {
    const full = { ...p, id: randomUUID() };
    await repo.savePeriod(full);
    setPeriods((ps) => [...ps, full].sort((a, b) => (a.start < b.start ? -1 : 1)));
  }, []);

  const updatePeriod = useCallback(async (p: Period) => {
    await repo.savePeriod(p);
    setPeriods((ps) => ps.map((x) => (x.id === p.id ? p : x)).sort((a, b) => (a.start < b.start ? -1 : 1)));
  }, []);

  const removePeriod = useCallback(async (id: string) => {
    await repo.deletePeriod(id);
    setPeriods((ps) => ps.filter((x) => x.id !== id));
  }, []);

  const startPeriodOn = useCallback(
    async (date: string) => {
      // If an existing range starts shortly after, move it earlier instead of duplicating.
      const near = periods.find((p) => Math.abs(diffDays(date, p.start)) <= 7);
      if (near) {
        const len = diffDays(near.start, near.end);
        await updatePeriod({ ...near, start: date, end: date > near.end ? addDays(date, len) : near.end });
      } else {
        await addPeriod({ start: date, end: addDays(date, settings.periodLength - 1), source: 'log' });
      }
    },
    [periods, settings.periodLength, addPeriod, updatePeriod],
  );

  const endPeriodOn = useCallback(
    async (date: string) => {
      const p = [...periods].reverse().find((x) => x.start <= date && diffDays(x.start, date) <= 14);
      if (p) await updatePeriod({ ...p, end: date });
    },
    [periods, updatePeriod],
  );

  const replaceAll = useCallback(async (snap: repo.Snapshot) => {
    await repo.replaceAll(snap);
    const fresh = await repo.loadAll();
    setSettings(fresh.settings);
    setLogs(fresh.logs);
    setPeriods(fresh.periods);
  }, []);

  const wipe = useCallback(async () => {
    await repo.wipeEverything();
    await rescheduleAll({ ...DEFAULT_SETTINGS }, null, todayISO()).catch(() => {});
    setSettings(DEFAULT_SETTINGS);
    setLogs([]);
    setPeriods([]);
  }, []);

  const value: AppState = {
    ready, error, settings, logs, logsByDate, periods, prediction, today,
    updateSettings, saveLog, addPeriod, updatePeriod, removePeriod, startPeriodOn, endPeriodOn, replaceAll, wipe,
  };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useApp(): AppState {
  const v = useContext(Ctx);
  if (!v) throw new Error('useApp outside AppProvider');
  return v;
}
