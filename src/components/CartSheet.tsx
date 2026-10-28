import { Image } from 'expo-image';
import { ArrowLeft, ArrowUpRight, Check, Clock3, MapPin, Minus, Plus, ShoppingBag, Sparkles, X } from './icons';
import React, { useEffect, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { dishArtwork } from '../data/artwork';
import { dishById } from '../data/seed';
import { useStore } from '../state/store';
import { colors, face } from '../theme';
import type { ActiveMerchantOrder, OrderStage } from '../types';
import { Button, formatBRL } from './ui';

type Step = 'bag' | 'checkout' | 'tracking';
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

const STAGE_META: Record<OrderStage, { label: string; color: string; stepIndex: number }> = {
  confirmado: { label: 'Recebido pelo restaurante', color: colors.gold, stepIndex: 1 },
  preparando: { label: 'Em preparo na cozinha', color: colors.gold, stepIndex: 2 },
  a_caminho: { label: 'Saiu para entrega', color: colors.accent, stepIndex: 3 },
  entregue: { label: 'Pedido entregue', color: colors.success, stepIndex: 4 },
};

export function CartSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { cartItems, cartGroups, cartTotal, state, actions } = useStore();
  const inset = useSafeAreaInsets();

  const [step, setStep] = useState<Step>('bag');
  const [coupon, setCoupon] = useState<CouponKey>('FOME10');
  const [addressId, setAddressId] = useState<string>('home');
  const [deliveryMode, setDeliveryMode] = useState<DeliveryMode>('standard');
  const [payment, setPayment] = useState<PaymentMethod>('pix');
  const [selectedNotes, setSelectedNotes] = useState<string[]>(['Enviar sachês e guardanapo']);

  useEffect(() => {
    if (!visible) return;
    if (state.checkoutDone || (cartItems.length === 0 && state.activeOrders.length > 0)) {
      setStep('tracking');
    } else {
      setStep('bag');
    }
  }, [visible, state.checkoutDone, cartItems.length, state.activeOrders.length]);

  const baseDeliveryFee = cartGroups.reduce((sum, g) => sum + g.deliveryFee, 0);
  const expressExtra = deliveryMode === 'express' && cartItems.length > 0 ? 4.9 * cartGroups.length : 0;
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

  const handleConfirmCheckout = () => {
    actions.checkout({
      addressLabel: chosenAddress.label,
      addressDetail: chosenAddress.detail,
      paymentTitle: chosenPayment.title,
      express: deliveryMode === 'express',
    });
    setStep('tracking');
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
              {step === 'checkout' ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Voltar para a sacola"
                  onPress={() => setStep('bag')}
                  style={styles.backBtn}
                >
                  <ArrowLeft size={18} color={colors.text} />
                </Pressable>
              ) : null}
              <View style={{ flex: 1 }}>
                <Text style={styles.eyebrow}>
                  {step === 'tracking'
                    ? `ACOMPANHAMENTO · ${state.activeOrders.length} RESTAURANTE(S)`
                    : step === 'checkout'
                      ? `CHECKOUT · ${cartGroups.length} RESTAURANTE(S)`
                      : `SUA SACOLA · ${cartGroups.length || 0} RESTAURANTE(S)`}
                </Text>
                <Text style={styles.title} numberOfLines={1}>
                  {step === 'tracking'
                    ? 'Pedidos em andamento'
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

          {cartItems.length > 0 && state.activeOrders.length > 0 ? (
            <View style={styles.modeSwitchRow}>
              <Pressable
                onPress={() => setStep('bag')}
                style={[styles.modeTab, step !== 'tracking' && styles.modeTabActive]}
              >
                <Text style={[styles.modeTabText, step !== 'tracking' && styles.modeTabTextActive]}>
                  Nova sacola ({cartItems.reduce((a, b) => a + b.qty, 0)})
                </Text>
              </Pressable>
              <Pressable
                onPress={() => setStep('tracking')}
                style={[styles.modeTab, step === 'tracking' && styles.modeTabActive]}
              >
                <Text style={[styles.modeTabText, step === 'tracking' && styles.modeTabTextActive]}>
                  Em andamento ({state.activeOrders.length})
                </Text>
              </Pressable>
            </View>
          ) : null}

          {step === 'tracking' && state.activeOrders.length > 0 ? (
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.successWrap}>
              <View style={styles.multiRouteBanner}>
                <View style={styles.successIcon}>
                  <Check size={24} color={colors.onAccent} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.orderCode}>
                    {state.activeOrders.length > 1
                      ? `${state.activeOrders.length} pedidos encaminhados em paralelo`
                      : 'Pedido encaminhado ao restaurante'}
                  </Text>
                  <Text style={styles.body}>
                    {state.activeOrders.length > 1
                      ? 'Cada restaurante recebeu apenas os seus próprios itens e prepara de forma independente:'
                      : 'A cozinha já recebeu seus itens e iniciou o preparo:'}
                  </Text>
                </View>
              </View>

              {state.activeOrders.map((order) => (
                <MerchantOrderCard
                  key={order.id}
                  order={order}
                  onAdvance={() => actions.advanceOrderStage(order.id)}
                />
              ))}

              <Text style={styles.disclaimer}>
                Protótipo de portfólio: roteamento multi-restaurante e acompanhamento simulados.
              </Text>
              <Button title="Voltar ao feed e descobrir mais" onPress={onClose} />
            </ScrollView>
          ) : cartItems.length === 0 ? (
            <View style={styles.empty}>
              <ShoppingBag size={36} color={colors.accent} />
              <Text style={styles.emptyTitle}>Sua sacola está vazia</Text>
              <Text style={styles.body}>
                Você pode adicionar pratos de um ou de vários restaurantes diferentes no feed — nós separamos e
                encaminhamos o pedido para cada cozinha automaticamente.
              </Text>
              <Button title="Explorar pratos agora" onPress={onClose} />
            </View>
          ) : step === 'bag' ? (
            <>
              <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.list}>
                {cartGroups.length > 1 ? (
                  <View style={styles.multiNotice}>
                    <Sparkles size={16} color={colors.gold} />
                    <Text style={styles.multiNoticeText}>
                      Sacola Multi-Restaurante: você paga tudo de uma vez e encaminhamos{' '}
                      <Text style={{ color: colors.white, fontFamily: face.bold }}>
                        {cartGroups.length} pedidos separados
                      </Text>{' '}
                      para cada restaurante.
                    </Text>
                  </View>
                ) : null}

                {cartGroups.map((group, groupIndex) => (
                  <View key={group.merchantId} style={styles.merchantGroupCard}>
                    <View style={styles.merchantGroupHeader}>
                      <View style={styles.merchantBadge}>
                        <Text style={styles.merchantBadgeText}>
                          {cartGroups.length > 1 ? `RESTAURANTE ${groupIndex + 1}` : 'RESTAURANTE'}
                        </Text>
                      </View>
                      <Text style={styles.merchantGroupTitle} numberOfLines={1}>
                        {group.merchantName}
                      </Text>
                      <Text style={styles.merchantGroupMeta}>
                        {group.etaMin} min · frete {formatBRL(group.deliveryFee)}
                      </Text>
                    </View>

                    {group.items.map((line) => {
                      const dish = dishById.get(line.dishId)!;
                      return (
                        <View key={line.dishId} style={styles.itemRow}>
                          <Image source={dishArtwork(dish)} contentFit="cover" style={styles.image} />
                          <View style={styles.itemInfo}>
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
                                  <Minus size={14} color={colors.text} />
                                </Pressable>
                                <Text style={styles.qty}>{line.qty}</Text>
                                <Pressable
                                  accessibilityRole="button"
                                  accessibilityLabel={`Aumentar ${line.name}`}
                                  style={styles.quantityButton}
                                  onPress={() => actions.add(line.dishId)}
                                >
                                  <Plus size={14} color={colors.text} />
                                </Pressable>
                              </View>
                            </View>
                          </View>
                        </View>
                      );
                    })}
                  </View>
                ))}

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
                  <Text style={styles.body}>
                    Subtotal ({cartItems.reduce((a, b) => a + b.qty, 0)} itens em {cartGroups.length}{' '}
                    {cartGroups.length > 1 ? 'restaurantes' : 'restaurante'})
                  </Text>
                  <Text style={styles.body}>{formatBRL(cartTotal)}</Text>
                </View>
                <View style={styles.totalRow}>
                  <Text style={styles.body}>
                    Entregas ({cartGroups.length} {cartGroups.length > 1 ? 'rotas' : 'rota'})
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
                  <Text style={styles.sectionTitle}>
                    Encaminhamento automático ({cartGroups.length}{' '}
                    {cartGroups.length > 1 ? 'restaurantes' : 'restaurante'})
                  </Text>
                  <View style={styles.routeSummaryBox}>
                    {cartGroups.map((g, i) => (
                      <View key={g.merchantId} style={styles.routeSummaryRow}>
                        <Text style={styles.routeSummaryIndex}>#{i + 1}</Text>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.optionTitle}>{g.merchantName}</Text>
                          <Text style={styles.optionSub}>
                            {g.items.map((it) => `${it.qty}x ${it.name}`).join(', ')}
                          </Text>
                        </View>
                        <Text style={styles.routeEta}>{g.etaMin} min</Text>
                      </View>
                    ))}
                  </View>
                </View>

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
                      <Text style={styles.optionTitle}>Padrão</Text>
                      <Text style={styles.optionSub}>{formatBRL(baseDeliveryFee)}</Text>
                    </Pressable>
                    <Pressable
                      onPress={() => setDeliveryMode('express')}
                      style={[styles.speedCard, deliveryMode === 'express' && styles.optionCardActive]}
                    >
                      <Text style={styles.optionTitle}>Prioritária ⚡</Text>
                      <Text style={[styles.optionSub, { color: colors.gold }]}>
                        + {formatBRL(4.9 * cartGroups.length)}
                      </Text>
                    </Pressable>
                  </View>
                </View>

                <View style={styles.sectionBlock}>
                  <Text style={styles.sectionTitle}>Forma de pagamento única</Text>
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
                  <Text style={styles.sectionTitle}>Observações para os restaurantes</Text>
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
                  <Text style={styles.body}>
                    {cartGroups.length} {cartGroups.length > 1 ? 'restaurantes' : 'restaurante'} · {chosenAddress.label}
                  </Text>
                </View>
                <View style={[styles.totalRow, { marginVertical: 10 }]}>
                  <Text style={styles.total}>Total a pagar</Text>
                  <Text style={styles.total}>{formatBRL(finalTotal)}</Text>
                </View>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Finalizar pedido simulado"
                  onPress={handleConfirmCheckout}
                  style={styles.checkout}
                >
                  <Text style={styles.checkoutText}>
                    Confirmar e enviar pedido{cartGroups.length > 1 ? 's' : ''} · {formatBRL(finalTotal)}
                  </Text>
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

function MerchantOrderCard({ order, onAdvance }: { order: ActiveMerchantOrder; onAdvance: () => void }) {
  const stageMeta = STAGE_META[order.stage];
  const steps = [
    { key: 1, label: 'Confirmado' },
    { key: 2, label: 'Na cozinha' },
    { key: 3, label: 'A caminho' },
    { key: 4, label: 'Entregue' },
  ];

  return (
    <View style={styles.orderTrackCard} testID={`order-card-${order.merchantId}`}>
      <View style={styles.orderTrackHeader}>
        <View style={{ flex: 1 }}>
          <Text style={styles.orderTrackId}>
            {order.id} · {order.merchantName}
          </Text>
          <Text style={[styles.orderTrackStatus, { color: stageMeta.color }]}>{stageMeta.label}</Text>
        </View>
        <View style={styles.etaBadge}>
          <Clock3 size={12} color={colors.gold} />
          <Text style={styles.etaBadgeText}>
            {order.stage === 'entregue' ? 'Concluído' : `~${order.etaMin} min`}
          </Text>
        </View>
      </View>

      <View style={styles.stepBarRow}>
        {steps.map((s) => {
          const done = stageMeta.stepIndex >= s.key;
          return (
            <View key={s.key} style={styles.stepBarCol}>
              <View style={[styles.stepBarTrack, done && { backgroundColor: stageMeta.color }]} />
              <Text style={[styles.stepBarLabel, done && { color: colors.text, fontFamily: face.bold }]}>
                {s.label}
              </Text>
            </View>
          );
        })}
      </View>

      <View style={styles.orderItemsBox}>
        {order.items.map((item) => (
          <View key={item.dishId} style={styles.orderItemLine}>
            <Text style={styles.orderItemText}>
              {item.qty}x {item.name}
            </Text>
            <Text style={styles.orderItemPrice}>{formatBRL(item.price * item.qty)}</Text>
          </View>
        ))}
        <View style={styles.orderItemFooter}>
          <Text style={styles.orderMetaText}>
            {order.addressLabel} · {order.paymentTitle.split(' · ')[0]}
          </Text>
          <Text style={styles.orderSubtotalText}>
            Total loja: {formatBRL(order.subtotal + order.deliveryFee)}
          </Text>
        </View>
      </View>

      {order.stage !== 'entregue' ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Avançar etapa de ${order.merchantName}`}
          onPress={onAdvance}
          style={styles.advanceBtn}
        >
          <Text style={styles.advanceBtnText}>Simular avanço desta cozinha →</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end', alignItems: 'center', backgroundColor: 'rgba(8, 3, 3, 0.78)' },
  sheet: {
    maxHeight: '92%',
    maxWidth: 560,
    width: '100%',
    backgroundColor: colors.surface,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderTopWidth: 1,
    borderColor: colors.border,
  },
  handle: { width: 38, height: 4, backgroundColor: colors.border, borderRadius: 2, alignSelf: 'center', marginTop: 12 },
  header: {
    paddingHorizontal: 24,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
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
  modeSwitchRow: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 24,
    paddingBottom: 12,
  },
  modeTab: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: 12,
    backgroundColor: colors.surfaceRaised,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  modeTabActive: {
    backgroundColor: colors.accentSoft,
    borderColor: colors.accent,
  },
  modeTabText: { color: colors.textMuted, fontFamily: face.semibold, fontSize: 12 },
  modeTabTextActive: { color: colors.white, fontFamily: face.bold },
  empty: { padding: 28, gap: 18, alignItems: 'flex-start' },
  emptyTitle: { color: colors.text, fontFamily: face.bold, fontSize: 20 },
  body: { color: colors.textMuted, fontFamily: face.regular, fontSize: 12, lineHeight: 19 },
  successWrap: { paddingHorizontal: 24, paddingBottom: 24, gap: 14 },
  multiRouteBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: colors.surfaceRaised,
    borderRadius: 18,
    padding: 15,
    borderWidth: 1,
    borderColor: colors.accent,
  },
  successIcon: {
    height: 44,
    width: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.accent,
  },
  orderCode: { color: colors.gold, fontFamily: face.bold, fontSize: 12, marginBottom: 2 },
  orderTrackCard: {
    backgroundColor: colors.surfaceRaised,
    borderRadius: 18,
    padding: 16,
    gap: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  orderTrackHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 10,
  },
  orderTrackId: { color: colors.text, fontFamily: face.display, fontSize: 15 },
  orderTrackStatus: { fontFamily: face.bold, fontSize: 12, marginTop: 2 },
  etaBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: colors.surface,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
  },
  etaBadgeText: { color: colors.gold, fontFamily: face.bold, fontSize: 11 },
  stepBarRow: { flexDirection: 'row', gap: 6 },
  stepBarCol: { flex: 1, gap: 4 },
  stepBarTrack: { height: 4, borderRadius: 2, backgroundColor: colors.border },
  stepBarLabel: { color: colors.textFaint, fontFamily: face.medium, fontSize: 10 },
  orderItemsBox: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 12,
    gap: 6,
  },
  orderItemLine: { flexDirection: 'row', justifyContent: 'space-between' },
  orderItemText: { color: colors.text, fontFamily: face.semibold, fontSize: 12 },
  orderItemPrice: { color: colors.textMuted, fontFamily: face.semibold, fontSize: 12 },
  orderItemFooter: {
    marginTop: 4,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  orderMetaText: { color: colors.textFaint, fontFamily: face.regular, fontSize: 10 },
  orderSubtotalText: { color: colors.gold, fontFamily: face.bold, fontSize: 11 },
  advanceBtn: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
    backgroundColor: colors.accentSoft,
    borderWidth: 1,
    borderColor: colors.accent,
  },
  advanceBtnText: { color: colors.white, fontFamily: face.bold, fontSize: 11 },
  list: { paddingHorizontal: 24, gap: 16, paddingBottom: 20 },
  multiNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: 'rgba(255, 184, 0, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255, 184, 0, 0.4)',
    borderRadius: 14,
    padding: 12,
  },
  multiNoticeText: { color: colors.textMuted, fontFamily: face.regular, fontSize: 11, lineHeight: 17, flex: 1 },
  merchantGroupCard: {
    backgroundColor: colors.surfaceRaised,
    borderRadius: 18,
    padding: 14,
    gap: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  merchantGroupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingBottom: 10,
  },
  merchantBadge: {
    backgroundColor: colors.accentSoft,
    borderWidth: 1,
    borderColor: colors.accent,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
  },
  merchantBadgeText: { color: colors.white, fontFamily: face.bold, fontSize: 8, letterSpacing: 0.8 },
  merchantGroupTitle: { color: colors.text, fontFamily: face.bold, fontSize: 13, flex: 1 },
  merchantGroupMeta: { color: colors.gold, fontFamily: face.semibold, fontSize: 10 },
  itemRow: { flexDirection: 'row', gap: 12, alignItems: 'center' },
  image: { width: 64, height: 64, borderRadius: 12 },
  itemInfo: { flex: 1, justifyContent: 'center' },
  itemName: { fontFamily: face.bold, color: colors.text, fontSize: 14 },
  itemBottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8, marginTop: 6 },
  itemPrice: { fontFamily: face.bold, color: colors.text, fontSize: 13 },
  quantity: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 11,
    borderWidth: 1,
    borderColor: colors.border,
  },
  quantityButton: { height: 32, width: 30, alignItems: 'center', justifyContent: 'center' },
  qty: { fontFamily: face.bold, color: colors.text, fontSize: 12, paddingHorizontal: 5 },
  routeSummaryBox: {
    backgroundColor: colors.surfaceRaised,
    borderRadius: 16,
    padding: 12,
    gap: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  routeSummaryRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  routeSummaryIndex: {
    color: colors.white,
    backgroundColor: colors.accent,
    fontFamily: face.bold,
    fontSize: 10,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
  },
  routeEta: { color: colors.gold, fontFamily: face.bold, fontSize: 11 },
  sectionBlock: { gap: 10, marginTop: 2 },
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
  couponChipActive: { backgroundColor: colors.accentSoft, borderColor: colors.accent },
  couponChipText: { color: colors.textMuted, fontFamily: face.semibold, fontSize: 11 },
  couponChipTextActive: { color: colors.white, fontFamily: face.bold },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 13,
    borderRadius: 15,
    backgroundColor: colors.surfaceRaised,
    borderWidth: 1,
    borderColor: colors.border,
  },
  optionCardActive: { borderColor: colors.accent, backgroundColor: colors.accentSoft },
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
    padding: 13,
    borderRadius: 15,
    backgroundColor: colors.surfaceRaised,
    borderWidth: 1,
    borderColor: colors.border,
  },
  totals: { paddingHorizontal: 24, paddingTop: 14, borderTopColor: colors.border, borderTopWidth: 1, gap: 4 },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between' },
  total: { fontFamily: face.display, color: colors.text, fontSize: 22, letterSpacing: -0.8 },
  checkout: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.accent,
    paddingHorizontal: 18,
    paddingVertical: 16,
    borderRadius: 15,
  },
  checkoutText: { fontFamily: face.bold, color: colors.onAccent, fontSize: 13 },
  disclaimer: { fontFamily: face.medium, color: colors.textFaint, fontSize: 10, textAlign: 'center', marginTop: 6 },
});
