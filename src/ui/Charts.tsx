/**
 * Lightweight SVG charts (no third-party chart library, works in Expo Go).
 */
import React, { useState } from 'react';
import { View, LayoutChangeEvent } from 'react-native';
import Svg, { Line, Path, Rect, Circle, Text as SvgText } from 'react-native-svg';
import { font, useTheme } from './theme';
import { T } from './components';

function useWidth(): [number, (e: LayoutChangeEvent) => void] {
  const [w, setW] = useState(0);
  return [w, (e) => setW(e.nativeEvent.layout.width)];
}

/** Vertical bars with value labels and an optional reference line. */
export function BarChart({ data, height = 160, color, refLine, refLabel }: {
  data: { label: string; value: number }[]; height?: number; color?: string; refLine?: number; refLabel?: string;
}) {
  const t = useTheme();
  const [w, onLayout] = useWidth();
  if (!data.length) return <T muted size={12}>Not enough data yet.</T>;
  const max = Math.max(...data.map((d) => d.value), refLine ?? 0) * 1.15;
  const padB = 18;
  const gap = 6;
  const bw = w ? Math.min(28, (w - gap * data.length) / data.length) : 0;
  const totalW = data.length * (bw + gap);
  const x0 = Math.max(0, (w - totalW) / 2);
  const y = (v: number) => (height - padB) * (1 - v / max);
  return (
    <View onLayout={onLayout} style={{ height }}>
      {w > 0 && (
        <Svg width={w} height={height}>
          {refLine !== undefined && (
            <>
              <Line x1={0} x2={w} y1={y(refLine)} y2={y(refLine)} stroke={t.muted} strokeDasharray="4 4" strokeWidth={1} />
              <SvgText x={w - 2} y={y(refLine) - 4} fontSize={9} fill={t.muted} textAnchor="end" fontFamily={font.regular}>{refLabel}</SvgText>
            </>
          )}
          {data.map((d, i) => {
            const x = x0 + i * (bw + gap);
            return (
              <React.Fragment key={i}>
                <Rect x={x} y={y(d.value)} width={bw} height={height - padB - y(d.value)} rx={bw / 2.5} fill={color ?? t.accent} opacity={0.35 + (0.65 * (i + 1)) / data.length} />
                <SvgText x={x + bw / 2} y={y(d.value) - 4} fontSize={9} fill={t.text} textAnchor="middle" fontFamily={font.bold}>{d.value}</SvgText>
                <SvgText x={x + bw / 2} y={height - 4} fontSize={8} fill={t.muted} textAnchor="middle" fontFamily={font.regular}>{d.label}</SvgText>
              </React.Fragment>
            );
          })}
        </Svg>
      )}
    </View>
  );
}

/** Line chart with dots; optional vertical marker (e.g. detected ovulation). */
export function LineChart({ data, height = 170, color, yFormat, markerIndex, minSpan = 0.5 }: {
  data: { label: string; value: number }[]; height?: number; color?: string; yFormat?: (n: number) => string; markerIndex?: number; minSpan?: number;
}) {
  const t = useTheme();
  const [w, onLayout] = useWidth();
  if (data.length < 2) return <T muted size={12}>Log at least two days to see this chart.</T>;
  const vals = data.map((d) => d.value);
  let lo = Math.min(...vals);
  let hi = Math.max(...vals);
  if (hi - lo < minSpan) { const m = (hi + lo) / 2; lo = m - minSpan / 2; hi = m + minSpan / 2; }
  const pad = { l: 40, r: 8, t: 10, b: 18 };
  const X = (i: number) => pad.l + (i / (data.length - 1)) * (w - pad.l - pad.r);
  const Y = (v: number) => pad.t + (1 - (v - lo) / (hi - lo)) * (height - pad.t - pad.b);
  const d = data.map((p, i) => `${i ? 'L' : 'M'} ${X(i)} ${Y(p.value)}`).join(' ');
  const c = color ?? t.accent;
  const fmt = yFormat ?? ((n: number) => n.toFixed(1));
  return (
    <View onLayout={onLayout} style={{ height }}>
      {w > 0 && (
        <Svg width={w} height={height}>
          {[lo, (lo + hi) / 2, hi].map((v, i) => (
            <React.Fragment key={i}>
              <Line x1={pad.l} x2={w - pad.r} y1={Y(v)} y2={Y(v)} stroke={t.border} strokeWidth={1} />
              <SvgText x={pad.l - 4} y={Y(v) + 3} fontSize={9} fill={t.muted} textAnchor="end" fontFamily={font.regular}>{fmt(v)}</SvgText>
            </React.Fragment>
          ))}
          {markerIndex !== undefined && markerIndex >= 0 && (
            <Line x1={X(markerIndex)} x2={X(markerIndex)} y1={pad.t} y2={height - pad.b} stroke={t.ovulation} strokeDasharray="3 3" strokeWidth={1.5} />
          )}
          <Path d={d} stroke={c} strokeWidth={2.5} fill="none" strokeLinejoin="round" strokeLinecap="round" />
          {data.map((p, i) => <Circle key={i} cx={X(i)} cy={Y(p.value)} r={3} fill={t.card} stroke={c} strokeWidth={2} />)}
          {[0, data.length - 1].map((i) => (
            <SvgText key={i} x={X(i)} y={height - 4} fontSize={8} fill={t.muted} textAnchor={i ? 'end' : 'start'} fontFamily={font.regular}>{data[i].label}</SvgText>
          ))}
        </Svg>
      )}
    </View>
  );
}
