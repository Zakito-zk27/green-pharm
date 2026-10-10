import "server-only";

// Order creation and status changes. Prices, offers and delivery are always recomputed
// here from stored data; nothing the browser sends about money is trusted.

import { WILAYAS } from "@/data/wilayas";
import { cleanText } from "@/lib/config";
import { isValidAlgerianPhone, normalizePhone } from "@/lib/phone";
import { priceCart, type CartLine } from "@/lib/pricing";
import type { DB, DeliveryMode, Order, OrderStatus } from "@/lib/types";
import { insertOrder, readDB } from "./db";

export type OrderInput = {
  name: string;
  phone: string;
  wilaya: number;
  commune: string;
  address: string;
  mode: DeliveryMode;
  coupon: string;
  lines: CartLine[];
  lang: "ar" | "fr";
  source: string;
};

export type FieldError = "name" | "phone" | "wil" | "com" | "addr";

export type CreateResult =
  | {
      ok: true;
      order: Pick<
        Order,
        "id" | "total" | "shipping" | "discount" | "subtotal" | "wilaya" | "mode" | "name" | "phone"
      >;
    }
  | { ok: false; error: "fields"; fields: FieldError[] }
  | { ok: false; error: "empty" | "stock" | "blocked" | "rate" | "coupon" };

/** Same checks as `submit()` in reference/store.html. */
export function validateFields(i: Partial<OrderInput>): FieldError[] {
  const bad: FieldError[] = [];
  if (String(i.name ?? "").trim().length < 3) bad.push("name");
  if (!isValidAlgerianPhone(String(i.phone ?? ""))) bad.push("phone");
  if (!WILAYAS.some((w) => w.code === Number(i.wilaya))) bad.push("wil");
  if (String(i.commune ?? "").trim().length < 2) bad.push("com");
  if (String(i.address ?? "").trim().length < 4) bad.push("addr");
  return bad;
}

/* ----- rate limiting (per server process; good enough for one shop, replaced by a table later) ----- */
const WINDOW = 10 * 60 * 1000;
const g = globalThis as typeof globalThis & { __gpHits?: Map<string, number[]> };
const hits: Map<string, number[]> = (g.__gpHits ??= new Map());

export function rateLimited(key: string, max: number, now = Date.now()): boolean {
  const list = (hits.get(key) ?? []).filter((t) => now - t < WINDOW);
  if (list.length >= max) {
    hits.set(key, list);
    return true;
  }
  list.push(now);
  hits.set(key, list);
  return false;
}

export function isFirstOrder(db: DB, phone: string): boolean {
  return !db.orders.some((o) => o.phone === phone && o.status !== "cancelled");
}

export async function createOrder(raw: OrderInput, ip: string): Promise<CreateResult> {
  const fields = validateFields(raw);
  if (fields.length) return { ok: false, error: "fields", fields };
  const lines = (Array.isArray(raw.lines) ? raw.lines : []).slice(0, 30).map((l) => ({
    productId: Number(l.productId),
    variantId: String(l.variantId),
    qty: Math.min(99, Math.max(1, Math.floor(Number(l.qty) || 1))),
  }));
  if (!lines.length) return { ok: false, error: "empty" };

  const phone = normalizePhone(raw.phone);
  if (rateLimited("ip:" + ip, 6) || rateLimited("phone:" + phone, 3))
    return { ok: false, error: "rate" };

  const db = await readDB({ orders: { phone } });
  {
    if (db.blacklist.some((b) => b.phone === phone))
      return { ok: false as const, error: "blocked" as const };
    const open = db.orders.filter((o) => o.phone === phone && o.status === "new").length;
    if (open >= 3) return { ok: false as const, error: "rate" as const };

    const mode: DeliveryMode = raw.mode === "desk" ? "desk" : "home";
    const priced = priceCart(
      {
        lines,
        wilaya: Number(raw.wilaya),
        mode,
        coupon: String(raw.coupon ?? ""),
        firstOrder: isFirstOrder(db, phone),
        now: new Date(),
      },
      {
        products: db.products.filter((p) => p.published),
        rates: db.rates,
        offers: db.offers,
        freeShip: db.settings.freeShip,
      },
    );
    if (priced.coupon === "invalid") return { ok: false as const, error: "coupon" as const };
    if (priced.problems.length || !priced.items.length)
      return { ok: false as const, error: "stock" as const };

    const now = new Date().toISOString();
    const order: Omit<Order, "id"> = {
      createdAt: now,
      name: cleanText(raw.name, 80).trim(),
      phone,
      wilaya: Number(raw.wilaya),
      commune: cleanText(raw.commune, 80).trim(),
      address: cleanText(raw.address, 200).trim(),
      mode,
      items: priced.items,
      subtotal: priced.subtotal,
      discount: priced.discount,
      shipping: priced.shipping ?? 0,
      total: priced.total,
      coupon: priced.coupon === "ok" ? String(raw.coupon).trim().toUpperCase() : "",
      offers: priced.offers,
      status: "new",
      history: [{ at: now, status: "new", by: "client" }],
      note: "",
      tracking: "",
      source: cleanText(raw.source, 80) || "store",
      lang: raw.lang === "fr" ? "fr" : "ar",
      stockApplied: false,
    };
    const id = await insertOrder(order);
    return {
      ok: true as const,
      order: {
        id,
        total: order.total,
        shipping: order.shipping,
        discount: order.discount,
        subtotal: order.subtotal,
        wilaya: order.wilaya,
        mode: order.mode,
        name: order.name,
        phone: order.phone,
      },
    };
  }
}

/** Stock leaves the shelf when an order is confirmed and comes back if it is cancelled or returned. */
export function applyStatus(db: DB, order: Order, status: OrderStatus, by: string, note?: string) {
  if (order.status === status) return;
  const takesStock = status === "confirmed" || status === "shipping" || status === "delivered";
  const at = new Date().toISOString();
  if (takesStock && !order.stockApplied) {
    for (const i of order.items) {
      moveStock(db, i.productId, i.variantId, -i.qty, "order", by, order.id);
      addSold(db, i.productId, i.qty);
    }
    order.stockApplied = true;
  } else if (
    (status === "cancelled" || status === "returned" || status === "new") &&
    order.stockApplied
  ) {
    const reason = status === "returned" ? "return" : "cancel";
    for (const i of order.items) {
      moveStock(db, i.productId, i.variantId, i.qty, reason, by, order.id);
      addSold(db, i.productId, -i.qty);
    }
    order.stockApplied = false;
  }
  order.status = status;
  order.history.push({ at, status, by, ...(note ? { note } : {}) });
}

export function moveStock(
  db: DB,
  productId: number,
  variantId: string,
  delta: number,
  reason: "order" | "cancel" | "return" | "manual",
  by: string,
  orderId?: number,
) {
  const v = db.products.find((p) => p.id === productId)?.variants.find((x) => x.id === variantId);
  if (!v) return;
  v.stock = Math.max(0, v.stock + delta);
  db.stockMoves.unshift({
    at: new Date().toISOString(),
    productId,
    variantId,
    delta,
    reason,
    by,
    ...(orderId ? { orderId } : {}),
  });
  if (db.stockMoves.length > 2000) db.stockMoves.length = 2000;
}

function addSold(db: DB, productId: number, qty: number) {
  const p = db.products.find((x) => x.id === productId);
  if (p) p.sold = Math.max(0, (p.sold ?? 0) + qty);
}
