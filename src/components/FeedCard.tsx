import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { ArrowUpRight, Heart, Info, Pause, Play, ShoppingBag, Star, Clock3 } from './icons';
import React, { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, AppState, Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { dishArtwork, merchantInitials } from '../data/artwork';
import { colors, face } from '../theme';
import type { FeedItem } from '../types';
import { formatBRL } from './ui';

export function FeedCard({
  item,
  isActive,
  isSaved,
  isWatchedComplete,
  cartQty,
  position,
  compact,
  onSave,
  onWatchComplete,
  onAdd,
  onOpenCart,
  onWhy,
}: {
  item: FeedItem;
  isActive: boolean;
  isSaved: boolean;
  isWatchedComplete: boolean;
  cartQty: number;
  position: string;
  compact: boolean;
  onSave: () => void;
  onWatchComplete: () => void;
  onAdd: () => void;
  onOpenCart: () => void;
  onWhy: () => void;
}) {
  const { dish, merchant } = item;
  const [paused, setPaused] = useState(false);
  const [foreground, setForeground] = useState(AppState.currentState === 'active' || Platform.OS === 'web');
  const [ready, setReady] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const elapsedRef = useRef(0);
  const completed = useRef(isWatchedComplete);
  const onComplete = useRef(onWatchComplete);
  const tapTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const zoom = useRef(new Animated.Value(1)).current;
  const burst = useRef(new Animated.Value(0)).current;
  const duration = Math.min(60, Math.max(1, dish.durationSec));
  const playing = isActive && !paused && foreground && ready;
  onComplete.current = onWatchComplete;
  completed.current = completed.current || isWatchedComplete;

  useEffect(() => {
    void AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion);
    const motion = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion);
    const app = AppState.addEventListener('change', (value) => setForeground(value === 'active'));
    const visibility = () => setForeground(document.visibilityState === 'visible');
    if (Platform.OS === 'web') document.addEventListener('visibilitychange', visibility);
    return () => {
      motion.remove();
      app.remove();
      if (Platform.OS === 'web') document.removeEventListener('visibilitychange', visibility);
      if (tapTimer.current) clearTimeout(tapTimer.current);
    };
  }, []);

  useEffect(() => {
    if (!isActive) {
      elapsedRef.current = 0;
      setElapsed(0);
      setPaused(false);
    }
  }, [isActive]);

  useEffect(() => {
    if (!playing) return;
    let previous = Date.now();
    const timer = setInterval(() => {
      const now = Date.now();
      elapsedRef.current += Math.min((now - previous) / 1000, 0.5);
      previous = now;
      if (elapsedRef.current >= duration) {
        if (!completed.current) {
          completed.current = true;
          onComplete.current();
        }
        elapsedRef.current = 0;
      }
      setElapsed(elapsedRef.current);
    }, 100);
    return () => clearInterval(timer);
  }, [playing, duration]);

  useEffect(() => {
    if (!playing || reduceMotion) return;
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(zoom, {
          toValue: 1.045,
          duration: 14000,
          useNativeDriver: Platform.OS !== 'web',
          isInteraction: false,
        }),
        Animated.timing(zoom, {
          toValue: 1,
          duration: 14000,
          useNativeDriver: Platform.OS !== 'web',
          isInteraction: false,
        }),
      ]),
    );
    animation.start();
    return () => animation.stop();
  }, [playing, reduceMotion, zoom]);

  const like = () => {
    if (!isSaved && !reduceMotion) {
      burst.setValue(1);
      Animated.timing(burst, { toValue: 0, duration: 700, useNativeDriver: Platform.OS !== 'web' }).start();
    }
    onSave();
  };

  const tap = () => {
    if (tapTimer.current) {
      clearTimeout(tapTimer.current);
      tapTimer.current = null;
      if (!isSaved) like();
    } else {
      tapTimer.current = setTimeout(() => {
        setPaused((value) => !value);
        tapTimer.current = null;
      }, 240);
    }
  };

  const offer = dish.promoOriginalPrice && dish.promoOriginalPrice > dish.price;

  return (
    <View style={styles.root} testID={`reel-${dish.id}`}>
      <Pressable
        style={StyleSheet.absoluteFill}
        onPress={tap}
        accessibilityRole="button"
        accessibilityLabel={paused ? 'Reproduzir slide' : 'Pausar slide'}
      >
        <Animated.View style={[StyleSheet.absoluteFill, { transform: [{ scale: zoom }] }]}>
          <Image
            source={dishArtwork(dish)}
            style={StyleSheet.absoluteFill}
            contentFit="cover"
            contentPosition="center"
            onLoad={() => setReady(true)}
            accessibilityLabel={`Foto ilustrativa de ${merchant.cuisine.toLowerCase()}`}
          />
        </Animated.View>
        <LinearGradient
          colors={['rgba(16, 6, 6, 0.34)', 'transparent', 'rgba(18, 6, 6, 0.22)', 'rgba(14, 6, 6, 0.96)']}
          locations={[0, 0.28, 0.5, 1]}
          style={StyleSheet.absoluteFill}
        />
        <Animated.View style={[styles.burst, { opacity: burst }]} pointerEvents="none">
          <Heart size={82} fill={colors.accent} color={colors.accent} strokeWidth={1} />
        </Animated.View>
      </Pressable>

      <View style={styles.top} pointerEvents="box-none">
        <View style={[styles.editorialTag, offer ? styles.offerTag : null]}>
          <View style={[styles.liveDot, offer ? { backgroundColor: colors.gold } : null]} />
          <Text style={styles.tagText}>
            {offer ? 'OFERTA QUENTE' : dish.reelKind === 'bastidores' ? 'DIRETO DA COZINHA' : 'DESCOBERTA DO DIA'}
          </Text>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={paused ? 'Continuar reprodução' : 'Pausar reprodução'}
          onPress={() => setPaused((v) => !v)}
          style={styles.playControl}
        >
          {paused ? <Play size={12} color="white" fill="white" /> : <Pause size={12} color="white" />}
          <Text style={styles.time}>
            SLIDE · {String(Math.floor(duration / 60))}:{String(duration % 60).padStart(2, '0')}
          </Text>
        </Pressable>
      </View>

      <View style={[styles.rail, compact && { bottom: 166, gap: 3 }]}>
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ selected: isSaved }}
          accessibilityLabel={isSaved ? 'Descurtir prato' : 'Curtir prato'}
          onPress={like}
          style={({ pressed }) => [styles.railButton, isSaved && styles.liked, pressed && styles.pressed]}
        >
          <Heart
            size={25}
            strokeWidth={1.8}
            color={isSaved ? colors.white : 'white'}
            fill={isSaved ? colors.accent : 'transparent'}
          />
        </Pressable>
        <Text style={styles.railCaption}>{isSaved ? 'Curtido' : 'Curtir'}</Text>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Adicionar ao carrinho"
          onPress={cartQty > 0 ? onOpenCart : onAdd}
          style={({ pressed }) => [styles.railButton, cartQty > 0 && styles.railCartActive, pressed && styles.pressed]}
        >
          <ShoppingBag size={23} strokeWidth={1.8} color="white" />
          {cartQty > 0 && (
            <View style={styles.counter}>
              <Text style={styles.counterText}>{cartQty}</Text>
            </View>
          )}
        </Pressable>
        <Text style={styles.railCaption}>{cartQty > 0 ? 'Sacola' : 'Pedir'}</Text>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Detalhes do prato"
          onPress={onWhy}
          style={styles.infoButton}
        >
          <Info size={22} color="white" strokeWidth={1.6} />
        </Pressable>
      </View>

      <View style={styles.bottom} pointerEvents="box-none">
        <View style={styles.copy} pointerEvents="none">
          <View style={styles.merchant}>
            <View style={styles.avatar}>
              <Text style={styles.initials}>{merchantInitials(merchant)}</Text>
            </View>
            <Text numberOfLines={1} style={styles.merchantName}>
              {merchant.name}
            </Text>
          </View>
          <Text style={[styles.title, compact && { fontSize: 26, lineHeight: 30 }]} numberOfLines={compact ? 1 : 2}>
            {dish.name}
          </Text>
          <Text style={[styles.description, compact && { marginTop: 6 }]} numberOfLines={compact ? 1 : 2}>
            {dish.description}
          </Text>
          <View style={styles.meta}>
            <Star size={13} color={colors.gold} fill={colors.gold} />
            <Text style={styles.metaText}>{merchant.rating.toFixed(1)}</Text>
            <View style={styles.dot} />
            <Clock3 size={13} color="#F2DFDA" />
            <Text style={styles.metaText}>{merchant.etaMin} min</Text>
            <View style={styles.dot} />
            <Text style={styles.metaText}>{merchant.distanceKm.toFixed(1)} km</Text>
          </View>
        </View>

        <View style={[styles.orderRow, compact && { marginTop: 12 }]}>
          <View>
            {offer ? (
              <Text style={styles.oldPrice}>de {formatBRL(dish.promoOriginalPrice!)}</Text>
            ) : (
              <Text style={styles.priceCaption}>PEDIR AGORA</Text>
            )}
            <Text style={styles.price}>{formatBRL(dish.price)}</Text>
          </View>

          <View style={styles.ctaGroup}>
            {cartQty > 0 ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Ver sacola e fazer checkout"
                onPress={onOpenCart}
                style={({ pressed }) => [styles.bagShortcutBtn, pressed && styles.pressed]}
              >
                <ShoppingBag size={16} color={colors.white} />
                <Text style={styles.bagShortcutText}>Finalizar ({cartQty})</Text>
              </Pressable>
            ) : null}

            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Pedir ${dish.name}`}
              onPress={onAdd}
              style={({ pressed }) => [styles.orderButton, pressed && styles.pressed]}
            >
              <Text style={styles.orderText}>{cartQty > 0 ? '+1 item' : 'Quero esse'}</Text>
              <ArrowUpRight size={20} color={colors.onAccent} />
            </Pressable>
          </View>
        </View>

        <View style={styles.bottomLine}>
          <Text style={styles.delivery}>Entrega {formatBRL(merchant.deliveryFee)}</Text>
          <Text style={styles.position}>{position}</Text>
        </View>
      </View>

      <View style={styles.track}>
        <View style={[styles.progress, { width: `${(elapsed / duration) * 100}%` }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surface, overflow: 'hidden' },
  top: {
    position: 'absolute',
    top: 22,
    left: 22,
    right: 22,
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  editorialTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    backgroundColor: 'rgba(24, 10, 10, 0.72)',
    borderWidth: 1,
    borderColor: 'rgba(234, 29, 44, 0.45)',
    paddingHorizontal: 11,
    paddingVertical: 8,
    borderRadius: 9,
  },
  offerTag: {
    backgroundColor: 'rgba(234, 29, 44, 0.88)',
    borderColor: 'rgba(255, 184, 0, 0.65)',
  },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.accent },
  tagText: { color: colors.text, fontFamily: face.bold, fontSize: 8, letterSpacing: 1.25 },
  playControl: {
    minHeight: 36,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    borderRadius: 9,
    backgroundColor: 'rgba(24, 10, 10, 0.62)',
  },
  time: { fontFamily: face.semibold, color: 'white', fontSize: 9, letterSpacing: 0.6 },
  burst: { position: 'absolute', top: '35%', alignSelf: 'center' },
  rail: { position: 'absolute', right: 20, bottom: 204, alignItems: 'center', gap: 6, zIndex: 2 },
  railButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(26, 12, 12, 0.64)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.24)',
  },
  liked: { borderColor: colors.accent, backgroundColor: 'rgba(234, 29, 44, 0.28)' },
  railCartActive: { borderColor: colors.gold, backgroundColor: 'rgba(234, 29, 44, 0.88)' },
  railCaption: { color: 'white', fontFamily: face.semibold, fontSize: 10, marginBottom: 9 },
  infoButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  counter: {
    position: 'absolute',
    top: -3,
    right: -4,
    backgroundColor: colors.gold,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  counterText: { color: '#1A0B0B', fontFamily: face.display, fontSize: 10 },
  bottom: { position: 'absolute', bottom: 20, left: 24, right: 24 },
  copy: { paddingRight: 56 },
  merchant: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  avatar: {
    width: 28,
    height: 28,
    borderRadius: 9,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  initials: { fontFamily: face.display, fontSize: 10, color: colors.white },
  merchantName: { color: '#F7E7E4', fontFamily: face.semibold, fontSize: 12, flexShrink: 1 },
  title: { fontFamily: face.display, fontSize: 34, lineHeight: 38, letterSpacing: -1.2, color: colors.text },
  description: { fontFamily: face.regular, fontSize: 12, lineHeight: 19, color: '#E6D2CE', marginTop: 8 },
  meta: { flexDirection: 'row', gap: 6, alignItems: 'center', marginTop: 12 },
  metaText: { fontFamily: face.medium, color: '#F2DFDA', fontSize: 11 },
  dot: { width: 3, height: 3, borderRadius: 1.5, backgroundColor: '#B89A94', marginHorizontal: 3 },
  orderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 20, gap: 10 },
  priceCaption: { fontFamily: face.bold, fontSize: 8, color: colors.gold, letterSpacing: 1.1 },
  price: { color: colors.text, fontFamily: face.display, fontSize: 26, letterSpacing: -0.9, marginTop: 2 },
  oldPrice: { color: '#D1B3AE', textDecorationLine: 'line-through', fontFamily: face.medium, fontSize: 11 },
  ctaGroup: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  bagShortcutBtn: {
    borderRadius: 15,
    minHeight: 50,
    paddingHorizontal: 14,
    backgroundColor: 'rgba(24, 12, 12, 0.88)',
    borderWidth: 1,
    borderColor: colors.gold,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  bagShortcutText: { fontFamily: face.bold, color: colors.gold, fontSize: 12 },
  orderButton: {
    borderRadius: 15,
    minHeight: 50,
    paddingHorizontal: 19,
    backgroundColor: colors.accent,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  orderText: { fontFamily: face.bold, color: colors.onAccent, fontSize: 13 },
  pressed: { opacity: 0.85, transform: [{ scale: 0.97 }] },
  bottomLine: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 12 },
  delivery: { color: '#C7ACA7', fontFamily: face.medium, fontSize: 10 },
  position: { color: '#C7ACA7', fontFamily: face.medium, fontSize: 10, letterSpacing: 2 },
  track: { position: 'absolute', bottom: 0, height: 3, left: 0, right: 0, backgroundColor: 'rgba(255,255,255,0.18)' },
  progress: { backgroundColor: colors.accent, height: 3 },
});
