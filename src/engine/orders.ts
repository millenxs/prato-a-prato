import { dishById, merchantById } from '../data/seed';
import type { ActiveMerchantOrder, CartLine, CartMerchantGroup, OrderStage } from '../types';

export function groupCartByMerchant(cart: CartLine[]): CartMerchantGroup[] {
  const map = new Map<string, CartMerchantGroup>();

  for (const line of cart) {
    const dish = dishById.get(line.dishId);
    if (!dish) continue;
    const merchant = merchantById.get(dish.merchantId);
    if (!merchant) continue;

    let group = map.get(merchant.id);
    if (!group) {
      group = {
        merchantId: merchant.id,
        merchantName: merchant.name,
        merchantEmoji: merchant.emoji,
        etaMin: merchant.etaMin,
        deliveryFee: merchant.deliveryFee,
        subtotal: 0,
        items: [],
      };
      map.set(merchant.id, group);
    }

    group.subtotal += dish.price * line.qty;
    group.items.push({
      dishId: dish.id,
      name: dish.name,
      emoji: dish.emoji,
      qty: line.qty,
      price: dish.price,
      merchantName: merchant.name,
    });
  }

  return [...map.values()];
}

export interface SplitOrdersMeta {
  addressLabel?: string;
  addressDetail?: string;
  paymentTitle?: string;
  express?: boolean;
  now?: number;
  seqStart?: number;
}

/**
 * Divide uma sacola com itens de 1 ou vários restaurantes em pedidos
 * independentes, encaminhados cada um para sua respectiva cozinha.
 */
export function splitCartIntoOrders(cart: CartLine[], meta: SplitOrdersMeta = {}): ActiveMerchantOrder[] {
  const groups = groupCartByMerchant(cart);
  const now = meta.now ?? Date.now();
  const baseSeq = meta.seqStart ?? 4820;

  return groups.map((group, index) => ({
    id: `#PP-${baseSeq + index + 1}`,
    merchantId: group.merchantId,
    merchantName: group.merchantName,
    merchantEmoji: group.merchantEmoji,
    etaMin: meta.express ? Math.max(12, Math.round(group.etaMin * 0.72)) : group.etaMin,
    deliveryFee: group.deliveryFee,
    subtotal: group.subtotal,
    items: group.items.map((item) => ({
      dishId: item.dishId,
      name: item.name,
      qty: item.qty,
      price: item.price,
    })),
    stage: 'preparando',
    addressLabel: meta.addressLabel ?? 'Casa',
    addressDetail: meta.addressDetail ?? 'Av. da Integração, 420 · Apto 302 · Petrolina, PE',
    paymentTitle: meta.paymentTitle ?? 'Pix · Aprovação imediata',
    createdAt: now,
  }));
}

const STAGE_ORDER: OrderStage[] = ['confirmado', 'preparando', 'a_caminho', 'entregue'];

export function nextOrderStage(stage: OrderStage): OrderStage {
  const idx = STAGE_ORDER.indexOf(stage);
  if (idx < 0 || idx >= STAGE_ORDER.length - 1) return 'entregue';
  return STAGE_ORDER[idx + 1] ?? 'entregue';
}
