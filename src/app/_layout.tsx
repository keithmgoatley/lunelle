/**
 * Root layout: loads fonts, opens the encrypted store, applies the theme and
 * puts the app-lock gate in front of everything.
 */
import React, { useEffect, useRef, useState } from 'react';
import { AppState, View, ActivityIndicator } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import * as LocalAuthentication from 'expo-local-authentication';
import { useFonts, JetBrainsMono_400Regular, JetBrainsMono_500Medium, JetBrainsMono_700Bold, JetBrainsMono_800ExtraBold } from '@expo-google-fonts/jetbrains-mono';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AppProvider, useApp } from '../state/AppContext';
import { useTheme, font } from '../ui/theme';
import { Button, T } from '../ui/components';

SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  const [fontsLoaded] = useFonts({ JetBrainsMono_400Regular, JetBrainsMono_500Medium, JetBrainsMono_700Bold, JetBrainsMono_800ExtraBold });
  return (
    <SafeAreaProvider>
      <AppProvider>{fontsLoaded ? <Shell /> : null}</AppProvider>
    </SafeAreaProvider>
  );
}

function Shell() {
  const { ready, error } = useApp();
  const t = useTheme();
  useEffect(() => {
    if (ready) SplashScreen.hideAsync().catch(() => {});
  }, [ready]);
  if (!ready) return <View style={{ flex: 1, backgroundColor: t.bg, alignItems: 'center', justifyContent: 'center' }}><ActivityIndicator color={t.accent} /></View>;
  if (error) return <View style={{ flex: 1, backgroundColor: t.bg, padding: 32, justifyContent: 'center' }}><T>Could not open your data: {error}</T></View>;
  return (
    <LockGate>
      <StatusBar style={t.dark ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerShadowVisible: false,
          headerStyle: { backgroundColor: t.bg },
          headerTintColor: t.accent,
          headerTitleStyle: { fontFamily: font.bold, color: t.text },
          headerBackButtonDisplayMode: 'minimal',
          contentStyle: { backgroundColor: t.bg },
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="onboarding" options={{ headerShown: false, gestureEnabled: false }} />
        <Stack.Screen name="log/[date]" options={{ presentation: 'modal', title: 'log' }} />
        <Stack.Screen name="cycles" options={{ title: 'past cycles' }} />
        <Stack.Screen name="pregnancy" options={{ title: 'pregnancy' }} />
        <Stack.Screen name="privacy" options={{ title: 'privacy' }} />
      </Stack>
    </LockGate>
  );
}

/**
 * When the lock is on, content is hidden on launch and whenever the app
 * returns from the background, until Face ID / passcode succeeds.
 */
function LockGate({ children }: { children: React.ReactNode }) {
  const { settings } = useApp();
  const t = useTheme();
  const [locked, setLocked] = useState(settings.lockEnabled);
  const busy = useRef(false);

  const unlock = async () => {
    if (busy.current) return;
    busy.current = true;
    try {
      const res = await LocalAuthentication.authenticateAsync({ promptMessage: 'Unlock Lunelle', fallbackLabel: 'Use passcode' });
      if (res.success) setLocked(false);
    } finally {
      busy.current = false;
    }
  };

  useEffect(() => {
    if (locked) unlock();
    const sub = AppState.addEventListener('change', (s) => {
      // Ignore the "inactive" blip caused by the Face ID sheet itself.
      if (s === 'background' && settings.lockEnabled) setLocked(true);
      if (s === 'active' && settings.lockEnabled && !busy.current) setLocked((l) => { if (l) unlock(); return l; });
    });
    return () => sub.remove();
  }, [settings.lockEnabled]);

  return (
    <View style={{ flex: 1 }}>
      {children}
      {locked && settings.lockEnabled && (
        <View style={{ position: 'absolute', inset: 0, backgroundColor: t.bg, alignItems: 'center', justifyContent: 'center', gap: 24, padding: 40 }}>
          <T size={44}>◐</T>
          <T size={22} weight="extra">lunelle is locked</T>
          <Button title="unlock" onPress={unlock} />
        </View>
      )}
    </View>
  );
}
