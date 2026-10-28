import { dishes, merchantById } from '../data/seed';
import type {
  Dish,
  Exclusion,
  Factor,
  FactorKey,
  FeedBuild,
  FeedItem,
  LabConfig,
  Merchant,
  ProfileSignal,
  TasteEntry,
} from '../types';

export const defaultLab: LabConfig = {
  wRelevance: 0.3,
  wMargin: 0.12,
  wNovelty: 0.1,
  wProximity: 0.12,
  wQuality: 0.16,
  wPopularity: 0.2,
  exploration: 0.1,
  maxEtaMin: 45,
  maxDistanceKm: 4,
  maxPerMerchant: 3,
  attentionCap: 3,
  quietHours: false,
};

const FACTOR_LABEL: Record<FactorKey, { label: string; hint: string }> = {
  relevance: { label: 'Combina com você', hint: 'Afinidade com os sabores que você salvou e pulou.' },
  margin: { label: 'Margem saudável', hint: 'Contribuição estimada para a operação do restaurante.' },
  novelty: { label: 'Novidade', hint: 'Prato novo ou pouco pedido hoje.' },
  proximity: { label: 'Perto de você', hint: 'Distância entre a loja e o seu endereço.' },
  quality: { label: 'Qualidade', hint: 'Nota da loja e histórico de pedidos.' },
  popularity: { label: 'Desejo agora', hint: 'Volume de pedidos nas últimas horas.' },
  exploration: { label: 'Descoberta', hint: 'Card sorteado fora do topo para evitar bolha.' },
};

const clamp01 = (value: number): number => Math.max(0, Math.min(1, value));

function mulberry32(seed: number): () => number {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function relevanceOf(dish: Dish, profile: Record<string, number>): number {
  const merchant = merchantById.get(dish.merchantId);
  const keys = merchant ? [...dish.tags, merchant.cuisine.toLowerCase()] : dish.tags;
  if (keys.length === 0) return 0.5;
  let sum = 0;
  for (const tag of keys) sum += profile[tag] ?? 0;
  return clamp01(0.5 + (sum / keys.length) * 0.5);
}

export function scoreItem(
  dish: Dish,
  merchant: Merchant,
  cfg: LabConfig,
  profile: Record<string, number>,
): { score: number; factors: Factor[] } {
  const values: Record<Exclude<FactorKey, 'exploration'>, number> = {
    relevance: relevanceOf(dish, profile),
    margin: clamp01(dish.marginPct / 0.4),
    novelty: dish.isNew ? 1 : dish.ordersToday < 30 ? 0.75 : 0.45,
    proximity: clamp01(1 - merchant.distanceKm / Math.max(cfg.maxDistanceKm, 0.1)),
    quality: clamp01((merchant.rating - 4) / 1) * 0.85 + (dish.ordersToday > 40 ? 0.15 : 0),
    popularity: clamp01(dish.ordersToday / 120),
  };

  const weights: Record<Exclude<FactorKey, 'exploration'>, number> = {
    relevance: cfg.wRelevance,
    margin: cfg.wMargin,
    novelty: cfg.wNovelty,
    proximity: cfg.wProximity,
    quality: cfg.wQuality,
    popularity: cfg.wPopularity,
  };

  const totalWeight = Object.values(weights).reduce((acc, w) => acc + w, 0) || 1;
  const factors: Factor[] = (Object.keys(values) as Array<keyof typeof values>).map((key) => {
    const meta = FACTOR_LABEL[key];
    return {
      key,
      label: meta.label,
      hint: meta.hint,
      value: values[key],
      weight: weights[key] / totalWeight,
      contribution: (values[key] * weights[key]) / totalWeight,
    };
  });

  const score = factors.reduce((acc, f) => acc + f.contribution, 0);
  return { score, factors: factors.sort((a, b) => b.contribution - a.contribution) };
}

/** Restrições duras: nada entra no feed sem passar por aqui. */
function hardConstraint(dish: Dish, merchant: Merchant, cfg: LabConfig): string | null {
  if (!merchant.open) return 'loja fechada agora';
  if (merchant.openOrders >= merchant.capacityPerHour) return 'cozinha lotada';
  if (merchant.etaMin > cfg.maxEtaMin) return `ETA de ${merchant.etaMin} min acima do limite`;
  if (merchant.distanceKm > cfg.maxDistanceKm) return `${merchant.distanceKm.toFixed(1)} km fora do raio`;
  if (!dish.available) return 'item esgotado';
  return null;
}

export interface BuildFeedInput {
  cfg: LabConfig;
  profile: Record<string, number>;
  seenMerchant: Record<string, number>;
  limit?: number;
  seed?: number;
}

export interface BuildFeedResult extends FeedBuild {
  /** Quantos itens foram barrados por restrição dura, por motivo. */
  blockedByReason: Array<{ reason: string; count: number }>;
  /** Quantos cards elegíveis ficaram de fora por causa do teto por loja. */
  cappedOut: number;
}

export function buildFeed({ cfg, profile, seenMerchant, limit = 30, seed = 1 }: BuildFeedInput): BuildFeedResult {
  const rand = mulberry32(seed);
  const excluded: Exclusion[] = [];
  const eligible: FeedItem[] = [];
  const blocked = new Map<string, number>();

  for (const dish of dishes) {
    const merchant = merchantById.get(dish.merchantId);
    if (!merchant) continue;

    const reason = hardConstraint(dish, merchant, cfg);
    if (reason) {
      blocked.set(reason, (blocked.get(reason) ?? 0) + 1);
      excluded.push({
        dishId: dish.id,
        dishName: dish.name,
        merchantName: merchant.name,
        reason,
      });
      continue;
    }

    const { score, factors } = scoreItem(dish, merchant, cfg, profile);
    // Quem já apareceu muito nesta sessão perde prioridade, sem ser excluído.
    const seenPenalty = Math.min(seenMerchant[merchant.id] ?? 0, 3) * 0.04;
    eligible.push({ dish, merchant, score: clamp01(score - seenPenalty), factors, media: dish.media });
  }

  eligible.sort((a, b) => b.score - a.score);

  const ordered: FeedItem[] = [];
  const remaining = [...eligible];
  const merchantCount: Record<string, number> = {};
  const lastCuisines: string[] = [];
  let cappedOut = 0;

  const cuisineOk = (item: FeedItem): boolean => {
    const last = lastCuisines[lastCuisines.length - 1];
    const before = lastCuisines[lastCuisines.length - 2];
    return item.merchant.cuisine !== last || item.merchant.cuisine !== before;
  };

  while (remaining.length > 0) {
    let index = remaining.findIndex(
      (item) => (merchantCount[item.merchant.id] ?? 0) < cfg.maxPerMerchant && cuisineOk(item),
    );
    if (index < 0) {
      // Relaxa a diversidade de cozinha, nunca o teto por loja: o teto é a
      // garantia de que o feed não vira vitrine de uma loja só.
      index = remaining.findIndex((item) => (merchantCount[item.merchant.id] ?? 0) < cfg.maxPerMerchant);
    }
    if (index < 0) {
      cappedOut = remaining.length;
      break;
    }

    const [picked] = remaining.splice(index, 1);
    if (!picked) break;
    ordered.push(picked);
    merchantCount[picked.merchant.id] = (merchantCount[picked.merchant.id] ?? 0) + 1;
    lastCuisines.push(picked.merchant.cuisine);
    if (lastCuisines.length > 2) lastCuisines.shift();
  }

  // Exploração: troca posições para furar a bolha do topo, mantendo as restrições duras.
  if (cfg.exploration > 0) {
    for (let i = 0; i < ordered.length - 1; i += 1) {
      if (rand() < cfg.exploration) {
        const j = i + 1 + Math.floor(rand() * Math.min(6, ordered.length - i - 1));
        const a = ordered[i];
        const b = ordered[j];
        if (a && b) {
          ordered[i] = b;
          ordered[j] = a;
        }
      }
    }
  }

  // Dedup de exclusões por loja+motivo para o painel não virar lista infinita.
  const seenExclusion = new Set<string>();
  const dedupedExcluded = excluded.filter((ex) => {
    const key = `${ex.merchantName}|${ex.reason}`;
    if (seenExclusion.has(key)) return false;
    seenExclusion.add(key);
    return true;
  });

  return {
    items: ordered.slice(0, limit),
    excluded: dedupedExcluded.slice(0, 8),
    eligible: eligible.length,
    candidates: dishes.length,
    builtAt: Date.now(),
    cappedOut,
    blockedByReason: [...blocked.entries()]
      .map(([reason, count]) => ({ reason, count }))
      .sort((a, b) => b.count - a.count),
  };
}

/** As 3 rotas da fast lane: cada uma otimiza um objetivo diferente. */
export function fastLane(feed: BuildFeedResult): {
  best: FeedItem | undefined;
  fastest: FeedItem | undefined;
  mostWanted: FeedItem | undefined;
} {
  const pool = feed.items;
  const fastest = [...pool].sort((a, b) => a.merchant.etaMin - b.merchant.etaMin)[0];
  const mostWanted = [...pool].sort((a, b) => b.dish.ordersToday - a.dish.ordersToday)[0];
  const best = [...pool].sort(
    (a, b) => b.score / Math.max(b.dish.price, 1) - a.score / Math.max(a.dish.price, 1),
  )[0];
  return { best, fastest, mostWanted };
}

const SIGNAL_DELTA: Record<ProfileSignal, number> = {
  add: 0.32,
  save: 0.22,
  watch_complete: 0.16,
  skip: -0.14,
};

export function updateProfile(
  profile: Record<string, number>,
  dish: Dish,
  signal: ProfileSignal,
): Record<string, number> {
  const delta = SIGNAL_DELTA[signal];
  const merchant = merchantById.get(dish.merchantId);
  const keys = merchant ? [...dish.tags, merchant.cuisine.toLowerCase()] : dish.tags;
  const next = { ...profile };
  for (const tag of keys) {
    next[tag] = Math.max(-1, Math.min(1, (next[tag] ?? 0) + delta));
  }
  return next;
}

export function topTasteProfile(profile: Record<string, number>, limit = 6): TasteEntry[] {
  return Object.entries(profile)
    .filter(([, score]) => Math.abs(score) >= 0.05)
    .map(([tag, score]) => ({ tag, score }))
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

/**
 * Re-ranqueia apenas os Reels que ainda estão abaixo do card atual,
 * moldando a fila em tempo real sem tirar do lugar o vídeo que o usuário está vendo.
 */
export function rerankUpcoming(
  feed: BuildFeedResult,
  lockedCount: number,
  cfg: LabConfig,
  profile: Record<string, number>,
): BuildFeedResult {
  const safeLocked = Math.max(0, Math.min(feed.items.length, lockedCount));
  const head = feed.items.slice(0, safeLocked).map((item) => {
    const { score, factors } = scoreItem(item.dish, item.merchant, cfg, profile);
    return { ...item, score, factors };
  });
  const tail = feed.items
    .slice(safeLocked)
    .map((item) => {
      const { score, factors } = scoreItem(item.dish, item.merchant, cfg, profile);
      return { ...item, score, factors };
    })
    .sort((a, b) => b.score - a.score);
  return {
    ...feed,
    items: [...head, ...tail],
  };
}
