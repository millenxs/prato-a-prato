import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, PanResponder, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';

import { colors, font, radius, spacing } from '../theme';
import type { FeedItem, ReelKind } from '../types';
import { formatBRL } from './ui';

const SWIPE_THRESHOLD = 100;

const KIND_BADGE: Record<ReelKind, { label: string; bg: string; color: string }> = {
  promocao: { label: '🔥 PROMOÇÃO NO REEL', bg: '#FF2D55', color: '#FFFFFF' },
  combo: { label: '🎁 COMBO ESPECIAL', bg: '#FFC857', color: '#111116' },
  bastidores: { label: '🎬 BASTIDORES DA COZINHA', bg: 'rgba(255,255,255,0.20)', color: '#FFFFFF' },
  prato: { label: '🍽 PRATO DO DIA', bg: 'rgba(255,90,54,0.88)', color: '#FFFFFF' },
};

const formatLikes = (count: number): string =>
  count >= 1000 ? `${(count / 1000).toFixed(1).replace('.', ',')} mil` : String(count);

const formatTimer = (sec: number): string => {
  const s = Math.max(0, Math.min(60, Math.floor(sec)));
  return `0:${s.toString().padStart(2, '0')}`;
};

export function FeedCard({
  item,
  isActive,
  isSaved,
  isWatchedComplete,
  cartQty,
  onSkip,
  onSave,
  onWatchComplete,
  onAdd,
  onWhy,
}: {
  item: FeedItem;
  isActive: boolean;
  isSaved: boolean;
  isWatchedComplete: boolean;
  cartQty: number;
  onSkip: () => void;
  onSave: () => void;
  onWatchComplete: () => void;
  onAdd: () => void;
  onWhy: () => void;
}) {
  const { width } = useWindowDimensions();
  const pan = useRef(new Animated.ValueXY()).current;
  const zoom = useRef(new Animated.Value(1)).current;
  const heartBurst = useRef(new Animated.Value(0)).current;
  const lastTapRef = useRef<number>(0);

  const [mediaFailed, setMediaFailed] = useState(false);
  const [paused, setPaused] = useState(false);
  const [elapsedSec, setElapsedSec] = useState(0);

  const { merchant, dish } = item;
  const durationSec = Math.min(60, Math.max(15, dish.durationSec));
  const progress = Math.min(1, elapsedSec / durationSec);

  // Movimento suave estilo vídeo (Ken Burns) enquanto o Reel está ativo.
  useEffect(() => {
    if (!isActive || paused) {
      zoom.stopAnimation();
      return;
    }
    zoom.setValue(1);
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(zoom, { toValue: 1.09, duration: 6500, useNativeDriver: false }),
        Animated.timing(zoom, { toValue: 1.0, duration: 6500, useNativeDriver: false }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [isActive, paused, zoom]);

  // Cronômetro real do Reel (máximo 60s). Ao completar >= 85% dispara `onWatchComplete`.
  useEffect(() => {
    if (!isActive) {
      setElapsedSec(0);
      setPaused(false);
      return;
    }
    if (paused) return;

    const interval = setInterval(() => {
      setElapsedSec((prev) => {
        const next = prev + 0.25;
        if (next >= durationSec * 0.85 && !isWatchedComplete) {
          onWatchComplete();
        }
        if (next >= durationSec) {
          return 0;
        }
        return next;
      });
    }, 250);

    return () => clearInterval(interval);
  }, [isActive, paused, durationSec, isWatchedComplete, onWatchComplete]);

  const triggerHeartBurst = () => {
    heartBurst.setValue(0);
    Animated.sequence([
      Animated.spring(heartBurst, { toValue: 1, friction: 4, useNativeDriver: false }),
      Animated.timing(heartBurst, { toValue: 0, duration: 260, useNativeDriver: false }),
    ]).start();
  };

  const handleVideoTap = () => {
    const now = Date.now();
    if (now - lastTapRef.current < 280) {
      if (!isSaved) onSave();
      triggerHeartBurst();
    } else {
      setPaused((prev) => !prev);
    }
    lastTapRef.current = now;
  };

  const fastForwardReel = () => {
    setElapsedSec((prev) => {
      const next = Math.min(durationSec, prev + Math.ceil(durationSec * 0.5));
      if (next >= durationSec * 0.85 && !isWatchedComplete) {
        onWatchComplete();
      }
      return next >= durationSec ? 0 : next;
    });
  };

  const responder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, gesture) =>
          Math.abs(gesture.dx) > 14 && Math.abs(gesture.dx) > Math.abs(gesture.dy) * 1.4,
        onPanResponderMove: Animated.event([null, { dx: pan.x, dy: pan.y }], { useNativeDriver: false }),
        onPanResponderRelease: (_, gesture) => {
          if (gesture.dx > SWIPE_THRESHOLD) {
            fling(1, () => {
              onSave();
              triggerHeartBurst();
            });
          } else if (gesture.dx < -SWIPE_THRESHOLD) {
            fling(-1, onSkip);
          } else {
            Animated.spring(pan, { toValue: { x: 0, y: 0 }, friction: 6, useNativeDriver: false }).start();
          }
        },
        onPanResponderTerminate: () => {
          Animated.spring(pan, { toValue: { x: 0, y: 0 }, friction: 6, useNativeDriver: false }).start();
        },
      }),
    [pan, onSave, onSkip],
  );

  const fling = (direction: 1 | -1, done: () => void) => {
    Animated.timing(pan, {
      toValue: { x: direction * width * 0.55, y: 0 },
      duration: 180,
      useNativeDriver: false,
    }).start(() => {
      done();
      pan.setValue({ x: 0, y: 0 });
    });
  };

  const kindMeta = KIND_BADGE[dish.reelKind];
  const handle = `@${merchant.name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '')}`;

  const heartScale = heartBurst.interpolate({ inputRange: [0, 1], outputRange: [0.3, 1.25] });

  return (
    <Animated.View {...responder.panHandlers} style={[styles.reelContainer, { transform: [{ translateX: pan.x }] }]}>
      <Pressable style={styles.mediaPressable} onPress={handleVideoTap}>
        <Animated.View style={[styles.mediaWrap, { transform: [{ scale: zoom }] }]}>
          <LinearGradient
            colors={item.media.fallback}
            style={StyleSheet.absoluteFill}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          />
          {mediaFailed ? (
            <View style={styles.emojiFallback}>
              <Text style={styles.emojiLarge}>{dish.emoji}</Text>
            </View>
          ) : (
            <Image
              source={{ uri: item.media.url }}
              style={StyleSheet.absoluteFill}
              contentFit="cover"
              transition={180}
              onError={() => setMediaFailed(true)}
            />
          )}
        </Animated.View>

        <LinearGradient
          colors={['rgba(0,0,0,0.62)', 'rgba(0,0,0,0.04)', 'rgba(0,0,0,0.45)', 'rgba(0,0,0,0.92)']}
          locations={[0, 0.28, 0.62, 1]}
          style={StyleSheet.absoluteFill}
          pointerEvents="none"
        />

        <Animated.View
          pointerEvents="none"
          style={[styles.centerHeartWrap, { opacity: heartBurst, transform: [{ scale: heartScale }] }]}
        >
          <Text style={styles.centerHeart}>♥</Text>
        </Animated.View>

        {paused ? (
          <View style={styles.pauseOverlay} pointerEvents="none">
            <Text style={styles.pauseIcon}>▶</Text>
            <Text style={styles.pauseLabel}>Toque para continuar o Reel</Text>
          </View>
        ) : null}
      </Pressable>

      {/* Pill de tempo do Reel (máx 60s) + avanço rápido para testar algoritmo */}
      <View style={styles.reelMetaBar} pointerEvents="box-none">
        <View style={styles.timerPill}>
          <View style={[styles.liveDot, isWatchedComplete && { backgroundColor: colors.success }]} />
          <Text style={styles.timerText}>
            {formatTimer(elapsedSec)} / {formatTimer(durationSec)} (máx 60s)
          </Text>
          {isWatchedComplete ? <Text style={styles.watchedBadge}>✓ visto completo</Text> : null}
        </View>
        <Pressable style={styles.ffButton} onPress={fastForwardReel}>
          <Text style={styles.ffButtonText}>⏩ +50% vídeo</Text>
        </Pressable>
      </View>

      {/* Coluna vertical direita idêntica ao TikTok / Instagram Reels */}
      <View style={styles.rightRail} pointerEvents="box-none">
        <Pressable style={styles.avatarWrap} onPress={onWhy} accessibilityLabel="Ver loja e algoritmo">
          <LinearGradient colors={item.media.fallback} style={styles.avatarCircle}>
            <Text style={styles.avatarEmoji}>{merchant.emoji}</Text>
          </LinearGradient>
          <View style={styles.avatarPlus}>
            <Text style={styles.avatarPlusText}>+</Text>
          </View>
        </Pressable>

        <Pressable
          style={styles.railAction}
          onPress={() => {
            onSave();
            triggerHeartBurst();
          }}
          accessibilityLabel="Curtir Reel"
        >
          <View style={[styles.railIconCircle, isSaved && styles.railIconLiked]}>
            <Text style={[styles.railIcon, isSaved && styles.railIconLikedText]}>♥</Text>
          </View>
          <Text style={styles.railCount}>{formatLikes(dish.likesCount + (isSaved ? 1 : 0))}</Text>
        </Pressable>

        <Pressable style={styles.railAction} onPress={onAdd} accessibilityLabel="Adicionar ao carrinho">
          <View style={[styles.railIconCircle, cartQty > 0 && styles.railIconCartActive]}>
            <Text style={styles.railIcon}>🛒</Text>
            {cartQty > 0 ? (
              <View style={styles.cartBadge}>
                <Text style={styles.cartBadgeText}>{cartQty}</Text>
              </View>
            ) : null}
          </View>
          <Text style={styles.railCount}>Pedir</Text>
        </Pressable>

        <Pressable style={styles.railAction} onPress={onWhy} accessibilityLabel="Ver algoritmo">
          <View style={styles.railIconCircle}>
            <Text style={styles.railScore}>{Math.round(item.score * 100)}%</Text>
          </View>
          <Text style={styles.railCount}>Match</Text>
        </Pressable>

        <Pressable style={styles.railAction} onPress={onSkip} accessibilityLabel="Não tenho interesse">
          <View style={styles.railIconCircle}>
            <Text style={styles.railIcon}>✕</Text>
          </View>
          <Text style={styles.railCount}>Pular</Text>
        </Pressable>
      </View>

      {/* Rodapé estilo TikTok / Reels: @loja, tipo de post, hook, tags, CTA de pedido e barra de progresso */}
      <View style={styles.bottomCaption} pointerEvents="box-none">
        <View style={styles.kindRow}>
          <View style={[styles.kindPill, { backgroundColor: kindMeta.bg }]}>
            <Text style={[styles.kindPillText, { color: kindMeta.color }]}>{kindMeta.label}</Text>
          </View>
          {dish.isNew ? (
            <View style={styles.newPill}>
              <Text style={styles.newPillText}>NOVO</Text>
            </View>
          ) : null}
        </View>

        <Text style={styles.handleText} numberOfLines={1}>
          {handle} <Text style={styles.handleMeta}>· ★ {merchant.rating.toFixed(1)} · ⏱ {merchant.etaMin} min · {merchant.distanceKm.toFixed(1)} km</Text>
        </Text>

        <Text style={styles.dishTitle}>{dish.name}</Text>
        <Text style={styles.hookText} numberOfLines={2}>
          {dish.hook} — <Text style={styles.descInline}>{dish.description}</Text>
        </Text>

        <Text style={styles.hashtags} numberOfLines={1}>
          {dish.tags.map((tag) => `#${tag}`).join('  ')}  #{merchant.cuisine.toLowerCase()}
        </Text>

        <View style={styles.orderStrip}>
          <View style={styles.priceBox}>
            {dish.promoOriginalPrice ? (
              <Text style={styles.oldPrice}>de {formatBRL(dish.promoOriginalPrice)}</Text>
            ) : (
              <Text style={styles.deliveryHint}>entrega {formatBRL(merchant.deliveryFee)}</Text>
            )}
            <Text style={styles.priceNow}>{formatBRL(dish.price)}</Text>
          </View>

          <Pressable style={styles.orderCta} onPress={onAdd}>
            <Text style={styles.orderCtaText}>
              {cartQty > 0 ? `🛒 No carrinho (${cartQty}) · +1` : '🛒 Fazer pedido agora'}
            </Text>
          </Pressable>
        </View>

        <View style={styles.audioRow}>
          <Text style={styles.audioText} numberOfLines={1}>
            ♪ {dish.audioTrack} · dê duplo-toque para ♥
          </Text>
        </View>
      </View>

      {/* Barra de progresso fininha na base do Reel (estilo TikTok/Reels) */}
      <View style={styles.progressTrack} pointerEvents="none">
        <View style={[styles.progressFill, { width: `${Math.round(progress * 100)}%` }]} />
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  reelContainer: {
    flex: 1,
    backgroundColor: '#050508',
    overflow: 'hidden',
  },
  mediaPressable: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  mediaWrap: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  emojiFallback: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emojiLarge: {
    fontSize: 120,
  },
  centerHeartWrap: {
    position: 'absolute',
    top: '38%',
    alignSelf: 'center',
  },
  centerHeart: {
    fontSize: 112,
    color: '#FF2D55',
    textShadowColor: 'rgba(0,0,0,0.55)',
    textShadowOffset: { width: 0, height: 6 },
    textShadowRadius: 16,
  },
  pauseOverlay: {
    position: 'absolute',
    top: '42%',
    alignSelf: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.55)',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: radius.lg,
  },
  pauseIcon: { color: colors.white, fontSize: 34, fontWeight: '900' },
  pauseLabel: { color: colors.textMuted, fontSize: font.micro, marginTop: 4 },
  reelMetaBar: {
    position: 'absolute',
    top: 86,
    left: spacing.md,
    right: spacing.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  timerPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(0,0,0,0.55)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
  },
  liveDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#FF2D55',
  },
  timerText: { color: colors.white, fontSize: 11, fontWeight: '800' },
  watchedBadge: { color: colors.success, fontSize: 10, fontWeight: '900' },
  ffButton: {
    backgroundColor: 'rgba(255,255,255,0.14)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.pill,
  },
  ffButtonText: { color: colors.white, fontSize: 11, fontWeight: '700' },
  rightRail: {
    position: 'absolute',
    right: 12,
    bottom: 92,
    alignItems: 'center',
    gap: 16,
  },
  avatarWrap: {
    alignItems: 'center',
    marginBottom: 4,
  },
  avatarCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    borderWidth: 2,
    borderColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarEmoji: { fontSize: 24 },
  avatarPlus: {
    marginTop: -10,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#FF2D55',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarPlusText: { color: colors.white, fontSize: 13, fontWeight: '900', lineHeight: 15 },
  railAction: {
    alignItems: 'center',
    gap: 3,
  },
  railIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(15,15,22,0.68)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.22)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  railIconLiked: {
    backgroundColor: 'rgba(255,45,85,0.24)',
    borderColor: '#FF2D55',
  },
  railIconCartActive: {
    backgroundColor: 'rgba(52,211,153,0.24)',
    borderColor: colors.success,
  },
  railIcon: { color: colors.white, fontSize: 22, fontWeight: '800' },
  railIconLikedText: { color: '#FF2D55' },
  railScore: { color: colors.gold, fontSize: 13, fontWeight: '900' },
  railCount: {
    color: colors.white,
    fontSize: 11,
    fontWeight: '700',
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  cartBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  cartBadgeText: { color: colors.white, fontSize: 10, fontWeight: '900' },
  bottomCaption: {
    position: 'absolute',
    left: spacing.md,
    right: 78,
    bottom: 16,
    gap: 5,
  },
  kindRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  kindPill: {
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: radius.sm,
  },
  kindPillText: { fontSize: 10, fontWeight: '900', letterSpacing: 0.4 },
  newPill: {
    backgroundColor: 'rgba(255,200,87,0.22)',
    borderWidth: 1,
    borderColor: colors.gold,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: radius.sm,
  },
  newPillText: { color: colors.gold, fontSize: 10, fontWeight: '900' },
  handleText: { color: colors.white, fontSize: font.body, fontWeight: '800' },
  handleMeta: { color: colors.textMuted, fontSize: font.micro, fontWeight: '600' },
  dishTitle: {
    color: colors.white,
    fontSize: font.h2,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  hookText: { color: '#F3F3F7', fontSize: font.small, fontWeight: '700', lineHeight: 18 },
  descInline: { color: colors.textMuted, fontWeight: '500' },
  hashtags: { color: colors.gold, fontSize: font.micro, fontWeight: '700' },
  orderStrip: {
    marginTop: 4,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(15,15,22,0.82)',
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.16)',
    gap: spacing.sm,
  },
  priceBox: {},
  oldPrice: { color: colors.textFaint, fontSize: 10, textDecorationLine: 'line-through' },
  deliveryHint: { color: colors.textMuted, fontSize: 10 },
  priceNow: { color: colors.white, fontSize: font.h3, fontWeight: '900' },
  orderCta: {
    backgroundColor: colors.accent,
    paddingHorizontal: spacing.md,
    paddingVertical: 9,
    borderRadius: radius.pill,
  },
  orderCtaText: { color: colors.white, fontSize: font.small, fontWeight: '900' },
  audioRow: { marginTop: 2 },
  audioText: { color: colors.textMuted, fontSize: 11, fontWeight: '600' },
  progressTrack: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.22)',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#FF2D55',
  },
});
