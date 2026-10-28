import type { Dish, Media, Merchant, ReelKind } from '../types';

/**
 * Dados de demonstração. Nada aqui é real: preços, margens e pedidos são
 * sintéticos e servem para exercitar o motor de decisão.
 *
 * A mídia é placeholder (LoremFlickr). Para trocar por vídeo, basta mudar
 * `type` para 'video' e apontar `url` para um MP4 — o card já sabe renderizar.
 */

const img = (keyword: string, lock: number, fallback: [string, string]): Media => ({
  type: 'image',
  url: `https://loremflickr.com/720/1280/${keyword}?lock=${lock}`,
  fallback,
});

export const merchants: Merchant[] = [
  {
    id: 'm1',
    name: 'Burger do Velho Chico',
    cuisine: 'Hambúrguer',
    rating: 4.7,
    distanceKm: 1.8,
    etaMin: 32,
    deliveryFee: 5.99,
    minOrder: 20,
    open: true,
    capacityPerHour: 60,
    openOrders: 38,
    emoji: '🍔',
    accent: ['#3B1D0F', '#8C3B12'],
  },
  {
    id: 'm2',
    name: 'Pizzaria Rio São Francisco',
    cuisine: 'Pizza',
    rating: 4.5,
    distanceKm: 2.4,
    etaMin: 48,
    deliveryFee: 7.99,
    minOrder: 30,
    open: true,
    capacityPerHour: 40,
    openOrders: 31,
    emoji: '🍕',
    accent: ['#2A1220', '#7A1F3D'],
  },
  {
    id: 'm3',
    name: 'Sushi Nori',
    cuisine: 'Japonês',
    rating: 4.8,
    distanceKm: 3.1,
    etaMin: 45,
    deliveryFee: 9.99,
    minOrder: 40,
    open: true,
    capacityPerHour: 35,
    openOrders: 22,
    emoji: '🍣',
    accent: ['#0E1B24', '#12556B'],
  },
  {
    id: 'm4',
    name: 'Cantinho Nordestino',
    cuisine: 'Nordestino',
    rating: 4.9,
    distanceKm: 0.9,
    etaMin: 25,
    deliveryFee: 3.99,
    minOrder: 15,
    open: true,
    capacityPerHour: 80,
    openOrders: 64,
    emoji: '🍲',
    accent: ['#2A1B08', '#8A5216'],
  },
  {
    id: 'm5',
    name: 'Açaí da Ilha',
    cuisine: 'Açaí',
    rating: 4.6,
    distanceKm: 1.2,
    etaMin: 20,
    deliveryFee: 4.99,
    minOrder: 12,
    open: true,
    capacityPerHour: 90,
    openOrders: 47,
    emoji: '🫐',
    accent: ['#1B0F2A', '#5B2A86'],
  },
  {
    id: 'm6',
    name: 'Espeto de Ouro',
    cuisine: 'Churrasco',
    rating: 4.4,
    distanceKm: 4.2,
    etaMin: 50,
    deliveryFee: 8.99,
    minOrder: 25,
    open: true,
    capacityPerHour: 40,
    openOrders: 44,
    emoji: '🍢',
    accent: ['#211008', '#7A2E12'],
  },
  {
    id: 'm7',
    name: 'Tempero da Baiana',
    cuisine: 'Baiana',
    rating: 4.8,
    distanceKm: 2.7,
    etaMin: 38,
    deliveryFee: 6.99,
    minOrder: 25,
    open: true,
    capacityPerHour: 30,
    openOrders: 19,
    emoji: '🥘',
    accent: ['#241206', '#8A3A0F'],
  },
  {
    id: 'm8',
    name: "Padaria Pão d'Água",
    cuisine: 'Padaria',
    rating: 4.7,
    distanceKm: 0.6,
    etaMin: 18,
    deliveryFee: 2.99,
    minOrder: 10,
    open: true,
    capacityPerHour: 120,
    openOrders: 58,
    emoji: '🥐',
    accent: ['#2A1E0A', '#A97A22'],
  },
  {
    id: 'm9',
    name: 'Verde Vivo',
    cuisine: 'Vegano',
    rating: 4.6,
    distanceKm: 3.6,
    etaMin: 35,
    deliveryFee: 6.49,
    minOrder: 20,
    open: true,
    capacityPerHour: 35,
    openOrders: 14,
    emoji: '🥗',
    accent: ['#0D2114', '#1F6B3A'],
  },
  {
    id: 'm10',
    name: 'Mamma Massa',
    cuisine: 'Massas',
    rating: 4.5,
    distanceKm: 5.2,
    etaMin: 42,
    deliveryFee: 7.49,
    minOrder: 30,
    open: true,
    capacityPerHour: 40,
    openOrders: 27,
    emoji: '🍝',
    accent: ['#241008', '#8A2B14'],
  },
  {
    id: 'm11',
    name: 'Maré Alta',
    cuisine: 'Frutos do Mar',
    rating: 4.3,
    distanceKm: 5.8,
    etaMin: 55,
    deliveryFee: 11.99,
    minOrder: 50,
    open: false,
    capacityPerHour: 25,
    openOrders: 0,
    emoji: '🦐',
    accent: ['#081B21', '#0E5A66'],
  },
  {
    id: 'm12',
    name: 'Doce Petrolina',
    cuisine: 'Doces',
    rating: 4.9,
    distanceKm: 1.5,
    etaMin: 28,
    deliveryFee: 4.49,
    minOrder: 12,
    open: true,
    capacityPerHour: 70,
    openOrders: 33,
    emoji: '🍰',
    accent: ['#2A0F1E', '#8A1F4A'],
  },
];

const M = Object.fromEntries(merchants.map((m) => [m.id, m]));

const accentOf = (merchantId: string): [string, string] => M[merchantId]?.accent ?? ['#15151C', '#2A2A36'];

const REEL_KINDS: ReelKind[] = ['prato', 'promocao', 'bastidores', 'combo'];
const DURATIONS = [15, 20, 25, 30, 35, 45, 60] as const;

const HOOKS: Record<ReelKind, string[]> = {
  prato: [
    'Feito na hora, saindo fumegando da chapa 🔥',
    'Close no recheio que derrete na primeira garfada 🤤',
    'O campeão de pedidos hoje em Petrolina ⭐',
  ],
  promocao: [
    'OFERTA RELÂMPAGO só neste Reel (até acabar o lote!) ⚡',
    'Desconto direto do restaurante pra fechar pedido agora 🏷️',
    'Preço especial liberado no feed por tempo limitado 🔥',
  ],
  bastidores: [
    'Bastidores da cozinha: veja como preparamos em 30s 👨‍🍳',
    'Segredo da receita artesanal gravado agora na cozinha 🎬',
    'Da grelha direto pra embalagem térmica sem perder crocância ✨',
  ],
  combo: [
    'Combo completo pra matar a fome sem pensar duas vezes 🎯',
    'Mais pedido pra dividir (ou comer sozinho sem culpa) 😋',
    'Prato + acompanhamento com vantagem no Reel 🎁',
  ],
};

const dish = (
  id: string,
  merchantId: string,
  name: string,
  description: string,
  price: number,
  tags: string[],
  marginPct: number,
  ordersToday: number,
  options: Partial<Pick<Dish, 'available' | 'isNew' | 'prepMin' | 'reelKind' | 'durationSec' | 'promoOriginalPrice' | 'hook'>> & {
    media: [keyword: string, lock: number];
    emoji: string;
  },
): Dish => {
  const num = Number(id.replace(/\D/g, '')) || 1;
  const merchant = M[merchantId];
  const reelKind: ReelKind =
    options.reelKind ??
    (tags.includes('combo') ? 'combo' : num % 3 === 0 ? 'promocao' : num % 5 === 0 ? 'bastidores' : REEL_KINDS[num % REEL_KINDS.length] ?? 'prato');
  const durationSec = Math.min(60, Math.max(15, options.durationSec ?? DURATIONS[num % DURATIONS.length] ?? 30));
  const promoOriginalPrice =
    options.promoOriginalPrice ??
    (reelKind === 'promocao' || reelKind === 'combo' ? Math.round(price * 1.24 * 10) / 10 : undefined);
  const hookPool = HOOKS[reelKind];
  const hook = options.hook ?? hookPool[num % hookPool.length] ?? description;
  const enrichedTags = Array.from(
    new Set([
      ...tags,
      ...(reelKind === 'promocao' ? ['promoção'] : reelKind === 'combo' ? ['combo'] : []),
    ]),
  );

  return {
    id,
    merchantId,
    name,
    description,
    price,
    promoOriginalPrice,
    reelKind,
    durationSec,
    hook,
    audioTrack: `Som original · ${merchant?.name ?? 'Restaurante'}`,
    likesCount: 140 + ordersToday * 11 + num * 17,
    tags: enrichedTags,
    marginPct,
    ordersToday,
    available: options.available ?? true,
    isNew: options.isNew ?? false,
    prepMin: options.prepMin ?? 15,
    media: img(options.media[0], options.media[1], accentOf(merchantId)),
    emoji: options.emoji,
  };
};

export const dishes: Dish[] = [
  dish('d01', 'm1', 'X-Velho Chico', 'Blend 160g, queijo coalho, cebola caramelizada e molho da casa.', 32.9, ['artesanal', 'carne', 'queijo'], 0.31, 84, { media: ['burger', 1], emoji: '🍔', prepMin: 18 }),
  dish('d02', 'm1', 'Smash Duplo', 'Dois smash de 90g, cheddar duplo e picles.', 27.9, ['smash', 'carne', 'cheddar'], 0.28, 71, { media: ['burger', 2], emoji: '🍔', prepMin: 14 }),
  dish('d03', 'm1', 'Veggie do Sertão', 'Grão-de-bico, queijo coalho e molho de coentro.', 29.9, ['vegetariano', 'grão-de-bico'], 0.34, 22, { media: ['veggie,burger', 3], emoji: '🥙', isNew: true }),
  dish('d04', 'm1', 'Batata Rústica', 'Porção com páprica e alho.', 18.9, ['acompanhamento', 'batata'], 0.42, 63, { media: ['fries', 4], emoji: '🍟', prepMin: 10 }),

  dish('d05', 'm2', 'Margherita da Ilha', 'Molho de tomate, muçarela de búfala e manjericão.', 54.9, ['pizza', 'queijo', 'manjericão'], 0.36, 45, { media: ['pizza', 5], emoji: '🍕', prepMin: 25 }),
  dish('d06', 'm2', 'Calabresa do Porto', 'Calabresa fatiada, cebola e orégano.', 59.9, ['pizza', 'calabresa'], 0.33, 52, { media: ['pizza', 6], emoji: '🍕', prepMin: 25 }),
  dish('d07', 'm2', 'Quatro Queijos', 'Muçarela, provolone, parmesão e gorgonzola.', 64.9, ['pizza', 'queijo'], 0.35, 38, { media: ['pizza', 7], emoji: '🍕', prepMin: 27 }),
  dish('d08', 'm2', 'Borda Recheada', 'Borda de catupiry ou cheddar.', 12.0, ['acompanhamento'], 0.55, 61, { media: ['pizza,dough', 8], emoji: '🧀', prepMin: 5 }),

  dish('d09', 'm3', 'Combo 20 Peças', 'Sashimi, niguiri e uramaki selecionados pelo sushiman.', 69.9, ['combo', 'sashimi'], 0.27, 33, { media: ['sushi', 9], emoji: '🍣', prepMin: 22 }),
  dish('d10', 'm3', 'Temaki Salmão', 'Cone de alga com salmão fresco e cream cheese.', 32.9, ['temaki', 'salmão'], 0.3, 47, { media: ['temaki', 10], emoji: '🍥', prepMin: 12 }),
  dish('d11', 'm3', 'Hot Roll', '8 unidades empanadas e fritas com molho tarê.', 38.9, ['frito', 'salmão'], 0.38, 44, { media: ['sushi,roll', 11], emoji: '🍤', isNew: true }),
  dish('d12', 'm3', 'Yakisoba', 'Macarrão oriental com frango e legumes.', 42.9, ['macarrão', 'frango'], 0.4, 29, { media: ['yakisoba', 12], emoji: '🍜', prepMin: 20 }),

  dish('d13', 'm4', 'Baião de Dois', 'Arroz, feijão-de-corda, queijo coalho e carne de sol.', 26.9, ['regional', 'feijão', 'queijo'], 0.44, 90, { media: ['brazilian,food', 13], emoji: '🍲', prepMin: 20 }),
  dish('d14', 'm4', 'Carne de Sol na Manteiga', 'Com macaxeira cozida e manteiga de garrafa.', 42.9, ['regional', 'carne'], 0.35, 76, { media: ['steak', 14], emoji: '🥩', prepMin: 25 }),
  dish('d15', 'm4', 'Tapioca de Queijo', 'Tapioca fininha com queijo coalho derretido.', 14.9, ['tapioca', 'queijo'], 0.52, 58, { media: ['tapioca', 15], emoji: '🫓', prepMin: 8 }),
  dish('d16', 'm4', 'Buchada', 'Prato tradicional, servido com pirão.', 34.9, ['regional', 'tradicional'], 0.41, 12, { media: ['brazilian,stew', 16], emoji: '🍛', available: false, prepMin: 30 }),

  dish('d17', 'm5', 'Açaí 500ml', 'Açaí cremoso com granola e banana.', 24.9, ['açaí', 'gelado'], 0.48, 120, { media: ['acai,bowl', 17], emoji: '🫐', prepMin: 8 }),
  dish('d18', 'm5', 'Açaí com Banana', 'Açaí, banana, leite em pó e mel.', 27.9, ['açaí', 'banana'], 0.46, 88, { media: ['acai', 18], emoji: '🍌', isNew: true, prepMin: 8 }),
  dish('d19', 'm5', 'Copo 300ml', 'Açaí puro com dois complementos.', 16.9, ['açaí', 'gelado'], 0.51, 95, { media: ['acai', 19], emoji: '🥤', prepMin: 6 }),

  dish('d20', 'm6', 'Espeto de Picanha', 'Picanha em cubos com sal grosso.', 39.9, ['carne', 'espeto'], 0.3, 41, { media: ['skewer', 20], emoji: '🍢', prepMin: 22 }),
  dish('d21', 'm6', 'Espeto de Frango', 'Frango marinado com limão e alho.', 22.9, ['frango', 'espeto'], 0.37, 55, { media: ['chicken,skewer', 21], emoji: '🍗', prepMin: 18 }),
  dish('d22', 'm6', 'Costela 12h', 'Costela bovina assada lentamente, com farofa.', 54.9, ['carne', 'costela'], 0.26, 18, { media: ['ribs', 22], emoji: '🍖', available: false, prepMin: 35 }),

  dish('d23', 'm7', 'Moqueca de Peixe', 'Peixe fresco, leite de coco, dendê e pimentões.', 62.9, ['peixe', 'regional'], 0.29, 24, { media: ['fish,stew', 23], emoji: '🥘', prepMin: 30 }),
  dish('d24', 'm7', 'Acarajé', 'Bolinho de feijão-fradinho com vatapá e caruru.', 19.9, ['regional', 'frito'], 0.45, 37, { media: ['street,food', 24], emoji: '🥟', prepMin: 12 }),
  dish('d25', 'm7', 'Vatapá', 'Creme de pão, camarão e leite de coco.', 28.9, ['regional'], 0.38, 15, { media: ['shrimp,stew', 25], emoji: '🍲', prepMin: 20 }),

  dish('d26', 'm8', 'Pão na Chapa', 'Pão francês na manteiga, quentinho.', 9.9, ['café', 'pão'], 0.61, 140, { media: ['bread', 26], emoji: '🥖', prepMin: 6 }),
  dish('d27', 'm8', 'Croissant', 'Folhado de manteiga, assado na hora.', 12.9, ['café', 'folhado'], 0.49, 66, { media: ['croissant', 27], emoji: '🥐', prepMin: 5 }),
  dish('d28', 'm8', 'Café com Leite', 'Café coado e leite vaporizado.', 8.9, ['café', 'bebida'], 0.68, 132, { media: ['coffee', 28], emoji: '☕', prepMin: 4 }),

  dish('d29', 'm9', 'Bowl Proteico', 'Quinoa, grão-de-bico, abacate e molho tahine.', 34.9, ['vegano', 'bowl'], 0.33, 27, { media: ['vegan,bowl', 29], emoji: '🥗', isNew: true, prepMin: 15 }),
  dish('d30', 'm9', 'Falafel no Pão', 'Falafel crocante, salada e molho de coentro.', 26.9, ['vegano', 'falafel'], 0.39, 31, { media: ['falafel', 30], emoji: '🥙', prepMin: 14 }),
  dish('d31', 'm9', 'Suco Verde', 'Couve, maçã, limão e gengibre.', 14.9, ['bebida', 'natural'], 0.58, 44, { media: ['green,juice', 31], emoji: '🥤', prepMin: 6 }),

  dish('d32', 'm10', 'Fettuccine Alfredo', 'Massa fresca com creme de parmesão.', 46.9, ['massa', 'creme'], 0.34, 29, { media: ['pasta', 32], emoji: '🍝', prepMin: 22 }),
  dish('d33', 'm10', 'Spaghetti à Bolonhesa', 'Ragu de carne cozido por 4 horas.', 44.9, ['massa', 'carne'], 0.32, 36, { media: ['spaghetti', 33], emoji: '🍝', prepMin: 22 }),
  dish('d34', 'm10', 'Lasanha da Casa', 'Camadas de massa, ragu e bechamel.', 52.9, ['massa', 'queijo'], 0.3, 33, { media: ['lasagna', 34], emoji: '🍲', isNew: true, prepMin: 28 }),

  dish('d35', 'm11', 'Camarão Empanado', 'Camarões grandes com molho de alho.', 58.9, ['camarão', 'frito'], 0.28, 0, { media: ['shrimp', 35], emoji: '🍤', prepMin: 25 }),
  dish('d36', 'm11', 'Arroz de Marisco', 'Arroz cremoso com frutos do mar.', 74.9, ['frutos-do-mar'], 0.25, 0, { media: ['seafood,rice', 36], emoji: '🍚', prepMin: 35 }),

  dish('d37', 'm12', 'Bolo de Rolo', 'Fatia generosa, receita pernambucana.', 18.9, ['doce', 'regional'], 0.57, 74, { media: ['cake,roll', 37], emoji: '🍰', prepMin: 5 }),
  dish('d38', 'm12', 'Brigadeiro Gourmet', 'Caixa com 6 unidades.', 6.9, ['doce'], 0.66, 110, { media: ['brigadeiro', 38], emoji: '🍫', prepMin: 4 }),
  dish('d39', 'm12', 'Torta de Limão', 'Base de biscoito, creme de limão e merengue.', 21.9, ['doce', 'limão'], 0.52, 42, { media: ['lemon,tart', 39], emoji: '🍋', isNew: true, prepMin: 6 }),
  dish('d40', 'm12', 'Pudim', 'Pudim de leite condensado com calda de caramelo.', 14.9, ['doce'], 0.59, 58, { media: ['pudding', 40], emoji: '🍮', prepMin: 5 }),
];

export const merchantById = new Map(merchants.map((m) => [m.id, m]));
export const dishById = new Map(dishes.map((d) => [d.id, d]));
