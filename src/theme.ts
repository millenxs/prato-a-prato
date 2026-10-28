export const colors = {
  bg: '#0E0808',
  surface: '#181010',
  surfaceRaised: '#241717',
  border: '#382323',
  text: '#FFF8F5',
  textMuted: '#D1BDB8',
  textFaint: '#9E8580',
  accent: '#EA1D2C',
  accentSoft: 'rgba(234, 29, 44, 0.16)',
  onAccent: '#FFFFFF',
  gold: '#FFB800',
  success: '#34D399',
  successSoft: 'rgba(52, 211, 153, 0.14)',
  danger: '#F87171',
  dangerSoft: 'rgba(248, 113, 113, 0.14)',
  overlay: 'rgba(12, 6, 6, 0.78)',
  white: '#FFFFFF',
} as const;

export const face = {
  regular: 'Manrope_400Regular',
  medium: 'Manrope_500Medium',
  semibold: 'Manrope_600SemiBold',
  bold: 'Manrope_700Bold',
  display: 'Manrope_800ExtraBold',
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
