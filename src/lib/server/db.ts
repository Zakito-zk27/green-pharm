import "server-only";

// Data store on Cloudflare D1 (binding `DB`, see wrangler.jsonc). Locally, `next dev` uses a
// local copy of D1 in `.wrangler/` automatically.
//
// Small collections (settings, delivery prices, offers, config…) are one JSON row each in `docs`;
// products, orders and stock moves have their own tables. `writeDB` loads the data, lets the caller
// change the plain object, then writes back only the rows that changed.

import { getCloudflareContext } from "@opennextjs/cloudflare";
import { emptyDB } from "@/lib/defaults";
import type { DB, Order, Product, StockMove } from "@/lib/types";

const DOC_KEYS = [
  "categories",
  "rates",
  "offers",
  "blacklist",
  "landings",
  "settings",
  "config",
] as const;
type DocKey = (typeof DOC_KEYS)[number];

const SCHEMA = [
  "CREATE TABLE IF NOT EXISTS docs (key TEXT PRIMARY KEY, data TEXT NOT NULL)",
  "CREATE TABLE IF NOT EXISTS products (id INTEGER PRIMARY KEY, data TEXT NOT NULL)",
  "CREATE TABLE IF NOT EXISTS orders (id INTEGER PRIMARY KEY, created_at TEXT NOT NULL, phone TEXT NOT NULL, status TEXT NOT NULL, data TEXT NOT NULL)",
  "CREATE INDEX IF NOT EXISTS orders_phone ON orders (phone)",
  "CREATE TABLE IF NOT EXISTS stock_moves (id INTEGER PRIMARY KEY AUTOINCREMENT, at TEXT NOT NULL, data TEXT NOT NULL)",
];

export async function env(): Promise<CloudflareEnv> {
  return (await getCloudflareContext({ async: true })).env;
}

const g = globalThis as typeof globalThis & { __gpReady?: Promise<void> };

/** Creates the tables and the starting data the first time (once per server instance). */
async function d1(): Promise<D1Database> {
  const db = (await env()).DB;
  g.__gpReady ??= (async () => {
    await db.batch(SCHEMA.map((s) => db.prepare(s)));
    const seeded = await db.prepare("SELECT 1 FROM docs WHERE key = 'settings'").first();
    if (!seeded) {
      const start = emptyDB();
      await db.batch(
        DOC_KEYS.map((k) =>
          db
            .prepare("INSERT OR IGNORE INTO docs (key, data) VALUES (?, ?)")
            .bind(k, JSON.stringify(start[k])),
        ),
      );
    }
  })().catch((e) => {
    g.__gpReady = undefined;
    throw e;
  });
  await g.__gpReady;
  return db;
}

/** Which orders to load: none (storefront), those of one phone number (checkout), or all (admin). */
export type Load = { orders?: "none" | "all" | { phone: string }; moves?: number };

type OrderRow = { id: number; data: string };
const toOrder = (r: OrderRow): Order => ({
  ...(JSON.parse(r.data) as Omit<Order, "id">),
  id: r.id,
});

export async function readDB(load: Load = {}): Promise<DB> {
  const db = await d1();
  const q: D1PreparedStatement[] = [
    db.prepare("SELECT key, data FROM docs"),
    db.prepare("SELECT id, data FROM products ORDER BY id"),
  ];
  const o = load.orders ?? "none";
  if (o === "all") q.push(db.prepare("SELECT id, data FROM orders ORDER BY id DESC"));
  else if (o !== "none")
    q.push(
      db.prepare("SELECT id, data FROM orders WHERE phone = ? ORDER BY id DESC").bind(o.phone),
    );
  if (load.moves)
    q.push(
      db.prepare("SELECT id, data FROM stock_moves ORDER BY id DESC LIMIT ?").bind(load.moves),
    );
  const res = await db.batch(q);

  const out: DB = { ...emptyDB(), products: [], orders: [], stockMoves: [] };
  for (const r of res[0].results as { key: DocKey; data: string }[]) {
    if ((DOC_KEYS as readonly string[]).includes(r.key))
      (out as Record<DocKey, unknown>)[r.key] = JSON.parse(r.data);
  }
  out.products = (res[1].results as OrderRow[]).map((r) => ({
    ...(JSON.parse(r.data) as Product),
    id: r.id,
  }));
  let i = 2;
  if (o !== "none") out.orders = (res[i++].results as OrderRow[]).map(toOrder);
  if (load.moves)
    out.stockMoves = (res[i++].results as OrderRow[]).map((r) => JSON.parse(r.data) as StockMove);
  out.nextProductId = out.products.reduce((m, p) => Math.max(m, p.id), 0) + 1;
  return out;
}

const orderData = (o: Order) => {
  const { id, ...rest } = o;
  void id; // the id lives in its own column
  return JSON.stringify(rest);
};

/**
 * Loads the data (`load` says which orders), runs `fn` on it and saves only what changed.
 * Products that `fn` adds are inserted; new orders go through `insertOrder` instead.
 */
export async function writeDB<T>(
  fn: (db: DB) => T | Promise<T>,
  load: Load = { orders: "all" },
): Promise<T> {
  const db = await d1();
  const data = await readDB(load);
  const before = {
    docs: Object.fromEntries(DOC_KEYS.map((k) => [k, JSON.stringify(data[k])])),
    products: new Map(data.products.map((p) => [p.id, JSON.stringify(p)])),
    orders: new Map(data.orders.map((o) => [o.id, orderData(o)])),
    moves: new Set(data.stockMoves),
  };
  const result = await fn(data);

  const w: D1PreparedStatement[] = [];
  for (const k of DOC_KEYS) {
    const s = JSON.stringify(data[k]);
    if (s !== before.docs[k])
      w.push(db.prepare("INSERT OR REPLACE INTO docs (key, data) VALUES (?, ?)").bind(k, s));
  }
  const kept = new Set<number>();
  for (const p of data.products) {
    kept.add(p.id);
    const s = JSON.stringify(p);
    if (s !== before.products.get(p.id)) {
      w.push(db.prepare("INSERT OR REPLACE INTO products (id, data) VALUES (?, ?)").bind(p.id, s));
    }
  }
  for (const id of before.products.keys()) {
    if (!kept.has(id)) w.push(db.prepare("DELETE FROM products WHERE id = ?").bind(id));
  }
  for (const o of data.orders) {
    const s = orderData(o);
    if (before.orders.has(o.id) && s !== before.orders.get(o.id)) {
      w.push(
        db
          .prepare("UPDATE orders SET status = ?, phone = ?, data = ? WHERE id = ?")
          .bind(o.status, o.phone, s, o.id),
      );
    }
  }
  for (const m of [...data.stockMoves].reverse()) {
    if (!before.moves.has(m)) {
      w.push(
        db
          .prepare("INSERT INTO stock_moves (at, data) VALUES (?, ?)")
          .bind(m.at, JSON.stringify(m)),
      );
    }
  }
  if (w.length) await db.batch(w);
  return result;
}

/** Inserts a new order and returns its number (1001, 1002…), given by the database. */
export async function insertOrder(o: Omit<Order, "id">): Promise<number> {
  const db = await d1();
  const row = await db
    .prepare(
      "INSERT INTO orders (id, created_at, phone, status, data) VALUES ((SELECT COALESCE(MAX(id), 1000) + 1 FROM orders), ?, ?, ?, ?) RETURNING id",
    )
    .bind(o.createdAt, o.phone, o.status, JSON.stringify(o))
    .first<{ id: number }>();
  if (!row) throw new Error("order not saved");
  return row.id;
}

/** Highest order number, for the dashboard's new-order check. */
export async function latestOrderNumber(): Promise<number> {
  const db = await d1();
  const row = await db.prepare("SELECT MAX(id) AS id FROM orders").first<{ id: number | null }>();
  return row?.id ?? 0;
}

/* ===== images: R2 bucket `MEDIA` when configured, otherwise the `MEDIA_DB` database ===== */

type MediaEnv = CloudflareEnv & { MEDIA?: R2Bucket };
const gm = globalThis as typeof globalThis & { __gpMedia?: Promise<unknown> };

async function mediaDB(e: MediaEnv) {
  gm.__gpMedia ??= e.MEDIA_DB.prepare(
    "CREATE TABLE IF NOT EXISTS media (name TEXT PRIMARY KEY, type TEXT NOT NULL, data BLOB NOT NULL)",
  ).run();
  await gm.__gpMedia;
  return e.MEDIA_DB;
}

export async function putMedia(name: string, type: string, bytes: Uint8Array) {
  const e = (await env()) as MediaEnv;
  if (e.MEDIA) {
    await e.MEDIA.put(name, bytes, { httpMetadata: { contentType: type } });
    return;
  }
  const m = await mediaDB(e);
  await m
    .prepare("INSERT INTO media (name, type, data) VALUES (?, ?, ?)")
    .bind(name, type, bytes)
    .run();
}

export async function getMedia(name: string): Promise<{ type: string; bytes: Uint8Array } | null> {
  const e = (await env()) as MediaEnv;
  if (e.MEDIA) {
    const obj = await e.MEDIA.get(name);
    if (!obj) return null;
    return {
      type: obj.httpMetadata?.contentType ?? "application/octet-stream",
      bytes: new Uint8Array(await obj.arrayBuffer()),
    };
  }
  const m = await mediaDB(e);
  const row = await m
    .prepare("SELECT type, data FROM media WHERE name = ?")
    .bind(name)
    .first<{ type: string; data: ArrayBuffer | number[] }>();
  return row ? { type: row.type, bytes: new Uint8Array(row.data) } : null;
}
