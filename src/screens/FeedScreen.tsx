import React, { useCallback, useRef, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View, type ListViewToken } from 'react-native';

import { FeedCard } from '../components/FeedCard';
import { TriggerBanner } from '../components/TriggerBanner';
import { WhySheet } from '../components/WhySheet';
import { Badge } from '../components/ui';
import { formatSeconds } from '../engine/metrics';
import { useStore } from '../state/store';
import { colors, font, radius, spacing } from '../theme';
import type { FeedItem } from '../types';

export function FeedScreen({
  cardHeight,
  onOpenCart,
  onOpenFastLane,
}: {
  cardHeight: number;
  onOpenCart: () => void;
  onOpenFastLane: () => void;
}) {
  const { state, metrics, actions } = useStore();
  const [whyItem, setWhyItem] = useState<FeedItem | null>(null);
  const seen = useRef<Set<string>>(new Set());

  const onViewableItemsChanged = useRef(({ viewableItems }: { viewableItems: ListViewToken[] }) => {
    for (const token of viewableItems) {
      const item = token.item as FeedItem;
      if (!item || seen.current.has(item.dish.id)) continue;
      seen.current.add(item.dish.id);
      actions.impression(item.dish.id, item.merchant.id);
    }
  }).current;

  const viewabilityConfig = useRef({ itemVisiblePercentThreshold: 55 }).current;

  const renderItem = useCallback(
    ({ item }: { item: FeedItem }) => (
      <View style={{ height: cardHeight }}>
        <FeedCard
          item={item}
          isSaved={state.savedIds.includes(item.dish.id)}
          onSkip={() => actions.skip(item.dish.id)}
          onSave={() => actions.save(item.dish.id)}
          onAdd={() => {
            actions.add(item.dish.id);
            onOpenCart();
          }}
          onWhy={() => setWhyItem(item)}
        />
      </View>
    ),
    [actions, cardHeight, onOpenCart, state.savedIds],
  );

  return (
    <View style={styles.root}>
      <View style={styles.header} pointerEvents="box-none">
        <View>
          <Text style={styles.brand}>prato a prato</Text>
          <Text style={styles.tagline}>comida em Petrolina, uma decisão por vez</Text>
        </View>
        <View style={styles.chips}>
          <Pressable onPress={onOpenCart} style={styles.chip}>
            <Text style={styles.chipText}>
              🛒 {state.cart.length > 0 ? `${state.cart.length} item(ns)` : 'carrinho'}
            </Text>
          </Pressable>
          {state.lab.quietHours || metrics.triggersShown >= state.lab.attentionCap ? (
            <Badge label="MODO SILÊNCIO" tone="neutral" />
          ) : (
            <Badge label={`atenção ${state.lab.attentionCap - metrics.triggersShown}`} tone="accent" />
          )}
        </View>
      </View>

      <FlatList
        data={state.feed.items}
        keyExtractor={(item) => item.dish.id}
        renderItem={renderItem}
        pagingEnabled
        snapToInterval={cardHeight}
        decelerationRate="fast"
        showsVerticalScrollIndicator={false}
        getItemLayout={(_, index) => ({ length: cardHeight, offset: cardHeight * index, index })}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        windowSize={3}
        initialNumToRender={2}
        maxToRenderPerBatch={2}
        removeClippedSubviews
        ListFooterComponent={
          <View style={[styles.footer, { height: cardHeight }]}>
            <Text style={styles.footerTitle}>Fim do feed</Text>
            <Text style={styles.footerBody}>
              {metrics.cardsShown} cards e {formatSeconds(metrics.sessionSeconds)} de sessão. Toque em “Decidir” para o
              atalho de 3 opções ou abra o Laboratório para mudar o motor.
            </Text>
            <Pressable style={styles.footerButton} onPress={onOpenFastLane}>
              <Text style={styles.footerButtonText}>Ir para o atalho</Text>
            </Pressable>
          </View>
        }
      />

      <TriggerBanner
        onAction={(triggerId) => {
          if (triggerId === 'fast_lane') onOpenFastLane();
          else onOpenCart();
        }}
      />

      <WhySheet
        visible={whyItem !== null}
        item={whyItem}
        feed={state.feed}
        lab={state.lab}
        onClose={() => setWhyItem(null)}
        onAdd={(dishId) => {
          actions.add(dishId);
          setWhyItem(null);
          onOpenCart();
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xs,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  brand: { color: colors.white, fontSize: font.h3, fontWeight: '900', letterSpacing: -0.4 },
  tagline: { color: colors.textFaint, fontSize: font.micro },
  chips: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  chip: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
  },
  chipText: { color: colors.text, fontSize: font.small, fontWeight: '700' },
  footer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    gap: spacing.md,
  },
  footerTitle: { color: colors.white, fontSize: font.h2, fontWeight: '800' },
  footerBody: { color: colors.textMuted, fontSize: font.small, textAlign: 'center', lineHeight: 20 },
  footerButton: {
    backgroundColor: colors.accent,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: radius.pill,
  },
  footerButtonText: { color: colors.white, fontWeight: '800' },
});
