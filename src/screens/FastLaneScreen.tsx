import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Badge, Button, Card, SectionLabel, formatBRL } from '../components/ui';
import { formatSeconds } from '../engine/metrics';
import { fastLane } from '../engine/ranking';
import { useStore } from '../state/store';
import { colors, font, radius, spacing } from '../theme';
import type { FeedItem } from '../types';

const ROUTES: Array<{ key: 'best' | 'fastest' | 'mostWanted'; title: string; subtitle: string }> = [
  { key: 'fastest', title: 'Chega mais rápido', subtitle: 'menor ETA entre os elegíveis' },
  { key: 'best', title: 'Melhor custo-benefício', subtitle: 'score por real gasto' },
  { key: 'mostWanted', title: 'Mais pedido agora', subtitle: 'volume das últimas horas' },
];

export function FastLaneScreen({
  onOpenCart,
  onGoFeed,
}: {
  onOpenCart: () => void;
  onGoFeed: () => void;
}) {
  const { state, metrics, actions } = useStore();
  const lanes = fastLane(state.feed);
  const verdict = state.checkoutDone
    ? 'pedido fechado'
    : metrics.timeToDecisionSec !== null
      ? `${formatSeconds(metrics.timeToDecisionSec)} até a decisão`
      : 'sem decisão ainda';

  const options: FeedItem[] = ROUTES.map((route) => lanes[route.key]).filter(
    (item): item is FeedItem => Boolean(item),
  );

  return (
    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <View style={styles.head}>
        <Text style={styles.title}>Atalho de decisão</Text>
        <Text style={styles.subtitle}>
          Quando rolar deixa de ser divertido e vira trabalho, o app corta o caminho: três rotas, uma escolha.
        </Text>
      </View>

      <View style={styles.statsRow}>
        <View style={styles.stat}>
          <Text style={styles.statValue}>{metrics.cardsShown}</Text>
          <Text style={styles.statLabel}>cards vistos</Text>
        </View>
        <View style={styles.stat}>
          <Text style={styles.statValue}>{formatSeconds(metrics.sessionSeconds)}</Text>
          <Text style={styles.statLabel}>tempo no app</Text>
        </View>
        <View style={styles.stat}>
          <Text style={styles.statValue}>{verdict}</Text>
          <Text style={styles.statLabel}>contra-métrica</Text>
        </View>
      </View>

      <SectionLabel>Escolha uma rota</SectionLabel>
      {options.map((item, index) => {
        const route = ROUTES[index] ?? ROUTES[0];
        return (
          <Card key={`${route?.key}-${item.dish.id}`}>
            <View style={styles.row}>
              <LinearGradient
                colors={item.media.fallback}
                style={styles.thumb}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <Text style={styles.thumbEmoji}>{item.dish.emoji}</Text>
              </LinearGradient>
              <View style={styles.rowText}>
                <Text style={styles.routeTitle}>{route?.title}</Text>
                <Text style={styles.routeSubtitle}>{route?.subtitle}</Text>
                <Text style={styles.dishName}>
                  {item.dish.name} · {formatBRL(item.dish.price)}
                </Text>
                <Text style={styles.merchantLine}>
                  {item.merchant.emoji} {item.merchant.name} · ⏱ {item.merchant.etaMin} min ·{' '}
                  {item.merchant.distanceKm.toFixed(1)} km
                </Text>
                <View style={styles.badges}>
                  <Badge label={`score ${Math.round(item.score * 100)}`} tone="accent" />
                  <Badge label={`margem ${Math.round(item.dish.marginPct * 100)}%`} tone="gold" />
                  <Badge label={`${item.dish.ordersToday} hoje`} />
                </View>
              </View>
            </View>
            <Pressable
              style={styles.addButton}
              onPress={() => {
                actions.add(item.dish.id);
                onOpenCart();
              }}
            >
              <Text style={styles.addButtonText}>Adicionar e fechar</Text>
            </Pressable>
          </Card>
        );
      })}

      <Card>
        <SectionLabel>Por que isso existe</SectionLabel>
        <Text style={styles.explain}>
          Um feed infinito maximiza tempo na tela. Em comida, o objetivo é o oposto: encurtar a decisão sem aumentar o
          subsídio. O atalho aparece depois de {6} cards ou 75 segundos e reduz a escolha a três rotas — nenhuma delas
          sorteada: todas saem das restrições duras.
        </Text>
        <Button title="Voltar ao feed" variant="outline" onPress={onGoFeed} />
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.lg, gap: spacing.lg, paddingBottom: spacing.xxl },
  head: { gap: spacing.sm },
  title: { color: colors.white, fontSize: font.h1, fontWeight: '900', letterSpacing: -0.8 },
  subtitle: { color: colors.textMuted, fontSize: font.body, lineHeight: 22 },
  statsRow: { flexDirection: 'row', gap: spacing.sm },
  stat: {
    flex: 1,
    backgroundColor: colors.surfaceRaised,
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 2,
  },
  statValue: { color: colors.white, fontSize: font.h3, fontWeight: '800' },
  statLabel: { color: colors.textFaint, fontSize: 10 },
  row: { flexDirection: 'row', gap: spacing.md, marginBottom: spacing.md },
  thumb: { width: 64, height: 64, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  thumbEmoji: { fontSize: 30 },
  rowText: { flex: 1, gap: 2 },
  routeTitle: { color: colors.accent, fontSize: font.micro, fontWeight: '800', letterSpacing: 1, textTransform: 'uppercase' },
  routeSubtitle: { color: colors.textFaint, fontSize: 10 },
  dishName: { color: colors.white, fontSize: font.body, fontWeight: '800', marginTop: 2 },
  merchantLine: { color: colors.textMuted, fontSize: font.micro },
  badges: { flexDirection: 'row', gap: spacing.sm, marginTop: 4, flexWrap: 'wrap' },
  addButton: {
    backgroundColor: colors.accent,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  addButtonText: { color: colors.white, fontWeight: '800' },
  explain: { color: colors.textMuted, fontSize: font.small, lineHeight: 20, marginBottom: spacing.md },
});
