import React, { useCallback, useRef, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View, type ListViewToken } from 'react-native';

import { FeedCard } from '../components/FeedCard';
import { TriggerBanner } from '../components/TriggerBanner';
import { WhySheet } from '../components/WhySheet';
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
  const { state, metrics, tasteProfile, actions } = useStore();
  const [whyItem, setWhyItem] = useState<FeedItem | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [onlyPromos, setOnlyPromos] = useState(false);

  const listRef = useRef<FlatList<FeedItem> | null>(null);
  const seen = useRef<Set<string>>(new Set());

  const items = onlyPromos
    ? state.feed.items.filter((i) => i.dish.reelKind === 'promocao' || i.dish.reelKind === 'combo')
    : state.feed.items;

  const onViewableItemsChanged = useRef(({ viewableItems }: { viewableItems: ListViewToken[] }) => {
    const first = viewableItems[0];
    if (first && typeof first.index === 'number') {
      setActiveIndex(first.index);
    }
    for (const token of viewableItems) {
      const item = token.item as FeedItem;
      if (!item || seen.current.has(item.dish.id)) continue;
      seen.current.add(item.dish.id);
      actions.impression(item.dish.id, item.merchant.id);
    }
  }).current;

  const viewabilityConfig = useRef({ itemVisiblePercentThreshold: 60 }).current;

  const advanceToNext = useCallback(
    (index: number) => {
      if (index + 1 < items.length) {
        listRef.current?.scrollToIndex({ index: index + 1, animated: true });
        setActiveIndex(index + 1);
      }
    },
    [items.length],
  );

  const renderItem = useCallback(
    ({ item, index }: { item: FeedItem; index: number }) => {
      const cartLine = state.cart.find((c) => c.dishId === item.dish.id);
      return (
        <View style={{ height: cardHeight }}>
          <FeedCard
            item={item}
            isActive={index === activeIndex}
            isSaved={state.savedIds.includes(item.dish.id)}
            isWatchedComplete={state.watchedCompleteIds.includes(item.dish.id)}
            cartQty={cartLine?.qty ?? 0}
            onSkip={() => {
              actions.skip(item.dish.id);
              advanceToNext(index);
            }}
            onSave={() => {
              if (state.savedIds.includes(item.dish.id)) {
                actions.unsave(item.dish.id);
              } else {
                actions.save(item.dish.id);
              }
            }}
            onWatchComplete={() => actions.watchComplete(item.dish.id)}
            onAdd={() => {
              actions.add(item.dish.id);
              onOpenCart();
            }}
            onWhy={() => setWhyItem(item)}
          />
        </View>
      );
    },
    [
      actions,
      activeIndex,
      advanceToNext,
      cardHeight,
      onOpenCart,
      state.cart,
      state.savedIds,
      state.watchedCompleteIds,
    ],
  );

  const totalCartCount = state.cart.reduce((acc, line) => acc + line.qty, 0);
  const topTagsText = tasteProfile
    .filter((t) => t.score > 0)
    .slice(0, 3)
    .map((t) => `+${t.tag} (${Math.round(50 + t.score * 50)}%)`)
    .join(' · ');

  return (
    <View style={styles.root}>
      <FlatList
        ref={listRef}
        data={items}
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
        ListFooterComponent={
          <View style={[styles.footer, { height: cardHeight }]}>
            <Text style={styles.footerTitle}>Fim dos Reels</Text>
            <Text style={styles.footerBody}>
              {metrics.cardsShown} Reels vistos · {metrics.saves} likes · {metrics.watchedComplete} vistos até o fim em{' '}
              {formatSeconds(metrics.sessionSeconds)}.
            </Text>
            <Pressable style={styles.footerButton} onPress={onOpenFastLane}>
              <Text style={styles.footerButtonText}>Ver as 3 melhores escolhas para você</Text>
            </Pressable>
          </View>
        }
      />

      {/* Top overlay flutuante estilo TikTok / Instagram Reels */}
      <View style={styles.topOverlay} pointerEvents="box-none">
        <View style={styles.topTabsRow} pointerEvents="box-none">
          <View style={styles.brandBadge}>
            <Text style={styles.brandDot}>●</Text>
            <Text style={styles.brandText}>Reels</Text>
          </View>

          <View style={styles.centerTabs}>
            <Pressable onPress={() => setOnlyPromos(true)} style={styles.topTabBtn}>
              <Text style={[styles.topTabText, onlyPromos && styles.topTabActive]}>Promoções 🔥</Text>
              {onlyPromos ? <View style={styles.topTabUnderline} /> : null}
            </Pressable>
            <Text style={styles.topTabDivider}>|</Text>
            <Pressable onPress={() => setOnlyPromos(false)} style={styles.topTabBtn}>
              <Text style={[styles.topTabText, !onlyPromos && styles.topTabActive]}>Para Você</Text>
              {!onlyPromos ? <View style={styles.topTabUnderline} /> : null}
            </Pressable>
          </View>

          <Pressable onPress={onOpenCart} style={styles.cartHeaderBtn}>
            <Text style={styles.cartHeaderText}>🛒 {totalCartCount}</Text>
          </Pressable>
        </View>

        {/* Barra ao vivo do Algoritmo / Perfil do Usuário */}
        <Pressable
          onPress={() => setWhyItem(items[activeIndex] ?? items[0] ?? null)}
          style={styles.algoPill}
        >
          <Text style={styles.algoPillTitle} numberOfLines={1}>
            🧠 {state.lastSignalNote ?? (topTagsText ? `Seu algoritmo: ${topTagsText}` : 'Algoritmo aprendendo com seus likes, vídeos vistos e carrinho')}
          </Text>
          <Text style={styles.algoPillStats}>
            ♥ {metrics.saves} · 🎬 {metrics.watchedComplete} · 🛒 {metrics.adds}
          </Text>
        </Pressable>
      </View>

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
        tasteProfile={tasteProfile}
        metrics={metrics}
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
  root: { flex: 1, backgroundColor: '#050508' },
  topOverlay: {
    position: 'absolute',
    top: spacing.xs,
    left: spacing.md,
    right: spacing.md,
    zIndex: 15,
    gap: 6,
  },
  topTabsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  brandBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(0,0,0,0.45)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.pill,
  },
  brandDot: { color: '#FF2D55', fontSize: 10 },
  brandText: { color: colors.white, fontSize: font.small, fontWeight: '900' },
  centerTabs: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: 'rgba(0,0,0,0.42)',
    paddingHorizontal: spacing.md,
    paddingVertical: 5,
    borderRadius: radius.pill,
  },
  topTabBtn: { alignItems: 'center' },
  topTabText: {
    color: 'rgba(255,255,255,0.62)',
    fontSize: font.small,
    fontWeight: '800',
  },
  topTabActive: {
    color: colors.white,
    fontWeight: '900',
  },
  topTabUnderline: {
    marginTop: 2,
    width: 22,
    height: 2,
    borderRadius: 1,
    backgroundColor: colors.white,
  },
  topTabDivider: { color: 'rgba(255,255,255,0.28)', fontSize: font.small },
  cartHeaderBtn: {
    backgroundColor: 'rgba(255,90,54,0.90)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.pill,
  },
  cartHeaderText: { color: colors.white, fontSize: font.small, fontWeight: '900' },
  algoPill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    backgroundColor: 'rgba(10,10,16,0.74)',
    borderRadius: radius.pill,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  algoPillTitle: {
    color: colors.gold,
    fontSize: 11,
    fontWeight: '700',
    flex: 1,
  },
  algoPillStats: {
    color: colors.white,
    fontSize: 10,
    fontWeight: '800',
  },
  footer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    gap: spacing.md,
    backgroundColor: '#050508',
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
