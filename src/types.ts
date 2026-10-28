export type Cuisine =
  | 'Hambúrguer'
  | 'Pizza'
  | 'Japonês'
  | 'Nordestino'
  | 'Açaí'
  | 'Churrasco'
  | 'Baiana'
  | 'Padaria'
  | 'Vegano'
  | 'Massas'
  | 'Frutos do Mar'
  | 'Doces';

export type ReelKind = 'prato' | 'promocao' | 'bastidores' | 'combo';

export interface Merchant {
  id: string;
  name: string;
  cuisine: Cuisine;
  rating: number;
  distanceKm: number;
  etaMin: number;
  deliveryFee: number;
  minOrder: number;
  open: boolean;
  /** Capacidade de pedidos por hora. Acima disso a loja sai do feed (restrição dura). */
  capacityPerHour: number;
  openOrders: number;
  emoji: string;
  /** Gradiente da marca: usado como fundo e fallback de mídia. */
  accent: [string, string];
}

export interface Dish {
  id: string;
  merchantId: string;
  name: string;
  description: string;
  price: number;
  /** Preço anterior quando o Reel é uma promoção/oferta relâmpago. */
  promoOriginalPrice?: number;
  /** Formato do post no feed estilo Reels/TikTok. */
  reelKind: ReelKind;
  /** Duração do slide/vídeo no feed (sempre ≤ 60s). */
  durationSec: number;
  /** Gancho curto em destaque no vídeo (estilo legenda de Reels/TikTok). */
  hook: string;
  /** Trilha/som exibido no rodapé do Reel. */
  audioTrack: string;
  /** Curtidas acumuladas do Reel. */
  likesCount: number;
  tags: string[];
  /** Margem bruta estimada (0–1). */
  marginPct: number;
  ordersToday: number;
  available: boolean;
  isNew: boolean;
  prepMin: number;
  /** Mídia do card. Trocar por vídeo é só mudar `type`. */
  media: Media;
  emoji: string;
}

export interface Media {
  type: 'image' | 'video';
  url: string;
  /** Cor de fundo caso a mídia falhe. */
  fallback: [string, string];
}

export type FactorKey =
  | 'relevance'
  | 'margin'
  | 'novelty'
  | 'proximity'
  | 'quality'
  | 'popularity'
  | 'exploration';

export interface Factor {
  key: FactorKey;
  label: string;
  /** 0–1 */
  value: number;
  weight: number;
  /** value * weight (0–1) */
  contribution: number;
  hint: string;
}

export interface FeedItem {
  dish: Dish;
  merchant: Merchant;
  score: number;
  factors: Factor[];
  media: Media;
}

export interface Exclusion {
  dishId: string;
  dishName: string;
  merchantName: string;
  reason: string;
}

export interface FeedBuild {
  items: FeedItem[];
  excluded: Exclusion[];
  eligible: number;
  candidates: number;
  builtAt: number;
}

export interface LabConfig {
  wRelevance: number;
  wMargin: number;
  wNovelty: number;
  wProximity: number;
  wQuality: number;
  wPopularity: number;
  /** 0–1: fração de cards sorteados fora do topo. */
  exploration: number;
  maxEtaMin: number;
  maxDistanceKm: number;
  /** Máximo de cards do mesmo merchant na sessão. */
  maxPerMerchant: number;
  /** Interrupções (push/modal/aviso) permitidas por dia. */
  attentionCap: number;
  quietHours: boolean;
}

export interface SessionMetrics {
  sessionSeconds: number;
  cardsShown: number;
  skips: number;
  saves: number;
  watchedComplete: number;
  adds: number;
  skipRate: number;
  saveRate: number;
  timeToDecisionSec: number | null;
  topMerchantShare: number;
  merchantsReached: number;
  triggersShown: number;
  triggersSuppressed: number;
}

export type ProfileSignal = 'save' | 'watch_complete' | 'add' | 'skip';

export interface TasteEntry {
  tag: string;
  score: number;
}

export type EventName =
  | 'impression'
  | 'watch_complete'
  | 'skip'
  | 'save'
  | 'unsave'
  | 'add'
  | 'remove'
  | 'checkout'
  | 'trigger_shown'
  | 'trigger_dismiss'
  | 'trigger_suppressed'
  | 'feed_rebuilt';

export interface LogEvent {
  id: string;
  name: EventName;
  at: number;
  dishId?: string;
  merchantId?: string;
  meta?: Record<string, string | number | boolean>;
}

export interface TriggerCandidate {
  id: string;
  title: string;
  body: string;
  actionLabel: string;
  priority: number;
  surface: 'banner' | 'modal';
}

export interface TriggerDecision {
  active: TriggerCandidate | null;
  suppressed: Array<{ id: string; reason: string }>;
  budgetLeft: number;
}

export interface CartLine {
  dishId: string;
  qty: number;
}

export type OrderStage = 'confirmado' | 'preparando' | 'a_caminho' | 'entregue';

export interface ActiveMerchantOrder {
  id: string;
  merchantId: string;
  merchantName: string;
  merchantEmoji: string;
  etaMin: number;
  deliveryFee: number;
  subtotal: number;
  items: Array<{ dishId: string; name: string; qty: number; price: number }>;
  stage: OrderStage;
  addressLabel: string;
  addressDetail: string;
  paymentTitle: string;
  createdAt: number;
}

export interface CartMerchantGroup {
  merchantId: string;
  merchantName: string;
  merchantEmoji: string;
  etaMin: number;
  deliveryFee: number;
  subtotal: number;
  items: Array<{ dishId: string; name: string; emoji: string; qty: number; price: number; merchantName: string }>;
}
