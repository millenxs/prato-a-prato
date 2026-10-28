import type { SessionMetrics } from '../types';

export interface MetricsInput {
  sessionStart: number;
  firstAddAt: number | null;
  cardsShown: number;
  skips: number;
  saves: number;
  watchedComplete?: number;
  adds: number;
  merchantImpressions: Record<string, number>;
  triggersShown: number;
  triggersSuppressed: number;
  now: number;
}

/** A contra-métrica é o tempo até a decisão, não o tempo no app. */
export function computeMetrics(input: MetricsInput): SessionMetrics {
  const impressions = Object.values(input.merchantImpressions);
  const total = impressions.reduce((acc, value) => acc + value, 0);
  const top = impressions.length > 0 ? Math.max(...impressions) : 0;

  return {
    sessionSeconds: Math.round((input.now - input.sessionStart) / 1000),
    cardsShown: input.cardsShown,
    skips: input.skips,
    saves: input.saves,
    watchedComplete: input.watchedComplete ?? 0,
    adds: input.adds,
    skipRate: input.cardsShown > 0 ? input.skips / input.cardsShown : 0,
    saveRate: input.cardsShown > 0 ? input.saves / input.cardsShown : 0,
    timeToDecisionSec:
      input.firstAddAt === null ? null : Math.round((input.firstAddAt - input.sessionStart) / 1000),
    topMerchantShare: total > 0 ? top / total : 0,
    merchantsReached: impressions.length,
    triggersShown: input.triggersShown,
    triggersSuppressed: input.triggersSuppressed,
  };
}

export const formatSeconds = (seconds: number | null): string => {
  if (seconds === null) return '—';
  if (seconds < 60) return `${seconds}s`;
  const min = Math.floor(seconds / 60);
  const rest = seconds % 60;
  return `${min}m${rest.toString().padStart(2, '0')}s`;
};

export const formatCurrency = (value: number): string =>
  `R$ ${value.toFixed(2).replace('.', ',')}`;
