import type { LabConfig, TriggerCandidate, TriggerDecision } from '../types';

export interface TriggerInput {
  cfg: LabConfig;
  now: Date;
  cardsShown: number;
  sessionSeconds: number;
  savedCount: number;
  adds: number;
  cartSize: number;
  interruptionsToday: number;
  lastTriggerAt: number | null;
  dismissedIds: string[];
}

const COOLDOWN_SECONDS = 45;

export const isHungerWindow = (now: Date): boolean => {
  const hour = now.getHours();
  return (hour >= 11 && hour <= 13) || (hour >= 18 && hour <= 21);
};

interface Rule {
  id: string;
  when: (input: TriggerInput) => boolean;
  build: (input: TriggerInput) => TriggerCandidate;
}

const RULES: Rule[] = [
  {
    id: 'cart_abandoned',
    when: (input) => input.cartSize > 0 && input.sessionSeconds > 45,
    build: () => ({
      id: 'cart_abandoned',
      title: 'Seu carrinho está esperando',
      body: 'Falta pouco para fechar. A cozinha ainda está aberta.',
      actionLabel: 'Fechar pedido',
      priority: 85,
      surface: 'modal',
    }),
  },
  {
    id: 'fast_lane',
    when: (input) => input.cardsShown >= 6 || input.sessionSeconds >= 75,
    build: () => ({
      id: 'fast_lane',
      title: 'Cansado de rolar?',
      body: 'Escolhemos 3 opções para você decidir em um toque.',
      actionLabel: 'Ver as 3',
      priority: 90,
      surface: 'banner',
    }),
  },
  {
    id: 'saved_not_ordered',
    when: (input) => input.savedCount >= 2 && input.adds === 0 && input.cardsShown >= 8,
    build: (input) => ({
      id: 'saved_not_ordered',
      title: `Você salvou ${input.savedCount} pratos`,
      body: 'Quer que a gente mostre só o que dá para pedir agora?',
      actionLabel: 'Ver salvos',
      priority: 70,
      surface: 'banner',
    }),
  },
  {
    id: 'hunger_window',
    when: (input) => isHungerWindow(input.now) && input.cardsShown >= 3,
    build: () => ({
      id: 'hunger_window',
      title: 'Horário de pico por aqui',
      body: 'É a faixa em que seus pedidos saem mais rápido. Quer ver os mais rápidos?',
      actionLabel: 'Ver rápidos',
      priority: 60,
      surface: 'banner',
    }),
  },
];

export function evaluateTriggers(input: TriggerInput): TriggerDecision {
  const budgetLeft = Math.max(0, input.cfg.attentionCap - input.interruptionsToday);
  const suppressed: Array<{ id: string; reason: string }> = [];
  const ready: TriggerCandidate[] = [];

  const cooledDown =
    input.lastTriggerAt !== null && (Date.now() - input.lastTriggerAt) / 1000 < COOLDOWN_SECONDS;

  for (const rule of RULES) {
    if (!rule.when(input)) continue;

    if (input.cfg.quietHours) {
      suppressed.push({ id: rule.id, reason: 'modo silencioso ligado' });
      continue;
    }
    if (budgetLeft <= 0) {
      suppressed.push({ id: rule.id, reason: 'limite de interrupções do dia atingido' });
      continue;
    }
    if (rule.id === 'saved_not_ordered' && input.adds > 0) {
      suppressed.push({ id: rule.id, reason: 'usuário já converteu nesta sessão' });
      continue;
    }
    if (input.dismissedIds.includes(rule.id)) {
      suppressed.push({ id: rule.id, reason: 'já dispensado nesta sessão' });
      continue;
    }
    if (cooledDown) {
      suppressed.push({ id: rule.id, reason: `cooldown de ${COOLDOWN_SECONDS}s` });
      continue;
    }
    ready.push(rule.build(input));
  }

  ready.sort((a, b) => b.priority - a.priority);

  // Só uma interrupção por vez: a segunda fica registrada como suprimida.
  for (const extra of ready.slice(1)) {
    suppressed.push({ id: extra.id, reason: 'outra interrupção já estava na tela' });
  }

  return { active: ready[0] ?? null, suppressed, budgetLeft };
}
