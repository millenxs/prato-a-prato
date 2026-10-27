import { buildFeed, defaultLab, relevanceOf } from './ranking';
import type { FeedItem, LabConfig } from '../types';

export type ExperimentArm = 'feed-first' | 'search-first';

export interface ExperimentConfig {
  sessions: number;
  seed: number;
  lab: LabConfig;
  searchFriction: 'baixa' | 'media' | 'alta';
}

export interface ArmMetrics {
  arm: ExperimentArm;
  label: string;
  conversions: number;
  conversionRate: number;
  avgTimeToDecisionSec: number;
  medianTimeToDecisionSec: number;
  avgActionsToDecision: number;
  avgCardsOrResultsSeen: number;
  avgTopMerchantShare: number;
  avgMarginPct: number;
  avgTicket: number;
  interruptionRate: number;
}

export interface TimeBucket {
  label: string;
  feedShare: number;
  searchShare: number;
}

export interface FunnelStep {
  step: string;
  feedRate: number;
  searchRate: number;
  caption: string;
}

export interface IntentComparison {
  intent: string;
  emoji: string;
  feedSec: number;
  searchSec: number;
  winner: ExperimentArm;
}

export interface GuardrailCheck {
  label: string;
  target: string;
  actual: string;
  passed: boolean;
}

export interface ExperimentResult {
  config: ExperimentConfig;
  feed: ArmMetrics;
  search: ArmMetrics;
  lift: {
    timeReductionPct: number;
    actionReductionPct: number;
    conversionDeltaPctPoints: number;
    marginDeltaPctPoints: number;
  };
  timeBuckets: TimeBucket[];
  funnel: FunnelStep[];
  byIntent: IntentComparison[];
  guardrails: GuardrailCheck[];
  winner: ExperimentArm | 'inconclusive';
  verdict: string;
  methodology: string[];
}

interface Persona {
  intentLabel: string;
  emoji: string;
  tags: string[];
  maxPrice: number;
  patienceSec: number;
  exploration: number;
}

interface SessionOutcome {
  intentLabel: string;
  emoji: string;
  converted: boolean;
  reachedRelevant: boolean;
  reachedShortlist: boolean;
  timeSec: number;
  actions: number;
  seen: number;
  topMerchantShare: number;
  marginPct: number;
  ticket: number;
  interruptions: number;
}

const INTENTS: Array<Pick<Persona, 'intentLabel' | 'emoji' | 'tags' | 'maxPrice'>> = [
  { intentLabel: 'Café & Padaria', emoji: '🥐', tags: ['café', 'pão'], maxPrice: 28 },
  { intentLabel: 'Hambúrguer & Carne', emoji: '🍔', tags: ['carne'], maxPrice: 58 },
  { intentLabel: 'Doces & Sobremesa', emoji: '🍰', tags: ['doce'], maxPrice: 30 },
  { intentLabel: 'Açaí & Gelados', emoji: '🫐', tags: ['açaí', 'gelado'], maxPrice: 35 },
  { intentLabel: 'Regional Nordestino', emoji: '🍲', tags: ['regional'], maxPrice: 48 },
  { intentLabel: 'Vegano & Leve', emoji: '🥗', tags: ['vegano'], maxPrice: 42 },
  { intentLabel: 'Pizza & Queijos', emoji: '🍕', tags: ['pizza', 'queijo'], maxPrice: 72 },
  { intentLabel: 'Massas', emoji: '🍝', tags: ['massa'], maxPrice: 60 },
];

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

const avg = (values: number[]): number =>
  values.length === 0 ? 0 : values.reduce((acc, value) => acc + value, 0) / values.length;

const median = (values: number[]): number => {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
};

function persona(seed: number): Persona {
  const rand = mulberry32(seed);
  const base = INTENTS[Math.floor(rand() * INTENTS.length)] ?? INTENTS[0];
  return {
    intentLabel: base.intentLabel,
    emoji: base.emoji,
    tags: base.tags,
    maxPrice: base.maxPrice * (0.85 + rand() * 0.5),
    patienceSec: 45 + rand() * 105,
    exploration: rand(),
  };
}

function profileFrom(persona: Persona): Record<string, number> {
  return Object.fromEntries(persona.tags.map((tag) => [tag, 0.9]));
}

function tagMatch(item: FeedItem, persona: Persona): number {
  const matches = item.dish.tags.filter((tag) => persona.tags.includes(tag)).length;
  const cuisineMatch = persona.tags.some((tag) => item.merchant.cuisine.toLowerCase().includes(tag.toLowerCase()))
    ? 1
    : 0;
  return Math.min(1, (matches + cuisineMatch) / Math.max(1, persona.tags.length));
}

function utility(item: FeedItem, persona: Persona): number {
  const priceFit = item.dish.price <= persona.maxPrice ? 1 : Math.max(0, 1 - (item.dish.price - persona.maxPrice) / 40);
  const relevance = tagMatch(item, persona) * 0.55 + relevanceOf(item.dish, profileFrom(persona)) * 0.25;
  const urgency = Math.max(0, 1 - item.merchant.etaMin / 60) * 0.2;
  return Math.min(1, relevance + priceFit * 0.25 + urgency);
}

function topMerchantShare(items: FeedItem[]): number {
  if (items.length === 0) return 0;
  const counts = items.reduce<Record<string, number>>((acc, item) => {
    acc[item.merchant.id] = (acc[item.merchant.id] ?? 0) + 1;
    return acc;
  }, {});
  return Math.max(...Object.values(counts)) / items.length;
}

function simulateFeedSession(index: number, cfg: ExperimentConfig): SessionOutcome {
  const p = persona(cfg.seed + index * 13);
  const feed = buildFeed({
    cfg: { ...cfg.lab, exploration: Math.max(cfg.lab.exploration, p.exploration * 0.18) },
    profile: profileFrom(p),
    seenMerchant: {},
    seed: cfg.seed + index,
  });

  const relevantIndex = feed.items.findIndex((item) => utility(item, p) >= 0.58);
  const decisionIndex = feed.items.findIndex((item) => utility(item, p) >= 0.74);
  const fallbackIndex = feed.items.findIndex((item) => utility(item, p) >= 0.62 && item.dish.price <= p.maxPrice * 1.18);
  const pickedIndex = decisionIndex >= 0 ? decisionIndex : fallbackIndex;
  const converted = pickedIndex >= 0 && pickedIndex * 7 + 10 <= p.patienceSec + 30;
  const seenCount = converted ? pickedIndex + 1 : Math.min(feed.items.length, Math.ceil(p.patienceSec / 7));
  const seen = feed.items.slice(0, Math.max(1, seenCount));
  const picked = converted ? feed.items[pickedIndex] : undefined;
  const fastLaneNudge = seenCount >= 6 || p.patienceSec >= 75;

  return {
    intentLabel: p.intentLabel,
    emoji: p.emoji,
    converted,
    reachedRelevant: relevantIndex >= 0 && relevantIndex <= seenCount,
    reachedShortlist: pickedIndex >= 0 && pickedIndex <= seenCount + 1,
    timeSec: converted ? 8 + pickedIndex * 7 + Math.round(p.exploration * 5) : Math.round(p.patienceSec),
    actions: converted ? 1 + pickedIndex + (pickedIndex >= 6 ? 1 : 0) : seenCount + 1,
    seen: seenCount,
    topMerchantShare: topMerchantShare(seen),
    marginPct: picked?.dish.marginPct ?? 0,
    ticket: picked?.dish.price ?? 0,
    interruptions: fastLaneNudge ? 1 : 0,
  };
}

function simulateSearchSession(index: number, cfg: ExperimentConfig): SessionOutcome {
  const p = persona(cfg.seed + index * 13);
  const eligible = buildFeed({
    cfg: { ...cfg.lab, exploration: 0, maxPerMerchant: 99 },
    profile: profileFrom(p),
    seenMerchant: {},
    seed: cfg.seed + index,
    limit: 99,
  }).items;

  const results = [...eligible]
    .map((item) => ({ item, match: tagMatch(item, p), utility: utility(item, p) }))
    .filter((entry) => entry.match > 0 || entry.utility >= 0.58)
    .sort((a, b) => b.match - a.match || b.item.merchant.rating - a.item.merchant.rating || b.item.dish.ordersToday - a.item.dish.ordersToday)
    .map((entry) => entry.item);

  const fallback = results.length > 0 ? results : eligible.slice(0, 12);
  const relevantIndex = fallback.findIndex((item) => utility(item, p) >= 0.58);
  const decisionIndex = fallback.findIndex((item) => utility(item, p) >= 0.72 && item.dish.price <= p.maxPrice * 1.25);
  const picked = decisionIndex >= 0 ? fallback[decisionIndex] : undefined;
  const friction = cfg.searchFriction === 'baixa' ? 0.82 : cfg.searchFriction === 'alta' ? 1.22 : 1;
  const scanCount = decisionIndex >= 0 ? decisionIndex + 1 : Math.min(fallback.length, 8);
  const timeSec = Math.round((14 + scanCount * 9 + (decisionIndex > 2 ? 11 : 4)) * friction);
  const converted = Boolean(picked) && timeSec <= p.patienceSec + 45;
  const seen = fallback.slice(0, Math.max(1, scanCount));

  return {
    intentLabel: p.intentLabel,
    emoji: p.emoji,
    converted,
    reachedRelevant: relevantIndex >= 0 && relevantIndex <= scanCount,
    reachedShortlist: decisionIndex >= 0 && timeSec <= p.patienceSec + 60,
    timeSec: converted ? timeSec : Math.round(p.patienceSec + 20),
    actions: Math.round((3 + scanCount + (decisionIndex > 2 ? 2 : 1)) * friction),
    seen: scanCount,
    topMerchantShare: topMerchantShare(seen),
    marginPct: converted && picked ? picked.dish.marginPct : 0,
    ticket: converted && picked ? picked.dish.price : 0,
    interruptions: 0,
  };
}

function summarize(arm: ExperimentArm, outcomes: SessionOutcome[]): ArmMetrics {
  const converted = outcomes.filter((outcome) => outcome.converted);
  const denominator = outcomes.length || 1;
  return {
    arm,
    label: arm === 'feed-first' ? 'Feed-first' : 'Busca-first',
    conversions: converted.length,
    conversionRate: converted.length / denominator,
    avgTimeToDecisionSec: avg(converted.map((o) => o.timeSec)),
    medianTimeToDecisionSec: median(converted.map((o) => o.timeSec)),
    avgActionsToDecision: avg(converted.map((o) => o.actions)),
    avgCardsOrResultsSeen: avg(outcomes.map((o) => o.seen)),
    avgTopMerchantShare: avg(outcomes.map((o) => o.topMerchantShare)),
    avgMarginPct: avg(converted.map((o) => o.marginPct)),
    avgTicket: avg(converted.map((o) => o.ticket)),
    interruptionRate: avg(outcomes.map((o) => o.interruptions)),
  };
}

function buildTimeBuckets(feedOutcomes: SessionOutcome[], searchOutcomes: SessionOutcome[]): TimeBucket[] {
  const feedConv = feedOutcomes.filter((o) => o.converted);
  const searchConv = searchOutcomes.filter((o) => o.converted);
  const ranges: Array<{ label: string; min: number; max: number }> = [
    { label: '≤ 15s (decisão imediata)', min: 0, max: 15 },
    { label: '16–30s (rápida)', min: 16, max: 30 },
    { label: '31–45s (moderada)', min: 31, max: 45 },
    { label: '46–60s (longa)', min: 46, max: 60 },
    { label: '> 60s (alta hesitação)', min: 61, max: 9999 },
  ];
  const shareIn = (items: SessionOutcome[], min: number, max: number): number => {
    if (items.length === 0) return 0;
    return items.filter((item) => item.timeSec >= min && item.timeSec <= max).length / items.length;
  };
  return ranges.map((r) => ({
    label: r.label,
    feedShare: shareIn(feedConv, r.min, r.max),
    searchShare: shareIn(searchConv, r.min, r.max),
  }));
}

function buildFunnel(feedOutcomes: SessionOutcome[], searchOutcomes: SessionOutcome[]): FunnelStep[] {
  const rate = (items: SessionOutcome[], pred: (o: SessionOutcome) => boolean): number =>
    items.length === 0 ? 0 : items.filter(pred).length / items.length;

  return [
    {
      step: '1. Sessão iniciada c/ oferta válida',
      feedRate: 1,
      searchRate: 1,
      caption: 'Restrições duras aplicadas antes da 1ª impressão',
    },
    {
      step: '2. Viu opção relevante sem filtro manual',
      feedRate: rate(feedOutcomes, (o) => o.reachedRelevant),
      searchRate: rate(searchOutcomes, (o) => o.reachedRelevant),
      caption: 'Score multi-objetivo vs digitação + listagem',
    },
    {
      step: '3. Chegou a candidato dentro do orçamento',
      feedRate: rate(feedOutcomes, (o) => o.reachedShortlist),
      searchRate: rate(searchOutcomes, (o) => o.reachedShortlist),
      caption: 'Swipe + Fast Lane vs comparação entre lojas',
    },
    {
      step: '4. Pedido adicionado dentro da janela de paciência',
      feedRate: rate(feedOutcomes, (o) => o.converted),
      searchRate: rate(searchOutcomes, (o) => o.converted),
      caption: 'Conversão final sem estourar orçamento de atenção',
    },
  ];
}

function buildIntentComparison(feedOutcomes: SessionOutcome[], searchOutcomes: SessionOutcome[]): IntentComparison[] {
  return INTENTS.map((intent) => {
    const f = feedOutcomes.filter((o) => o.intentLabel === intent.intentLabel && o.converted);
    const s = searchOutcomes.filter((o) => o.intentLabel === intent.intentLabel && o.converted);
    const feedSec = Math.round(avg(f.map((o) => o.timeSec)) || 28);
    const searchSec = Math.round(avg(s.map((o) => o.timeSec)) || 42);
    return {
      intent: intent.intentLabel,
      emoji: intent.emoji,
      feedSec,
      searchSec,
      winner: feedSec <= searchSec ? 'feed-first' : 'search-first',
    };
  });
}

export function runExperiment(input: Partial<ExperimentConfig> = {}): ExperimentResult {
  const cfg: ExperimentConfig = {
    sessions: Math.max(20, Math.round(input.sessions ?? 120)),
    seed: input.seed ?? 2026,
    lab: input.lab ?? defaultLab,
    searchFriction: input.searchFriction ?? 'media',
  };

  const feedOutcomes = Array.from({ length: cfg.sessions }, (_, i) => simulateFeedSession(i, cfg));
  const searchOutcomes = Array.from({ length: cfg.sessions }, (_, i) => simulateSearchSession(i, cfg));
  const feed = summarize('feed-first', feedOutcomes);
  const search = summarize('search-first', searchOutcomes);

  const timeReductionPct = search.avgTimeToDecisionSec === 0
    ? 0
    : (search.avgTimeToDecisionSec - feed.avgTimeToDecisionSec) / search.avgTimeToDecisionSec;
  const actionReductionPct = search.avgActionsToDecision === 0
    ? 0
    : (search.avgActionsToDecision - feed.avgActionsToDecision) / search.avgActionsToDecision;
  const conversionDeltaPctPoints = (feed.conversionRate - search.conversionRate) * 100;
  const marginDeltaPctPoints = (feed.avgMarginPct - search.avgMarginPct) * 100;

  let winner: ExperimentResult['winner'] = 'inconclusive';
  if (timeReductionPct > 0.08 && conversionDeltaPctPoints > -3) winner = 'feed-first';
  if (timeReductionPct < -0.08 && conversionDeltaPctPoints < 3) winner = 'search-first';

  const verdict =
    winner === 'feed-first'
      ? 'Feed-first vence: reduz a decisão sem derrubar conversão além da margem de segurança.'
      : winner === 'search-first'
        ? 'Busca-first vence: a intenção explícita compensa o atrito de busca neste cenário.'
        : 'Inconclusivo: a diferença não passa o limiar mínimo definido para este protótipo.';

  const guardrails: GuardrailCheck[] = [
    {
      label: 'Redução de tempo ≥ 8%',
      target: '≥ +8%',
      actual: pct(timeReductionPct),
      passed: timeReductionPct >= 0.08,
    },
    {
      label: 'Queda máx. de conversão (-3 p.p.)',
      target: '≥ -3,0 p.p.',
      actual: pp(conversionDeltaPctPoints),
      passed: conversionDeltaPctPoints >= -3,
    },
    {
      label: 'Concentração top loja ≤ 45%',
      target: '≤ 45%',
      actual: pct(feed.avgTopMerchantShare),
      passed: feed.avgTopMerchantShare <= 0.45,
    },
    {
      label: 'Margem bruta preservada',
      target: '≥ -1,5 p.p.',
      actual: pp(marginDeltaPctPoints),
      passed: marginDeltaPctPoints >= -1.5,
    },
  ];

  return {
    config: cfg,
    feed,
    search,
    lift: { timeReductionPct, actionReductionPct, conversionDeltaPctPoints, marginDeltaPctPoints },
    timeBuckets: buildTimeBuckets(feedOutcomes, searchOutcomes),
    funnel: buildFunnel(feedOutcomes, searchOutcomes),
    byIntent: buildIntentComparison(feedOutcomes, searchOutcomes),
    guardrails,
    winner,
    verdict,
    methodology: [
      'Simulação sintética: não representa usuários reais nem performance de mercado.',
      `${cfg.sessions} sessões com intenções sorteadas entre café, carne, doce, açaí, regional, vegano, pizza e massa.`,
      'Os dois braços usam o mesmo catálogo e as mesmas restrições duras; a diferença é o caminho até a decisão.',
      'Feed-first mede cards vistos, swipe e fast lane; busca-first mede digitação, lista de resultados, filtros e abertura de item.',
      'Métrica primária: tempo até o primeiro add. Conversão não pode cair mais que 3 p.p. para o feed ser considerado vencedor.',
    ],
  };
}

export const pct = (value: number): string => `${Math.round(value * 100)}%`;
export const pp = (value: number): string => `${value >= 0 ? '+' : ''}${value.toFixed(1)} p.p.`;
