import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';
import { ArrowLeft, ArrowUpRight, Compass, Heart, MapPin, ShoppingBag, Sparkles, UserRound, type LucideIcon } from './components/icons';
import React, { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';

import { CartSheet } from './components/CartSheet';
import { BrandMark } from './components/BrandMark';
import { formatBRL } from './components/ui';
import { ExperimentScreen } from './screens/ExperimentScreen';
import { FastLaneScreen } from './screens/FastLaneScreen';
import { FeedScreen } from './screens/FeedScreen';
import { LabScreen } from './screens/LabScreen';
import { CollectionScreen, ProfileScreen } from './screens/CollectionScreen';
import { StoreProvider, useStore } from './state/store';
import { colors, face } from './theme';

type Tab = 'feed' | 'saved' | 'decide' | 'profile' | 'experiment' | 'lab';
const TABS: Array<{ key: Tab; label: string; icon: LucideIcon }> = [
  { key: 'feed', label: 'Explorar', icon: Compass },
  { key: 'saved', label: 'Curtidos', icon: Heart },
  { key: 'decide', label: 'Escolhas', icon: Sparkles },
  { key: 'profile', label: 'Perfil', icon: UserRound },
];

function Shell() {
  const [tab, setTab] = useState<Tab>('feed');
  const [cartOpen, setCartOpen] = useState(false);
  const { width } = useWindowDimensions();
  const inset = useSafeAreaInsets();
  const desktop = width >= 1100;
  const { state, cartTotal, actions } = useStore();
  const count = state.cart.reduce((total, line) => total + line.qty, 0);
  const technical = tab === 'lab' || tab === 'experiment';
  const cart = () => {
    actions.closeCheckout();
    setCartOpen(true);
  };

  const navigation = TABS.map(({ key, label, icon: Icon }) => {
    const active = tab === key || (key === 'profile' && technical);
    return (
      <Pressable
        key={key}
        accessibilityRole="tab"
        accessibilityState={{ selected: active }}
        onPress={() => setTab(key)}
        style={({ pressed }) => [
          desktop ? styles.sideTab : styles.tab,
          active && desktop && styles.selectedTab,
          pressed && { opacity: 0.65 },
        ]}
      >
        <Icon size={desktop ? 19 : 21} strokeWidth={active ? 2 : 1.6} color={active ? colors.accent : colors.textFaint} />
        <Text style={[styles.tabLabel, active && styles.tabActive, desktop && styles.sideLabel]}>{label}</Text>
        {key === 'saved' && desktop && state.savedIds.length > 0 && (
          <Text style={styles.navCount}>{state.savedIds.length}</Text>
        )}
        {!desktop && active && <View style={styles.activeDot} />}
      </Pressable>
    );
  });

  return (
    <View style={[styles.root, { paddingTop: inset.top }]}>
      <StatusBar style="light" />
      <View style={styles.layout}>
        {desktop && (
          <View style={styles.sidebar}>
            <View style={styles.brand}>
              <View style={styles.brandIcon}>
                <BrandMark />
              </View>
              <Text style={styles.brandName}>
                prato{'\n'}a prato<Text style={{ color: colors.accent }}>.</Text>
              </Text>
            </View>
            <Text style={styles.brandNote}>FOME DE DESCOBRIR</Text>
            <View accessibilityRole="tablist" style={styles.sideNav}>
              {navigation}
            </View>
            <Pressable
              onPress={cart}
              accessibilityRole="button"
              style={[styles.cartShortcut, count > 0 && styles.cartShortcutActive]}
            >
              <ShoppingBag size={18} color={count > 0 ? colors.white : colors.textMuted} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.sideLabel, count > 0 && { color: colors.white, fontFamily: face.bold }]}>
                  {count > 0 ? 'Fechar pedido' : 'Sua sacola'}
                </Text>
                {count > 0 ? <Text style={styles.cartShortcutSub}>{formatBRL(cartTotal)}</Text> : null}
              </View>
              <Text style={[styles.navCount, count > 0 && { color: colors.white, fontFamily: face.bold }]}>{count}</Text>
            </Pressable>
            <View style={styles.sidebarBottom}>
              <Pressable onPress={() => setTab('experiment')} style={styles.projectButton}>
                <Text style={styles.projectText}>Por dentro do projeto</Text>
                <ArrowUpRight size={15} color={colors.textFaint} />
              </Pressable>
              <View style={styles.sidebarLocation}>
                <MapPin size={13} color={colors.accent} />
                <Text style={styles.smallText}>Petrolina, Pernambuco</Text>
              </View>
              <Text style={styles.demo}>EDIÇÃO DE PORTFÓLIO · 01</Text>
            </View>
          </View>
        )}
        <View style={styles.main}>
          {technical && (
            <Pressable onPress={() => setTab('profile')} style={styles.back}>
              <ArrowLeft size={18} color={colors.text} />
              <Text style={styles.backLabel}>Voltar ao perfil</Text>
            </Pressable>
          )}
          {tab === 'feed' && (
            <FeedScreen
              onOpenCart={cart}
              onOpenFastLane={() => setTab('decide')}
              onOpenSaved={() => setTab('saved')}
              obscured={cartOpen}
            />
          )}
          {tab === 'saved' && <CollectionScreen onOpenCart={cart} onGoFeed={() => setTab('feed')} />}
          {tab === 'decide' && <FastLaneScreen onOpenCart={cart} onGoFeed={() => setTab('feed')} />}
          {tab === 'profile' && (
            <ProfileScreen
              onOpenLab={() => setTab('lab')}
              onOpenCase={() => setTab('experiment')}
              onOpenCart={cart}
            />
          )}
          {tab === 'experiment' && <ExperimentScreen />}
          {tab === 'lab' && <LabScreen />}
        </View>
      </View>

      {/* Barra vermelha flutuante estilo iFood quando há itens na sacola */}
      {count > 0 && !cartOpen && (
        <View style={styles.floatingBagWrap}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Ver sacola e finalizar pedido"
            onPress={cart}
            style={styles.floatingBagBar}
          >
            <View style={styles.floatingBagLeft}>
              <View style={styles.floatingBagBadge}>
                <Text style={styles.floatingBagBadgeText}>{count}</Text>
              </View>
              <View>
                <Text style={styles.floatingBagTitle}>Ver sacola e fazer checkout</Text>
                <Text style={styles.floatingBagSub}>Entrega e pagamento em 1 toque</Text>
              </View>
            </View>
            <View style={styles.floatingBagRight}>
              <Text style={styles.floatingBagTotal}>{formatBRL(cartTotal)}</Text>
              <ArrowUpRight size={18} color={colors.white} />
            </View>
          </Pressable>
        </View>
      )}

      {!desktop && (
        <View accessibilityRole="tablist" style={[styles.tabBar, { paddingBottom: Math.max(inset.bottom, 8) }]}>
          {navigation}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Abrir sacola"
            onPress={cart}
            style={styles.tab}
          >
            <View>
              <ShoppingBag size={21} strokeWidth={1.8} color={count > 0 ? colors.accent : colors.textFaint} />
              {count > 0 ? (
                <View style={styles.mobileTabBadge}>
                  <Text style={styles.mobileTabBadgeText}>{count}</Text>
                </View>
              ) : null}
            </View>
            <Text style={[styles.tabLabel, count > 0 && styles.tabActive]}>Sacola</Text>
          </Pressable>
        </View>
      )}
      <CartSheet visible={cartOpen} onClose={() => setCartOpen(false)} />
    </View>
  );
}

export default function App() {
  const [loaded, error] = useFonts({
    Manrope_400Regular: require('@expo-google-fonts/manrope/400Regular/Manrope_400Regular.ttf'),
    Manrope_500Medium: require('@expo-google-fonts/manrope/500Medium/Manrope_500Medium.ttf'),
    Manrope_600SemiBold: require('@expo-google-fonts/manrope/600SemiBold/Manrope_600SemiBold.ttf'),
    Manrope_700Bold: require('@expo-google-fonts/manrope/700Bold/Manrope_700Bold.ttf'),
    Manrope_800ExtraBold: require('@expo-google-fonts/manrope/800ExtraBold/Manrope_800ExtraBold.ttf'),
  });
  if (!loaded && !error)
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  return (
    <SafeAreaProvider>
      <StoreProvider>
        <Shell />
      </StoreProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  layout: { flex: 1, flexDirection: 'row', minHeight: 0 },
  main: { flex: 1, minWidth: 0, minHeight: 0 },
  loading: { flex: 1, backgroundColor: colors.bg, justifyContent: 'center', alignItems: 'center' },
  sidebar: { width: 224, borderRightWidth: 1, borderRightColor: colors.border, padding: 22, paddingTop: 38 },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  brandIcon: {
    backgroundColor: colors.accent,
    width: 46,
    height: 46,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
  },
  brandName: { fontFamily: face.display, color: colors.text, fontSize: 21, lineHeight: 22, letterSpacing: -1 },
  brandNote: { fontFamily: face.bold, color: colors.accent, fontSize: 8, letterSpacing: 1.5, marginTop: 16 },
  sideNav: { marginTop: 42, gap: 8 },
  sideTab: { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 13, borderRadius: 14 },
  selectedTab: { backgroundColor: colors.accentSoft, borderWidth: 1, borderColor: 'rgba(234, 29, 44, 0.32)' },
  sideLabel: { color: colors.textMuted, fontFamily: face.medium, fontSize: 12 },
  navCount: { color: colors.textFaint, fontFamily: face.medium, fontSize: 11, marginLeft: 'auto' },
  cartShortcut: {
    marginTop: 26,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    borderRadius: 15,
    paddingVertical: 14,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  cartShortcutActive: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  cartShortcutSub: { color: 'rgba(255,255,255,0.85)', fontFamily: face.semibold, fontSize: 10, marginTop: 2 },
  sidebarBottom: { marginTop: 'auto', gap: 16, paddingBottom: 12 },
  projectButton: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 },
  projectText: { color: colors.textFaint, fontFamily: face.medium, fontSize: 10 },
  sidebarLocation: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  smallText: { color: colors.textMuted, fontFamily: face.medium, fontSize: 9 },
  demo: { color: colors.textFaint, fontFamily: face.medium, fontSize: 7, letterSpacing: 1.4 },
  floatingBagWrap: {
    paddingHorizontal: 14,
    paddingBottom: 8,
    backgroundColor: 'transparent',
  },
  floatingBagBar: {
    maxWidth: 534,
    width: '100%',
    alignSelf: 'center',
    backgroundColor: colors.accent,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: 'rgba(255, 184, 0, 0.45)',
  },
  floatingBagLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  floatingBagBadge: {
    minWidth: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  floatingBagBadgeText: { color: colors.accent, fontFamily: face.display, fontSize: 12 },
  floatingBagTitle: { color: colors.white, fontFamily: face.bold, fontSize: 13 },
  floatingBagSub: { color: 'rgba(255,255,255,0.82)', fontFamily: face.medium, fontSize: 10 },
  floatingBagRight: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  floatingBagTotal: { color: colors.white, fontFamily: face.display, fontSize: 15 },
  tabBar: {
    flexDirection: 'row',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.bg,
  },
  tab: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 5, minHeight: 48 },
  tabLabel: { color: colors.textFaint, fontFamily: face.medium, fontSize: 9 },
  tabActive: { color: colors.accent, fontFamily: face.bold },
  activeDot: {
    position: 'absolute',
    top: -8,
    width: 18,
    height: 2,
    borderRadius: 1,
    backgroundColor: colors.accent,
  },
  mobileTabBadge: {
    position: 'absolute',
    top: -5,
    right: -8,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  mobileTabBadgeText: { color: colors.white, fontFamily: face.bold, fontSize: 9 },
  back: { flexDirection: 'row', alignItems: 'center', padding: 20, gap: 10 },
  backLabel: { color: colors.text, fontFamily: face.medium, fontSize: 12 },
});
