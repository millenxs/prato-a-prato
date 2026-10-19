import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useState,
} from 'react';

import { dishById, merchantById } from '../data/seed';
import { computeMetrics } from '../engine/metrics';
import { buildFeed, defaultLab, updateProfile, type BuildFeedResult } from '../engine/ranking';
import { evaluateTriggers } from '../engine/triggers';
import type { CartLine, LabConfig, LogEvent, SessionMetrics, TriggerDecision } from '../types';

const MAX_EVENTS = 400;

export interface AppState {
  lab: LabConfig;
  seed: number;
  feed: BuildFeedResult;
  profile: Record<string, number>;
  seenMerchant: Record<string, number>;
  savedIds: string[];
  skippedIds: string[];
  cart: CartLine[];
  events: LogEvent[];
  eventSeq: number;
  sessionStart: number;
  firstAddAt: number | null;
  cardsShown: number;
  skips: number;
  saves: number;
  adds: number;
  merchantImpressions: Record<string, number>;
  interruptionsToday: number;
  lastTriggerAt: number | null;
  activeTriggerId: string | null;
  dismissedTriggerIds: string[];
  checkoutDone: boolean;
}

type Action =
  | { type: 'impression'; at: number; dishId: string; merchantId: string }
  | { type: 'skip'; at: number; dishId: string }
  | { type: 'save'; at: number; dishId: string }
  | { type: 'unsave'; at: number; dishId: string }
  | { type: 'add'; at: number; dishId: string }
  | { type: 'remove'; at: number; dishId: string }
  | { type: 'checkout'; at: number }
  | { type: 'closeCheckout' }
  | { type: 'setLab'; lab: LabConfig }
  | { type: 'rebuild'; at: number; seed: number }
  | { type: 'triggerShown'; at: number; id: string }
  | { type: 'triggerDismiss'; at: number; id: string }
  | { type: 'triggerSuppressed'; at: number; id: string; reason: string }
  | { type: 'resetSession'; at: number };

function pushEvent(state: AppState, event: Omit<LogEvent, 'id'>): Pick<AppState, 'events' | 'eventSeq'> {
  const seq = state.eventSeq + 1;
  const log: LogEvent = { ...event, id: `e${seq}` };
  const events = [...state.events, log];
  return { events: events.length > MAX_EVENTS ? events.slice(events.length - MAX_EVENTS) : events, eventSeq: seq };
}

export function createInitialState(now: number = Date.now()): AppState {
  const feed = buildFeed({ cfg: defaultLab, profile: {}, seenMerchant: {}, seed: 1 });
  return {
    lab: defaultLab,
    seed: 1,
    feed,
    profile: {},
    seenMerchant: {},
    savedIds: [],
    skippedIds: [],
    cart: [],
    events: [],
    eventSeq: 0,
    sessionStart: now,
    firstAddAt: null,
    cardsShown: 0,
    skips: 0,
    saves: 0,
    adds: 0,
    merchantImpressions: {},
    interruptionsToday: 0,
    lastTriggerAt: null,
    activeTriggerId: null,
    dismissedTriggerIds: [],
    checkoutDone: false,
  };
}

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'impression': {
      const dish = dishById.get(action.dishId);
      if (!dish) return state;
      return {
        ...state,
        cardsShown: state.cardsShown + 1,
        merchantImpressions: {
          ...state.merchantImpressions,
          [action.merchantId]: (state.merchantImpressions[action.merchantId] ?? 0) + 1,
        },
        seenMerchant: {
          ...state.seenMerchant,
          [action.merchantId]: (state.seenMerchant[action.merchantId] ?? 0) + 1,
        },
        ...pushEvent(state, {
          name: 'impression',
          at: action.at,
          dishId: action.dishId,
          merchantId: action.merchantId,
        }),
      };
    }
    case 'skip': {
      const dish = dishById.get(action.dishId);
      if (!dish) return state;
      return {
        ...state,
        skips: state.skips + 1,
        skippedIds: [...state.skippedIds, action.dishId],
        profile: updateProfile(state.profile, dish, 'skip'),
        ...pushEvent(state, { name: 'skip', at: action.at, dishId: action.dishId }),
      };
    }
    case 'save': {
      const dish = dishById.get(action.dishId);
      if (!dish || state.savedIds.includes(action.dishId)) return state;
      return {
        ...state,
        saves: state.saves + 1,
        savedIds: [...state.savedIds, action.dishId],
        profile: updateProfile(state.profile, dish, 'save'),
        ...pushEvent(state, { name: 'save', at: action.at, dishId: action.dishId }),
      };
    }
    case 'unsave': {
      const dish = dishById.get(action.dishId);
      if (!dish) return state;
      return {
        ...state,
        saves: Math.max(0, state.saves - 1),
        savedIds: state.savedIds.filter((id) => id !== action.dishId),
        profile: updateProfile(state.profile, dish, 'skip'),
        ...pushEvent(state, { name: 'unsave', at: action.at, dishId: action.dishId }),
      };
    }
    case 'add': {
      const dish = dishById.get(action.dishId);
      if (!dish) return state;
      const existing = state.cart.find((line) => line.dishId === action.dishId);
      const cart = existing
        ? state.cart.map((line) =>
            line.dishId === action.dishId ? { ...line, qty: line.qty + 1 } : line,
          )
        : [...state.cart, { dishId: action.dishId, qty: 1 }];
      return {
        ...state,
        cart,
        adds: state.adds + 1,
        firstAddAt: state.firstAddAt ?? action.at,
        checkoutDone: false,
        ...pushEvent(state, { name: 'add', at: action.at, dishId: action.dishId }),
      };
    }
    case 'remove': {
      const line = state.cart.find((l) => l.dishId === action.dishId);
      if (!line) return state;
      const cart =
        line.qty <= 1
          ? state.cart.filter((l) => l.dishId !== action.dishId)
          : state.cart.map((l) => (l.dishId === action.dishId ? { ...l, qty: l.qty - 1 } : l));
      return {
        ...state,
        cart,
        ...pushEvent(state, { name: 'remove', at: action.at, dishId: action.dishId }),
      };
    }
    case 'checkout':
      return {
        ...state,
        checkoutDone: true,
        cart: [],
        ...pushEvent(state, { name: 'checkout', at: action.at, meta: { lines: state.cart.length } }),
      };
    case 'closeCheckout':
      return { ...state, checkoutDone: false };
    case 'setLab': {
      const feed = buildFeed({
        cfg: action.lab,
        profile: state.profile,
        seenMerchant: state.seenMerchant,
        seed: state.seed,
      });
      return { ...state, lab: action.lab, feed };
    }
    case 'rebuild': {
      const feed = buildFeed({
        cfg: state.lab,
        profile: state.profile,
        seenMerchant: state.seenMerchant,
        seed: action.seed,
      });
      return {
        ...state,
        seed: action.seed,
        feed,
        ...pushEvent(state, { name: 'feed_rebuilt', at: action.at, meta: { seed: action.seed } }),
      };
    }
    case 'triggerShown':
      if (state.activeTriggerId === action.id) return state;
      return {
        ...state,
        activeTriggerId: action.id,
        interruptionsToday: state.interruptionsToday + 1,
        lastTriggerAt: action.at,
        ...pushEvent(state, { name: 'trigger_shown', at: action.at, meta: { trigger: action.id } }),
      };
    case 'triggerDismiss':
      if (state.activeTriggerId === null) return state;
      return {
        ...state,
        activeTriggerId: null,
        dismissedTriggerIds: state.dismissedTriggerIds.includes(action.id)
          ? state.dismissedTriggerIds
          : [...state.dismissedTriggerIds, action.id],
        ...pushEvent(state, { name: 'trigger_dismiss', at: action.at, meta: { trigger: action.id } }),
      };
    case 'triggerSuppressed':
      return {
        ...state,
        ...pushEvent(state, {
          name: 'trigger_suppressed',
          at: action.at,
          meta: { trigger: action.id, reason: action.reason },
        }),
      };
    case 'resetSession': {
      const feed = buildFeed({
        cfg: state.lab,
        profile: {},
        seenMerchant: {},
        seed: state.seed + 1,
      });
      return {
        ...state,
        feed,
        seed: state.seed + 1,
        profile: {},
        seenMerchant: {},
        savedIds: [],
        skippedIds: [],
        cart: [],
        events: [],
        eventSeq: 0,
        sessionStart: action.at,
        firstAddAt: null,
        cardsShown: 0,
        skips: 0,
        saves: 0,
        adds: 0,
        merchantImpressions: {},
        interruptionsToday: 0,
        lastTriggerAt: null,
        activeTriggerId: null,
        dismissedTriggerIds: [],
        checkoutDone: false,
      };
    }
    default:
      return state;
  }
}

interface StoreValue {
  state: AppState;
  metrics: SessionMetrics;
  trigger: TriggerDecision;
  cartItems: Array<{ dishId: string; name: string; emoji: string; qty: number; price: number; merchantName: string }>;
  cartTotal: number;
  actions: {
    impression: (dishId: string, merchantId: string) => void;
    skip: (dishId: string) => void;
    save: (dishId: string) => void;
    unsave: (dishId: string) => void;
    add: (dishId: string) => void;
    remove: (dishId: string) => void;
    checkout: () => void;
    closeCheckout: () => void;
    setLab: (lab: LabConfig) => void;
    rebuild: () => void;
    triggerShown: (id: string) => void;
    triggerDismiss: (id: string) => void;
    triggerSuppressed: (id: string, reason: string) => void;
    resetSession: () => void;
  };
}

const StoreContext = createContext<StoreValue | null>(null);

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, () => createInitialState());
  const [tick, setTick] = useState(0);

  // Reavalia gatilhos e métricas periodicamente (janela de fome, cooldown, tempo de sessão).
  useEffect(() => {
    const timer = setInterval(() => setTick((value) => value + 1), 5000);
    return () => clearInterval(timer);
  }, []);

  const now = Date.now() + tick;

  const metrics = useMemo(
    () =>
      computeMetrics({
        sessionStart: state.sessionStart,
        firstAddAt: state.firstAddAt,
        cardsShown: state.cardsShown,
        skips: state.skips,
        saves: state.saves,
        adds: state.adds,
        merchantImpressions: state.merchantImpressions,
        triggersShown: state.interruptionsToday,
        triggersSuppressed: state.events.filter((event) => event.name === 'trigger_suppressed').length,
        now,
      }),
    [state, now],
  );

  const trigger = useMemo(
    () =>
      evaluateTriggers({
        cfg: state.lab,
        now: new Date(now),
        cardsShown: state.cardsShown,
        sessionSeconds: (now - state.sessionStart) / 1000,
        savedCount: state.savedIds.length,
        adds: state.adds,
        cartSize: state.cart.length,
        interruptionsToday: state.interruptionsToday,
        lastTriggerAt: state.lastTriggerAt,
        dismissedIds: state.dismissedTriggerIds,
      }),
    [state, now],
  );

  const { cartItems, cartTotal } = useMemo(() => {
    const items = state.cart.flatMap((line) => {
      const dish = dishById.get(line.dishId);
      if (!dish) return [];
      const merchant = merchantById.get(dish.merchantId);
      return [
        {
          dishId: dish.id,
          name: dish.name,
          emoji: dish.emoji,
          qty: line.qty,
          price: dish.price,
          merchantName: merchant?.name ?? 'Loja',
        },
      ];
    });
    return {
      cartItems: items,
      cartTotal: items.reduce((acc, item) => acc + item.price * item.qty, 0),
    };
  }, [state.cart]);

  const actions = useMemo(
    () => ({
      impression: (dishId: string, merchantId: string) =>
        dispatch({ type: 'impression', at: Date.now(), dishId, merchantId }),
      skip: (dishId: string) => dispatch({ type: 'skip', at: Date.now(), dishId }),
      save: (dishId: string) => dispatch({ type: 'save', at: Date.now(), dishId }),
      unsave: (dishId: string) => dispatch({ type: 'unsave', at: Date.now(), dishId }),
      add: (dishId: string) => dispatch({ type: 'add', at: Date.now(), dishId }),
      remove: (dishId: string) => dispatch({ type: 'remove', at: Date.now(), dishId }),
      checkout: () => dispatch({ type: 'checkout', at: Date.now() }),
      closeCheckout: () => dispatch({ type: 'closeCheckout' }),
      setLab: (lab: LabConfig) => dispatch({ type: 'setLab', lab }),
      rebuild: () => dispatch({ type: 'rebuild', at: Date.now(), seed: Date.now() % 100000 }),
      triggerShown: (id: string) => dispatch({ type: 'triggerShown', at: Date.now(), id }),
      triggerDismiss: (id: string) => dispatch({ type: 'triggerDismiss', at: Date.now(), id }),
      triggerSuppressed: (id: string, reason: string) =>
        dispatch({ type: 'triggerSuppressed', at: Date.now(), id, reason }),
      resetSession: () => dispatch({ type: 'resetSession', at: Date.now() }),
    }),
    [],
  );

  const value = useMemo<StoreValue>(
    () => ({ state, metrics, trigger, cartItems, cartTotal, actions }),
    [state, metrics, trigger, cartItems, cartTotal, actions],
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore(): StoreValue {
  const value = useContext(StoreContext);
  if (!value) throw new Error('useStore precisa estar dentro de <StoreProvider>');
  return value;
}
