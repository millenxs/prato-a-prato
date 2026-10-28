import { Image } from 'expo-image';
import { ArrowUpRight, Heart, ShoppingBag, SlidersHorizontal, ChartNoAxesCombined, Sparkles } from '../components/icons';
import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { dishArtwork } from '../data/artwork';
import { dishById, merchantById } from '../data/seed';
import { useStore } from '../state/store';
import { colors, face } from '../theme';
import { formatBRL } from '../components/ui';

export function CollectionScreen({ onOpenCart, onGoFeed }: { onOpenCart: () => void; onGoFeed: () => void }) {
  const { state, actions } = useStore();
  return <ScrollView contentContainerStyle={styles.content}>
    <Text style={styles.eyebrow}>SUA COLEÇÃO</Text><Text style={styles.title}>Ficou na{ '\n' }vontade.</Text><Text style={styles.subtitle}>Os pratos que você curtiu, prontos para a próxima escolha.</Text>
    {state.savedIds.length === 0 ? <View style={styles.empty}><Heart size={34} color={colors.accent} strokeWidth={1.4} /><Text style={styles.emptyTitle}>Seu gosto começa aqui.</Text><Text style={styles.subtitle}>Encontre um prato no feed e toque no coração para guardar.</Text><Pressable onPress={onGoFeed} style={styles.primary}><Text style={styles.primaryText}>Explorar sabores</Text><ArrowUpRight size={18} color={colors.onAccent} /></Pressable></View> : <View style={styles.grid}>{[...state.savedIds].reverse().map((id) => {
      const dish = dishById.get(id);
      if (!dish) return null;
      return <View key={id} style={styles.card}><Image source={dishArtwork(dish)} style={styles.photo} contentFit="cover" /><Pressable accessibilityRole="button" accessibilityLabel={`Descurtir ${dish.name}`} onPress={() => actions.unsave(id)} style={styles.heart}><Heart size={19} color={colors.accent} fill={colors.accent} /></Pressable><View style={styles.cardBody}><Text numberOfLines={1} style={styles.restaurant}>{merchantById.get(dish.merchantId)?.name}</Text><Text style={styles.name}>{dish.name}</Text><View style={styles.priceRow}><Text style={styles.price}>{formatBRL(dish.price)}</Text><Pressable accessibilityRole="button" accessibilityLabel={`Pedir ${dish.name}`} onPress={() => { actions.add(id); onOpenCart(); }} style={styles.bag}><ShoppingBag size={18} color={colors.onAccent} /></Pressable></View></View></View>;
    })}</View>}
  </ScrollView>;
}

export function ProfileScreen({ onOpenLab, onOpenCase, onOpenCart }: { onOpenLab: () => void; onOpenCase: () => void; onOpenCart: () => void }) {
  const { tasteProfile, state, metrics } = useStore();
  const interests = tasteProfile.filter((entry) => entry.score > 0);
  return <ScrollView contentContainerStyle={styles.content}>
    <Text style={styles.eyebrow}>CADA ESCOLHA CONTA</Text><Text style={styles.title}>Seu paladar.{ '\n' }Seu feed.</Text><Text style={styles.subtitle}>Curtidas, slides assistidos até o fim e pedidos ajudam a encontrar o seu próximo favorito.</Text>
    <View style={styles.profileCard}><Sparkles size={25} color={colors.accent} /><Text style={styles.emptyTitle}>O que está no seu radar</Text>{interests.length ? <View style={styles.tags}>{interests.map((entry) => <View key={entry.tag} style={styles.tag}><Text style={styles.tagText}>{entry.tag}</Text></View>)}</View> : <Text style={styles.subtitle}>Ainda estamos conhecendo seu gosto. Comece explorando os pratos.</Text>}<Text style={styles.note}>Perfil desta sessão · atualizado a cada interação</Text></View>
    <View style={styles.metrics}>{[{ value: state.savedIds.length, label: 'curtidos' }, { value: metrics.watchedComplete, label: 'assistidos até o fim' }, { value: state.cart.reduce((sum, item) => sum + item.qty, 0), label: 'no carrinho' }].map((metric) => <View key={metric.label} style={styles.metric}><Text style={styles.metricValue}>{String(metric.value).padStart(2, '0')}</Text><Text style={styles.metricLabel}>{metric.label}</Text></View>)}</View>
    <Pressable style={styles.menuRow} onPress={onOpenCart}><ShoppingBag size={20} color={colors.textMuted} /><Text style={styles.menuLabel}>Seu carrinho</Text><ArrowUpRight size={18} color={colors.textFaint} /></Pressable>
    <Text style={[styles.eyebrow, { marginTop: 24 }]}>POR DENTRO DO PROJETO</Text>
    <Pressable style={styles.menuRow} onPress={onOpenLab}><SlidersHorizontal size={20} color={colors.textMuted} /><View style={{ flex: 1 }}><Text style={styles.menuLabel}>Laboratório de recomendações</Text><Text style={styles.note}>Ajuste pesos e entenda suas escolhas.</Text></View><ArrowUpRight size={18} color={colors.textFaint} /></Pressable>
    <Pressable style={styles.menuRow} onPress={onOpenCase}><ChartNoAxesCombined size={20} color={colors.textMuted} /><View style={{ flex: 1 }}><Text style={styles.menuLabel}>Case study A/B</Text><Text style={styles.note}>Hipóteses de produto em uma simulação.</Text></View><ArrowUpRight size={18} color={colors.textFaint} /></Pressable>
    <Text style={styles.note}>Prato a Prato é uma demonstração de portfólio. Catálogo fictício, fotografias ilustrativas e pedidos simulados. O perfil é local e reinicia ao recarregar.</Text>
  </ScrollView>;
}

const styles = StyleSheet.create({
  content: { padding: 24, paddingTop: 32, gap: 16, width: '100%', maxWidth: 800, alignSelf: 'center', paddingBottom: 40 },
  eyebrow: { color: colors.accent, fontFamily: face.semibold, fontSize: 9, letterSpacing: 2 },
  title: { color: colors.text, fontFamily: face.display, fontSize: 44, lineHeight: 48, letterSpacing: -2 },
  subtitle: { color: colors.textMuted, fontFamily: face.regular, fontSize: 13, lineHeight: 22 },
  empty: { paddingVertical: 42, alignItems: 'flex-start', gap: 17 },
  emptyTitle: { color: colors.text, fontFamily: face.bold, fontSize: 19, letterSpacing: -0.4 },
  primary: { flexDirection: 'row', alignItems: 'center', gap: 24, padding: 17, borderRadius: 15, backgroundColor: colors.accent },
  primaryText: { fontFamily: face.bold, color: colors.onAccent, fontSize: 13 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 14, marginTop: 10 },
  card: { flexGrow: 1, flexBasis: '45%', maxWidth: 350, borderRadius: 19, overflow: 'hidden', backgroundColor: colors.surface },
  photo: { width: '100%', aspectRatio: 1 },
  heart: { position: 'absolute', right: 10, top: 10, height: 40, width: 40, backgroundColor: '#101210BB', borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  cardBody: { padding: 14, gap: 6 },
  restaurant: { color: colors.textFaint, fontFamily: face.medium, fontSize: 9 },
  name: { color: colors.text, fontFamily: face.bold, fontSize: 17, letterSpacing: -0.5 },
  priceRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 10 },
  price: { color: colors.text, fontFamily: face.semibold, fontSize: 16 },
  bag: { padding: 12, borderRadius: 12, backgroundColor: colors.accent },
  profileCard: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 22, padding: 23, gap: 18, marginTop: 10 },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tag: { paddingHorizontal: 13, paddingVertical: 8, backgroundColor: colors.accentSoft, borderRadius: 20 },
  tagText: { color: colors.accent, fontFamily: face.medium, fontSize: 12 },
  metrics: { flexDirection: 'row', gap: 12, marginVertical: 10 },
  metric: { flex: 1, borderLeftWidth: 1, borderLeftColor: colors.border, paddingLeft: 14 },
  metricValue: { color: colors.text, fontFamily: face.bold, fontSize: 27 },
  metricLabel: { color: colors.textFaint, fontFamily: face.medium, fontSize: 9, marginTop: 4 },
  menuRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 18, borderBottomWidth: 1, borderBottomColor: colors.border, gap: 14 },
  menuLabel: { color: colors.text, fontFamily: face.semibold, fontSize: 13, flex: 1 },
  note: { color: colors.textFaint, fontFamily: face.regular, fontSize: 10, lineHeight: 18, marginTop: 5 },
});
