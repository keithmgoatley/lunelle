/**
 * Settings: mode, cycle defaults, units, theme, app lock, reminders and
 * all data controls (export / import / delete).
 */
import React from 'react';
import { Alert, Switch, View } from 'react-native';
import { router } from 'expo-router';
import * as LocalAuthentication from 'expo-local-authentication';
import { useApp } from '../../state/AppContext';
import { Button, Card, Chip, ChipRow, Disclaimer, H1, Label, ListItem, Row, Screen, Stepper, T, success } from '../../ui/components';
import { useTheme } from '../../ui/theme';
import type { Goal, ReminderSetting, Settings } from '../../domain/types';
import { BIRTH_CONTROL } from '../../domain/types';
import { ensurePermission } from '../../features/notifications';
import { exportCsv, exportJson, parseBackup, pickTextFile } from '../../features/exportImport';
import { parsePeriodCsv } from '../../features/csv';

const pad = (n: number) => String(n).padStart(2, '0');

export default function SettingsScreen() {
  const app = useApp();
  const { settings: s, updateSettings } = app;
  const t = useTheme();

  const toggle = (v: boolean, onChange: (v: boolean) => void) => (
    <Switch value={v} onValueChange={onChange} trackColor={{ true: t.accent, false: t.border }} />
  );

  const setReminder = async (key: keyof Settings['reminders'], patch: Partial<ReminderSetting>) => {
    if (patch.enabled && !(await ensurePermission())) {
      Alert.alert('Notifications are off', 'Allow notifications for Expo Go in iOS Settings to use reminders.');
      return;
    }
    await updateSettings({ reminders: { ...s.reminders, [key]: { ...s.reminders[key], ...patch } } });
  };

  const setLock = async (on: boolean) => {
    if (on) {
      const has = await LocalAuthentication.hasHardwareAsync();
      const enrolled = await LocalAuthentication.isEnrolledAsync();
      if (!has || !enrolled) {
        const ok = await LocalAuthentication.authenticateAsync({ promptMessage: 'Confirm with your passcode' });
        if (!ok.success) return;
      } else {
        const ok = await LocalAuthentication.authenticateAsync({ promptMessage: 'Turn on app lock' });
        if (!ok.success) return;
      }
    }
    await updateSettings({ lockEnabled: on });
    success();
  };

  const doImport = async () => {
    try {
      const f = await pickTextFile();
      if (!f) return;
      if (f.name.toLowerCase().endsWith('.csv')) {
        const { periods, errors } = parsePeriodCsv(f.text, s.periodLength);
        const existing = new Set(app.periods.map((p) => p.start));
        const fresh = periods.filter((p) => !existing.has(p.start));
        for (const p of fresh) await app.addPeriod(p);
        Alert.alert('Imported', `${fresh.length} periods added.${errors.length ? '\n' + errors.slice(0, 5).join('\n') : ''}`);
        return;
      }
      const snap = parseBackup(f.text);
      Alert.alert('Restore backup?', `This replaces everything on this phone with ${snap.logs.length} day logs and ${snap.periods.length} periods from the file.`, [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Replace', style: 'destructive', onPress: async () => { await app.replaceAll({ ...snap, settings: { ...snap.settings, onboarded: true, lockEnabled: s.lockEnabled } }); success(); } },
      ]);
    } catch (e: any) {
      Alert.alert('Could not import', e?.message ?? String(e));
    }
  };

  const doDelete = () =>
    Alert.alert('Delete all data?', 'This permanently erases every log, period, setting and the encryption key from this phone. Export first if you want a copy. This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete everything', style: 'destructive',
        onPress: () => Alert.alert('Are you sure?', 'Last chance.', [
          { text: 'Keep my data', style: 'cancel' },
          { text: 'Delete', style: 'destructive', onPress: async () => { await app.wipe(); router.replace('/onboarding'); } },
        ]),
      },
    ]);

  const reminderRow = (key: keyof Settings['reminders'], title: string, subtitle: string) => {
    const r = s.reminders[key];
    return (
      <View key={key}>
        <ListItem title={title} subtitle={subtitle} right={toggle(r.enabled, (v) => setReminder(key, { enabled: v }))} />
        {r.enabled && (
          <Row style={{ justifyContent: 'space-between', paddingBottom: 6 }}>
            <T size={12} muted>at {pad(r.hour)}:{pad(r.minute)}</T>
            <Row>
              <Stepper value={r.hour} min={0} max={23} onChange={(h) => setReminder(key, { hour: h })} format={(n) => `${pad(n)}h`} />
              <Stepper value={r.minute} min={0} max={45} step={15} onChange={(m) => setReminder(key, { minute: m })} format={(n) => `${pad(n)}m`} />
            </Row>
          </Row>
        )}
        {r.enabled && key === 'period' && (
          <Row style={{ justifyContent: 'space-between', paddingBottom: 6 }}>
            <T size={12} muted>days before</T>
            <Stepper value={r.daysBefore ?? 2} min={0} max={7} onChange={(d) => setReminder('period', { daysBefore: d })} />
          </Row>
        )}
      </View>
    );
  };

  return (
    <Screen>
      <H1>settings</H1>

      <Card>
        <Label>mode</Label>
        <ChipRow>
          {([['cycle', 'cycle tracking'], ['ttc', 'trying to conceive'], ['pregnancy', 'pregnancy']] as [Goal, string][]).map(([g, l]) => (
            <Chip key={g} label={l} selected={s.goal === g} onPress={() => { updateSettings({ goal: g }); if (g === 'pregnancy' && !s.pregnancyLmp) router.push('/pregnancy'); }} />
          ))}
        </ChipRow>
        {s.goal === 'pregnancy' && <ListItem title="pregnancy dates" subtitle="due date & week-by-week" onPress={() => router.push('/pregnancy')} />}
        <Label>birth control</Label>
        <ChipRow>{BIRTH_CONTROL.map((b) => <Chip key={b} label={b} selected={s.birthControl === b} onPress={() => updateSettings({ birthControl: b })} />)}</ChipRow>
      </Card>

      <Card delay={40}>
        <Label>cycle defaults</Label>
        <T size={11} muted>used until you’ve logged a few cycles, then your real data takes over.</T>
        <Row style={{ justifyContent: 'space-between' }}><T>cycle length</T><Stepper value={s.cycleLength} min={18} max={60} onChange={(n) => updateSettings({ cycleLength: n })} format={(n) => `${n}d`} /></Row>
        <Row style={{ justifyContent: 'space-between' }}><T>period length</T><Stepper value={s.periodLength} min={2} max={10} onChange={(n) => updateSettings({ periodLength: n })} format={(n) => `${n}d`} /></Row>
        <Row style={{ justifyContent: 'space-between' }}><T>luteal phase</T><Stepper value={s.lutealLength} min={9} max={17} onChange={(n) => updateSettings({ lutealLength: n })} format={(n) => `${n}d`} /></Row>
        <ListItem title="past cycles" subtitle="add, edit or import periods" onPress={() => router.push('/cycles')} />
      </Card>

      <Card delay={80}>
        <Label>units & look</Label>
        <Row style={{ justifyContent: 'space-between' }}><T>temperature</T><ChipRow>{(['C', 'F'] as const).map((u) => <Chip key={u} label={`°${u}`} selected={s.tempUnit === u} onPress={() => updateSettings({ tempUnit: u })} />)}</ChipRow></Row>
        <Row style={{ justifyContent: 'space-between' }}><T>weight</T><ChipRow>{(['kg', 'lb'] as const).map((u) => <Chip key={u} label={u} selected={s.weightUnit === u} onPress={() => updateSettings({ weightUnit: u })} />)}</ChipRow></Row>
        <Row style={{ justifyContent: 'space-between' }}><T>water</T><ChipRow>{(['ml', 'oz'] as const).map((u) => <Chip key={u} label={u} selected={s.waterUnit === u} onPress={() => updateSettings({ waterUnit: u })} />)}</ChipRow></Row>
        <Row style={{ justifyContent: 'space-between' }}><T>theme</T><ChipRow>{(['system', 'light', 'dark'] as const).map((u) => <Chip key={u} label={u} selected={s.theme === u} onPress={() => updateSettings({ theme: u })} />)}</ChipRow></Row>
      </Card>

      <Card delay={120}>
        <Label>reminders</Label>
        <T size={11} muted>local notifications scheduled on this phone only. the wording is discreet.</T>
        {s.goal !== 'pregnancy' && reminderRow('period', 'upcoming period', 'a heads-up before your next cycle')}
        {s.goal !== 'pregnancy' && reminderRow('fertile', 'fertile window', 'when your estimated window begins')}
        {reminderRow('pill', 'pill reminder', 'every day')}
        {reminderRow('daily', 'daily log', 'a nudge to check in')}
      </Card>

      <Card delay={160}>
        <Label>privacy & security</Label>
        <ListItem title="app lock" subtitle="Face ID / passcode on open" right={toggle(s.lockEnabled, setLock)} />
        <ListItem title="how your data is protected" onPress={() => router.push('/privacy')} />
      </Card>

      <Card delay={200}>
        <Label>your data</Label>
        <Button title="export backup (json)" variant="ghost" onPress={() => exportJson({ settings: s, logs: app.logs, periods: app.periods }).catch((e) => Alert.alert('Export failed', String(e)))} />
        <Button title="export spreadsheets (csv)" variant="ghost" onPress={() => exportCsv(app.logs, app.periods).catch((e) => Alert.alert('Export failed', String(e)))} />
        <Button title="import json backup or period csv" variant="ghost" onPress={doImport} />
        <T size={11} muted>exports are not encrypted, so keep them somewhere you trust.</T>
        <Button title="delete all data" variant="danger" onPress={doDelete} />
      </Card>

      <Disclaimer />
      <T size={11} muted center>lunelle 1.0 · no accounts · no cloud · no tracking</T>
    </Screen>
  );
}
