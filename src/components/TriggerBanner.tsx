import React, { useEffect, useRef } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';

import { useStore } from '../state/store';
import { colors, font, radius, spacing } from '../theme';

/**
 * Banner de interrupção. Ele é o único lugar do app que decide mostrar um
 * gatilho — e registra tanto o que apareceu quanto o que foi barrado.
 */
export function TriggerBanner({ onAction }: { onAction: (triggerId: string) => void }) {
  const { trigger, actions } = useStore();
  const suppressedLogged = useRef<Set<string>>(new Set());
  const slide = useRef(new Animated.Value(-140)).current;

  const active = trigger.active;
  const activeId = active?.id ?? null;

  useEffect(() => {
    if (activeId) actions.triggerShown(activeId);
  }, [activeId, actions]);

  useEffect(() => {
    for (const item of trigger.suppressed) {
      const key = `${item.id}|${item.reason}`;
      if (!suppressedLogged.current.has(key)) {
        suppressedLogged.current.add(key);
        actions.triggerSuppressed(item.id, item.reason);
      }
    }
  }, [trigger.suppressed, actions]);

  useEffect(() => {
    Animated.spring(slide, {
      toValue: active ? 0 : -140,
      useNativeDriver: true,
      friction: 8,
    }).start();
  }, [active, slide]);

  if (!active) return null;

  return (
    <Animated.View style={[styles.wrap, { transform: [{ translateY: slide }] }]}>
      <View style={styles.card}>
        <View style={styles.textWrap}>
          <Text style={styles.title}>{active.title}</Text>
          <Text style={styles.body} numberOfLines={2}>
            {active.body}
          </Text>
        </View>
        <View style={styles.actions}>
          <Pressable
            style={styles.cta}
            onPress={() => {
              onAction(active.id);
              actions.triggerDismiss(active.id);
            }}
          >
            <Text style={styles.ctaText}>{active.actionLabel}</Text>
          </Pressable>
          <Pressable style={styles.dismiss} onPress={() => actions.triggerDismiss(active.id)}>
            <Text style={styles.dismissText}>agora não</Text>
          </Pressable>
        </View>
      </View>
      <Text style={styles.budget}>
        gatilho {active.id} · orçamento de atenção restante: {trigger.budgetLeft}
      </Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    top: spacing.sm,
    left: spacing.md,
    right: spacing.md,
    zIndex: 20,
  },
  card: {
    backgroundColor: colors.surfaceRaised,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.accent,
    padding: spacing.lg,
    gap: spacing.md,
  },
  textWrap: { gap: 2 },
  title: { color: colors.white, fontWeight: '800', fontSize: font.body },
  body: { color: colors.textMuted, fontSize: font.small },
  actions: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  cta: {
    backgroundColor: colors.accent,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
  },
  ctaText: { color: colors.white, fontWeight: '800', fontSize: font.small },
  dismiss: { paddingVertical: spacing.sm },
  dismissText: { color: colors.textMuted, fontSize: font.small, fontWeight: '600' },
  budget: { color: colors.textFaint, fontSize: 10, marginTop: spacing.xs, textAlign: 'center' },
});
