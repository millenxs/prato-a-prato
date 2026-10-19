import React from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { useStore } from '../state/store';
import { colors, font, radius, spacing } from '../theme';
import { Badge, Button, SectionLabel, formatBRL } from './ui';

export function CartSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { cartItems, cartTotal, state, actions } = useStore();

  const deliveryFee = cartItems.length > 0 ? 6.9 : 0;
  const total = cartTotal + deliveryFee;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} />
      <View style={styles.sheet}>
        <View style={styles.handle} />

        {state.checkoutDone ? (
          <View style={styles.success}>
            <Text style={styles.successEmoji}>🎉</Text>
            <Text style={styles.successTitle}>Pedido simulado com sucesso</Text>
            <Text style={styles.successBody}>
              Aqui entraria o pagamento e o acompanhamento da entrega. No protótipo, o que interessa é o que veio
              antes: {state.cardsShown} cards vistos, {state.saves} salvos e {state.adds} adicionados.
            </Text>
            <Button title="Fechar" onPress={onClose} />
          </View>
        ) : (
          <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
            <SectionLabel>Seu carrinho</SectionLabel>
            {cartItems.length === 0 ? (
              <Text style={styles.empty}>Nada por aqui ainda. Deslize para a direita ou toque em “Adicionar”.</Text>
            ) : (
              <View style={styles.list}>
                {cartItems.map((item) => (
                  <View key={item.dishId} style={styles.line}>
                    <Text style={styles.lineEmoji}>{item.emoji}</Text>
                    <View style={styles.lineText}>
                      <Text style={styles.lineName}>{item.name}</Text>
                      <Text style={styles.lineMerchant}>{item.merchantName}</Text>
                    </View>
                    <View style={styles.qty}>
                      <Pressable style={styles.qtyButton} onPress={() => actions.remove(item.dishId)}>
                        <Text style={styles.qtyText}>−</Text>
                      </Pressable>
                      <Text style={styles.qtyValue}>{item.qty}</Text>
                      <Pressable style={styles.qtyButton} onPress={() => actions.add(item.dishId)}>
                        <Text style={styles.qtyText}>+</Text>
                      </Pressable>
                    </View>
                    <Text style={styles.linePrice}>{formatBRL(item.price * item.qty)}</Text>
                  </View>
                ))}
              </View>
            )}

            {cartItems.length > 0 ? (
              <View style={styles.totals}>
                <View style={styles.totalRow}>
                  <Text style={styles.totalLabel}>Subtotal</Text>
                  <Text style={styles.totalValue}>{formatBRL(cartTotal)}</Text>
                </View>
                <View style={styles.totalRow}>
                  <Text style={styles.totalLabel}>Entrega</Text>
                  <Text style={styles.totalValue}>{formatBRL(deliveryFee)}</Text>
                </View>
                <View style={styles.totalRow}>
                  <Text style={styles.totalStrong}>Total</Text>
                  <Text style={styles.totalStrong}>{formatBRL(total)}</Text>
                </View>
                <View style={styles.badgeRow}>
                  <Badge label="pagamento simulado" tone="gold" />
                  <Badge label="sem entrega real" tone="neutral" />
                </View>
                <Button title="Finalizar pedido" onPress={() => actions.checkout()} />
              </View>
            ) : null}

            <Button title="Voltar ao feed" variant="ghost" onPress={onClose} />
          </ScrollView>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: colors.overlay },
  sheet: {
    maxHeight: '80%',
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
  list: { gap: spacing.sm },
  line: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surfaceRaised,
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  lineEmoji: { fontSize: 22 },
  lineText: { flex: 1 },
  lineName: { color: colors.text, fontWeight: '700', fontSize: font.small },
  lineMerchant: { color: colors.textFaint, fontSize: font.micro },
  qty: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  qtyButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.10)',
  },
  qtyText: { color: colors.white, fontWeight: '800' },
  qtyValue: { color: colors.text, fontWeight: '700', minWidth: 16, textAlign: 'center' },
  linePrice: { color: colors.text, fontWeight: '700', fontSize: font.small, minWidth: 72, textAlign: 'right' },
  totals: { gap: spacing.sm },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between' },
  totalLabel: { color: colors.textMuted, fontSize: font.small },
  totalValue: { color: colors.text, fontSize: font.small },
  totalStrong: { color: colors.white, fontSize: font.h3, fontWeight: '800' },
  badgeRow: { flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' },
  empty: { color: colors.textMuted, fontSize: font.small, lineHeight: 20 },
  success: { padding: spacing.xl, gap: spacing.md, alignItems: 'center' },
  successEmoji: { fontSize: 44 },
  successTitle: { color: colors.white, fontSize: font.h3, fontWeight: '800', textAlign: 'center' },
  successBody: { color: colors.textMuted, fontSize: font.small, textAlign: 'center', lineHeight: 20 },
});
