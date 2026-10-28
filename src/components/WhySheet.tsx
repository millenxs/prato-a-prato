import { Image } from 'expo-image';
import { ArrowUpRight, ChevronDown, Clock3, MapPin, Sparkles, Star, X } from './icons';
import React, { useEffect, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { dishArtwork } from '../data/artwork';
import { colors, face } from '../theme';
import type { FeedItem, LabConfig, SessionMetrics, TasteEntry } from '../types';
import type { BuildFeedResult } from '../engine/ranking';
import { Bar, formatBRL } from './ui';

export function WhySheet({ visible, item, feed, lab, tasteProfile = [], onClose, onAdd }: {
  visible: boolean; item: FeedItem | null; feed: BuildFeedResult; lab: LabConfig;
  tasteProfile?: TasteEntry[]; metrics?: SessionMetrics;
  onClose: () => void; onAdd: (dishId: string) => void;
}) {
  const [explain, setExplain] = useState(false);
  const inset = useSafeAreaInsets();
  useEffect(() => { if (!visible) setExplain(false); }, [visible]);
  if (!item) return null;
  return <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
    <View style={styles.overlay}><Pressable accessibilityRole="button" accessibilityLabel="Fechar detalhes" style={StyleSheet.absoluteFill} onPress={onClose} />
      <View style={[styles.sheet, { paddingBottom: Math.max(inset.bottom, 16) }]}>
        <ScrollView showsVerticalScrollIndicator={false}>
          <View><Image source={dishArtwork(item.dish)} style={styles.photo} contentFit="cover" /><Pressable onPress={onClose} accessibilityRole="button" accessibilityLabel="Fechar" style={styles.close}><X size={21} color="white" /></Pressable></View>
          <View style={styles.content}>
            <Text style={styles.kicker}>{item.merchant.name.toUpperCase()}</Text><Text style={styles.title}>{item.dish.name}</Text><Text style={styles.body}>{item.dish.description}</Text>
            <View style={styles.facts}><View style={styles.fact}><Star size={16} color={colors.accent} /><Text style={styles.factText}>{item.merchant.rating.toFixed(1)}</Text></View><View style={styles.fact}><Clock3 size={16} color={colors.textMuted} /><Text style={styles.factText}>{item.merchant.etaMin} min</Text></View><View style={styles.fact}><MapPin size={16} color={colors.textMuted} /><Text style={styles.factText}>{item.merchant.distanceKm.toFixed(1)} km</Text></View></View>
            <View style={styles.tags}>{item.dish.tags.slice(0, 4).map((tag) => <Text key={tag} style={styles.tag}>{tag}</Text>)}</View>
            <Pressable onPress={() => setExplain(!explain)} accessibilityRole="button" accessibilityState={{ expanded: explain }} style={styles.explain}><Sparkles size={17} color={colors.accent} /><Text style={styles.explainText}>Por que apareceu para mim?</Text><ChevronDown size={18} color={colors.textMuted} /></Pressable>
            {explain && <View style={styles.explanation}><Text style={styles.body}>Usamos suas curtidas, visualizações completas e itens adicionados ao carrinho. Os pesos abaixo são regras do protótipo, não uma previsão de quanto você vai gostar.</Text>
              {tasteProfile.filter((tag) => tag.score > 0).length > 0 && <Text style={styles.note}>Seus interesses: {tasteProfile.filter((tag) => tag.score > 0).map((tag) => tag.tag).join(', ')}.</Text>}
              {item.factors.map((factor) => <View key={factor.key} style={styles.factor}><View style={styles.factorHeader}><Text style={styles.factorLabel}>{factor.label}</Text><Text style={styles.note}>{Math.round(factor.contribution * 100)} pts</Text></View><View style={{ height: 5, flexDirection: 'row' }}><Bar value={factor.value} color={colors.accent} height={5} /></View></View>)}
              <Text style={styles.note}>Loja aberta · item disponível · até {lab.maxEtaMin} min · raio de {lab.maxDistanceKm} km. {feed.eligible} de {feed.candidates} pratos elegíveis.</Text>
              {feed.excluded.map((entry) => <Text key={`${entry.dishId}-${entry.reason}`} style={styles.note}>{entry.dishName}: {entry.reason}.</Text>)}
            </View>}
            <Text style={styles.note}>Catálogo demonstrativo · fotografia ilustrativa.</Text>
          </View>
        </ScrollView>
        <View style={styles.footer}><View><Text style={styles.price}>{formatBRL(item.dish.price)}</Text><Text style={styles.note}>Entrega {formatBRL(item.merchant.deliveryFee)}</Text></View><Pressable style={styles.order} onPress={() => onAdd(item.dish.id)} accessibilityRole="button"><Text style={styles.orderText}>Adicionar</Text><ArrowUpRight size={20} color={colors.onAccent} /></Pressable></View>
      </View>
    </View>
  </Modal>;
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: '#000000AA', alignItems: 'center', justifyContent: 'flex-end' },
  sheet: { width: '100%', maxWidth: 540, maxHeight: '90%', backgroundColor: colors.surface, borderTopLeftRadius: 28, borderTopRightRadius: 28, overflow: 'hidden' },
  photo: { width: '100%', height: 200 },
  close: { position: 'absolute', top: 16, right: 16, backgroundColor: '#101210B0', borderRadius: 22, width: 44, height: 44, justifyContent: 'center', alignItems: 'center' },
  content: { padding: 24, gap: 17 },
  kicker: { fontFamily: face.semibold, color: colors.accent, fontSize: 9, letterSpacing: 1.5 },
  title: { fontFamily: face.display, color: colors.text, fontSize: 31, letterSpacing: -1 },
  body: { fontFamily: face.regular, color: colors.textMuted, fontSize: 13, lineHeight: 22 },
  facts: { flexDirection: 'row', gap: 25 },
  fact: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  factText: { fontFamily: face.semibold, color: colors.text, fontSize: 12 },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tag: { fontFamily: face.medium, color: colors.textMuted, backgroundColor: colors.surfaceRaised, borderRadius: 10, padding: 8, fontSize: 10 },
  explain: { flexDirection: 'row', alignItems: 'center', gap: 9, paddingVertical: 18, borderTopWidth: 1, borderTopColor: colors.border },
  explainText: { flex: 1, fontFamily: face.semibold, color: colors.text, fontSize: 12 },
  explanation: { gap: 15 },
  note: { fontFamily: face.regular, color: colors.textFaint, fontSize: 10, lineHeight: 17 },
  factor: { gap: 8 },
  factorHeader: { flexDirection: 'row', justifyContent: 'space-between' },
  factorLabel: { fontFamily: face.medium, color: colors.text, fontSize: 12 },
  footer: { paddingHorizontal: 24, paddingTop: 18, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, borderTopColor: colors.border },
  price: { fontFamily: face.bold, color: colors.text, fontSize: 23 },
  order: { flexDirection: 'row', alignItems: 'center', gap: 20, borderRadius: 14, backgroundColor: colors.accent, padding: 16 },
  orderText: { fontFamily: face.bold, color: colors.onAccent, fontSize: 13 },
});
