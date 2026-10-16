/**
 * Shared UI primitives: monospace text, cards, chips, buttons, sections.
 */
import React from 'react';
import {
  Pressable, ScrollView, StyleProp, StyleSheet, Text, TextInput, TextInputProps, TextProps, TextStyle, View, ViewStyle,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { font, radius, space, useTheme } from './theme';

export const tap = () => Haptics.selectionAsync().catch(() => {});
export const success = () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});

type TProps = TextProps & {
  size?: number;
  weight?: keyof typeof font;
  color?: string;
  muted?: boolean;
  center?: boolean;
};

/** Monospace text. Use this instead of <Text> everywhere. */
export function T({ size = 14, weight = 'regular', color, muted, center, style, ...rest }: TProps) {
  const t = useTheme();
  return (
    <Text
      {...rest}
      style={[
        { fontFamily: font[weight], fontSize: size, color: color ?? (muted ? t.muted : t.text), lineHeight: size * 1.45 },
        center && { textAlign: 'center' },
        style,
      ]}
    />
  );
}

export function Screen({ children, scroll = true, padTop = true }: { children: React.ReactNode; scroll?: boolean; padTop?: boolean }) {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const content = (
    <View style={{ paddingHorizontal: space(5), paddingTop: padTop ? insets.top + space(3) : space(3), paddingBottom: insets.bottom + space(24), gap: space(4) }}>
      {children}
    </View>
  );
  return (
    <LinearGradient colors={t.bgGradient} style={{ flex: 1 }}>
      {scroll ? <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>{content}</ScrollView> : content}
    </LinearGradient>
  );
}

export function Card({ children, style, delay = 0, tint }: { children: React.ReactNode; style?: StyleProp<ViewStyle>; delay?: number; tint?: string }) {
  const t = useTheme();
  return (
    <Animated.View
      entering={FadeInDown.delay(delay).springify().damping(18)}
      style={[
        {
          backgroundColor: tint ?? t.card,
          borderRadius: radius.lg,
          padding: space(5),
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: t.border,
          shadowColor: '#C2185B',
          shadowOpacity: t.dark ? 0 : 0.06,
          shadowRadius: 18,
          shadowOffset: { width: 0, height: 8 },
          gap: space(3),
        },
        style,
      ]}
    >
      {children}
    </Animated.View>
  );
}

export function H1({ children }: { children: React.ReactNode }) {
  return <T size={28} weight="extra" style={{ letterSpacing: -1 }}>{children}</T>;
}

export function Label({ children }: { children: React.ReactNode }) {
  return <T size={11} weight="bold" muted style={{ letterSpacing: 1.5, textTransform: 'uppercase' }}>{children}</T>;
}

export function Chip({ label, selected, onPress, color }: { label: string; selected?: boolean; onPress?: () => void; color?: string }) {
  const t = useTheme();
  const c = color ?? t.accent;
  return (
    <Pressable
      onPress={() => { tap(); onPress?.(); }}
      style={({ pressed }) => ({
        paddingVertical: space(2),
        paddingHorizontal: space(3.5),
        borderRadius: radius.pill,
        backgroundColor: selected ? c : t.cardAlt,
        borderWidth: 1,
        borderColor: selected ? c : t.border,
        transform: [{ scale: pressed ? 0.96 : 1 }],
      })}
    >
      <T size={12} weight="medium" color={selected ? t.onAccent : t.text}>{label}</T>
    </Pressable>
  );
}

export function ChipRow({ children }: { children: React.ReactNode }) {
  return <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space(2) }}>{children}</View>;
}

export function Button({ title, onPress, variant = 'primary', disabled, style }: {
  title: string; onPress: () => void; variant?: 'primary' | 'ghost' | 'danger'; disabled?: boolean; style?: StyleProp<ViewStyle>;
}) {
  const t = useTheme();
  const bg = variant === 'primary' ? t.accent : variant === 'danger' ? '#D93A57' : 'transparent';
  const fg = variant === 'ghost' ? t.accent : '#fff';
  return (
    <Pressable
      disabled={disabled}
      onPress={() => { tap(); onPress(); }}
      style={({ pressed }) => [{
        backgroundColor: bg,
        borderRadius: radius.pill,
        paddingVertical: space(3.5),
        paddingHorizontal: space(5),
        alignItems: 'center',
        borderWidth: variant === 'ghost' ? 1.5 : 0,
        borderColor: t.accent,
        opacity: disabled ? 0.4 : pressed ? 0.85 : 1,
        transform: [{ scale: pressed ? 0.98 : 1 }],
      }, style]}
    >
      <T weight="bold" color={fg}>{title}</T>
    </Pressable>
  );
}

export function Row({ children, style }: { children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[{ flexDirection: 'row', alignItems: 'center', gap: space(3) }, style]}>{children}</View>;
}

export function ListItem({ title, subtitle, right, onPress }: { title: string; subtitle?: string; right?: React.ReactNode; onPress?: () => void }) {
  const t = useTheme();
  return (
    <Pressable onPress={onPress ? () => { tap(); onPress(); } : undefined} style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1, flexDirection: 'row', alignItems: 'center', paddingVertical: space(2.5), gap: space(3) })}>
      <View style={{ flex: 1 }}>
        <T weight="medium">{title}</T>
        {subtitle ? <T size={12} muted>{subtitle}</T> : null}
      </View>
      {right ?? (onPress ? <T color={t.muted}>›</T> : null)}
    </Pressable>
  );
}

export function Input(props: TextInputProps & { style?: StyleProp<TextStyle> }) {
  const t = useTheme();
  return (
    <TextInput
      placeholderTextColor={t.muted}
      {...props}
      style={[{
        fontFamily: font.regular, fontSize: 15, color: t.text, backgroundColor: t.cardAlt,
        borderRadius: radius.md, paddingHorizontal: space(4), paddingVertical: space(3), borderWidth: 1, borderColor: t.border,
      }, props.style]}
    />
  );
}

/** −/+ numeric stepper. */
export function Stepper({ value, onChange, min, max, step = 1, format }: {
  value: number; onChange: (n: number) => void; min: number; max: number; step?: number; format?: (n: number) => string;
}) {
  const t = useTheme();
  const btn = (label: string, delta: number) => (
    <Pressable
      onPress={() => { tap(); onChange(Math.min(max, Math.max(min, Math.round((value + delta) * 100) / 100))); }}
      style={({ pressed }) => ({ width: 40, height: 40, borderRadius: 20, backgroundColor: pressed ? t.lilac : t.cardAlt, alignItems: 'center', justifyContent: 'center' })}
    >
      <T size={18} weight="bold" color={t.accent}>{label}</T>
    </Pressable>
  );
  return (
    <Row>
      {btn('−', -step)}
      <T size={18} weight="bold" style={{ minWidth: 70, textAlign: 'center' }}>{format ? format(value) : value}</T>
      {btn('+', step)}
    </Row>
  );
}

export function Disclaimer() {
  return (
    <T size={11} muted center style={{ paddingHorizontal: space(2) }}>
      Predictions are estimates, not medical advice, and must never be used as contraception.
    </T>
  );
}

export function Legend({ items }: { items: { color: string; label: string; outline?: boolean }[] }) {
  return (
    <ChipRow>
      {items.map((i) => (
        <Row key={i.label} style={{ gap: space(1.5) }}>
          <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: i.outline ? 'transparent' : i.color, borderWidth: 1.5, borderColor: i.color, borderStyle: i.outline ? 'dashed' : 'solid' }} />
          <T size={11} muted>{i.label}</T>
        </Row>
      ))}
    </ChipRow>
  );
}
