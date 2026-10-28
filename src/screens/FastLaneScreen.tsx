import { Image } from 'expo-image';
import { ArrowUpRight, Clock3, Sparkles, TrendingUp } from '../components/icons';
import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { formatBRL } from '../components/ui';
import { dishArtwork } from '../data/artwork';
import { fastLane } from '../engine/ranking';
import { useStore } from '../state/store';
import { colors, face } from '../theme';

const ROUTES = [
  { key: 'fastest', title: 'Sem esperar muito', subtitle: 'A opção que chega mais rápido.', icon: Clock3 },
  { key: 'best', title: 'Uma boa escolha', subtitle: 'Uma combinação de preço e afinidade.', icon: Sparkles },
  { key: 'mostWanted', title: 'Na vontade de todo mundo', subtitle: 'Destaque de pedidos no catálogo demo.', icon: TrendingUp },
] as const;

export function FastLaneScreen({ onOpenCart, onGoFeed }: { onOpenCart: () => void; onGoFeed: () => void }) {
  const { state, actions } = useStore();
  const lanes = fastLane(state.feed);
  return <ScrollView contentContainerStyle={styles.content}>
    <Text style={styles.eyebrow}>MENOS DÚVIDA. MAIS SABOR.</Text><Text style={styles.title}>Deixa com{ '\n' }a gente.</Text><Text style={styles.subtitle}>Três caminhos para matar a fome. Você escolhe o que combina com o seu momento.</Text>
    {ROUTES.map(({ key, title, subtitle, icon: Icon }) => {
      const item = lanes[key];
      if (!item) return null;
      return <View style={styles.card} key={key}><View style={styles.cardHead}><Icon size={18} color={colors.accent} /><View style={{ flex: 1 }}><Text style={styles.reason}>{title}</Text><Text style={styles.reasonSub}>{subtitle}</Text></View></View><View style={styles.dishRow}><Image source={dishArtwork(item.dish)} style={styles.image} contentFit="cover" /><View style={styles.info}><Text style={styles.merchant}>{item.merchant.name}</Text><Text style={styles.dish}>{item.dish.name}</Text><Text style={styles.eta}>{item.merchant.etaMin} min · entrega {formatBRL(item.merchant.deliveryFee)}</Text><View style={styles.orderRow}><Text style={styles.price}>{formatBRL(item.dish.price)}</Text><Pressable accessibilityRole="button" accessibilityLabel={`Pedir ${item.dish.name}`} style={styles.order} onPress={() => { actions.add(item.dish.id); onOpenCart(); }}><ArrowUpRight size={20} color={colors.onAccent} /></Pressable></View></View></View></View>;
    })}
    {!state.feed.items.length && <Text style={styles.subtitle}>Nenhum prato atende aos filtros atuais. Ajuste suas preferências no Perfil.</Text>}
    <Pressable style={styles.back} onPress={onGoFeed}><Text style={styles.backText}>Prefiro continuar descobrindo</Text><ArrowUpRight size={16} color={colors.textMuted} /></Pressable>
  </ScrollView>;
}

const styles = StyleSheet.create({
  content: { padding: 24, paddingTop: 32, gap: 16, width: '100%', maxWidth: 800, alignSelf: 'center', paddingBottom: 40 },
  eyebrow: { color: colors.accent, fontFamily: face.semibold, fontSize: 9, letterSpacing: 2 },
  title: { fontFamily: face.display, color: colors.text, fontSize: 44, lineHeight: 48, letterSpacing: -2 },
  subtitle: { color: colors.textMuted, fontFamily: face.regular, fontSize: 13, lineHeight: 22, marginBottom: 10 },
  card: { padding: 18, borderRadius: 22, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, gap: 18 },
  cardHead: { flexDirection: 'row', alignItems: 'center', gap: 11 },
  reason: { fontFamily: face.bold, color: colors.text, fontSize: 13 },
  reasonSub: { fontFamily: face.regular, color: colors.textFaint, fontSize: 10, marginTop: 4 },
  dishRow: { flexDirection: 'row', gap: 17 },
  image: { width: 100, borderRadius: 15, minHeight: 135 },
  info: { flex: 1, gap: 7 },
  merchant: { color: colors.textFaint, fontFamily: face.medium, fontSize: 9 },
  dish: { color: colors.text, fontFamily: face.bold, fontSize: 20, lineHeight: 24, letterSpacing: -0.5 },
  eta: { color: colors.textMuted, fontFamily: face.medium, fontSize: 10 },
  orderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto', paddingTop: 8 },
  price: { color: colors.text, fontFamily: face.semibold, fontSize: 19 },
  order: { width: 42, height: 42, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.accent, borderRadius: 13 },
  back: { paddingVertical: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
  backText: { fontFamily: face.medium, color: colors.textMuted, fontSize: 12 },
});
