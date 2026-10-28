import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { colors, font, radius, spacing } from '../theme';
import type { FeedItem, LabConfig, SessionMetrics, TasteEntry } from '../types';
import type { BuildFeedResult } from '../engine/ranking';
import { Badge, Bar, Button, SectionLabel, formatBRL } from './ui';

export function WhySheet({
  visible,
  item,
  feed,
  lab,
  tasteProfile = [],
  metrics,
  onClose,
  onAdd,
}: {
  visible: boolean;
  item: FeedItem | null;
  feed: BuildFeedResult;
  lab: LabConfig;
  tasteProfile?: TasteEntry[];
  metrics?: SessionMetrics;
  onClose: () => void;
  onAdd: (dishId: string) => void;
}) {
  if (!item) return null;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} />
      <View style={styles.sheet}>
        <View style={styles.handle} />
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.headerRow}>
            <LinearGradient colors={item.media.fallback} style={styles.thumb} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
              <Text style={styles.thumbEmoji}>{item.dish.emoji}</Text>
            </LinearGradient>
            <View style={styles.headerText}>
              <Text style={styles.dishName}>{item.dish.name}</Text>
              <Text style={styles.merchant}>
                {item.merchant.emoji} {item.merchant.name} · Reel de {item.dish.durationSec}s ({item.dish.reelKind})
              </Text>
              <Text style={styles.scoreLine}>
                match com você <Text style={styles.scoreValue}>{(item.score * 100).toFixed(0)}%</Text>
              </Text>
            </View>
          </View>

          <SectionLabel>🧠 Seu perfil no algoritmo (aprendizado ao vivo)</SectionLabel>
          <View style={styles.signalGrid}>
            <View style={styles.signalChip}>
              <Text style={styles.signalValue}>♥ {metrics?.saves ?? 0}</Text>
              <Text style={styles.signalLabel}>Likes (+22%)</Text>
            </View>
            <View style={styles.signalChip}>
              <Text style={styles.signalValue}>🎬 {metrics?.watchedComplete ?? 0}</Text>
              <Text style={styles.signalLabel}>Vistos 100% (+16%)</Text>
            </View>
            <View style={styles.signalChip}>
              <Text style={styles.signalValue}>🛒 {metrics?.adds ?? 0}</Text>
              <Text style={styles.signalLabel}>Carrinho (+32%)</Text>
            </View>
            <View style={styles.signalChip}>
              <Text style={styles.signalValue}>✕ {metrics?.skips ?? 0}</Text>
              <Text style={styles.signalLabel}>Pulos (-14%)</Text>
            </View>
          </View>

          {tasteProfile.length === 0 ? (
            <Text style={styles.muted}>
              Interaja nos Reels (dê like no ♥, assista até o fim ou clique no 🛒) para ver seu DNA de gosto se formar
              aqui e reordenar os próximos vídeos.
            </Text>
          ) : (
            <View style={styles.factorList}>
              {tasteProfile.map((entry) => {
                const normalized = Math.max(0.05, Math.min(1, 0.5 + entry.score * 0.5));
                const positive = entry.score >= 0;
                return (
                  <View key={entry.tag} style={styles.factorRow}>
                    <View style={styles.factorHeader}>
                      <Text style={styles.factorLabel}>#{entry.tag}</Text>
                      <Text style={[styles.factorValue, { color: positive ? colors.success : colors.danger }]}>
                        {positive ? '+' : ''}
                        {Math.round(entry.score * 100)} pts de afinidade
                      </Text>
                    </View>
                    <Bar value={normalized} color={positive ? colors.success : colors.danger} height={6} />
                  </View>
                );
              })}
            </View>
          )}

          <SectionLabel>Como este Reel foi pontuado</SectionLabel>
          <View style={styles.factorList}>
            {item.factors.map((factor) => (
              <View key={factor.key} style={styles.factorRow}>
                <View style={styles.factorHeader}>
                  <Text style={styles.factorLabel}>{factor.label}</Text>
                  <Text style={styles.factorValue}>
                    {Math.round(factor.contribution * 100)} pts · peso {Math.round(factor.weight * 100)}%
                  </Text>
                </View>
                <Bar value={factor.value} color={factor.key === 'margin' ? colors.gold : colors.accent} height={6} />
                <Text style={styles.factorHint}>{factor.hint}</Text>
              </View>
            ))}
          </View>

          <SectionLabel>Restrições duras que este Reel passou</SectionLabel>
          <View style={styles.constraintRow}>
            <Badge label="loja aberta" tone="success" />
            <Badge label={`duração ${item.dish.durationSec}s ≤ 60s`} tone="success" />
            <Badge label={`ETA ${item.merchant.etaMin} ≤ ${lab.maxEtaMin} min`} tone="success" />
            <Badge label={`${item.merchant.distanceKm.toFixed(1)} ≤ ${lab.maxDistanceKm} km`} tone="success" />
            <Badge label={`cozinha ${item.merchant.openOrders}/${item.merchant.capacityPerHour}`} tone="success" />
            <Badge label="item disponível" tone="success" />
          </View>

          <SectionLabel>Por que outros ficaram de fora</SectionLabel>
          {feed.excluded.length === 0 ? (
            <Text style={styles.muted}>Nada foi barrado com a configuração atual.</Text>
          ) : (
            <View style={styles.exclusionList}>
              {feed.excluded.map((ex) => (
                <View key={`${ex.dishId}-${ex.reason}`} style={styles.exclusionRow}>
                  <Text style={styles.exclusionName} numberOfLines={1}>
                    {ex.dishName}
                  </Text>
                  <Text style={styles.exclusionMerchant} numberOfLines={1}>
                    {ex.merchantName}
                  </Text>
                  <Text style={styles.exclusionReason}>{ex.reason}</Text>
                </View>
              ))}
            </View>
          )}

          {feed.blockedByReason.length > 0 ? (
            <Text style={styles.summary}>
              {feed.eligible} de {feed.candidates} Reels elegíveis ·{' '}
              {feed.blockedByReason.map((b) => `${b.count} ${b.reason}`).join(' · ')}
              {feed.cappedOut > 0
                ? ` · ${feed.cappedOut} card(s) ficaram fora por causa do teto de ${lab.maxPerMerchant} por loja`
                : ''}
            </Text>
          ) : null}

          <View style={styles.actions}>
            <Button title={`🛒 Fazer pedido · ${formatBRL(item.dish.price)}`} onPress={() => onAdd(item.dish.id)} />
            <Button title="Continuar assistindo Reels" variant="ghost" onPress={onClose} />
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: colors.overlay },
  sheet: {
    maxHeight: '85%',
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    borderTopWidth: 1,
    borderColor: colors.border,
  },
  handle: {
    alignSelf: 'center',
    width: 44,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
    marginTop: spacing.md,
  },
  content: { padding: spacing.lg, gap: spacing.lg, paddingBottom: spacing.xxl },
  headerRow: { flexDirection: 'row', gap: spacing.lg, alignItems: 'center' },
  thumb: { width: 72, height: 72, borderRadius: radius.lg, alignItems: 'center', justifyContent: 'center' },
  thumbEmoji: { fontSize: 34 },
  headerText: { flex: 1, gap: 2 },
  dishName: { color: colors.white, fontSize: font.h3, fontWeight: '800' },
  merchant: { color: colors.textMuted, fontSize: font.small },
  scoreLine: { color: colors.textFaint, fontSize: font.small, marginTop: 2 },
  scoreValue: { color: colors.accent, fontWeight: '800' },
  signalGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  signalChip: {
    width: '47%',
    backgroundColor: colors.surfaceRaised,
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 2,
  },
  signalValue: { color: colors.white, fontSize: font.body, fontWeight: '800' },
  signalLabel: { color: colors.textFaint, fontSize: 10 },
  factorList: { gap: spacing.md },
  factorRow: { gap: 6 },
  factorHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  factorLabel: { color: colors.text, fontSize: font.small, fontWeight: '700' },
  factorValue: { color: colors.textFaint, fontSize: font.micro, fontWeight: '700' },
  factorHint: { color: colors.textFaint, fontSize: font.micro },
  constraintRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  exclusionList: { gap: spacing.sm },
  exclusionRow: {
    backgroundColor: colors.surfaceRaised,
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  exclusionName: { color: colors.text, fontWeight: '700', fontSize: font.small },
  exclusionMerchant: { color: colors.textFaint, fontSize: font.micro },
  exclusionReason: { color: colors.danger, fontSize: font.small, marginTop: 2 },
  summary: { color: colors.textMuted, fontSize: font.small, lineHeight: 20 },
  muted: { color: colors.textMuted, fontSize: font.small, lineHeight: 20 },
  actions: { gap: spacing.sm },
});
