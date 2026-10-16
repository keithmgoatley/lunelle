/**
 * Month calendar: logged periods, predicted periods, fertile window and
 * ovulation. Tap any day to open its log.
 */
import React, { useState } from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import { useApp } from '../../state/AppContext';
import { Button, Card, Chip, ChipRow, Disclaimer, H1, Label, Legend, Row, Screen, T } from '../../ui/components';
import { MonthGrid, useMonth, DayDecoration } from '../../ui/MonthGrid';
import { space, useTheme } from '../../ui/theme';
import { classifyDay } from '../../engine/predict';
import { formatPretty } from '../../engine/dates';

export default function CalendarScreen() {
  const { prediction, today, logsByDate } = useApp();
  const t = useTheme();
  const nav = useMonth(today);
  const [sel, setSel] = useState(today);

  const decorate = (iso: string): DayDecoration => {
    const kind = classifyDay(iso, prediction, today);
    const logged = logsByDate.get(iso);
    const dot = logged && (logged.symptoms.length || logged.moods.length || logged.notes || logged.sex || logged.bbt !== undefined) ? t.muted : undefined;
    switch (kind) {
      case 'period': return { bg: t.period, textColor: '#fff', bold: true, dot: dot && '#fff' };
      case 'predictedPeriod': return { border: t.period, dashed: true, textColor: t.period, dot };
      case 'ovulation': return { bg: t.ovulation, textColor: '#fff', bold: true, dot };
      case 'fertile': return { bg: t.fertileSoft, textColor: t.text, dot };
      default: return { dot };
    }
  };

  const kind = classifyDay(sel, prediction, today);
  const selLog = logsByDate.get(sel);
  const summary = selLog
    ? [selLog.flow && `${selLog.flow} flow`, ...selLog.symptoms, ...selLog.moods, selLog.sex && selLog.sex !== 'none' && `sex (${selLog.sex})`, selLog.bbt !== undefined && `bbt ${selLog.bbt}°C`, selLog.ovulationTest && `LH ${selLog.ovulationTest}`, selLog.pregnancyTest && `pregnancy test ${selLog.pregnancyTest}`].filter(Boolean).join(' · ')
    : '';

  return (
    <Screen>
      <Row style={{ justifyContent: 'space-between' }}>
        <H1>calendar</H1>
        <Chip label="today" onPress={() => { nav.jump(today); setSel(today); }} />
      </Row>
      <Card>
        <MonthGrid year={nav.year} month0={nav.month0} onPrev={nav.prev} onNext={nav.next} today={today} selected={sel} decorate={decorate}
          onSelect={(iso) => { if (iso === sel) router.push(`/log/${iso}`); else setSel(iso); }} />
        <Legend items={[
          { color: t.period, label: 'period' },
          { color: t.period, label: 'predicted', outline: true },
          { color: t.fertile, label: 'fertile' },
          { color: t.ovulation, label: 'ovulation' },
        ]} />
      </Card>
      <Card delay={80}>
        <Label>{formatPretty(sel).toLowerCase()} {sel.slice(0, 4)}</Label>
        <T weight="bold">
          {{ period: 'period day', predictedPeriod: 'predicted period', ovulation: 'estimated ovulation', fertile: 'fertile window', none: sel > today ? 'no prediction' : 'cycle day' }[kind]}
        </T>
        {summary ? <T size={12} muted>{summary}</T> : <T size={12} muted>nothing logged.</T>}
        {selLog?.notes ? <T size={12}>“{selLog.notes}”</T> : null}
        <Button title={selLog ? 'edit log' : 'log this day'} onPress={() => router.push(`/log/${sel}`)} />
        <T size={11} muted center>tip: tap a selected day again to open its log</T>
      </Card>
      <Button title="add or edit past cycles" variant="ghost" onPress={() => router.push('/cycles')} />
      <Disclaimer />
      <View style={{ height: space(2) }} />
    </Screen>
  );
}
