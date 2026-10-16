/**
 * Home: cycle ring with day, phase, countdown and fertile window,
 * or the pregnancy tracker when pregnancy mode is on.
 */
import React from 'react';
import { View, useWindowDimensions } from 'react-native';
import { router } from 'expo-router';
import { useApp } from '../../state/AppContext';
import { Button, Card, Disclaimer, H1, Label, Row, Screen, T } from '../../ui/components';
import { CycleRing } from '../../ui/CycleRing';
import { PHASE_LABEL, space, useTheme } from '../../ui/theme';
import { diffDays, formatPretty } from '../../engine/dates';
import { pregnancyStatus } from '../../engine/pregnancy';
import { weekInfo } from '../../content/pregnancyWeeks';
import { PHASE_TIPS } from '../../content/phases';

export default function Home() {
  const { settings } = useApp();
  return settings.goal === 'pregnancy' ? <PregnancyHome /> : <CycleHome />;
}

function Greeting() {
  const { today } = useApp();
  const h = new Date().getHours();
  const hello = h < 12 ? 'good morning' : h < 18 ? 'good afternoon' : 'good evening';
  return (
    <View>
      <T muted size={12}>{formatPretty(today).toLowerCase()} · {today.slice(0, 4)}</T>
      <H1>{hello}</H1>
    </View>
  );
}

function CycleHome() {
  const { prediction: p, today, settings, logsByDate, startPeriodOn } = useApp();
  const t = useTheme();
  const { width } = useWindowDimensions();
  const ttc = settings.goal === 'ttc';
  const size = Math.min(width - 40, 340);

  if (!p.hasData || p.cycleDay === undefined) {
    return (
      <Screen>
        <Greeting />
        <Card>
          <T size={18} weight="bold">let’s get your first cycle in</T>
          <T muted>log the first day of your period, or add past cycles to start predictions.</T>
          <Button title="my period started today" onPress={() => startPeriodOn(today)} />
          <Button title="add past cycles" variant="ghost" onPress={() => router.push('/cycles')} />
        </Card>
        <Disclaimer />
      </Screen>
    );
  }

  const L = Math.round(p.avgCycleLength);
  const start = p.currentCycleStart!;
  const cur = p.upcoming[0];
  const periodDays = diffDays(cur.periodStart, cur.periodEnd) + 1;
  const fertileStartDay = diffDays(start, cur.fertileStart) + 1;
  const ovuDay = diffDays(start, cur.ovulation) + 1;
  const inFertile = !!p.fertileStart && today >= p.fertileStart && today <= p.fertileEnd!;
  const inPeriod = p.phase === 'menstrual';
  const days = p.daysUntilNextPeriod!;
  const headline = p.lateBy > 0
    ? `${p.lateBy} day${p.lateBy > 1 ? 's' : ''} late`
    : inPeriod
      ? `period day ${p.cycleDay}`
      : days === 0
        ? 'period may start today'
        : `period in ${days} day${days > 1 ? 's' : ''}`;
  const toFertile = p.fertileStart ? diffDays(today, p.fertileStart) : undefined;
  const chance = inFertile ? (today === p.ovulation ? 'peak' : 'high') : 'low';
  const todayLogged = logsByDate.has(today);

  return (
    <Screen>
      <Greeting />
      <View style={{ alignItems: 'center', marginVertical: space(2) }}>
        <CycleRing size={size} cycleLength={L} cycleDay={p.cycleDay} periodDays={periodDays} fertileStartDay={fertileStartDay} ovulationDay={ovuDay}>
          <T muted size={12} style={{ letterSpacing: 2 }}>CYCLE DAY</T>
          <T size={64} weight="extra" color={t.accent} style={{ lineHeight: 72 }}>{p.cycleDay}</T>
          <T weight="bold" size={15} center>{headline}</T>
          <View style={{ marginTop: 6, paddingHorizontal: 10, paddingVertical: 3, borderRadius: 999, backgroundColor: inFertile ? t.fertileSoft : t.periodSoft }}>
            <T size={11} weight="medium">{PHASE_LABEL[p.phase!].toLowerCase()} phase</T>
          </View>
        </CycleRing>
      </View>

      {ttc && (
        <Card tint={inFertile ? t.fertileSoft : undefined} delay={50}>
          <Label>chance of conceiving today</Label>
          <T size={26} weight="extra" color={inFertile ? t.ovulation : t.text}>{chance}</T>
          <T muted size={12}>
            {inFertile ? 'this is your estimated fertile window.' : toFertile !== undefined && toFertile > 0 ? `fertile window in ${toFertile} days.` : 'outside your estimated fertile window.'}
            {p.ovulationSource !== 'calendar' ? `  ovulation confirmed by ${p.ovulationSource === 'lh' ? 'an LH test' : 'your temperature shift'}.` : ''}
          </T>
        </Card>
      )}

      <Row style={{ alignItems: 'stretch' }}>
        <Card style={{ flex: 1 }} delay={100}>
          <Label>next period</Label>
          <T size={18} weight="bold">{formatPretty(p.nextPeriod!)}</T>
          <T muted size={11}>likely {formatPretty(p.nextPeriodEarliest!)} – {formatPretty(p.nextPeriodLatest!)}</T>
        </Card>
        <Card style={{ flex: 1 }} delay={150} tint={inFertile ? t.fertileSoft : undefined}>
          <Label>fertile window</Label>
          <T size={18} weight="bold">{formatPretty(p.fertileStart!)}–{formatPretty(p.fertileEnd!).split(' ')[0]}</T>
          <T muted size={11}>ovulation ~{formatPretty(p.ovulation!)}</T>
        </Card>
      </Row>

      <Card delay={200}>
        <Row style={{ justifyContent: 'space-between' }}>
          <View style={{ flex: 1 }}>
            <Label>today</Label>
            <T weight="bold">{todayLogged ? 'logged ✓ tap to edit' : 'how are you feeling?'}</T>
          </View>
          <Button title={todayLogged ? 'edit' : '+ log'} onPress={() => router.push(`/log/${today}`)} />
        </Row>
        {!inPeriod && (p.lateBy > 0 || (days <= 5 && days >= -1)) && (
          <Button title="my period started today" variant="ghost" onPress={() => startPeriodOn(today)} />
        )}
      </Card>

      <Card delay={250}>
        <Label>{PHASE_LABEL[p.phase!].toLowerCase()} phase</Label>
        <T size={13}>{PHASE_TIPS[p.phase!]}</T>
      </Card>

      {p.irregularity.irregular && (
        <Card delay={300} tint={t.cardAlt}>
          <Label>a gentle note</Label>
          <T size={13}>Your recent cycles look a little irregular: {p.irregularity.reasons.join('; ')}. Stress, travel, illness and hormonal changes can all do this. If it continues, or you have severe pain or very heavy bleeding, it’s worth checking in with a doctor.</T>
        </Card>
      )}
      <Disclaimer />
    </Screen>
  );
}

function PregnancyHome() {
  const { settings, today, updateSettings } = useApp();
  const t = useTheme();
  if (!settings.pregnancyLmp) {
    return (
      <Screen>
        <Greeting />
        <Card>
          <T size={18} weight="bold">set up pregnancy mode</T>
          <T muted>add the first day of your last period or your due date to see your week-by-week tracker.</T>
          <Button title="set dates" onPress={() => router.push('/pregnancy')} />
          <Button title="switch back to cycle tracking" variant="ghost" onPress={() => updateSettings({ goal: 'cycle' })} />
        </Card>
      </Screen>
    );
  }
  const s = pregnancyStatus(settings.pregnancyLmp, today);
  const info = weekInfo(s.week);
  const progress = Math.min(1, (s.week * 7 + s.day) / 280);
  return (
    <Screen>
      <Greeting />
      <Card tint={t.cardAlt}>
        <Label>you are</Label>
        <T size={44} weight="extra" color={t.accent} style={{ lineHeight: 52 }}>{s.week}w {s.day}d</T>
        <T muted>trimester {s.trimester} · due {formatPretty(s.dueDate)} {s.dueDate.slice(0, 4)}</T>
        <View style={{ height: 10, backgroundColor: t.border, borderRadius: 5, overflow: 'hidden' }}>
          <View style={{ width: `${progress * 100}%`, height: '100%', backgroundColor: t.accent, borderRadius: 5 }} />
        </View>
        <T size={12} muted>{s.daysToGo > 0 ? `${s.daysToGo} days to go` : 'any day now'}</T>
      </Card>
      <Card delay={100}>
        <Label>this week · about the size of {info.size}</Label>
        <T weight="bold">baby</T>
        <T size={13}>{info.baby}</T>
        <T weight="bold">you</T>
        <T size={13}>{info.you}</T>
      </Card>
      <Button title="week by week & settings" variant="ghost" onPress={() => router.push('/pregnancy')} />
      <Button title={`+ log today`} onPress={() => router.push(`/log/${today}`)} />
      <T size={11} muted center>This is general information, not medical advice. Follow your midwife or doctor’s guidance, and seek care urgently for bleeding, severe pain, severe headaches, reduced baby movements or fluid leaking.</T>
    </Screen>
  );
}
