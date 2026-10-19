import React from 'react';
import { Pressable, StyleSheet, Text, View, type ViewStyle } from 'react-native';

import { colors, font, radius, spacing } from '../theme';

export function Badge({
  label,
  tone = 'neutral',
}: {
  label: string;
  tone?: 'neutral' | 'accent' | 'success' | 'danger' | 'gold';
}) {
  const toneStyle: Record<string, ViewStyle> = {
    neutral: { backgroundColor: 'rgba(255,255,255,0.10)' },
    accent: { backgroundColor: colors.accentSoft },
    success: { backgroundColor: colors.successSoft },
    danger: { backgroundColor: colors.dangerSoft },
    gold: { backgroundColor: 'rgba(255,200,87,0.14)' },
  };
  const textColor: Record<string, string> = {
    neutral: colors.text,
    accent: colors.accent,
    success: colors.success,
    danger: colors.danger,
    gold: colors.gold,
  };
  return (
    <View style={[styles.badge, toneStyle[tone]]}>
      <Text style={[styles.badgeText, { color: textColor[tone] }]}>{label}</Text>
    </View>
  );
}

export function Bar({
  value,
  color = colors.accent,
  height = 8,
}: {
  value: number;
  color?: string;
  height?: number;
}) {
  return (
    <View style={[styles.barTrack, { height }]}>
      <View
        style={[
          styles.barFill,
          { width: `${Math.round(Math.max(0, Math.min(1, value)) * 100)}%`, backgroundColor: color },
        ]}
      />
    </View>
  );
}

export function Button({
  title,
  onPress,
  variant = 'primary',
  disabled,
  compact,
}: {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'ghost' | 'outline';
  disabled?: boolean;
  compact?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.button,
        compact && styles.buttonCompact,
        variant === 'primary' && { backgroundColor: colors.accent },
        variant === 'outline' && { borderWidth: 1, borderColor: colors.border },
        variant === 'ghost' && { backgroundColor: 'transparent' },
        disabled && { opacity: 0.4 },
        pressed && { opacity: 0.75 },
      ]}
    >
      <Text
        style={[
          styles.buttonText,
          compact && { fontSize: font.small },
          variant === 'outline' && { color: colors.text },
          variant === 'ghost' && { color: colors.textMuted },
        ]}
      >
        {title}
      </Text>
    </Pressable>
  );
}

export function SectionLabel({ children }: { children: React.ReactNode }) {
  return <Text style={styles.sectionLabel}>{children}</Text>;
}

export function Card({ children, style }: { children: React.ReactNode; style?: ViewStyle }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export const formatBRL = (value: number): string => `R$ ${value.toFixed(2).replace('.', ',')}`;

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radius.pill,
  },
  badgeText: {
    fontSize: font.micro,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  barTrack: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: radius.pill,
    overflow: 'hidden',
    flex: 1,
  },
  barFill: {
    height: '100%',
    borderRadius: radius.pill,
  },
  button: {
    minHeight: 48,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  buttonCompact: {
    minHeight: 36,
    paddingHorizontal: spacing.md,
  },
  buttonText: {
    color: colors.white,
    fontSize: font.body,
    fontWeight: '700',
  },
  sectionLabel: {
    color: colors.textFaint,
    fontSize: font.micro,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: spacing.sm,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
  },
});
