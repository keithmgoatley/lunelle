/**
 * Four-step onboarding: last period → cycle & period length → goal → birth control.
 */
import React, { useState } from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import Animated, { FadeInRight, FadeOutLeft } from 'react-native-reanimated';
import { useApp } from '../state/AppContext';
import { Button, Card, Chip, ChipRow, Disclaimer, H1, Label, Row, Screen, Stepper, T, success } from '../ui/components';
import { DateField } from '../ui/MonthGrid';
import { addDays } from '../engine/dates';
import { BIRTH_CONTROL, Goal } from '../domain/types';
import { space, useTheme } from '../ui/theme';

const GOALS: { key: Goal; title: string; sub: string }[] = [
  { key: 'cycle', title: 'track my cycle', sub: 'periods, symptoms, patterns' },
  { key: 'ttc', title: 'trying to conceive', sub: 'fertile window & ovulation focus' },
  { key: 'pregnancy', title: 'i’m pregnant', sub: 'week-by-week companion' },
];

export default function Onboarding() {
  const { today, updateSettings, addPeriod } = useApp();
  const t = useTheme();
  const [step, setStep] = useState(0);
  const [lastPeriod, setLastPeriod] = useState<string>();
  const [unknown, setUnknown] = useState(false);
  const [cycleLength, setCycleLength] = useState(28);
  const [periodLength, setPeriodLength] = useState(5);
  const [goal, setGoal] = useState<Goal>('cycle');
  const [birthControl, setBirthControl] = useState('none');

  const finish = async () => {
    if (lastPeriod) await addPeriod({ start: lastPeriod, end: addDays(lastPeriod, periodLength - 1), source: 'onboarding' });
    await updateSettings({
      onboarded: true, cycleLength, periodLength, goal, birthControl,
      pregnancyLmp: goal === 'pregnancy' ? lastPeriod : undefined,
    });
    success();
    router.replace('/');
  };

  const steps = [
    <Card key="0">
      <Label>step 1 of 4</Label>
      <T size={20} weight="bold">when did your last period start?</T>
      <DateField value={lastPeriod} onChange={(d) => { setLastPeriod(d); setUnknown(false); }} today={today} maxDate={today} />
      <Chip label="i don’t remember" selected={unknown} onPress={() => { setUnknown(!unknown); setLastPeriod(undefined); }} />
      <Button title="next" disabled={!lastPeriod && !unknown} onPress={() => setStep(1)} />
    </Card>,
    <Card key="1">
      <Label>step 2 of 4</Label>
      <T size={20} weight="bold">your typical rhythm</T>
      <T muted size={12}>not sure? keep the defaults, lunelle learns from what you log.</T>
      <Row style={{ justifyContent: 'space-between' }}><T>cycle length</T><Stepper value={cycleLength} onChange={setCycleLength} min={18} max={60} format={(n) => `${n}d`} /></Row>
      <Row style={{ justifyContent: 'space-between' }}><T>period length</T><Stepper value={periodLength} onChange={setPeriodLength} min={2} max={10} format={(n) => `${n}d`} /></Row>
      <Button title="next" onPress={() => setStep(2)} />
    </Card>,
    <Card key="2">
      <Label>step 3 of 4</Label>
      <T size={20} weight="bold">what brings you here?</T>
      {GOALS.map((g) => (
        <Chip key={g.key} label={`${g.title} · ${g.sub}`} selected={goal === g.key} onPress={() => setGoal(g.key)} />
      ))}
      <Button title="next" onPress={() => setStep(3)} />
    </Card>,
    <Card key="3">
      <Label>step 4 of 4</Label>
      <T size={20} weight="bold">birth control</T>
      <T muted size={12}>hormonal methods can change bleeding patterns. this only helps you read your data.</T>
      <ChipRow>{BIRTH_CONTROL.map((b) => <Chip key={b} label={b} selected={birthControl === b} onPress={() => setBirthControl(b)} />)}</ChipRow>
      <Button title="start tracking" onPress={finish} />
    </Card>,
  ];

  return (
    <Screen>
      <View style={{ gap: space(2), marginTop: space(6) }}>
        <T size={40}>◐</T>
        <H1>lunelle</H1>
        <T muted>a private cycle companion. everything stays encrypted on this phone.</T>
      </View>
      <Row>
        {[0, 1, 2, 3].map((i) => (
          <View key={i} style={{ flex: 1, height: 4, borderRadius: 2, backgroundColor: i <= step ? t.accent : t.border }} />
        ))}
      </Row>
      <Animated.View key={step} entering={FadeInRight.springify().damping(18)} exiting={FadeOutLeft}>
        {steps[step]}
      </Animated.View>
      {step > 0 && <Button title="back" variant="ghost" onPress={() => setStep(step - 1)} />}
      <Disclaimer />
    </Screen>
  );
}
