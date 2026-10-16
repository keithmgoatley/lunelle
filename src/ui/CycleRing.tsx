/**
 * The big home-screen ring. One full turn = one (predicted) cycle.
 * Arcs show the period and fertile window; a glowing marker shows today.
 */
import React, { useEffect } from 'react';
import { View } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Path, Stop } from 'react-native-svg';
import Animated, { useAnimatedStyle, useSharedValue, withRepeat, withSequence, withTiming, withSpring } from 'react-native-reanimated';
import { useTheme } from './theme';

function polar(cx: number, cy: number, r: number, angle: number) {
  const a = ((angle - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) };
}

function arc(cx: number, cy: number, r: number, from: number, to: number) {
  const span = Math.min(359.99, Math.max(0.01, to - from));
  const s = polar(cx, cy, r, from);
  const e = polar(cx, cy, r, from + span);
  return `M ${s.x} ${s.y} A ${r} ${r} 0 ${span > 180 ? 1 : 0} 1 ${e.x} ${e.y}`;
}

export interface RingProps {
  size: number;
  cycleLength: number;
  cycleDay: number;
  periodDays: number;
  fertileStartDay?: number;
  ovulationDay?: number;
  children?: React.ReactNode;
}

export function CycleRing({ size, cycleLength, cycleDay, periodDays, fertileStartDay, ovulationDay, children }: RingProps) {
  const t = useTheme();
  const stroke = 22;
  const r = size / 2 - stroke;
  const c = size / 2;
  const L = Math.max(cycleLength, cycleDay);
  const deg = (day: number) => ((day - 1) / L) * 360;
  const pos = polar(c, c, r, deg(Math.min(cycleDay, L)) + 360 / L / 2);

  // Gentle breathing for the today-marker and a spring-in for the ring.
  const pulse = useSharedValue(1);
  const scale = useSharedValue(0.85);
  useEffect(() => {
    scale.value = withSpring(1, { damping: 14 });
    pulse.value = withRepeat(withSequence(withTiming(1.25, { duration: 1100 }), withTiming(1, { duration: 1100 })), -1);
  }, []);
  const ringStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  const pulseStyle = useAnimatedStyle(() => ({ transform: [{ scale: pulse.value }] }));

  return (
    <Animated.View style={[{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }, ringStyle]}>
      <Svg width={size} height={size} style={{ position: 'absolute' }}>
        <Defs>
          <LinearGradient id="track" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={t.blush} />
            <Stop offset="1" stopColor={t.lilac} />
          </LinearGradient>
          <LinearGradient id="per" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={t.accent} />
            <Stop offset="1" stopColor={t.period} />
          </LinearGradient>
        </Defs>
        <Circle cx={c} cy={c} r={r} stroke="url(#track)" strokeWidth={stroke} fill="none" opacity={0.7} />
        {/* Day ticks */}
        {Array.from({ length: L }, (_, i) => {
          const p1 = polar(c, c, r - stroke / 2 - 6, deg(i + 1));
          return <Circle key={i} cx={p1.x} cy={p1.y} r={1.3} fill={t.muted} opacity={0.35} />;
        })}
        <Path d={arc(c, c, r, deg(1), deg(periodDays + 1))} stroke="url(#per)" strokeWidth={stroke} strokeLinecap="round" fill="none" />
        {fertileStartDay !== undefined && ovulationDay !== undefined && fertileStartDay > 0 && (
          <Path d={arc(c, c, r, deg(fertileStartDay), deg(ovulationDay + 1))} stroke={t.fertile} strokeWidth={stroke} strokeLinecap="round" fill="none" />
        )}
        {ovulationDay !== undefined && ovulationDay > 0 && ovulationDay <= L && (() => {
          const o = polar(c, c, r, deg(ovulationDay) + 360 / L / 2);
          return <Circle cx={o.x} cy={o.y} r={6} fill={t.card} stroke={t.ovulation} strokeWidth={3} />;
        })()}
      </Svg>
      <Animated.View
        style={[
          { position: 'absolute', left: pos.x - 16, top: pos.y - 16, width: 32, height: 32, borderRadius: 16, backgroundColor: t.accent, opacity: 0.25 },
          pulseStyle,
        ]}
      />
      <View style={{ position: 'absolute', left: pos.x - 10, top: pos.y - 10, width: 20, height: 20, borderRadius: 10, backgroundColor: t.card, borderWidth: 4, borderColor: t.accent }} />
      <View style={{ alignItems: 'center', paddingHorizontal: stroke * 2 }}>{children}</View>
    </Animated.View>
  );
}
