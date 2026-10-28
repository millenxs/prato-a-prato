import { Image } from 'expo-image';
import {
  ArrowUpRight,
  ChartNoAxesCombined,
  Heart,
  ShoppingBag,
  SlidersHorizontal,
  Sparkles,
} from '../components/icons';
import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Bar, formatBRL } from '../components/ui';
import { dishArtwork } from '../data/artwork';
import { dishById, merchantById } from '../data/seed';
import { useStore } from '../state/store';
import { colors, face } from '../theme';

export function CollectionScreen({ onOpenCart, onGoFeed }: { onOpenCart: () => void; onGoFeed: () => void }) {
  const { state, actions } = useStore();
  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Text style={styles.eyebrow}>SUA COLEÇÃO</Text>
      <Text style={styles.title}>
        Ficou na{'\n'}vontade.
      </Text>
      <Text style={styles.subtitle}>Os pratos que você curtiu, prontos para a próxima escolha.</Text>
      {state.savedIds.length === 0 ? (
        <View style={styles.empty}>
          <Heart size={34} color={colors.accent} strokeWidth={1.4} />
          <Text style={styles.emptyTitle}>Seu gosto começa aqui.</Text>
          <Text style={styles.subtitle}>Encontre um prato no feed e toque no coração para guardar.</Text>
          <Pressable onPress={onGoFeed} style={styles.primary}>
            <Text style={styles.primaryText}>Explorar sabores</Text>
            <ArrowUpRight size={18} color={colors.onAccent} />
          </Pressable>
        </View>
      ) : (
        <View style={styles.grid}>
          {[...state.savedIds].reverse().map((id) => {
            const dish = dishById.get(id);
            if (!dish) return null;
            return (
              <View key={id} style={styles.card}>
                <Image source={dishArtwork(dish)} style={styles.photo} contentFit="cover" />
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Descurtir ${dish.name}`}
                  onPress={() => actions.unsave(id)}
                  style={styles.heart}
                >
                  <Heart size={19} color={colors.accent} fill={colors.accent} />
                </Pressable>
                <View style={styles.cardBody}>
                  <Text numberOfLines={1} style={styles.restaurant}>
                    {merchantById.get(dish.merchantId)?.name}
                  </Text>
                  <Text style={styles.name}>{dish.name}</Text>
                  <View style={styles.priceRow}>
                    <Text style={styles.price}>{formatBRL(dish.price)}</Text>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`Pedir ${dish.name}`}
                      onPress={() => {
                        actions.add(id);
                        onOpenCart();
                      }}
                      style={styles.bag}
                    >
                      <ShoppingBag size={18} color={colors.onAccent} />
                    </Pressable>
                  </View>
                </View>
              </View>
            );
          })}
        </View>
      )}
    </ScrollView>
  );
}

export function ProfileScreen({
  onOpenLab,
  onOpenCase,
  onOpenCart,
}: {
  onOpenLab: () => void;
  onOpenCase: () => void;
  onOpenCart: () => void;
}) {
  const { tasteAnalysis, backendOnline, state, metrics, actions } = useStore();

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <View style={styles.topRow}>
        <Text style={styles.eyebrow}>INTELIGÊNCIA DE PALADAR</Text>
        <View style={[styles.apiBadge, backendOnline && styles.apiBadgeOnline]}>
          <View style={[styles.apiDot, backendOnline && { backgroundColor: colors.success }]} />
          <Text style={styles.apiBadgeText}>
            {backendOnline ? 'API Node.js + TS conectada (:3333)' : 'Motor Local Ativo'}
          </Text>
        </View>
      </View>

      <Text style={styles.title}>
        Seu paladar.{'\n'}Sua recomendação.
      </Text>
      <Text style={styles.subtitle}>{tasteAnalysis.summaryText}</Text>

      <View style={styles.profileCard}>
        <View style={styles.cardHeaderRow}>
          <Sparkles size={22} color={colors.gold} />
          <View style={{ flex: 1 }}>
            <Text style={styles.emptyTitle}>O que o algoritmo descobriu que você GOSTA</Text>
            <Text style={styles.note}>
              Confiança do modelo: {tasteAnalysis.confidencePct}% · {tasteAnalysis.totalSignals} interações analisadas
            </Text>
          </View>
        </View>

        {tasteAnalysis.willLike.length > 0 ? (
          <View style={styles.affinityList}>
            {tasteAnalysis.willLike.map((item) => (
              <View key={item.feature} style={styles.affinityRow}>
                <View style={styles.affinityHead}>
                  <Text style={styles.affinityName}>
                    #{item.feature} <Text style={styles.affinityKind}>({item.kind})</Text>
                  </Text>
                  <Text style={[styles.affinityPct, { color: colors.success }]}>
                    +{Math.round(item.score * 100)}% afinidade
                  </Text>
                </View>
                <View style={{ height: 6, flexDirection: 'row' }}>
                  <Bar value={Math.min(1, 0.35 + item.score * 0.65)} color={colors.success} height={6} />
                </View>
              </View>
            ))}
          </View>
        ) : (
          <Text style={styles.subtitle}>
            Curta um prato no coração, assista a um slide ou adicione à sacola para o motor aprender seus sabores
            preferidos.
          </Text>
        )}

        {tasteAnalysis.willDislike.length > 0 ? (
          <View style={styles.dislikeSection}>
            <Text style={styles.dislikeTitle}>O que o algoritmo rebaixou (você pulou ou evitou)</Text>
            <View style={styles.tags}>
              {tasteAnalysis.willDislike.map((entry) => (
                <View key={entry.feature} style={styles.dislikeTag}>
                  <Text style={styles.dislikeTagText}>
                    − #{entry.feature} ({Math.round(entry.score * 100)}%)
                  </Text>
                </View>
              ))}
            </View>
          </View>
        ) : null}
      </View>

      <Text style={[styles.eyebrow, { marginTop: 12 }]}>RECOMENDAÇÕES CORRETAS PARA VOCÊ AGORA</Text>
      <View style={styles.predList}>
        {tasteAnalysis.predictedFavorites.slice(0, 3).map((pred) => (
          <View key={pred.item.dish.id} style={styles.predCard}>
            <Image source={dishArtwork(pred.item.dish)} style={styles.predPhoto} contentFit="cover" />
            <View style={{ flex: 1, gap: 4 }}>
              <View style={styles.predTopRow}>
                <Text style={styles.restaurant} numberOfLines={1}>
                  {pred.item.merchant.name}
                </Text>
                <Text style={styles.matchPill}>{pred.matchPct}% compatível</Text>
              </View>
              <Text style={styles.predName}>{pred.item.dish.name}</Text>
              <Text style={styles.predReason} numberOfLines={1}>
                Por quê: {pred.reasonsToLike.join(' · ')}
              </Text>
              <View style={styles.predBottom}>
                <Text style={styles.price}>{formatBRL(pred.item.dish.price)}</Text>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Pedir recomendação ${pred.item.dish.name}`}
                  onPress={() => {
                    actions.add(pred.item.dish.id);
                    onOpenCart();
                  }}
                  style={styles.predBtn}
                >
                  <Text style={styles.predBtnText}>Pedir</Text>
                  <ArrowUpRight size={14} color={colors.white} />
                </Pressable>
              </View>
            </View>
          </View>
        ))}
      </View>

      <View style={styles.metrics}>
        {[
          { value: state.savedIds.length, label: 'curtidos' },
          { value: metrics.watchedComplete, label: 'slides completos' },
          { value: state.cart.reduce((sum, item) => sum + item.qty, 0), label: 'na sacola' },
        ].map((metric) => (
          <View key={metric.label} style={styles.metric}>
            <Text style={styles.metricValue}>{String(metric.value).padStart(2, '0')}</Text>
            <Text style={styles.metricLabel}>{metric.label}</Text>
          </View>
        ))}
      </View>

      <Pressable style={styles.menuRow} onPress={onOpenCart}>
        <ShoppingBag size={20} color={colors.textMuted} />
        <Text style={styles.menuLabel}>Sua sacola e pedidos em andamento</Text>
        <ArrowUpRight size={18} color={colors.textFaint} />
      </Pressable>

      <Text style={[styles.eyebrow, { marginTop: 24 }]}>POR DENTRO DO PROJETO</Text>
      <Pressable style={styles.menuRow} onPress={onOpenLab}>
        <SlidersHorizontal size={20} color={colors.textMuted} />
        <View style={{ flex: 1 }}>
          <Text style={styles.menuLabel}>Laboratório de recomendações</Text>
          <Text style={styles.note}>Ajuste pesos e entenda suas escolhas.</Text>
        </View>
        <ArrowUpRight size={18} color={colors.textFaint} />
      </Pressable>
      <Pressable style={styles.menuRow} onPress={onOpenCase}>
        <ChartNoAxesCombined size={20} color={colors.textMuted} />
        <View style={{ flex: 1 }}>
          <Text style={styles.menuLabel}>Case study A/B</Text>
          <Text style={styles.note}>Telemetria real da sua sessão + comparativo Feed vs. Busca.</Text>
        </View>
        <ArrowUpRight size={18} color={colors.textFaint} />
      </Pressable>
      <Text style={styles.note}>
        Prato a Prato sincroniza eventos e pedidos com a API REST em Node.js + TypeScript (server/index.ts) quando o
        servidor está ativo.
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 24, paddingTop: 28, gap: 16, width: '100%', maxWidth: 800, alignSelf: 'center', paddingBottom: 40 },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 },
  eyebrow: { color: colors.accent, fontFamily: face.semibold, fontSize: 9, letterSpacing: 2 },
  apiBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.surfaceRaised,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
  },
  apiBadgeOnline: { borderColor: colors.success },
  apiDot: { width: 7, height: 7, borderRadius: 3.5, backgroundColor: colors.gold },
  apiBadgeText: { color: colors.text, fontFamily: face.bold, fontSize: 10 },
  title: { color: colors.text, fontFamily: face.display, fontSize: 40, lineHeight: 44, letterSpacing: -1.8 },
  subtitle: { color: colors.textMuted, fontFamily: face.regular, fontSize: 13, lineHeight: 21 },
  empty: { paddingVertical: 42, alignItems: 'flex-start', gap: 17 },
  emptyTitle: { color: colors.text, fontFamily: face.bold, fontSize: 17, letterSpacing: -0.3 },
  primary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 24,
    padding: 17,
    borderRadius: 15,
    backgroundColor: colors.accent,
  },
  primaryText: { fontFamily: face.bold, color: colors.onAccent, fontSize: 13 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 14, marginTop: 10 },
  card: {
    flexGrow: 1,
    flexBasis: '45%',
    maxWidth: 350,
    borderRadius: 19,
    overflow: 'hidden',
    backgroundColor: colors.surface,
  },
  photo: { width: '100%', aspectRatio: 1 },
  heart: {
    position: 'absolute',
    right: 10,
    top: 10,
    height: 40,
    width: 40,
    backgroundColor: 'rgba(14, 8, 8, 0.78)',
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardBody: { padding: 14, gap: 6 },
  restaurant: { color: colors.textFaint, fontFamily: face.medium, fontSize: 10 },
  name: { color: colors.text, fontFamily: face.bold, fontSize: 17, letterSpacing: -0.5 },
  priceRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 10 },
  price: { color: colors.text, fontFamily: face.bold, fontSize: 15 },
  bag: { padding: 12, borderRadius: 12, backgroundColor: colors.accent },
  profileCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 22,
    padding: 20,
    gap: 16,
    marginTop: 6,
  },
  cardHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  affinityList: { gap: 10 },
  affinityRow: { gap: 5 },
  affinityHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  affinityName: { color: colors.text, fontFamily: face.bold, fontSize: 13 },
  affinityKind: { color: colors.textFaint, fontFamily: face.regular, fontSize: 11 },
  affinityPct: { fontFamily: face.bold, fontSize: 11 },
  dislikeSection: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 14,
    gap: 8,
  },
  dislikeTitle: { color: colors.textMuted, fontFamily: face.bold, fontSize: 12 },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  dislikeTag: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: colors.dangerSoft,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.danger,
  },
  dislikeTagText: { color: colors.danger, fontFamily: face.bold, fontSize: 11 },
  predList: { gap: 12 },
  predCard: {
    flexDirection: 'row',
    gap: 14,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 18,
    padding: 12,
    alignItems: 'center',
  },
  predPhoto: { width: 76, height: 76, borderRadius: 14 },
  predTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  matchPill: {
    color: colors.gold,
    fontFamily: face.bold,
    fontSize: 10,
    backgroundColor: 'rgba(255, 184, 0, 0.14)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
  },
  predName: { color: colors.text, fontFamily: face.bold, fontSize: 15 },
  predReason: { color: colors.textMuted, fontFamily: face.regular, fontSize: 11 },
  predBottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 },
  predBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.accent,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
  },
  predBtnText: { color: colors.white, fontFamily: face.bold, fontSize: 11 },
  metrics: { flexDirection: 'row', gap: 12, marginVertical: 10 },
  metric: { flex: 1, borderLeftWidth: 1, borderLeftColor: colors.border, paddingLeft: 14 },
  metricValue: { color: colors.text, fontFamily: face.bold, fontSize: 27 },
  metricLabel: { color: colors.textFaint, fontFamily: face.medium, fontSize: 9, marginTop: 4 },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 18,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: 14,
  },
  menuLabel: { color: colors.text, fontFamily: face.semibold, fontSize: 13, flex: 1 },
  note: { color: colors.textFaint, fontFamily: face.regular, fontSize: 10, lineHeight: 18, marginTop: 3 },
});
