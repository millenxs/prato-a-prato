import { Image } from 'expo-image';
import { ArrowDown, ArrowUp, ArrowUpRight, ChevronDown, Heart, MapPin, ShoppingBag, Sparkles } from '../components/icons';
import React, { useEffect, useRef, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View, useWindowDimensions, type ListViewToken } from 'react-native';
import { FeedCard } from '../components/FeedCard';
import { WhySheet } from '../components/WhySheet';
import { formatBRL } from '../components/ui';
import { dishArtwork } from '../data/artwork';
import { dishById } from '../data/seed';
import { useStore } from '../state/store';
import { colors, face } from '../theme';
import type { FeedItem } from '../types';

export function FeedScreen({
  onOpenCart,
  onOpenFastLane,
  onOpenSaved,
  obscured,
}: {
  onOpenCart: () => void;
  onOpenFastLane: () => void;
  onOpenSaved: () => void;
  obscured: boolean;
}) {
  const { state, metrics, tasteProfile, cartTotal, actions } = useStore();
  const { width } = useWindowDimensions();
  const desktop = width >= 1100;
  const [whyId, setWhyId] = useState<string | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [onlyPromos, setOnlyPromos] = useState(false);
  const [height, setHeight] = useState(0);
  const list = useRef<FlatList<FeedItem>>(null);
  const seen = useRef(new Set<string>());
  const focused = useRef<string | null>(null);
  const viewabilityConfig = useRef({ itemVisiblePercentThreshold: 65, minimumViewTime: 180 }).current;
  const items = onlyPromos
    ? state.feed.items.filter((item) => item.dish.reelKind === 'promocao' || item.dish.reelKind === 'combo')
    : state.feed.items;
  const activeIndex = Math.max(0, items.findIndex((item) => item.dish.id === activeId));
  const whyItem = state.feed.items.find((item) => item.dish.id === whyId) ?? null;
  const cartCount = state.cart.reduce((sum, line) => sum + line.qty, 0);

  const onViewableItemsChanged = useRef(({ viewableItems }: { viewableItems: ListViewToken[] }) => {
    const token = viewableItems.find((entry) => entry.isViewable);
    const item = token?.item as FeedItem | undefined;
    if (!item) {
      setActiveId(null);
      return;
    }
    if (focused.current !== item.dish.id) {
      focused.current = item.dish.id;
      actions.focus(item.dish.id);
      setActiveId(item.dish.id);
    }
    if (!seen.current.has(item.dish.id)) {
      seen.current.add(item.dish.id);
      actions.impression(item.dish.id, item.merchant.id);
    }
  }).current;

  useEffect(() => {
    seen.current.clear();
    focused.current = null;
    setActiveId(null);
  }, [onlyPromos, state.feed.builtAt]);

  const move = (direction: number) => {
    const index = Math.max(0, Math.min(items.length - 1, activeIndex + direction));
    list.current?.scrollToIndex({ index, animated: true });
  };

  return (
    <View style={[styles.root, desktop ? styles.desktopRoot : styles.mobileRoot]}>
      <View style={styles.header}>
        <View>
          <Text style={styles.eyebrow}>PRATO A PRATO · PETROLINA</Text>
          <Text style={styles.heading}>Bateu a fome?</Text>
        </View>
        <View style={styles.headerRight}>
          <View style={styles.location}>
            <MapPin size={13} color={colors.accent} />
            <Text style={styles.locationText}>Petrolina, PE</Text>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Abrir sacola e fazer checkout"
            onPress={onOpenCart}
            style={[styles.headerCartBtn, cartCount > 0 && styles.headerCartBtnActive]}
          >
            <ShoppingBag size={15} color={colors.white} />
            <Text style={styles.headerCartText}>
              {cartCount > 0 ? `Sacola (${cartCount})` : 'Sacola'}
            </Text>
          </Pressable>
        </View>
      </View>

      <View style={styles.columns}>
        <View style={styles.feedColumn}>
          <View style={styles.filters} accessibilityRole="tablist">
            {[false, true].map((offers) => (
              <Pressable
                key={String(offers)}
                accessibilityRole="tab"
                accessibilityState={{ selected: onlyPromos === offers }}
                onPress={() => setOnlyPromos(offers)}
                style={[styles.filter, onlyPromos === offers && styles.selectedFilter]}
              >
                <Text style={[styles.filterText, onlyPromos === offers && styles.selectedFilterText]}>
                  {offers ? 'Ofertas quentes' : 'Para você'}
                </Text>
                {onlyPromos === offers && <View style={styles.filterDot} />}
              </Pressable>
            ))}
            <View style={styles.filterEnd}>
              <Sparkles size={12} color={colors.gold} />
              <Text style={styles.forYou}>No seu gosto</Text>
            </View>
          </View>

          <View style={styles.viewport} onLayout={(event) => setHeight(Math.round(event.nativeEvent.layout.height))}>
            {height > 0 && (
              <FlatList
                key={`${onlyPromos}-${state.feed.builtAt}-${height}`}
                ref={list}
                data={items}
                renderItem={({ item, index }) => (
                  <View style={{ height }}>
                    <FeedCard
                      item={item}
                      compact={height < 520}
                      position={`${String(index + 1).padStart(2, '0')} / ${String(items.length).padStart(2, '0')}`}
                      isActive={item.dish.id === activeId && !whyId && !obscured}
                      isSaved={state.savedIds.includes(item.dish.id)}
                      isWatchedComplete={state.watchedCompleteIds.includes(item.dish.id)}
                      cartQty={state.cart.find((line) => line.dishId === item.dish.id)?.qty ?? 0}
                      onSave={() =>
                        state.savedIds.includes(item.dish.id)
                          ? actions.unsave(item.dish.id)
                          : actions.save(item.dish.id)
                      }
                      onWatchComplete={() => actions.watchComplete(item.dish.id)}
                      onAdd={() => {
                        actions.add(item.dish.id);
                        onOpenCart();
                      }}
                      onOpenCart={onOpenCart}
                      onWhy={() => setWhyId(item.dish.id)}
                    />
                  </View>
                )}
                keyExtractor={(item) => item.dish.id}
                pagingEnabled
                snapToInterval={height}
                decelerationRate="fast"
                showsVerticalScrollIndicator={false}
                getItemLayout={(_, index) => ({ length: height, offset: height * index, index })}
                onViewableItemsChanged={onViewableItemsChanged}
                viewabilityConfig={viewabilityConfig}
                initialNumToRender={2}
                windowSize={3}
                maxToRenderPerBatch={2}
                ListEmptyComponent={
                  <View style={[styles.empty, { height }]}>
                    <Sparkles color={colors.accent} size={32} />
                    <Text style={styles.emptyTitle}>Novos sabores em breve.</Text>
                    <Text style={styles.body}>
                      Nenhum prato atende aos filtros atuais. Você pode ajustar suas preferências no Perfil.
                    </Text>
                  </View>
                }
                ListFooterComponent={
                  items.length > 0 ? (
                    <View style={[styles.empty, { height }]}>
                      <Heart color={colors.accent} size={32} />
                      <Text style={styles.emptyTitle}>Qual ficou na vontade?</Text>
                      <Text style={styles.body}>
                        Revisite seus curtidos ou deixe a seleção rápida ajudar na escolha.
                      </Text>
                      <Pressable onPress={onOpenSaved} style={styles.primary}>
                        <Text style={styles.primaryText}>Ver meus curtidos</Text>
                        <ArrowUpRight size={18} color={colors.onAccent} />
                      </Pressable>
                      <Pressable onPress={onOpenFastLane} style={styles.textButton}>
                        <Text style={styles.subtleLink}>Me ajude a escolher</Text>
                      </Pressable>
                    </View>
                  ) : undefined
                }
              />
            )}
          </View>

          <View style={styles.feedFooter}>
            <View style={styles.inline}>
              <ChevronDown size={14} color={colors.textFaint} />
              <Text style={styles.scrollHint}>Deslize para descobrir mais pratos</Text>
            </View>
            <View style={styles.inline}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Prato anterior"
                disabled={activeIndex === 0}
                onPress={() => move(-1)}
                style={[styles.arrow, activeIndex === 0 && { opacity: 0.3 }]}
              >
                <ArrowUp size={16} color={colors.textMuted} />
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Próximo prato"
                disabled={activeIndex >= items.length - 1}
                onPress={() => move(1)}
                style={styles.arrow}
              >
                <ArrowDown size={16} color={colors.textMuted} />
              </Pressable>
            </View>
          </View>
        </View>

        {desktop && (
          <View style={styles.aside}>
            <View style={styles.asideIntro}>
              <View style={styles.tinyLine} />
              <Text style={styles.asideEyebrow}>PEDIR COM OS OLHOS.</Text>
              <Text style={styles.asideTitle}>
                O próximo pedido{'\n'}começa no{'\n'}primeiro olhar.
              </Text>
              <Text style={styles.asideBody}>
                Restaurantes abertos agora perto de você. O feed aprende com o que você curte, assiste e pede.
              </Text>
            </View>

            <View style={styles.collectionHead}>
              <Text style={styles.sectionName}>Ficou na vontade</Text>
              <Text style={styles.collectionCount}>{String(state.savedIds.length).padStart(2, '0')}</Text>
            </View>

            {state.savedIds.length ? (
              state.savedIds
                .slice(-3)
                .reverse()
                .map((id) => {
                  const dish = dishById.get(id);
                  if (!dish) return null;
                  return (
                    <Pressable key={id} onPress={onOpenSaved} style={styles.savedRow}>
                      <Image source={dishArtwork(dish)} style={styles.savedPhoto} contentFit="cover" />
                      <View style={{ flex: 1 }}>
                        <Text numberOfLines={1} style={styles.savedName}>
                          {dish.name}
                        </Text>
                        <Text style={styles.savedSub}>{formatBRL(dish.price)} · Na sua coleção</Text>
                      </View>
                      <ArrowUpRight size={15} color={colors.textMuted} />
                    </Pressable>
                  );
                })
            ) : (
              <View style={styles.emptyCollection}>
                <Heart size={21} color={colors.accent} />
                <Text style={styles.asideBody}>Toque no coração para guardar os pratos que deram água na boca.</Text>
              </View>
            )}

            <Pressable onPress={onOpenCart} style={styles.quickChoice}>
              <ShoppingBag size={18} color={colors.accent} />
              <View style={{ flex: 1 }}>
                <Text style={styles.savedName}>
                  {cartCount > 0 ? `Sua sacola (${cartCount} item${cartCount > 1 ? 's' : ''})` : 'Sua sacola de pedidos'}
                </Text>
                <Text style={styles.savedSub}>
                  {cartCount > 0
                    ? `Total parcial ${formatBRL(cartTotal)} · Ir para o checkout`
                    : 'Adicione um prato para finalizar a compra.'}
                </Text>
              </View>
              <ArrowUpRight size={18} color={colors.accent} />
            </Pressable>

            <Pressable onPress={onOpenFastLane} style={styles.quickChoice}>
              <Sparkles size={18} color={colors.gold} />
              <View style={{ flex: 1 }}>
                <Text style={styles.savedName}>Muita fome, pouca dúvida?</Text>
                <Text style={styles.savedSub}>Três sugestões diretas para pedir em 1 toque.</Text>
              </View>
              <ArrowUpRight size={18} color={colors.gold} />
            </Pressable>

            <Text style={styles.demoNote}>
              PROTÓTIPO INTERATIVO{'\n'}Restaurantes fictícios. Fotos ilustrativas.
            </Text>
          </View>
        )}
      </View>

      <WhySheet
        visible={!!whyId}
        item={whyItem}
        feed={state.feed}
        lab={state.lab}
        tasteProfile={tasteProfile}
        metrics={metrics}
        onClose={() => setWhyId(null)}
        onAdd={(id) => {
          actions.add(id);
          setWhyId(null);
          onOpenCart();
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, paddingHorizontal: 12 },
  mobileRoot: { width: '100%', maxWidth: 534, alignSelf: 'center' },
  desktopRoot: { paddingHorizontal: 44, paddingTop: 16, maxWidth: 1050, width: '100%', alignSelf: 'center' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingTop: 10,
    paddingBottom: 12,
    gap: 10,
  },
  eyebrow: { fontFamily: face.bold, color: colors.accent, fontSize: 8, letterSpacing: 2.2, marginBottom: 2 },
  heading: { fontFamily: face.display, color: colors.text, fontSize: 25, letterSpacing: -1 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  location: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  locationText: { fontFamily: face.medium, color: colors.textMuted, fontSize: 10 },
  headerCartBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.surfaceRaised,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
  },
  headerCartBtnActive: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  headerCartText: { fontFamily: face.bold, color: colors.white, fontSize: 11 },
  columns: { flex: 1, flexDirection: 'row', gap: 40 },
  feedColumn: { flex: 1, maxWidth: 510, minWidth: 0 },
  filters: { flexDirection: 'row', gap: 6, paddingBottom: 10, alignItems: 'center' },
  filter: { minHeight: 36, paddingHorizontal: 15, borderRadius: 20, flexDirection: 'row', gap: 8, alignItems: 'center' },
  selectedFilter: { backgroundColor: colors.accentSoft, borderWidth: 1, borderColor: 'rgba(234, 29, 44, 0.35)' },
  filterText: { fontFamily: face.medium, color: colors.textFaint, fontSize: 12 },
  selectedFilterText: { color: colors.text, fontFamily: face.bold },
  filterDot: { width: 5, height: 5, backgroundColor: colors.accent, borderRadius: 2.5 },
  filterEnd: { flex: 1, flexDirection: 'row', justifyContent: 'flex-end', gap: 5, alignItems: 'center', paddingRight: 5 },
  forYou: { color: colors.textMuted, fontSize: 10, fontFamily: face.semibold },
  viewport: { flex: 1, borderRadius: 24, overflow: 'hidden', backgroundColor: colors.surface },
  feedFooter: { minHeight: 40, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 5 },
  inline: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  scrollHint: { fontFamily: face.medium, color: colors.textFaint, fontSize: 10 },
  arrow: { width: 32, height: 36, justifyContent: 'center', alignItems: 'center' },
  aside: { width: 268, paddingTop: 42, gap: 16 },
  asideIntro: { gap: 14, marginBottom: 14 },
  tinyLine: { height: 3, width: 32, backgroundColor: colors.accent, borderRadius: 2 },
  asideEyebrow: { color: colors.accent, fontFamily: face.bold, fontSize: 8, letterSpacing: 1.6 },
  asideTitle: { color: colors.text, fontFamily: face.display, fontSize: 28, lineHeight: 34, letterSpacing: -1 },
  asideBody: { color: colors.textMuted, fontFamily: face.regular, fontSize: 12, lineHeight: 20, flexShrink: 1 },
  collectionHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 18,
  },
  sectionName: { fontFamily: face.bold, color: colors.text, fontSize: 12 },
  collectionCount: { color: colors.accent, fontFamily: face.bold, fontSize: 11 },
  emptyCollection: { flexDirection: 'row', gap: 12, paddingRight: 20, alignItems: 'flex-start' },
  savedRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  savedPhoto: { height: 50, width: 50, borderRadius: 13 },
  savedName: { fontFamily: face.bold, color: colors.text, fontSize: 12 },
  savedSub: { color: colors.textFaint, fontFamily: face.regular, fontSize: 10, marginTop: 3 },
  quickChoice: {
    marginTop: 6,
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  demoNote: { color: colors.textFaint, fontFamily: face.regular, fontSize: 9, lineHeight: 18, marginTop: 'auto', marginBottom: 24 },
  empty: { padding: 30, justifyContent: 'center', alignItems: 'center', gap: 20 },
  emptyTitle: { color: colors.text, fontFamily: face.bold, fontSize: 26, textAlign: 'center' },
  body: { color: colors.textMuted, fontFamily: face.regular, fontSize: 13, lineHeight: 21, textAlign: 'center' },
  primary: { flexDirection: 'row', alignItems: 'center', gap: 20, padding: 16, backgroundColor: colors.accent, borderRadius: 14 },
  primaryText: { color: colors.onAccent, fontFamily: face.bold, fontSize: 13 },
  textButton: { padding: 12 },
  subtleLink: { color: colors.textMuted, fontFamily: face.medium, fontSize: 12 },
});
