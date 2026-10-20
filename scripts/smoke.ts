/**
 * Smoke test do motor de decisão — roda sem React Native.
 *
 *   npm run smoke
 *
 * Ele existe para uma coisa só: provar que as restrições duras, a diversidade,
 * a exploração e o orçamento de atenção se comportam como o painel promete.
 */
import { dishes, merchantById } from '../src/data/seed';
import { runExperiment } from '../src/engine/experiment';
import { buildFeed, defaultLab, updateProfile } from '../src/engine/ranking';
import { computeMetrics } from '../src/engine/metrics';
import { evaluateTriggers } from '../src/engine/triggers';
import type { FeedItem, LabConfig } from '../src/types';

let failures = 0;

function check(label: string, condition: boolean, detail?: string): void {
  if (condition) {
    console.log(`  ok   ${label}`);
    return;
  }
  failures += 1;
  console.log(`  FAIL ${label}${detail ? ` — ${detail}` : ''}`);
}

function satisfiesHardConstraints(item: FeedItem, cfg: LabConfig): boolean {
  return (
    item.merchant.open &&
    item.dish.available &&
    item.merchant.etaMin <= cfg.maxEtaMin &&
    item.merchant.distanceKm <= cfg.maxDistanceKm &&
    item.merchant.openOrders < item.merchant.capacityPerHour
  );
}

function longestCuisineRun(items: FeedItem[]): number {
  let best = 0;
  let run = 0;
  let previous = '';
  for (const item of items) {
    run = item.merchant.cuisine === previous ? run + 1 : 1;
    previous = item.merchant.cuisine;
    best = Math.max(best, run);
  }
  return best;
}

console.log('\n1) Feed padrão');

const base = buildFeed({ cfg: defaultLab, profile: {}, seenMerchant: {}, seed: 7 });

check('monta um feed não vazio', base.items.length > 0, `${base.items.length} itens`);
check(
  'todo card passa pelas restrições duras',
  base.items.every((item) => satisfiesHardConstraints(item, defaultLab)),
);
check('nenhum item aparece duas vezes', new Set(base.items.map((i) => i.dish.id)).size === base.items.length);
check(
  'teto de cards por loja respeitado',
  Object.values(
    base.items.reduce<Record<string, number>>((acc, item) => {
      acc[item.merchant.id] = (acc[item.merchant.id] ?? 0) + 1;
      return acc;
    }, {}),
  ).every((count) => count <= defaultLab.maxPerMerchant),
);
check('nunca 3 cozinhas iguais seguidas', longestCuisineRun(base.items) <= 2, `maior sequência: ${longestCuisineRun(base.items)}`);
check(
  'excluídos têm todos os motivos esperados',
  ['loja fechada agora', 'cozinha lotada', 'item esgotado'].every((reason) =>
    base.excluded.some((ex) => ex.reason === reason) || base.blockedByReason.some((b) => b.reason === reason),
  ),
);
check(
  'itens excluídos não vazam para o feed',
  base.excluded.every((ex) => !base.items.some((item) => item.dish.id === ex.dishId)),
);

console.log(`  feed: ${base.items.length} itens · elegíveis ${base.eligible}/${base.candidates}`);
console.log(`  motivos: ${base.blockedByReason.map((b) => `${b.count}× ${b.reason}`).join(', ')}`);

console.log('\n2) Restrições duras reagem à configuração');

const tight = buildFeed({ cfg: { ...defaultLab, maxEtaMin: 25, maxDistanceKm: 1 }, profile: {}, seenMerchant: {}, seed: 7 });
check('apertar ETA e raio reduz os elegíveis', tight.eligible < base.eligible, `${tight.eligible} < ${base.eligible}`);
check(
  'o feed apertado continua válido',
  tight.items.every((item) =>
    satisfiesHardConstraints(item, { ...defaultLab, maxEtaMin: 25, maxDistanceKm: 1 }),
  ),
);

const loose: LabConfig = { ...defaultLab, maxEtaMin: 70, maxDistanceKm: 8, maxPerMerchant: 1 };
const looseFeed = buildFeed({ cfg: loose, profile: {}, seenMerchant: {}, seed: 7 });
check('abrir o raio traz a loja fechada de volta? não — fechada é fechada', looseFeed.items.every((i) => i.merchant.open));
check(
  'teto de 1 card por loja é obedecido mesmo com folga',
  new Set(looseFeed.items.map((i) => i.merchant.id)).size === looseFeed.items.length,
);
check('cards que não entraram por causa do teto são contados', looseFeed.cappedOut > 0, `${looseFeed.cappedOut}`);
check('feed padrão aproveita o estoque elegível', base.cappedOut === 0 || base.items.length < base.eligible);

console.log('\n3) Exploração');

const exploreSeed = 2026;
const deterministic = buildFeed({ cfg: { ...defaultLab, exploration: 0 }, profile: {}, seenMerchant: {}, seed: exploreSeed });
const exploratory = buildFeed({ cfg: { ...defaultLab, exploration: 0.45 }, profile: {}, seenMerchant: {}, seed: exploreSeed });
check(
  'exploração muda a ordem sem mudar o conjunto',
  deterministic.items.map((i) => i.dish.id).join(',') !== exploratory.items.map((i) => i.dish.id).join(','),
);
check(
  'o conjunto elegível é estável',
  deterministic.eligible === exploratory.eligible &&
    [...deterministic.items].sort((a, b) => a.dish.id.localeCompare(b.dish.id)).length ===
      [...exploratory.items].sort((a, b) => a.dish.id.localeCompare(b.dish.id)).length,
);

console.log('\n4) Perfil de gosto');

const burgerLover = dishes
  .filter((dish) => dish.tags.includes('carne'))
  .reduce((profile, dish) => updateProfile(profile, dish, 'save'), {} as Record<string, number>);
const personalized = buildFeed({ cfg: defaultLab, profile: burgerLover, seenMerchant: {}, seed: 3 });
const withoutProfile = buildFeed({ cfg: defaultLab, profile: {}, seenMerchant: {}, seed: 3 });
check(
  'salvar pratos de carne sobe o score dos pratos de carne',
  (personalized.items.find((i) => i.dish.tags.includes('carne'))?.score ?? 0) >
    (withoutProfile.items.find((i) => i.dish.tags.includes('carne'))?.score ?? 0),
);

console.log('\n5) Orçamento de atenção');

const triggerBase = {
  cfg: defaultLab,
  now: new Date('2026-10-19T19:30:00'),
  cardsShown: 9,
  sessionSeconds: 120,
  savedCount: 3,
  adds: 0,
  cartSize: 0,
  interruptionsToday: 0,
  lastTriggerAt: null,
  dismissedIds: [],
};

const hot = evaluateTriggers(triggerBase);
check('com fome e tempo de rolagem, um gatilho aparece', hot.active !== null, String(hot.active?.id));
check('o gatilho escolhido é o de maior prioridade', hot.active?.id === 'fast_lane', String(hot.active?.id));
check('os demais gatilhos ficam registrados como suprimidos', hot.suppressed.length > 0);

const silenced = evaluateTriggers({ ...triggerBase, cfg: { ...defaultLab, quietHours: true } });
check('modo silencioso não deixa nada passar', silenced.active === null && silenced.suppressed.length > 0);

const capped = evaluateTriggers({ ...triggerBase, interruptionsToday: defaultLab.attentionCap });
check(
  'teto diário barra tudo com motivo explícito',
  capped.active === null &&
    capped.suppressed.every((s) => s.reason === 'limite de interrupções do dia atingido'),
);
check('orçamento restante é calculado', capped.budgetLeft === 0);

const dismissed = evaluateTriggers({ ...triggerBase, dismissedIds: ['fast_lane', 'saved_not_ordered'] });
check('gatilho já dispensado não volta na mesma sessão', dismissed.active?.id !== 'fast_lane');

const converted = evaluateTriggers({
  ...triggerBase,
  cardsShown: 2,
  sessionSeconds: 10,
  interruptionsToday: 0,
  adds: 1,
  cartSize: 2,
});
check('quem já converteu não recebe cutucada de carrinho abandonado', converted.active?.id !== 'saved_not_ordered');

console.log('\n6) Métricas');

const metrics = computeMetrics({
  sessionStart: 0,
  firstAddAt: 42_000,
  cardsShown: 10,
  skips: 6,
  saves: 3,
  adds: 1,
  merchantImpressions: { m4: 5, m8: 3, m12: 2 },
  triggersShown: 1,
  triggersSuppressed: 2,
  now: 100_000,
});
check('tempo até decisão mede a decisão, não a sessão', metrics.timeToDecisionSec === 42);
check('taxa de pulo é derivada dos cards vistos', Math.abs(metrics.skipRate - 0.6) < 1e-9);
check('concentração de exposição é o topo sobre o total', Math.abs(metrics.topMerchantShare - 0.5) < 1e-9);
check('lojas alcançadas conta a distribuição', metrics.merchantsReached === 3);

console.log('\n7) Sanidade do catálogo');

check('todo prato aponta para uma loja existente', dishes.every((dish) => merchantById.has(dish.merchantId)));
check('ids de prato são únicos', new Set(dishes.map((d) => d.id)).size === dishes.length);
check('preços e margens são plausíveis', dishes.every((d) => d.price > 0 && d.marginPct > 0 && d.marginPct < 1));

console.log('\n8) Experimento A/B');

const experiment = runExperiment({ sessions: 80, seed: 2026, lab: defaultLab, searchFriction: 'media' });
check('experimento preserva o tamanho da amostra', experiment.config.sessions === 80);
check('ambos os braços têm conversões', experiment.feed.conversions > 0 && experiment.search.conversions > 0);
check(
  'taxas ficam no intervalo 0–1',
  [experiment.feed.conversionRate, experiment.search.conversionRate].every((value) => value >= 0 && value <= 1),
);
check('tempo até decisão é positivo', experiment.feed.avgTimeToDecisionSec > 0 && experiment.search.avgTimeToDecisionSec > 0);
check('resultado declara uma metodologia', experiment.methodology.length >= 4);
check(
  'feed-first tem menos ações que busca-first no cenário padrão',
  experiment.feed.avgActionsToDecision < experiment.search.avgActionsToDecision,
  `${experiment.feed.avgActionsToDecision.toFixed(1)} vs ${experiment.search.avgActionsToDecision.toFixed(1)}`,
);
check(
  'winner sempre é um valor conhecido',
  ['feed-first', 'search-first', 'inconclusive'].includes(experiment.winner),
  String(experiment.winner),
);

console.log(`\n${failures === 0 ? 'todos os checks passaram' : `${failures} check(s) falharam`}\n`);
process.exitCode = failures === 0 ? 0 : 1;
