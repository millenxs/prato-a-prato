export const colors = {
  bg: '#0B0B0F',
  surface: '#15151C',
  surfaceRaised: '#1D1D26',
  border: '#2A2A36',
  text: '#F5F5F7',
  textMuted: '#A0A0B0',
  textFaint: '#6E6E80',
  accent: '#FF5A36',
  accentSoft: 'rgba(255, 90, 54, 0.16)',
  gold: '#FFC857',
  success: '#34D399',
  successSoft: 'rgba(52, 211, 153, 0.14)',
  danger: '#F87171',
  dangerSoft: 'rgba(248, 113, 113, 0.14)',
  overlay: 'rgba(6, 6, 10, 0.72)',
  white: '#FFFFFF',
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

export const radius = {
  sm: 8,
  md: 12,
  lg: 18,
  xl: 26,
  pill: 999,
} as const;

export const font = {
  h1: 34,
  h2: 26,
  h3: 20,
  body: 15,
  small: 13,
  micro: 11,
} as const;

export const shadow = {
  card: {
    shadowColor: '#000',
    shadowOpacity: 0.35,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 8,
  },
} as const;
