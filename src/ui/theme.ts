/**
 * Design tokens. Soft blush / lilac / cream palette with one bold accent
 * (electric magenta). Every screen reads colours from `useTheme()`.
 */
import { useColorScheme } from 'react-native';
import { useApp } from '../state/AppContext';

export const ACCENT = '#E0218A';

export interface Theme {
  dark: boolean;
  bg: string;
  bgGradient: [string, string, string];
  card: string;
  cardAlt: string;
  text: string;
  muted: string;
  border: string;
  accent: string;
  onAccent: string;
  period: string;
  periodSoft: string;
  fertile: string;
  fertileSoft: string;
  ovulation: string;
  lilac: string;
  blush: string;
  success: string;
}

export const light: Theme = {
  dark: false,
  bg: '#FFF8F3',
  bgGradient: ['#FFF3F1', '#FBEFF8', '#F4EEFF'],
  card: '#FFFFFF',
  cardAlt: '#FCEFF3',
  text: '#3A2533',
  muted: '#8E7688',
  border: '#F1DDE6',
  accent: ACCENT,
  onAccent: '#FFFFFF',
  period: '#F0507F',
  periodSoft: '#FAD2DE',
  fertile: '#A98BE0',
  fertileSoft: '#E9DFFA',
  ovulation: '#7C4DDB',
  lilac: '#D9C8F2',
  blush: '#F9D5DF',
  success: '#3FA57A',
};

export const dark: Theme = {
  dark: true,
  bg: '#160F1B',
  bgGradient: ['#1E1222', '#1A1324', '#140F1E'],
  card: '#241A2C',
  cardAlt: '#2E2036',
  text: '#F7E9F1',
  muted: '#AE95AA',
  border: '#3A2A44',
  accent: '#FF3EA5',
  onAccent: '#FFFFFF',
  period: '#FF6B95',
  periodSoft: '#5A2A3E',
  fertile: '#B79CF0',
  fertileSoft: '#3A2D57',
  ovulation: '#C7A8FF',
  lilac: '#4A3A66',
  blush: '#4A2A3A',
  success: '#5CC79A',
};

export const font = {
  regular: 'JetBrainsMono_400Regular',
  medium: 'JetBrainsMono_500Medium',
  bold: 'JetBrainsMono_700Bold',
  extra: 'JetBrainsMono_800ExtraBold',
};

export const radius = { sm: 12, md: 18, lg: 26, pill: 999 };
export const space = (n: number) => n * 4;

export function useTheme(): Theme {
  const system = useColorScheme();
  const { settings } = useApp();
  const pref = settings.theme;
  const isDark = pref === 'dark' || (pref === 'system' && system === 'dark');
  return isDark ? dark : light;
}

export const PHASE_LABEL: Record<string, string> = {
  menstrual: 'Menstrual',
  follicular: 'Follicular',
  ovulatory: 'Fertile',
  luteal: 'Luteal',
};
