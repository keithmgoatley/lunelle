/**
 * Manage period ranges: manual entry of past periods, editing, deletion,
 * and CSV import (with a shareable template).
 */
import React, { useState } from 'react';
import { Alert, View, Pressable } from 'react-native';
import { useApp } from '../state/AppContext';
import { Button, Card, Label, Row, Screen, T, success, tap } from '../ui/components';
import { DateField } from '../ui/MonthGrid';
import { useTheme } from '../ui/theme';
import { addDays, diffDays, formatPretty } from '../engine/dates';
import { parsePeriodCsv } from '../features/csv';
import { pickTextFile, shareTemplate } from '../features/exportImport';

export default function CyclesScreen() {
  const { periods, addPeriod, removePeriod, updatePeriod, today, settings, prediction } = useApp();
  const t = useTheme();
  const [start, setStart] = useState<string>();
  const [end, setEnd] = useState<string>();

  const add = async () => {
    if (!start) return;
    const e = end && end >= start ? end : addDays(start, settings.periodLength - 1);
    if (diffDays(start, e) > 14) return Alert.alert('That period is longer than 14 days', 'Please check the end date.');
    await addPeriod({ start, end: e, source: 'manual' });
    success();
    setStart(undefined);
    setEnd(undefined);
  };

  const importCsv = async () => {
    try {
      const f = await pickTextFile();
      if (!f) return;
      const { periods: rows, errors } = parsePeriodCsv(f.text, settings.periodLength);
      const existing = new Set(periods.map((p) => p.start));
      const fresh = rows.filter((r) => !existing.has(r.start) && r.start <= today);
      for (const r of fresh) await addPeriod(r);
      success();
      Alert.alert('Import finished', `${fresh.length} period${fresh.length === 1 ? '' : 's'} added.${errors.length ? `\n\n${errors.slice(0, 5).join('\n')}` : ''}`);
    } catch (e) {
      Alert.alert('Could not import', String(e));
    }
  };

  const confirmDelete = (id: string, label: string) =>
    Alert.alert('Delete period?', label, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => removePeriod(id) },
    ]);

  const sorted = [...periods].sort((a, b) => (a.start < b.start ? 1 : -1));
  const lengthAfter = new Map(prediction.cycles.map((c) => [c.start, c.length]));

  return (
    <Screen padTop={false}>
      <Card>
        <Label>add a past period</Label>
        <T size={12} muted>start date</T>
        <DateField value={start} onChange={setStart} today={today} maxDate={today} />
        <T size={12} muted>end date (optional, defaults to {settings.periodLength} days)</T>
        <DateField value={end} onChange={setEnd} today={start ?? today} maxDate={today} placeholder="pick end date" />
        <Button title="add period" disabled={!start} onPress={add} />
      </Card>

      <Card delay={60}>
        <Label>import from csv</Label>
        <T size={12} muted>one row per period: start_date,end_date (YYYY-MM-DD). share the template to Files or Numbers, fill it in, then import.</T>
        <Row>
          <Button title="get template" variant="ghost" style={{ flex: 1 }} onPress={() => shareTemplate().catch((e) => Alert.alert('Error', String(e)))} />
          <Button title="import csv" style={{ flex: 1 }} onPress={importCsv} />
        </Row>
      </Card>

      <Card delay={120}>
        <Label>your periods ({periods.length})</Label>
        {sorted.length === 0 && <T muted size={12}>none yet.</T>}
        {sorted.map((p) => {
          const len = diffDays(p.start, p.end) + 1;
          const cyc = lengthAfter.get(p.start);
          return (
            <Row key={p.id} style={{ justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: t.border, paddingVertical: 8 }}>
              <View style={{ flex: 1 }}>
                <T weight="medium">{formatPretty(p.start)} {p.start.slice(0, 4)} → {formatPretty(p.end)}</T>
                <T size={11} muted>{len} day period{cyc ? ` · ${cyc} day cycle` : ''} · {p.source}</T>
              </View>
              <Pressable hitSlop={8} onPress={() => { tap(); updatePeriod({ ...p, end: addDays(p.end, 1) }); }}><T color={t.accent}> +1d </T></Pressable>
              <Pressable hitSlop={8} onPress={() => { tap(); if (len > 1) updatePeriod({ ...p, end: addDays(p.end, -1) }); }}><T color={t.accent}> −1d </T></Pressable>
              <Pressable hitSlop={8} onPress={() => confirmDelete(p.id, `${p.start} → ${p.end}`)}><T color="#D93A57"> ✕</T></Pressable>
            </Row>
          );
        })}
      </Card>
    </Screen>
  );
}
