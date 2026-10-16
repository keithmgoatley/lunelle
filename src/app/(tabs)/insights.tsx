/**
 * Insights: cycle & period length history, personal patterns,
 * symptoms by phase, mood trend and BBT chart.
 */
import React, { useMemo } from 'react';
import { View } from 'react-native';
import { useApp } from '../../state/AppContext';
import { Card, H1, Label, Row, Screen, T } from '../../ui/components';
import { BarChart, LineChart } from '../../ui/Charts';
import { PHASE_LABEL, space, useTheme } from '../../ui/theme';
import { findPatterns, moodSeries, symptomsByPhase } from '../../engine/patterns';
import { formatPretty } from '../../engine/dates';
import { cToF } from '../../features/units';
import type { Phase } from '../../engine/predict';

const short = (iso: string) => formatPretty(iso).split(' ').reverse().join(' ').toLowerCase();

export default function Insights() {
  const { prediction: p, logs, settings } = useApp();
  const t = useTheme();

  const completed = p.cycles.filter((c) => c.length !== undefined).slice(-12);
  const patterns = useMemo(() => findPatterns(p.cycles, logs), [p.cycles, logs]);
  const byPhase = useMemo(() => symptomsByPhase(p.cycles, logs, settings.lutealLength), [p.cycles, logs, settings.lutealLength]);
  const moods = useMemo(() => moodSeries(logs).slice(-45), [logs]);

  // BBT for the current cycle (fallback: last 40 readings).
  const bbt = useMemo(() => {
    const all = logs.filter((l) => l.bbt !== undefined);
    const cur = p.currentCycleStart ? all.filter((l) => l.date >= p.currentCycleStart!) : [];
    return (cur.length >= 2 ? cur : all.slice(-40)).map((l) => ({
      date: l.date, label: short(l.date), value: settings.tempUnit === 'F' ? cToF(l.bbt!) : l.bbt!,
    }));
  }, [logs, p.currentCycleStart, settings.tempUnit]);
  const ovuIdx = p.ovulationSource === 'bbt' && p.currentOvulation ? bbt.findIndex((b) => b.date > p.currentOvulation!) : undefined;

  return (
    <Screen>
      <H1>insights</H1>

      <Row style={{ alignItems: 'stretch' }}>
        <Card style={{ flex: 1 }}>
          <Label>avg cycle</Label>
          <T size={26} weight="extra" color={t.accent}>{p.avgCycleLength.toFixed(0)}d</T>
          <T size={11} muted>±{p.sd}d variation</T>
        </Card>
        <Card style={{ flex: 1 }} delay={50}>
          <Label>avg period</Label>
          <T size={26} weight="extra" color={t.period}>{p.avgPeriodLength}d</T>
          <T size={11} muted>{p.cycles.length} cycles logged</T>
        </Card>
      </Row>

      {p.irregularity.irregular && (
        <Card tint={t.cardAlt}>
          <Label>cycle regularity</Label>
          <T size={13}>We noticed {p.irregularity.reasons.join('; ')}. Some variation is completely normal. If irregularity is new, persistent or comes with other symptoms, consider speaking with a doctor.</T>
        </Card>
      )}

      <Card delay={100}>
        <Label>cycle length history</Label>
        <BarChart data={completed.map((c) => ({ label: short(c.start), value: c.length! }))} refLine={p.avgCycleLength} refLabel="avg" />
      </Card>

      <Card delay={150}>
        <Label>period length</Label>
        <BarChart height={130} color={t.period} data={p.cycles.slice(-12).map((c) => ({ label: short(c.start), value: c.periodLength }))} />
      </Card>

      <Card delay={200}>
        <Label>your patterns</Label>
        {patterns.length ? (
          patterns.slice(0, 6).map((pt) => (
            <Row key={pt.symptom} style={{ alignItems: 'flex-start' }}>
              <T color={t.accent}>✦</T>
              <View style={{ flex: 1 }}>
                <T size={13}>{pt.message}</T>
                <T size={11} muted>in {Math.round(pt.share * 100)}% of your logged cycles</T>
              </View>
            </Row>
          ))
        ) : (
          <T size={12} muted>Log symptoms across at least two full cycles and Lunelle will point out repeating patterns here.</T>
        )}
      </Card>

      <Card delay={250}>
        <Label>symptoms by phase</Label>
        {(Object.keys(byPhase) as Phase[]).map((ph) => {
          const top = Object.entries(byPhase[ph]).sort((a, b) => b[1] - a[1]).slice(0, 4);
          const max = Math.max(1, ...top.map((x) => x[1]));
          return (
            <View key={ph} style={{ gap: 4, marginBottom: space(2) }}>
              <T weight="bold" size={12}>{PHASE_LABEL[ph].toLowerCase()}</T>
              {top.length ? top.map(([s, n]) => (
                <Row key={s} style={{ gap: 8 }}>
                  <T size={11} style={{ width: 110 }}>{s}</T>
                  <View style={{ flex: 1, height: 8, borderRadius: 4, backgroundColor: t.cardAlt }}>
                    <View style={{ width: `${(n / max) * 100}%`, height: 8, borderRadius: 4, backgroundColor: ph === 'menstrual' ? t.period : ph === 'ovulatory' ? t.fertile : t.accent }} />
                  </View>
                  <T size={11} muted>{n}</T>
                </Row>
              )) : <T size={11} muted>—</T>}
            </View>
          );
        })}
      </Card>

      <Card delay={300}>
        <Label>mood trend</Label>
        <LineChart data={moods.map((m) => ({ label: short(m.date), value: m.score }))} color={t.fertile} minSpan={4}
          yFormat={(n) => (n >= 1 ? 'up' : n <= -1 ? 'low' : 'mid')} />
      </Card>

      <Card delay={350}>
        <Label>basal body temperature (°{settings.tempUnit})</Label>
        <LineChart data={bbt} color={t.accent} markerIndex={ovuIdx} yFormat={(n) => n.toFixed(2)} minSpan={settings.tempUnit === 'F' ? 1 : 0.5} />
        {p.ovulationSource === 'bbt' && <T size={11} muted>dashed line: temperature shift detected, ovulation estimated {formatPretty(p.currentOvulation!)}</T>}
      </Card>
      <T size={11} muted center>Insights are based only on what you log. For severe or unusual symptoms, please see a doctor.</T>
    </Screen>
  );
}
