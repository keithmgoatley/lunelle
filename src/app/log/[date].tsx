/**
 * Day log editor. Works for any date (past, today or future).
 */
import React, { useMemo, useState } from 'react';
import { View, Pressable } from 'react-native';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useApp } from '../../state/AppContext';
import { Button, Card, Chip, ChipRow, Input, Label, Row, Screen, Stepper, T, success, tap } from '../../ui/components';
import { space, useTheme } from '../../ui/theme';
import { DayLog, Discharge, emptyLog, Flow, Level, MOODS, SexLog, SYMPTOMS, TestResult } from '../../domain/types';
import { formatPretty, isValidISO } from '../../engine/dates';
import { cToF, fToC, kgToLb, lbToKg, mlToOz, ozToMl, round } from '../../features/units';

const FLOWS: Flow[] = ['spotting', 'light', 'medium', 'heavy'];
const DISCHARGE: Discharge[] = ['none', 'sticky', 'creamy', 'watery', 'eggwhite', 'unusual'];
const SEX: SexLog[] = ['none', 'protected', 'unprotected'];
const LEVELS: Level[] = ['low', 'medium', 'high'];
const TESTS: TestResult[] = ['negative', 'positive'];

/** Single-select chip row that toggles off when re-tapped. */
function Pick<V extends string>({ options, value, onChange, color }: { options: readonly V[]; value?: V; onChange: (v?: V) => void; color?: string }) {
  return (
    <ChipRow>
      {options.map((o) => <Chip key={o} label={o} color={color} selected={value === o} onPress={() => onChange(value === o ? undefined : o)} />)}
    </ChipRow>
  );
}

function Multi({ options, value, onChange, color }: { options: readonly string[]; value: string[]; onChange: (v: string[]) => void; color?: string }) {
  return (
    <ChipRow>
      {options.map((o) => (
        <Chip key={o} label={o} color={color} selected={value.includes(o)} onPress={() => onChange(value.includes(o) ? value.filter((x) => x !== o) : [...value, o])} />
      ))}
    </ChipRow>
  );
}

/** Optional numeric field: shows "add" until a value is set. */
function NumField({ value, onChange, initial, min, max, step, format }: {
  value?: number; onChange: (n?: number) => void; initial: number; min: number; max: number; step: number; format: (n: number) => string;
}) {
  const t = useTheme();
  if (value === undefined) return <Chip label="+ add" onPress={() => onChange(initial)} />;
  return (
    <Row style={{ justifyContent: 'space-between' }}>
      <Stepper value={value} onChange={onChange} min={min} max={max} step={step} format={format} />
      <Pressable onPress={() => { tap(); onChange(undefined); }} hitSlop={10}><T color={t.muted}>clear</T></Pressable>
    </Row>
  );
}

export default function LogScreen() {
  const { date } = useLocalSearchParams<{ date: string }>();
  const { logsByDate, saveLog, settings, startPeriodOn, endPeriodOn, prediction, today } = useApp();
  const t = useTheme();
  const valid = typeof date === 'string' && isValidISO(date);
  const [log, setLog] = useState<DayLog>(() => ({ ...emptyLog(date), ...(logsByDate.get(date) ?? {}) }));
  const [medText, setMedText] = useState('');
  const set = <K extends keyof DayLog>(k: K, v: DayLog[K]) => setLog((l) => ({ ...l, [k]: v }));

  const inPeriod = useMemo(() => prediction.episodes.some((e) => date >= e.start && date <= e.end), [prediction, date]);
  if (!valid) return <Screen><T>Invalid date.</T></Screen>;

  // Display values in the user’s units; store metric.
  const F = settings.tempUnit === 'F';
  const LB = settings.weightUnit === 'lb';
  const OZ = settings.waterUnit === 'oz';
  const bbtDisp = log.bbt === undefined ? undefined : round(F ? cToF(log.bbt) : log.bbt, 2);
  const wDisp = log.weight === undefined ? undefined : round(LB ? kgToLb(log.weight) : log.weight, 1);
  const waterDisp = log.water === undefined ? undefined : Math.round(OZ ? mlToOz(log.water) : log.water);

  const save = async () => {
    await saveLog(log);
    success();
    router.back();
  };

  return (
    <>
      <Stack.Screen options={{ title: `${formatPretty(date).toLowerCase()} ${date.slice(0, 4)}${date === today ? ' · today' : ''}`, headerRight: () => <Pressable onPress={save} hitSlop={10}><T weight="bold" color={t.accent}>save</T></Pressable> }} />
      <Screen padTop={false}>
        <Card tint={t.periodSoft}>
          <Label>period</Label>
          <Row>
            <Button title={inPeriod ? 'move start here' : 'period started'} style={{ flex: 1 }} onPress={async () => { await startPeriodOn(date); if (!log.flow) set('flow', 'medium'); success(); }} />
            {inPeriod && <Button title="period ended" variant="ghost" style={{ flex: 1 }} onPress={async () => { await endPeriodOn(date); success(); }} />}
          </Row>
          <Label>flow</Label>
          <Pick options={FLOWS} value={log.flow} onChange={(v) => set('flow', v)} color={t.period} />
        </Card>

        <Card>
          <Label>symptoms</Label>
          <Multi options={SYMPTOMS} value={log.symptoms} onChange={(v) => set('symptoms', v)} />
        </Card>

        <Card>
          <Label>mood</Label>
          <Multi options={MOODS} value={log.moods} onChange={(v) => set('moods', v)} color={t.fertile} />
          <Label>energy</Label>
          <ChipRow>
            {[1, 2, 3, 4, 5].map((n) => <Chip key={n} label={['drained', 'low', 'ok', 'good', 'buzzing'][n - 1]} selected={log.energy === n} onPress={() => set('energy', log.energy === n ? undefined : n)} />)}
          </ChipRow>
          <Label>sleep</Label>
          <NumField value={log.sleepHours} onChange={(v) => set('sleepHours', v)} initial={7.5} min={0} max={16} step={0.5} format={(n) => `${n}h`} />
        </Card>

        <Card>
          <Label>sex</Label>
          <Pick options={SEX} value={log.sex} onChange={(v) => set('sex', v)} />
          <Label>libido</Label>
          <Pick options={LEVELS} value={log.libido} onChange={(v) => set('libido', v)} />
          <Label>discharge</Label>
          <Pick options={DISCHARGE} value={log.discharge} onChange={(v) => set('discharge', v)} color={t.fertile} />
        </Card>

        <Card>
          <Label>ovulation (LH) test</Label>
          <Pick options={TESTS} value={log.ovulationTest} onChange={(v) => set('ovulationTest', v)} color={t.ovulation} />
          <Label>pregnancy test</Label>
          <Pick options={TESTS} value={log.pregnancyTest} onChange={(v) => set('pregnancyTest', v)} color={t.ovulation} />
        </Card>

        <Card>
          <Label>basal body temperature (°{settings.tempUnit})</Label>
          <NumField value={bbtDisp} initial={F ? 97.7 : 36.5} min={F ? 93 : 34} max={F ? 104 : 40} step={F ? 0.1 : 0.05}
            format={(n) => n.toFixed(2)} onChange={(v) => set('bbt', v === undefined ? undefined : round(F ? fToC(v) : v, 3))} />
          <T size={11} muted>take it right after waking, before getting up, at about the same time each day.</T>
          <Label>weight ({settings.weightUnit})</Label>
          <NumField value={wDisp} initial={LB ? 140 : 63} min={20} max={500} step={0.1} format={(n) => n.toFixed(1)}
            onChange={(v) => set('weight', v === undefined ? undefined : round(LB ? lbToKg(v) : v, 2))} />
          <Label>water ({settings.waterUnit})</Label>
          <NumField value={waterDisp} initial={OZ ? 64 : 1500} min={0} max={OZ ? 300 : 9000} step={OZ ? 8 : 250} format={(n) => `${n}`}
            onChange={(v) => set('water', v === undefined ? undefined : Math.round(OZ ? ozToMl(v) : v))} />
        </Card>

        <Card>
          <Label>pills & medication</Label>
          {settings.birthControl === 'pill' || settings.reminders.pill.enabled ? (
            <Chip label={log.pillTaken ? 'pill taken ✓' : 'took my pill'} selected={!!log.pillTaken} onPress={() => set('pillTaken', log.pillTaken ? undefined : true)} />
          ) : null}
          <ChipRow>
            {log.meds.map((m) => <Chip key={m} label={`${m} ×`} selected onPress={() => set('meds', log.meds.filter((x) => x !== m))} />)}
          </ChipRow>
          <Row>
            <View style={{ flex: 1 }}><Input value={medText} onChangeText={setMedText} placeholder="e.g. ibuprofen 200mg" returnKeyType="done"
              onSubmitEditing={() => { if (medText.trim()) { set('meds', [...log.meds, medText.trim()]); setMedText(''); } }} /></View>
            <Button title="add" variant="ghost" onPress={() => { if (medText.trim()) { set('meds', [...log.meds, medText.trim()]); setMedText(''); } }} />
          </Row>
        </Card>

        <Card>
          <Label>notes</Label>
          <Input value={log.notes ?? ''} onChangeText={(v) => set('notes', v || undefined)} placeholder="anything else…" multiline style={{ minHeight: 90, textAlignVertical: 'top' }} />
        </Card>

        <Button title="save" onPress={save} />
        <View style={{ height: space(2) }} />
      </Screen>
    </>
  );
}
