/**
 * Month calendar grid used by the Calendar tab and the date picker.
 * Rendering of each day is customisable via `decorate`.
 */
import React, { useState } from 'react';
import { Pressable, View, Modal } from 'react-native';
import { T, Row, tap, Button } from './components';
import { radius, space, useTheme } from './theme';
import { isoFromParts, monthDays, parseISO, formatPretty } from '../engine/dates';

export interface DayDecoration {
  bg?: string;
  border?: string;
  dashed?: boolean;
  textColor?: string;
  dot?: string;
  bold?: boolean;
}

const WEEKDAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

export function MonthGrid({ year, month0, onPrev, onNext, onSelect, decorate, selected, today, maxDate }: {
  year: number;
  month0: number;
  onPrev: () => void;
  onNext: () => void;
  onSelect: (iso: string) => void;
  decorate?: (iso: string) => DayDecoration;
  selected?: string;
  today: string;
  maxDate?: string;
}) {
  const t = useTheme();
  const first = new Date(Date.UTC(year, month0, 1)).getUTCDay(); // 0 = Sun
  const offset = (first + 6) % 7; // Monday-first
  const n = monthDays(year, month0);
  const cells: (string | null)[] = [...Array(offset).fill(null), ...Array.from({ length: n }, (_, i) => isoFromParts(year, month0, i + 1))];
  while (cells.length % 7) cells.push(null);
  const title = new Date(Date.UTC(year, month0, 1)).toLocaleDateString(undefined, { month: 'long', year: 'numeric', timeZone: 'UTC' });

  const navBtn = (label: string, fn: () => void) => (
    <Pressable onPress={() => { tap(); fn(); }} hitSlop={12} style={{ width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: t.cardAlt }}>
      <T weight="bold" color={t.accent}>{label}</T>
    </Pressable>
  );

  return (
    <View style={{ gap: space(3) }}>
      <Row style={{ justifyContent: 'space-between' }}>
        {navBtn('‹', onPrev)}
        <T weight="bold" size={16}>{title.toLowerCase()}</T>
        {navBtn('›', onNext)}
      </Row>
      <View style={{ flexDirection: 'row' }}>
        {WEEKDAYS.map((d, i) => (
          <T key={i} size={11} muted center style={{ flex: 1 }}>{d}</T>
        ))}
      </View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
        {cells.map((iso, i) => {
          if (!iso) return <View key={i} style={{ width: `${100 / 7}%`, aspectRatio: 1 }} />;
          const dec = decorate?.(iso) ?? {};
          const isToday = iso === today;
          const isSel = iso === selected;
          const disabled = !!maxDate && iso > maxDate;
          return (
            <Pressable
              key={iso}
              disabled={disabled}
              onPress={() => { tap(); onSelect(iso); }}
              style={{ width: `${100 / 7}%`, aspectRatio: 1, padding: 3, opacity: disabled ? 0.3 : 1 }}
            >
              {({ pressed }) => (
                <View
                  style={{
                    flex: 1,
                    borderRadius: radius.pill,
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: isSel ? t.accent : dec.bg ?? 'transparent',
                    borderWidth: isToday || dec.border ? 2 : 0,
                    borderColor: isToday ? t.accent : dec.border,
                    borderStyle: dec.dashed ? 'dashed' : 'solid',
                    transform: [{ scale: pressed ? 0.9 : 1 }],
                  }}
                >
                  <T size={13} weight={isToday || dec.bold ? 'bold' : 'regular'} color={isSel ? t.onAccent : dec.textColor}>
                    {parseISO(iso) ? Number(iso.slice(8)) : ''}
                  </T>
                  {dec.dot ? <View style={{ position: 'absolute', bottom: 4, width: 4, height: 4, borderRadius: 2, backgroundColor: isSel ? t.onAccent : dec.dot }} /> : null}
                </View>
              )}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

/** Stateful month navigation helper. */
export function useMonth(initialIso: string) {
  const [ym, setYm] = useState({ y: Number(initialIso.slice(0, 4)), m: Number(initialIso.slice(5, 7)) - 1 });
  return {
    year: ym.y,
    month0: ym.m,
    prev: () => setYm(({ y, m }) => (m === 0 ? { y: y - 1, m: 11 } : { y, m: m - 1 })),
    next: () => setYm(({ y, m }) => (m === 11 ? { y: y + 1, m: 0 } : { y, m: m + 1 })),
    jump: (iso: string) => setYm({ y: Number(iso.slice(0, 4)), m: Number(iso.slice(5, 7)) - 1 }),
  };
}

/** A tappable field that opens a modal month picker. */
export function DateField({ value, onChange, today, maxDate, placeholder = 'pick a date' }: {
  value?: string; onChange: (iso: string) => void; today: string; maxDate?: string; placeholder?: string;
}) {
  const t = useTheme();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(value);
  const nav = useMonth(value ?? today);
  return (
    <>
      <Pressable
        onPress={() => { tap(); setDraft(value); nav.jump(value ?? today); setOpen(true); }}
        style={{ backgroundColor: t.cardAlt, borderRadius: radius.md, paddingVertical: space(3), paddingHorizontal: space(4), borderWidth: 1, borderColor: t.border }}
      >
        <T weight="medium" color={value ? t.text : t.muted}>{value ? formatPretty(value) + ' ' + value.slice(0, 4) : placeholder}</T>
      </Pressable>
      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <View style={{ flex: 1, backgroundColor: '#0008', justifyContent: 'center', padding: space(5) }}>
          <View style={{ backgroundColor: t.card, borderRadius: radius.lg, padding: space(5), gap: space(4) }}>
            <MonthGrid year={nav.year} month0={nav.month0} onPrev={nav.prev} onNext={nav.next} onSelect={setDraft} selected={draft} today={today} maxDate={maxDate} />
            <Row style={{ justifyContent: 'flex-end' }}>
              <Button title="cancel" variant="ghost" onPress={() => setOpen(false)} />
              <Button title="done" disabled={!draft} onPress={() => { if (draft) onChange(draft); setOpen(false); }} />
            </Row>
          </View>
        </View>
      </Modal>
    </>
  );
}
