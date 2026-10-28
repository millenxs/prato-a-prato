import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';

import { dishById } from '../src/data/seed';
import { runExperiment } from '../src/engine/experiment';
import { nextOrderStage, splitCartIntoOrders, type SplitOrdersMeta } from '../src/engine/orders';
import { buildFeed, defaultLab, updateProfile } from '../src/engine/ranking';
import { analyzeUserTaste } from '../src/engine/tasteAnalyzer';
import type { ActiveMerchantOrder, CartLine, LabConfig, LogEvent } from '../src/types';

const PORT = Number(process.env.PORT ?? 3333);
const DATA_DIR = path.resolve(process.cwd(), 'server', 'data');
const DB_FILE = path.join(DATA_DIR, 'db.json');

interface PersistedDB {
  lab: LabConfig;
  profile: Record<string, number>;
  seenMerchant: Record<string, number>;
  savedIds: string[];
  watchedCompleteIds: string[];
  skippedIds: string[];
  cart: CartLine[];
  events: LogEvent[];
  activeOrders: ActiveMerchantOrder[];
  sessionStart: number;
  firstAddAt: number | null;
  completedSessions: Array<{
    at: number;
    timeToDecisionSec: number;
    cardsSeen: number;
    likes: number;
    watchedComplete: number;
    merchantsOrdered: number;
  }>;
}

function defaultDB(): PersistedDB {
  return {
    lab: defaultLab,
    profile: {},
    seenMerchant: {},
    savedIds: [],
    watchedCompleteIds: [],
    skippedIds: [],
    cart: [],
    events: [],
    activeOrders: [],
    sessionStart: Date.now(),
    firstAddAt: null,
    completedSessions: [],
  };
}

function loadDB(): PersistedDB {
  try {
    if (fs.existsSync(DB_FILE)) {
      const parsed = JSON.parse(fs.readFileSync(DB_FILE, 'utf8')) as Partial<PersistedDB>;
      return { ...defaultDB(), ...parsed };
    }
  } catch {
    // fallback para banco limpo se o arquivo estiver corrompido
  }
  return defaultDB();
}

function saveDB(db: PersistedDB): void {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), 'utf8');
}

let db = loadDB();

function sendJson(res: http.ServerResponse, status: number, payload: unknown): void {
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'access-control-allow-origin': '*',
    'access-control-allow-methods': 'GET, POST, PATCH, OPTIONS',
    'access-control-allow-headers': 'Content-Type',
  });
  res.end(JSON.stringify(payload));
}

function readBody(req: http.IncomingMessage): Promise<Record<string, unknown>> {
  return new Promise((resolve) => {
    const chunks: Buffer[] = [];
    req.on('data', (chunk: Buffer) => chunks.push(chunk));
    req.on('end', () => {
      try {
        const raw = Buffer.concat(chunks).toString('utf8');
        resolve(raw ? (JSON.parse(raw) as Record<string, unknown>) : {});
      } catch {
        resolve({});
      }
    });
  });
}

function computeTaste() {
  return analyzeUserTaste({
    cfg: db.lab,
    profile: db.profile,
    savedIds: db.savedIds,
    watchedCompleteIds: db.watchedCompleteIds,
    skippedIds: db.skippedIds,
    cartDishIds: db.cart.map((c) => c.dishId),
    events: db.events,
    sessionStart: db.sessionStart,
    firstAddAt: db.firstAddAt,
  });
}

export function createApiServer(): http.Server {
  return http.createServer(async (req, res) => {
    if (req.method === 'OPTIONS') {
      sendJson(res, 200, { ok: true });
      return;
    }

    const url = new URL(req.url ?? '/', `http://${req.headers.host ?? 'localhost'}`);
    const pathname = url.pathname;

    if (req.method === 'GET' && pathname === '/api/health') {
      const taste = computeTaste();
      sendJson(res, 200, {
        ok: true,
        service: 'prato-a-prato-api',
        persistedEvents: db.events.length,
        activeOrders: db.activeOrders.length,
        completedSessions: db.completedSessions.length,
        tasteConfidencePct: taste.confidencePct,
        willLikeTop: taste.willLike.slice(0, 3).map((f) => f.feature),
        willDislikeTop: taste.willDislike.slice(0, 3).map((f) => f.feature),
      });
      return;
    }

    if (req.method === 'GET' && pathname === '/api/feed') {
      const feed = buildFeed({
        cfg: db.lab,
        profile: db.profile,
        seenMerchant: db.seenMerchant,
        seed: Date.now() % 10000,
      });
      sendJson(res, 200, { feed, taste: computeTaste() });
      return;
    }

    if (req.method === 'GET' && pathname === '/api/taste-analysis') {
      sendJson(res, 200, computeTaste());
      return;
    }

    if (req.method === 'POST' && pathname === '/api/interactions') {
      const body = await readBody(req);
      const type = String(body.type ?? '');
      const dishId = typeof body.dishId === 'string' ? body.dishId : undefined;
      const now = Date.now();

      if (type === 'reset') {
        db = { ...defaultDB(), completedSessions: db.completedSessions };
        saveDB(db);
        sendJson(res, 200, { ok: true, taste: computeTaste() });
        return;
      }

      if (dishId) {
        const dish = dishById.get(dishId);
        if (dish) {
          if (type === 'impression') {
            db.seenMerchant[dish.merchantId] = (db.seenMerchant[dish.merchantId] ?? 0) + 1;
            db.events.push({ id: `srv-${db.events.length + 1}`, name: 'impression', at: now, dishId, merchantId: dish.merchantId });
          } else if (type === 'save') {
            if (!db.savedIds.includes(dishId)) db.savedIds.push(dishId);
            db.profile = updateProfile(db.profile, dish, 'save');
            db.events.push({ id: `srv-${db.events.length + 1}`, name: 'save', at: now, dishId });
          } else if (type === 'unsave') {
            db.savedIds = db.savedIds.filter((id) => id !== dishId);
            db.profile = updateProfile(db.profile, dish, 'skip');
            db.events.push({ id: `srv-${db.events.length + 1}`, name: 'unsave', at: now, dishId });
          } else if (type === 'watch_complete') {
            if (!db.watchedCompleteIds.includes(dishId)) db.watchedCompleteIds.push(dishId);
            db.profile = updateProfile(db.profile, dish, 'watch_complete');
            db.events.push({ id: `srv-${db.events.length + 1}`, name: 'watch_complete', at: now, dishId });
          } else if (type === 'skip') {
            db.skippedIds.push(dishId);
            db.profile = updateProfile(db.profile, dish, 'skip');
            db.events.push({ id: `srv-${db.events.length + 1}`, name: 'skip', at: now, dishId });
          } else if (type === 'add') {
            const existing = db.cart.find((c) => c.dishId === dishId);
            if (existing) existing.qty += 1;
            else db.cart.push({ dishId, qty: 1 });
            db.firstAddAt = db.firstAddAt ?? now;
            db.profile = updateProfile(db.profile, dish, 'add');
            db.events.push({ id: `srv-${db.events.length + 1}`, name: 'add', at: now, dishId });
          } else if (type === 'remove') {
            const existing = db.cart.find((c) => c.dishId === dishId);
            if (existing) {
              if (existing.qty <= 1) db.cart = db.cart.filter((c) => c.dishId !== dishId);
              else existing.qty -= 1;
            }
            db.events.push({ id: `srv-${db.events.length + 1}`, name: 'remove', at: now, dishId });
          }
        }
      }

      if (db.events.length > 500) {
        db.events = db.events.slice(-500);
      }
      saveDB(db);
      sendJson(res, 200, { ok: true, taste: computeTaste() });
      return;
    }

    if (req.method === 'POST' && pathname === '/api/orders') {
      const body = await readBody(req);
      const cartInput = Array.isArray(body.cart) ? (body.cart as CartLine[]) : db.cart;
      const meta = (body.meta ?? {}) as SplitOrdersMeta;
      const orders = splitCartIntoOrders(cartInput, {
        ...meta,
        now: Date.now(),
        seqStart: 4820 + db.activeOrders.length,
      });

      const decisionSec =
        db.firstAddAt !== null ? Math.max(1, Math.round((db.firstAddAt - db.sessionStart) / 1000)) : 18;
      db.completedSessions.push({
        at: Date.now(),
        timeToDecisionSec: decisionSec,
        cardsSeen: new Set(db.events.filter((e) => e.name === 'impression').map((e) => e.dishId)).size || 1,
        likes: db.savedIds.length,
        watchedComplete: db.watchedCompleteIds.length,
        merchantsOrdered: orders.length,
      });
      db.activeOrders = [...orders, ...db.activeOrders];
      db.cart = [];
      saveDB(db);
      sendJson(res, 201, { ok: true, orders, activeOrders: db.activeOrders });
      return;
    }

    if (req.method === 'PATCH' && pathname.startsWith('/api/orders/')) {
      const orderId = decodeURIComponent(pathname.replace('/api/orders/', '').replace('/stage', ''));
      db.activeOrders = db.activeOrders.map((o) =>
        o.id === orderId ? { ...o, stage: nextOrderStage(o.stage) } : o,
      );
      saveDB(db);
      sendJson(res, 200, { ok: true, activeOrders: db.activeOrders });
      return;
    }

    if (req.method === 'GET' && pathname === '/api/ab-telemetry') {
      const taste = computeTaste();
      const benchmark = runExperiment({ sessions: 120, seed: 2026, lab: db.lab });
      sendJson(res, 200, {
        realSession: taste.realTelemetry,
        completedSessions: db.completedSessions,
        taste,
        benchmark,
      });
      return;
    }

    sendJson(res, 404, { error: 'Not found', path: pathname });
  });
}

if (require.main === module) {
  const server = createApiServer();
  server.listen(PORT, '0.0.0.0', () => {
    console.log(`Prato a Prato API running on http://127.0.0.1:${PORT} and LAN :${PORT}`);
  });
}
