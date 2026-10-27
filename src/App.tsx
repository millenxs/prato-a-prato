import { StatusBar } from 'expo-status-bar';
import React, { useState } from 'react';
import { Platform, Pressable, StatusBar as RNStatusBar, StyleSheet, Text, View, useWindowDimensions } from 'react-native';

import { CartSheet } from './components/CartSheet';
import { ExperimentScreen } from './screens/ExperimentScreen';
import { FastLaneScreen } from './screens/FastLaneScreen';
import { FeedScreen } from './screens/FeedScreen';
import { LabScreen } from './screens/LabScreen';
import { StoreProvider, useStore } from './state/store';
import { colors, font, spacing } from './theme';

const TOP_PADDING = Platform.select({ android: RNStatusBar.currentHeight ?? 24, default: 52 }) ?? 24;
const TAB_BAR_HEIGHT = 68;

type Tab = 'feed' | 'decide' | 'experiment' | 'lab';

const TABS: Array<{ key: Tab; label: string; icon: string }> = [
  { key: 'feed', label: 'Feed', icon: '🍽' },
  { key: 'decide', label: 'Decidir', icon: '⚡' },
  { key: 'experiment', label: 'Case A/B', icon: '📊' },
  { key: 'lab', label: 'Laboratório', icon: '🎛' },
];

function Shell() {
  const [tab, setTab] = useState<Tab>('feed');
  const [cartOpen, setCartOpen] = useState(false);
  const { height } = useWindowDimensions();
  const { state } = useStore();

  const cardHeight = Math.max(320, height - TOP_PADDING - TAB_BAR_HEIGHT - 8);

  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      <View style={{ flex: 1, paddingTop: TOP_PADDING }}>
        {tab === 'feed' ? (
          <FeedScreen
            cardHeight={cardHeight}
            onOpenCart={() => setCartOpen(true)}
            onOpenFastLane={() => setTab('decide')}
          />
        ) : null}
        {tab === 'decide' ? (
          <FastLaneScreen onOpenCart={() => setCartOpen(true)} onGoFeed={() => setTab('feed')} />
        ) : null}
        {tab === 'experiment' ? <ExperimentScreen /> : null}
        {tab === 'lab' ? <LabScreen /> : null}
      </View>

      <View style={styles.tabBar}>
        {TABS.map((item) => {
          const active = tab === item.key;
          return (
            <Pressable key={item.key} style={styles.tab} onPress={() => setTab(item.key)}>
              <Text style={[styles.tabIcon, active && styles.tabIconActive]}>{item.icon}</Text>
              <Text style={[styles.tabLabel, active && styles.tabLabelActive]}>{item.label}</Text>
              {item.key === 'decide' && state.cart.length > 0 ? <View style={styles.dot} /> : null}
            </Pressable>
          );
        })}
      </View>

      <CartSheet visible={cartOpen} onClose={() => setCartOpen(false)} />
    </View>
  );
}

export default function App() {
  return (
    <StoreProvider>
      <Shell />
    </StoreProvider>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  tabBar: {
    height: TAB_BAR_HEIGHT,
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.surface,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  tabIcon: { fontSize: 20, opacity: 0.5 },
  tabIconActive: { opacity: 1 },
  tabLabel: { color: colors.textFaint, fontSize: font.micro, fontWeight: '700' },
  tabLabelActive: { color: colors.text },
  dot: {
    position: 'absolute',
    top: spacing.md,
    right: '32%',
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.accent,
  },
});
