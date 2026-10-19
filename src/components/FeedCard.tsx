import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useMemo, useRef, useState } from 'react';
import { Animated, PanResponder, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';

import { colors, font, radius, spacing } from '../theme';
import type { FeedItem } from '../types';
import { Badge, formatBRL } from './ui';

const SWIPE_THRESHOLD = 110;

export function FeedCard({
  item,
  isSaved,
  onSkip,
  onSave,
  onAdd,
  onWhy,
}: {
  item: FeedItem;
  isSaved: boolean;
  onSkip: () => void;
  onSave: () => void;
  onAdd: () => void;
  onWhy: () => void;
}) {
  const { width } = useWindowDimensions();
  const pan = useRef(new Animated.ValueXY()).current;
  const [mediaFailed, setMediaFailed] = useState(false);
  const [added, setAdded] = useState(false);

  const responder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, gesture) =>
          Math.abs(gesture.dx) > 12 && Math.abs(gesture.dx) > Math.abs(gesture.dy) * 1.4,
        onPanResponderMove: Animated.event([null, { dx: pan.x, dy: pan.y }], { useNativeDriver: false }),
        onPanResponderRelease: (_, gesture) => {
          if (gesture.dx > SWIPE_THRESHOLD) {
            fling(1, onSave);
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
      toValue: { x: direction * width * 1.4, y: 0 },
      duration: 220,
      useNativeDriver: false,
    }).start(() => {
      done();
      pan.setValue({ x: 0, y: 0 });
    });
  };

  const rotate = pan.x.interpolate({
    inputRange: [-width / 2, 0, width / 2],
    outputRange: ['-7deg', '0deg', '7deg'],
  });
  const likeOpacity = pan.x.interpolate({ inputRange: [0, SWIPE_THRESHOLD], outputRange: [0, 1], extrapolate: 'clamp' });
  const skipOpacity = pan.x.interpolate({ inputRange: [-SWIPE_THRESHOLD, 0], outputRange: [1, 0], extrapolate: 'clamp' });

  const { merchant, dish } = item;

  return (
    <Animated.View
      {...responder.panHandlers}
      style={[styles.wrapper, { transform: [{ translateX: pan.x }, { translateY: pan.y }, { rotate }] }]}
    >
      <View style={styles.mediaWrap}>
        <LinearGradient colors={item.media.fallback} style={StyleSheet.absoluteFill} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />
        {mediaFailed ? (
          <View style={styles.emojiFallback}>
            <Text style={styles.emojiLarge}>{dish.emoji}</Text>
          </View>
        ) : (
          <Image
            source={{ uri: item.media.url }}
            style={StyleSheet.absoluteFill}
            contentFit="cover"
            transition={220}
            onError={() => setMediaFailed(true)}
          />
        )}
        <LinearGradient
          colors={['rgba(6,6,10,0.72)', 'rgba(6,6,10,0.10)', 'rgba(6,6,10,0.60)', 'rgba(6,6,10,0.96)']}
          locations={[0, 0.32, 0.62, 1]}
          style={StyleSheet.absoluteFill}
        />
      </View>

      <Animated.View style={[styles.stamp, styles.stampLike, { opacity: likeOpacity }]} pointerEvents="none">
        <Text style={styles.stampTextLike}>SALVAR</Text>
      </Animated.View>
      <Animated.View style={[styles.stamp, styles.stampSkip, { opacity: skipOpacity }]} pointerEvents="none">
        <Text style={styles.stampTextSkip}>PULAR</Text>
      </Animated.View>

      <View style={styles.topRow} pointerEvents="box-none">
        <View style={styles.topChips}>
          {dish.isNew ? <Badge label="NOVO" tone="gold" /> : null}
          {merchant.deliveryFee === 0 ? <Badge label="FRETE GRÁTIS" tone="success" /> : null}
          {merchant.open ? null : <Badge label="FECHADO" tone="danger" />}
        </View>
        <Pressable onPress={onWhy} accessibilityLabel="Por que este prato" style={styles.scoreChip}>
          <Text style={styles.scoreText}>{Math.round(item.score * 100)}</Text>
          <Text style={styles.scoreHint}>por quê?</Text>
        </Pressable>
      </View>

      <View style={styles.bottom} pointerEvents="box-none">
        <View style={styles.merchantRow}>
          <Text style={styles.merchantEmoji}>{merchant.emoji}</Text>
          <Text style={styles.merchantName} numberOfLines={1}>
            {merchant.name}
          </Text>
          <Text style={styles.meta}>★ {merchant.rating.toFixed(1)}</Text>
        </View>

        <Text style={styles.dishName}>{dish.name}</Text>
        <Text style={styles.description} numberOfLines={2}>
          {dish.description}
        </Text>

        <View style={styles.metaRow}>
          <Text style={styles.meta}>⏱ {merchant.etaMin} min</Text>
          <Text style={styles.dot}>•</Text>
          <Text style={styles.meta}>{merchant.distanceKm.toFixed(1)} km</Text>
          <Text style={styles.dot}>•</Text>
          <Text style={styles.meta}>entrega {formatBRL(merchant.deliveryFee)}</Text>
        </View>

        <View style={styles.tagRow}>
          {dish.tags.slice(0, 3).map((tag) => (
            <Badge key={tag} label={tag} />
          ))}
        </View>

        <View style={styles.actionRow}>
          <View>
            <Text style={styles.price}>{formatBRL(dish.price)}</Text>
            <Text style={styles.priceHint}>preço do prato</Text>
          </View>
          <View style={styles.buttons}>
            <Pressable style={[styles.round, styles.roundSkip]} onPress={onSkip} accessibilityLabel="Pular prato">
              <Text style={styles.roundIcon}>✕</Text>
            </Pressable>
            <Pressable
              style={[styles.round, styles.roundSave, isSaved && styles.roundSaved]}
              onPress={onSave}
              accessibilityLabel="Salvar prato"
            >
              <Text style={styles.roundIcon}>{isSaved ? '♥' : '♡'}</Text>
            </Pressable>
            <Pressable
              style={[styles.addButton, added && styles.addButtonDone]}
              onPress={() => {
                onAdd();
                setAdded(true);
              }}
              accessibilityLabel="Adicionar ao carrinho"
            >
              <Text style={styles.addButtonText}>{added ? 'Adicionado ✓' : 'Adicionar +'}</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
    margin: spacing.md,
    borderRadius: radius.xl,
    overflow: 'hidden',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  mediaWrap: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.surfaceRaised,
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
    fontSize: 96,
  },
  stamp: {
    position: 'absolute',
    top: 96,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 3,
  },
  stampLike: {
    left: spacing.lg,
    borderColor: colors.success,
    transform: [{ rotate: '-12deg' }],
  },
  stampSkip: {
    right: spacing.lg,
    borderColor: colors.danger,
    transform: [{ rotate: '12deg' }],
  },
  stampTextLike: { color: colors.success, fontWeight: '900', fontSize: 22, letterSpacing: 2 },
  stampTextSkip: { color: colors.danger, fontWeight: '900', fontSize: 22, letterSpacing: 2 },
  topRow: {
    position: 'absolute',
    top: spacing.lg,
    left: spacing.lg,
    right: spacing.lg,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  topChips: { flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap', maxWidth: '70%' },
  scoreChip: {
    alignItems: 'center',
    backgroundColor: 'rgba(6,6,10,0.66)',
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  scoreText: { color: colors.white, fontWeight: '800', fontSize: font.h3 },
  scoreHint: { color: colors.textMuted, fontSize: 10, letterSpacing: 0.4 },
  bottom: {
    position: 'absolute',
    left: spacing.lg,
    right: spacing.lg,
    bottom: spacing.lg,
    gap: spacing.sm,
  },
  merchantRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  merchantEmoji: { fontSize: 18 },
  merchantName: { color: colors.text, fontWeight: '700', fontSize: font.small, flexShrink: 1 },
  dishName: { color: colors.white, fontWeight: '900', fontSize: font.h2, letterSpacing: -0.5 },
  description: { color: colors.textMuted, fontSize: font.small, lineHeight: 19 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  meta: { color: colors.textMuted, fontSize: font.small, fontWeight: '600' },
  dot: { color: colors.textFaint },
  tagRow: { flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' },
  actionRow: {
    marginTop: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  price: { color: colors.white, fontWeight: '800', fontSize: font.h3 },
  priceHint: { color: colors.textFaint, fontSize: 10 },
  buttons: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  round: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.10)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.16)',
  },
  roundSkip: {},
  roundSave: {},
  roundSaved: { backgroundColor: colors.successSoft, borderColor: colors.success },
  roundIcon: { color: colors.white, fontSize: 20, fontWeight: '800' },
  addButton: {
    paddingHorizontal: spacing.lg,
    height: 46,
    borderRadius: 23,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addButtonDone: { backgroundColor: colors.success },
  addButtonText: { color: colors.white, fontWeight: '800', fontSize: font.body },
});
