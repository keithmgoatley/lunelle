/**
 * Pregnancy mode: set LMP or due date, and browse week-by-week notes.
 */
import React, { useState } from 'react';
import { View } from 'react-native';
import { useApp } from '../state/AppContext';
import { Card, Chip, ChipRow, Label, Row, Screen, T, success } from '../ui/components';
import { DateField } from '../ui/MonthGrid';
import { useTheme } from '../ui/theme';
import { addDays, formatPretty } from '../engine/dates';
import { lmpFromDueDate, pregnancyStatus } from '../engine/pregnancy';
import { PREGNANCY_WEEKS, weekInfo } from '../content/pregnancyWeeks';

export default function PregnancyScreen() {
  const { settings, updateSettings, today, prediction } = useApp();
  const t = useTheme();
  const [by, setBy] = useState<'lmp' | 'due'>('lmp');
  const lmp = settings.pregnancyLmp;
  const status = lmp ? pregnancyStatus(lmp, today) : undefined;
  const [week, setWeek] = useState(status ? Math.min(40, status.week) : 4);
  const info = weekInfo(week);

  const save = async (newLmp: string) => {
    await updateSettings({ pregnancyLmp: newLmp, goal: 'pregnancy' });
    setWeek(Math.min(40, pregnancyStatus(newLmp, today).week));
    success();
  };

  return (
    <Screen padTop={false}>
      <Card>
        <Label>dates</Label>
        <ChipRow>
          <Chip label="last period" selected={by === 'lmp'} onPress={() => setBy('lmp')} />
          <Chip label="due date" selected={by === 'due'} onPress={() => setBy('due')} />
        </ChipRow>
        {by === 'lmp' ? (
          <DateField value={lmp ?? prediction.currentCycleStart} onChange={save} today={today} maxDate={today} />
        ) : (
          <DateField value={lmp ? addDays(lmp, 280) : undefined} onChange={(d) => save(lmpFromDueDate(d))} today={today} placeholder="pick due date" />
        )}
        {status && <T size={12} muted>due {formatPretty(status.dueDate)} {status.dueDate.slice(0, 4)} · currently {status.week}w {status.day}d</T>}
        {!lmp && <T size={12} muted>tap the date above and confirm to start.</T>}
      </Card>

      <Card delay={60}>
        <Label>week by week</Label>
        <ChipRow>
          {PREGNANCY_WEEKS.map((w) => (
            <Chip key={w} label={w === 0 ? '0-2' : String(w)} selected={weekInfo(week) === weekInfo(w)} color={status && w === Math.min(40, status.week) ? t.ovulation : undefined}
              onPress={() => setWeek(w)} />
          ))}
        </ChipRow>
      </Card>

      <Card delay={120} tint={t.cardAlt}>
        <Row style={{ justifyContent: 'space-between' }}>
          <T size={22} weight="extra" color={t.accent}>week {week === 0 ? '0–2' : week}</T>
          <T size={11} muted>≈ {info.size}</T>
        </Row>
        <View style={{ gap: 6 }}>
          <T weight="bold">baby</T>
          <T size={13}>{info.baby}</T>
          <T weight="bold">you</T>
          <T size={13}>{info.you}</T>
        </View>
      </Card>
      <T size={11} muted center>General information only, written for Lunelle. Your midwife or doctor knows your situation best. Get urgent care for bleeding, severe pain, severe headache or vision changes, fluid leaking, or reduced movements.</T>
    </Screen>
  );
}
