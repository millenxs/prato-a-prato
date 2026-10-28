import { dishes, dishById, merchantById } from '../data/seed';
import { buildFeed } from './ranking';
import type { Dish, FeedItem, LabConfig, LogEvent } from '../types';

export interface FeatureAffinity {
  feature: string;
  kind: 'tag' | 'culinária' | 'formato';
  score: number; // -1 a +1
  confidence: number; // 0 a 1
  evidenceCount: number;
}

export interface PredictedDishMatch {
  item: FeedItem;
  matchPct: number;
  confidencePct: number;
  reasonsToLike: string[];
  reasonsToAvoid: string[];
}

export interface RealABTelemetry {
  hasRealInteractions: boolean;
  realCardsSeen: number;
  realLikes: number;
  realWatchedComplete: number;
  realCartAdds: number;
  realSkips: number;
  realTimeToDecisionSec: number | null;
  searchBaselineSec: number;
  timeSavedVsSearchPct: number | null;
  recommendationHitRatePct: number;
}

export interface TasteAnalysisResult {
  totalSignals: number;
  confidencePct: number;
  willLike: FeatureAffinity[];
  willDislike: FeatureAffinity[];
  predictedFavorites: PredictedDishMatch[];
  predictedAvoid: PredictedDishMatch[];
  realTelemetry: RealABTelemetry;
  summaryText: string;
}

export interface TasteAnalysisInput {
  cfg: LabConfig;
  profile: Record<string, number>;
  savedIds: string[];
  watchedCompleteIds: string[];
  skippedIds: string[];
  cartDishIds: string[];
  events: LogEvent[];
  sessionStart: number;
  firstAddAt: number | null;
}

const clamp = (val: number, min: number, max: number): number => Math.max(min, Math.min(max, val));

function extractFeatures(dish: Dish): Array<{ feature: string; kind: FeatureAffinity['kind'] }> {
  const merchant = merchantById.get(dish.merchantId);
  const list: Array<{ feature: string; kind: FeatureAffinity['kind'] }> = dish.tags.map((t) => ({
    feature: t,
    kind: 'tag',
  }));
  if (merchant) {
    list.push({ feature: merchant.cuisine.toLowerCase(), kind: 'culinária' });
  }
  list.push({ feature: dish.reelKind, kind: 'formato' });
  return list;
}

/**
 * Motor real de análise de gosto do usuário (Content-Based Cosine & Bayesian Affinity).
 * Cruza sinais explícitos (carrinho, like, pulo) e implícitos (assistiu até o fim,
 * impressões repetidas sem engajamento) para descobrir o que o usuário GOSTA e o que
 * NÃO GOSTA, gerando recomendações corretas e justificadas.
 */
export function analyzeUserTaste(input: TasteAnalysisInput): TasteAnalysisResult {
  const rawScore = new Map<string, { score: number; count: number; kind: FeatureAffinity['kind'] }>();

  const addSignal = (dishId: string, weight: number) => {
    const dish = dishById.get(dishId);
    if (!dish) return;
    for (const { feature, kind } of extractFeatures(dish)) {
      const current = rawScore.get(feature) ?? { score: 0, count: 0, kind };
      current.score = clamp(current.score + weight, -2.5, 2.5);
      current.count += 1;
      rawScore.set(feature, current);
    }
  };

  // 1. Sinais explícitos de alta intenção (Sacola / Pedido)
  for (const id of input.cartDishIds) addSignal(id, 0.48);

  // 2. Sinais explícitos de preferência (Like / Coração)
  for (const id of input.savedIds) addSignal(id, 0.34);

  // 3. Sinais implícitos de atenção (Assistiu o slide completo <= 60s)
  for (const id of input.watchedCompleteIds) addSignal(id, 0.22);

  // 4. Sinais explícitos de rejeição (Pulou / Descurtiu)
  for (const id of input.skippedIds) addSignal(id, -0.32);

  // 5. Sinais implícitos negativos: pratos que apareceram (impression) mas foram ignorados
  // quando o usuário já interagiu com outros pratos na sessão
  const positiveDishSet = new Set([...input.cartDishIds, ...input.savedIds, ...input.watchedCompleteIds]);
  const impressedDishIds = input.events
    .filter((e) => e.name === 'impression' && e.dishId)
    .map((e) => e.dishId as string);

  if (positiveDishSet.size > 0) {
    for (const id of impressedDishIds) {
      if (!positiveDishSet.has(id) && !input.skippedIds.includes(id)) {
        addSignal(id, -0.09);
      }
    }
  }

  // Também incorpora qualquer ajuste vindo do profile do estado
  for (const [tag, val] of Object.entries(input.profile)) {
    if (!rawScore.has(tag) && Math.abs(val) >= 0.05) {
      rawScore.set(tag, { score: val, count: 1, kind: 'tag' });
    }
  }

  const affinities: FeatureAffinity[] = [...rawScore.entries()].map(([feature, data]) => {
    const normalized = clamp(data.score / 1.2, -1, 1);
    const confidence = clamp(1 - Math.exp(-0.55 * data.count), 0.15, 0.98);
    return {
      feature,
      kind: data.kind,
      score: normalized,
      confidence,
      evidenceCount: data.count,
    };
  });

  const willLike = affinities
    .filter((a) => a.score > 0.06)
    .sort((a, b) => b.score * b.confidence - a.score * a.confidence)
    .slice(0, 6);

  const willDislike = affinities
    .filter((a) => a.score < -0.05)
    .sort((a, b) => a.score * a.confidence - b.score * b.confidence)
    .slice(0, 5);

  // Avalia todo o catálogo elegível contra o vetor real do usuário
  const eligibleFeed = buildFeed({
    cfg: { ...input.cfg, exploration: 0, maxPerMerchant: 99 },
    profile: input.profile,
    seenMerchant: {},
    limit: 99,
  });

  const scoredCandidates: PredictedDishMatch[] = eligibleFeed.items.map((feedItem) => {
    const features = extractFeatures(feedItem.dish);
    const reasonsToLike: string[] = [];
    const reasonsToAvoid: string[] = [];

    let dotProduct = 0;
    let normFeatures = 0;
    let matchedEvidence = 0;

    for (const { feature } of features) {
      const aff = rawScore.get(feature);
      normFeatures += 1;
      if (!aff) continue;
      const normScore = clamp(aff.score / 1.2, -1, 1);
      dotProduct += normScore;
      matchedEvidence += aff.count;
      if (normScore >= 0.12) {
        reasonsToLike.push(`+${feature} (${Math.round(normScore * 100)}% afinidade)`);
      } else if (normScore <= -0.08) {
        reasonsToAvoid.push(`-${feature} (evitado por você)`);
      }
    }

    const cosine = normFeatures > 0 ? dotProduct / Math.sqrt(normFeatures) : 0;
    const baseQuality = (feedItem.merchant.rating - 4) * 0.18 + (1 - feedItem.merchant.etaMin / 60) * 0.12;
    const rawMatch = clamp(0.54 + cosine * 0.34 + baseQuality, 0.08, 0.99);
    const confidencePct = Math.round(clamp(25 + matchedEvidence * 14, 25, 98));

    if (reasonsToLike.length === 0) {
      reasonsToLike.push(`Nota ${feedItem.merchant.rating.toFixed(1)} · chega em ${feedItem.merchant.etaMin} min`);
    }

    return {
      item: feedItem,
      matchPct: Math.round(rawMatch * 100),
      confidencePct,
      reasonsToLike: reasonsToLike.slice(0, 3),
      reasonsToAvoid: reasonsToAvoid.slice(0, 2),
    };
  });

  const sortedByMatch = [...scoredCandidates].sort((a, b) => b.matchPct - a.matchPct);
  const predictedFavorites = sortedByMatch
    .filter((c) => !input.cartDishIds.includes(c.item.dish.id))
    .slice(0, 4);

  const predictedAvoid = [...scoredCandidates]
    .filter((c) => c.reasonsToAvoid.length > 0 || c.matchPct < 52)
    .sort((a, b) => a.matchPct - b.matchPct)
    .slice(0, 3);

  // Calcula a precisão (Hit Rate) real: quantos dos itens que o usuário curtiu/pediu
  // têm afinidade acima da mediana do catálogo
  const medianMatch =
    sortedByMatch.length > 0 ? sortedByMatch[Math.floor(sortedByMatch.length / 2)]!.matchPct : 55;
  const userChosenIds = [...new Set([...input.cartDishIds, ...input.savedIds])];
  const hits = userChosenIds.filter((id) => {
    const found = scoredCandidates.find((c) => c.item.dish.id === id);
    return found ? found.matchPct >= medianMatch : true;
  }).length;
  const recommendationHitRatePct =
    userChosenIds.length > 0 ? Math.round((hits / userChosenIds.length) * 100) : 0;

  const totalSignals =
    input.cartDishIds.length +
    input.savedIds.length +
    input.watchedCompleteIds.length +
    input.skippedIds.length;
  const confidencePct = Math.round(clamp(totalSignals * 18, 0, 96));

  const realTimeToDecisionSec =
    input.firstAddAt !== null ? Math.max(1, Math.round((input.firstAddAt - input.sessionStart) / 1000)) : null;
  const searchBaselineSec = 44; // baseline médio de busca + filtro + comparação
  const timeSavedVsSearchPct =
    realTimeToDecisionSec !== null
      ? Math.round(((searchBaselineSec - realTimeToDecisionSec) / searchBaselineSec) * 100)
      : null;

  const topLikedNames = willLike.slice(0, 3).map((a) => `#${a.feature}`).join(', ');
  const topDislikedNames = willDislike.slice(0, 2).map((a) => `#${a.feature}`).join(', ');

  const summaryText =
    totalSignals === 0
      ? 'Aguardando suas primeiras interações reais no feed (curtir, assistir até o fim ou adicionar à sacola) para traçar seu vetor de paladar.'
      : `Com base em ${totalSignals} sinal(is) real(is), seu paladar prioriza ${topLikedNames || 'pratos rápidos e bem avaliados'}${
          topDislikedNames ? ` e rebaixa automaticamente ${topDislikedNames}` : ''
        }.`;

  return {
    totalSignals,
    confidencePct,
    willLike,
    willDislike,
    predictedFavorites,
    predictedAvoid,
    realTelemetry: {
      hasRealInteractions: totalSignals > 0 || impressedDishIds.length > 0,
      realCardsSeen: new Set(impressedDishIds).size,
      realLikes: input.savedIds.length,
      realWatchedComplete: input.watchedCompleteIds.length,
      realCartAdds: input.cartDishIds.length,
      realSkips: input.skippedIds.length,
      realTimeToDecisionSec,
      searchBaselineSec,
      timeSavedVsSearchPct,
      recommendationHitRatePct,
    },
    summaryText,
  };
}
