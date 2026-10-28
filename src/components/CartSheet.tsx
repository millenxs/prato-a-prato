import { Image } from 'expo-image';
import { ArrowLeft, ArrowUpRight, Check, Clock3, MapPin, Minus, Plus, ShoppingBag, Sparkles, X } from './icons';
import React, { useEffect, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { dishArtwork } from '../data/artwork';
import { dishById, merchantById } from '../data/seed';
import { useStore } from '../state/store';
import { colors, face } from '../theme';
import { Button, formatBRL } from './ui';

type Step = 'bag' | 'checkout';
type CouponKey = 'NONE' | 'FOME10' | 'FRETEGRATIS';
type PaymentMethod = 'pix' | 'card' | 'apple_pay' | 'delivery';
type DeliveryMode = 'standard' | 'express';

const ADDRESSES = [
  { id: 'home', label: 'Casa', detail: 'Av. da Integração, 420 · Apto 302 · Petrolina, PE' },
  { id: 'work', label: 'Trabalho', detail: 'Av. Guararapes, 1180 · Centro · Petrolina, PE' },
] as const;

const PAYMENTS: Array<{ id: PaymentMethod; title: string; subtitle: string; badge?: string }> = [
  { id: 'pix', title: 'Pix · Aprovação imediata', subtitle: 'Código QR / Copia e Cola gerado na hora', badge: 'Mais rápido' },
  { id: 'card', title: 'Cartão de Crédito •••• 4821', subtitle: 'Mastercard final 4821 · 1x sem juros' },
  { id: 'apple_pay', title: 'Apple Pay / Carteira Digital', subtitle: 'Confirmação com Face ID no iPhone' },
  { id: 'delivery', title: 'Pagar na entrega', subtitle: 'Maquininha (cartão ou aproximação)' },
];

const NOTES = ['Enviar sachês e guardanapo', 'Sem cebola', 'Tocar interfone ao chegar', 'CPF na nota'] as const;

export function CartSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { cartItems, cartTotal, state, actions } = useStore();
  const inset = useSafeAreaInsets();

  const [step, setStep] = useState<Step>('bag');
  const [coupon, setCoupon] = useState<CouponKey>('FOME10');
  const [addressId, setAddressId] = useState<string>('home');
  const [deliveryMode, setDeliveryMode] = useState<DeliveryMode>('standard');
  const [payment, setPayment] = useState<PaymentMethod>('pix');
  const [selectedNotes, setSelectedNotes] = useState<string[]>(['Enviar sachês e guardanapo']);

  useEffect(() => {
    if (!visible) {
      setStep('bag');
    }
  }, [visible]);

  const merchantIds = new Set(cartItems.map((line) => dishById.get(line.dishId)?.merchantId));
  const baseDeliveryFee = [...merchantIds].reduce((sum, id) => sum + (id ? merchantById.get(id)?.deliveryFee ?? 0 : 0), 0);
  const expressExtra = deliveryMode === 'express' && cartItems.length > 0 ? 4.9 : 0;
  const rawDeliveryFee = baseDeliveryFee + expressExtra;
  const couponDiscount =
    cartItems.length === 0
      ? 0
      : coupon === 'FOME10'
        ? Math.min(10, cartTotal * 0.25)
        : coupon === 'FRETEGRATIS'
          ? baseDeliveryFee
          : 0;
  const finalTotal = Math.max(0, cartTotal + rawDeliveryFee - couponDiscount);
  const chosenAddress = ADDRESSES.find((a) => a.id === addressId) ?? ADDRESSES[0];
  const chosenPayment = PAYMENTS.find((p) => p.id === payment) ?? PAYMENTS[0];

  const toggleNote = (note: string) => {
    setSelectedNotes((prev) => (prev.includes(note) ? prev.filter((item) => item !== note) : [...prev, note]));
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel="Fechar carrinho"
        />
        <View style={[styles.sheet, { paddingBottom: Math.max(18, inset.bottom) }]}>
          <View style={styles.handle} />

          <View style={styles.header}>
            <View style={styles.headerLeft}>
              {step === 'checkout' && !state.checkoutDone ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Voltar para a sacola"
                  onPress={() => setStep('bag')}
                  style={styles.backBtn}
                >
                  <ArrowLeft size={18} color={colors.text} />
                </Pressable>
              ) : null}
              <View>
                <Text style={styles.eyebrow}>
                  {state.checkoutDone
                    ? 'PEDIDO CONFIRMADO'
                    : step === 'checkout'
                      ? 'PASSO 2 DE 2 · CHECKOUT'
                      : 'PASSO 1 DE 2 · SUA SACOLA'}
                </Text>
                <Text style={styles.title}>
                  {state.checkoutDone
                    ? 'Pedido a caminho!'
                    : step === 'checkout'
                      ? 'Entrega e pagamento'
                      : 'Sua sacola'}
                </Text>
              </View>
            </View>
            <Pressable accessibilityRole="button" accessibilityLabel="Fechar" onPress={onClose} style={styles.close}>
              <X size={20} color={colors.text} />
            </Pressable>
          </View>

          {state.checkoutDone ? (
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.successWrap}>
              <View style={styles.successBanner}>
                <View style={styles.successIcon}>
                  <Check size={28} color={colors.onAccent} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.orderCode}>Pedido #PP-4829 confirmado</Text>
                  <Text style={styles.emptyTitle}>A cozinha já recebeu seu pedido</Text>
                </View>
              </View>

              <View style={styles.timelineCard}>
                <View style={styles.timelineStep}>
                  <View style={[styles.timelineDot, styles.timelineDotDone]} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.timelineTitle}>1. Pagamento e pedido aprovados</Text>
                    <Text style={styles.timelineSub}>{chosenPayment.title}</Text>
                  </View>
                  <Text style={styles.timelineBadge}>Agora</Text>
                </View>

                <View style={styles.timelineStep}>
                  <View style={[styles.timelineDot, styles.timelineDotActive]} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.timelineTitle}>2. Preparando na cozinha</Text>
                    <Text style={styles.timelineSub}>Ingredientes na chapa · embalagem térmica</Text>
                  </View>
                  <Text style={[styles.timelineBadge, { color: colors.gold }]}>Em preparo</Text>
                </View>

                <View style={styles.timelineStep}>
                  <View style={styles.timelineDot} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.timelineTitle}>3. Entrega no seu endereço</Text>
                    <Text style={styles.timelineSub}>{chosenAddress.detail}</Text>
                  </View>
                  <Text style={styles.timelineBadge}>{deliveryMode === 'express' ? '15–22 min' : '25–35 min'}</Text>
                </View>
              </View>

              <Text style={styles.disclaimer}>
                Protótipo de portfólio: fluxo completo de checkout simulado (nenhuma cobrança real foi realizada).
              </Text>
              <Button title="Voltar ao feed de pratos" onPress={onClose} />
            </ScrollView>
          ) : cartItems.length === 0 ? (
            <View style={styles.empty}>
              <ShoppingBag size={36} color={colors.accent} />
              <Text style={styles.emptyTitle}>Sua sacola está vazia</Text>
              <Text style={styles.body}>
                Escolha um prato no feed e toque em “Quero esse” para montar seu pedido e ir para o checkout.
              </Text>
              <Button title="Explorar pratos agora" onPress={onClose} />
            </View>
          ) : step === 'bag' ? (
            <>
              <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.list}>
                {cartItems.map((line) => {
                  const dish = dishById.get(line.dishId)!;
                  return (
                    <View key={line.dishId} style={styles.item}>
                      <Image source={dishArtwork(dish)} contentFit="cover" style={styles.image} />
                      <View style={styles.itemInfo}>
                        <Text style={styles.merchant}>{line.merchantName}</Text>
                        <Text style={styles.itemName}>{line.name}</Text>
                        <View style={styles.itemBottom}>
                          <Text style={styles.itemPrice}>{formatBRL(line.price * line.qty)}</Text>
                          <View style={styles.quantity}>
                            <Pressable
                              accessibilityRole="button"
                              accessibilityLabel={`Diminuir ${line.name}`}
                              style={styles.quantityButton}
                              onPress={() => actions.remove(line.dishId)}
                            >
                              <Minus size={15} color={colors.text} />
                            </Pressable>
                            <Text style={styles.qty}>{line.qty}</Text>
                            <Pressable
                              accessibilityRole="button"
                              accessibilityLabel={`Aumentar ${line.name}`}
                              style={styles.quantityButton}
                              onPress={() => actions.add(line.dishId)}
                            >
                              <Plus size={15} color={colors.text} />
                            </Pressable>
                          </View>
                        </View>
                      </View>
                    </View>
                  );
                })}

                <View style={styles.sectionBlock}>
                  <View style={styles.sectionRow}>
                    <Sparkles size={15} color={colors.gold} />
                    <Text style={styles.sectionTitle}>Cupom de desconto</Text>
                  </View>
                  <View style={styles.couponRow}>
                    {(
                      [
                        { key: 'FOME10', label: 'FOME10 (-25% até R$10)' },
                        { key: 'FRETEGRATIS', label: 'FRETEGRATIS' },
                        { key: 'NONE', label: 'Sem cupom' },
                      ] as const
                    ).map((c) => (
                      <Pressable
                        key={c.key}
                        onPress={() => setCoupon(c.key)}
                        style={[styles.couponChip, coupon === c.key && styles.couponChipActive]}
                      >
                        <Text style={[styles.couponChipText, coupon === c.key && styles.couponChipTextActive]}>
                          {c.label}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                </View>
              </ScrollView>

              <View style={styles.totals}>
                <View style={styles.totalRow}>
                  <Text style={styles.body}>Subtotal ({cartItems.reduce((a, b) => a + b.qty, 0)} itens)</Text>
                  <Text style={styles.body}>{formatBRL(cartTotal)}</Text>
                </View>
                <View style={styles.totalRow}>
                  <Text style={styles.body}>
                    Entrega{merchantIds.size > 1 ? ` (${merchantIds.size} lojas)` : ''}
                  </Text>
                  <Text style={styles.body}>{formatBRL(rawDeliveryFee)}</Text>
                </View>
                {couponDiscount > 0 ? (
                  <View style={styles.totalRow}>
                    <Text style={[styles.body, { color: colors.gold }]}>Desconto ({coupon})</Text>
                    <Text style={[styles.body, { color: colors.gold }]}>- {formatBRL(couponDiscount)}</Text>
                  </View>
                ) : null}
                <View style={[styles.totalRow, { marginVertical: 10 }]}>
                  <Text style={styles.total}>Total</Text>
                  <Text style={styles.total}>{formatBRL(finalTotal)}</Text>
                </View>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Continuar para entrega e pagamento"
                  onPress={() => setStep('checkout')}
                  style={styles.checkout}
                >
                  <Text style={styles.checkoutText}>Continuar para entrega e pagamento</Text>
                  <ArrowUpRight size={19} color={colors.onAccent} />
                </Pressable>
              </View>
            </>
          ) : (
            <>
              <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.list}>
                <View style={styles.sectionBlock}>
                  <View style={styles.sectionRow}>
                    <MapPin size={15} color={colors.accent} />
                    <Text style={styles.sectionTitle}>Endereço de entrega</Text>
                  </View>
                  {ADDRESSES.map((addr) => {
                    const active = addr.id === addressId;
                    return (
                      <Pressable
                        key={addr.id}
                        onPress={() => setAddressId(addr.id)}
                        style={[styles.optionCard, active && styles.optionCardActive]}
                      >
                        <View style={styles.radioOuter}>{active ? <View style={styles.radioInner} /> : null}</View>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.optionTitle}>{addr.label}</Text>
                          <Text style={styles.optionSub}>{addr.detail}</Text>
                        </View>
                      </Pressable>
                    );
                  })}
                </View>

                <View style={styles.sectionBlock}>
                  <View style={styles.sectionRow}>
                    <Clock3 size={15} color={colors.gold} />
                    <Text style={styles.sectionTitle}>Velocidade da entrega</Text>
                  </View>
                  <View style={styles.speedRow}>
                    <Pressable
                      onPress={() => setDeliveryMode('standard')}
                      style={[styles.speedCard, deliveryMode === 'standard' && styles.optionCardActive]}
                    >
                      <Text style={styles.optionTitle}>Padrão · 25–35 min</Text>
                      <Text style={styles.optionSub}>{formatBRL(baseDeliveryFee)}</Text>
                    </Pressable>
                    <Pressable
                      onPress={() => setDeliveryMode('express')}
                      style={[styles.speedCard, deliveryMode === 'express' && styles.optionCardActive]}
                    >
                      <Text style={styles.optionTitle}>Prioritária · 15–22 min</Text>
                      <Text style={[styles.optionSub, { color: colors.gold }]}>+ R$ 4,90</Text>
                    </Pressable>
                  </View>
                </View>

                <View style={styles.sectionBlock}>
                  <Text style={styles.sectionTitle}>Forma de pagamento</Text>
                  {PAYMENTS.map((pm) => {
                    const active = pm.id === payment;
                    return (
                      <Pressable
                        key={pm.id}
                        onPress={() => setPayment(pm.id)}
                        style={[styles.optionCard, active && styles.optionCardActive]}
                      >
                        <View style={styles.radioOuter}>{active ? <View style={styles.radioInner} /> : null}</View>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.optionTitle}>{pm.title}</Text>
                          <Text style={styles.optionSub}>{pm.subtitle}</Text>
                        </View>
                        {pm.badge ? <Text style={styles.pmBadge}>{pm.badge}</Text> : null}
                      </Pressable>
                    );
                  })}
                </View>

                <View style={styles.sectionBlock}>
                  <Text style={styles.sectionTitle}>Preferências para o restaurante</Text>
                  <View style={styles.couponRow}>
                    {NOTES.map((note) => {
                      const active = selectedNotes.includes(note);
                      return (
                        <Pressable
                          key={note}
                          onPress={() => toggleNote(note)}
                          style={[styles.couponChip, active && styles.couponChipActive]}
                        >
                          <Text style={[styles.couponChipText, active && styles.couponChipTextActive]}>{note}</Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </View>
              </ScrollView>

              <View style={styles.totals}>
                <View style={styles.totalRow}>
                  <Text style={styles.body}>Pagamento via {chosenPayment.title.split(' · ')[0]}</Text>
                  <Text style={styles.body}>{chosenAddress.label}</Text>
                </View>
                <View style={[styles.totalRow, { marginVertical: 10 }]}>
                  <Text style={styles.total}>Total a pagar</Text>
                  <Text style={styles.total}>{formatBRL(finalTotal)}</Text>
                </View>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Finalizar pedido simulado"
                  onPress={actions.checkout}
                  style={styles.checkout}
                >
                  <Text style={styles.checkoutText}>Confirmar e fazer pedido · {formatBRL(finalTotal)}</Text>
                  <Check size={19} color={colors.onAccent} />
                </Pressable>
                <Text style={styles.disclaimer}>Demonstração de portfólio · sem cobrança real</Text>
              </View>
            </>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end', alignItems: 'center', backgroundColor: 'rgba(8, 3, 3, 0.78)' },
  sheet: {
    maxHeight: '90%',
    maxWidth: 560,
    width: '100%',
    backgroundColor: colors.surface,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderTopWidth: 1,
    borderColor: colors.border,
  },
  handle: { width: 38, height: 4, backgroundColor: colors.border, borderRadius: 2, alignSelf: 'center', marginTop: 12 },
  header: { paddingHorizontal: 24, paddingVertical: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.surfaceRaised,
    alignItems: 'center',
    justifyContent: 'center',
  },
  eyebrow: { color: colors.accent, fontFamily: face.bold, fontSize: 8, letterSpacing: 2, marginBottom: 4 },
  title: { color: colors.text, fontFamily: face.display, fontSize: 23, letterSpacing: -0.7 },
  close: {
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceRaised,
    borderRadius: 21,
  },
  empty: { padding: 28, gap: 18, alignItems: 'flex-start' },
  emptyTitle: { color: colors.text, fontFamily: face.bold, fontSize: 21 },
  body: { color: colors.textMuted, fontFamily: face.regular, fontSize: 12, lineHeight: 20 },
  successWrap: { paddingHorizontal: 24, paddingBottom: 24, gap: 18 },
  successBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: colors.surfaceRaised,
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.accent,
  },
  successIcon: {
    height: 50,
    width: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.accent,
  },
  orderCode: { color: colors.gold, fontFamily: face.bold, fontSize: 11, marginBottom: 2 },
  timelineCard: {
    backgroundColor: colors.surfaceRaised,
    borderRadius: 18,
    padding: 18,
    gap: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  timelineStep: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  timelineDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.border },
  timelineDotDone: { backgroundColor: colors.success },
  timelineDotActive: { backgroundColor: colors.gold },
  timelineTitle: { color: colors.text, fontFamily: face.bold, fontSize: 13 },
  timelineSub: { color: colors.textFaint, fontFamily: face.regular, fontSize: 11, marginTop: 2 },
  timelineBadge: { color: colors.success, fontFamily: face.bold, fontSize: 10 },
  list: { paddingHorizontal: 24, gap: 18, paddingBottom: 20 },
  item: {
    flexDirection: 'row',
    gap: 14,
    backgroundColor: colors.surfaceRaised,
    padding: 12,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
  },
  image: { width: 72, borderRadius: 13, minHeight: 84 },
  itemInfo: { flex: 1, justifyContent: 'center' },
  merchant: { fontFamily: face.medium, color: colors.textFaint, fontSize: 10, marginBottom: 3 },
  itemName: { fontFamily: face.bold, color: colors.text, fontSize: 15 },
  itemBottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8, marginTop: 8 },
  itemPrice: { fontFamily: face.bold, color: colors.text, fontSize: 14 },
  quantity: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderRadius: 12, borderWidth: 1, borderColor: colors.border },
  quantityButton: { height: 36, width: 34, alignItems: 'center', justifyContent: 'center' },
  qty: { fontFamily: face.bold, color: colors.text, fontSize: 12, paddingHorizontal: 6 },
  sectionBlock: { gap: 10, marginTop: 4 },
  sectionRow: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  sectionTitle: { color: colors.text, fontFamily: face.bold, fontSize: 13 },
  couponRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  couponChip: {
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 12,
    backgroundColor: colors.surfaceRaised,
    borderWidth: 1,
    borderColor: colors.border,
  },
  couponChipActive: {
    backgroundColor: colors.accentSoft,
    borderColor: colors.accent,
  },
  couponChipText: { color: colors.textMuted, fontFamily: face.semibold, fontSize: 11 },
  couponChipTextActive: { color: colors.white, fontFamily: face.bold },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 15,
    backgroundColor: colors.surfaceRaised,
    borderWidth: 1,
    borderColor: colors.border,
  },
  optionCardActive: {
    borderColor: colors.accent,
    backgroundColor: colors.accentSoft,
  },
  radioOuter: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioInner: { width: 9, height: 9, borderRadius: 4.5, backgroundColor: colors.accent },
  optionTitle: { color: colors.text, fontFamily: face.bold, fontSize: 13 },
  optionSub: { color: colors.textMuted, fontFamily: face.regular, fontSize: 11, marginTop: 2 },
  pmBadge: {
    color: colors.gold,
    fontFamily: face.bold,
    fontSize: 10,
    backgroundColor: 'rgba(255, 184, 0, 0.14)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  speedRow: { flexDirection: 'row', gap: 10 },
  speedCard: {
    flex: 1,
    padding: 14,
    borderRadius: 15,
    backgroundColor: colors.surfaceRaised,
    borderWidth: 1,
    borderColor: colors.border,
  },
  totals: { paddingHorizontal: 24, paddingTop: 16, borderTopColor: colors.border, borderTopWidth: 1, gap: 4 },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between' },
  total: { fontFamily: face.display, color: colors.text, fontSize: 23, letterSpacing: -0.8 },
  checkout: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.accent,
    paddingHorizontal: 20,
    paddingVertical: 17,
    borderRadius: 15,
  },
  checkoutText: { fontFamily: face.bold, color: colors.onAccent, fontSize: 14 },
  disclaimer: { fontFamily: face.medium, color: colors.textFaint, fontSize: 10, textAlign: 'center', marginTop: 8 },
});
