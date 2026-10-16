/**
 * Local-only reminders via expo-notifications. Nothing is sent to any server:
 * we only use the on-device scheduler, never push tokens.
 */
import * as Notifications from 'expo-notifications';
import type { Settings } from '../domain/types';
import type { Prediction } from '../engine/predict';
import { addDays, parseISO } from '../engine/dates';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

export async function ensurePermission(): Promise<boolean> {
  const cur = await Notifications.getPermissionsAsync();
  if (cur.granted) return true;
  const req = await Notifications.requestPermissionsAsync();
  return req.granted;
}

/** Local Date at hour:minute on an ISO calendar day. */
function at(iso: string, hour: number, minute: number): Date {
  const d = new Date(parseISO(iso));
  return new Date(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), hour, minute);
}

async function once(title: string, body: string, date: Date) {
  if (date.getTime() <= Date.now()) return;
  await Notifications.scheduleNotificationAsync({
    content: { title, body },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date },
  });
}

/** Cancels everything we scheduled and rebuilds it from current state. */
export async function rescheduleAll(s: Settings, p: Prediction | null, today: string): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
  const r = s.reminders;
  const anyOn = r.period.enabled || r.fertile.enabled || r.pill.enabled || r.daily.enabled;
  if (!anyOn || !s.onboarded) return;
  const perm = await Notifications.getPermissionsAsync();
  if (!perm.granted) return;
  // Copy is deliberately discreet: lock-screen banners never say "period".
  if (s.goal !== 'pregnancy' && p?.hasData) {
    if (r.period.enabled) {
      for (const c of p.upcoming.slice(1, 4)) {
        await once('Lunelle', `Heads up: a new cycle may start in ${r.period.daysBefore ?? 2} days.`,
          at(addDays(c.periodStart, -(r.period.daysBefore ?? 2)), r.period.hour, r.period.minute));
      }
    }
    if (r.fertile.enabled) {
      for (const c of p.upcoming.slice(0, 3)) {
        if (c.fertileStart < today) continue;
        await once('Lunelle', 'Your estimated fertile window starts today.', at(c.fertileStart, r.fertile.hour, r.fertile.minute));
      }
    }
  }
  if (r.pill.enabled) {
    await Notifications.scheduleNotificationAsync({
      content: { title: 'Lunelle', body: 'Time for your daily pill.' },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DAILY, hour: r.pill.hour, minute: r.pill.minute },
    });
  }
  if (r.daily.enabled) {
    await Notifications.scheduleNotificationAsync({
      content: { title: 'Lunelle', body: 'How was today? Take 10 seconds to log it.' },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DAILY, hour: r.daily.hour, minute: r.daily.minute },
    });
  }
}
