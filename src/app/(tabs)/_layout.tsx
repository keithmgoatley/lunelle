import React from 'react';
import { Redirect, Tabs } from 'expo-router';
import { useApp } from '../../state/AppContext';
import { font, useTheme } from '../../ui/theme';
import { T } from '../../ui/components';

const icon = (glyph: string) => ({ color }: { color: unknown }) => <T size={18} color={String(color)}>{glyph}</T>;

export default function TabsLayout() {
  const { settings } = useApp();
  const t = useTheme();
  if (!settings.onboarded) return <Redirect href="/onboarding" />;
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: t.accent,
        tabBarInactiveTintColor: t.muted,
        tabBarStyle: { backgroundColor: t.card, borderTopColor: t.border },
        tabBarLabelStyle: { fontFamily: font.medium, fontSize: 10 },
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'today', tabBarIcon: icon('◐') }} />
      <Tabs.Screen name="calendar" options={{ title: 'calendar', tabBarIcon: icon('▦') }} />
      <Tabs.Screen name="insights" options={{ title: 'insights', tabBarIcon: icon('◭') }} />
      <Tabs.Screen name="settings" options={{ title: 'settings', tabBarIcon: icon('⚙') }} />
    </Tabs>
  );
}
