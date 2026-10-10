// The one pricing function. The cart uses it to show totals, and the server runs it again
// with database prices when an order is created, so a tampered request changes nothing.

import type { DeliveryMode, DeliveryRate, Offer, OrderItem, Product } from "./types";

export type CartLine = { productId: number; variantId: string; qty: number };

export type PriceInput = {
  lines: CartLine[];
  wilaya: number | null; // wilaya code 1-58, null while not chosen
  mode: DeliveryMode;
  coupon: string;
  firstOrder: boolean; // no earlier order from this phone number
  now: Date;
};

export type PriceData = {
  products: Pick<Product, "id" | "name" | "variants">[];
  rates: DeliveryRate[];
  offers: Offer[];
  freeShip: number;
};

export type PriceResult = {
  items: OrderItem[];
  subtotal: number;
  discount: number;
  shipping: number | null; // null until a wilaya is chosen
  total: number;
  offers: string[];
  coupon: "" | "ok" | "invalid";
  problems: { productId: number; variantId: string; kind: "unknown" | "out" | "reduced" }[];
};

export function isOfferActive(o: Offer, now: Date): boolean {
  if (!o.on) return false;
  if (o.startsAt && now < new Date(o.startsAt + "T00:00:00")) return false;
  if (o.endsAt && now > new Date(o.endsAt + "T23:59:59")) return false;
  return true;
}

export function priceCart(input: PriceInput, data: PriceData): PriceResult {
  const problems: PriceResult["problems"] = [];
  const items: OrderItem[] = [];

  for (const line of input.lines) {
    const p = data.products.find((x) => x.id === line.productId);
    const v = p?.variants.find((x) => x.id === line.variantId);
    if (!p || !v) {
      problems.push({ productId: line.productId, variantId: line.variantId, kind: "unknown" });
      continue;
    }
    const wanted = Math.max(1, Math.floor(Number(line.qty) || 1));
    if (v.stock <= 0) {
      problems.push({ productId: p.id, variantId: v.id, kind: "out" });
      continue;
    }
    const qty = Math.min(wanted, v.stock);
    if (qty < wanted) problems.push({ productId: p.id, variantId: v.id, kind: "reduced" });
    const existing = items.find((i) => i.productId === p.id && i.variantId === v.id);
    if (existing) existing.qty = Math.min(v.stock, existing.qty + qty);
    else
      items.push({
        productId: p.id,
        variantId: v.id,
        name: p.name,
        variantLabel: v.label,
        price: v.price,
        qty,
      });
  }

  const subtotal = items.reduce((s, i) => s + i.price * i.qty, 0);
  const code = input.coupon.trim().toUpperCase();
  const active = data.offers.filter(
    (o) =>
      isOfferActive(o, input.now) &&
      subtotal >= o.minTotal &&
      (!o.firstOnly || input.firstOrder) &&
      (o.code === "" || o.code.toUpperCase() === code),
  );
  const coupon: PriceResult["coupon"] =
    code === "" ? "" : active.some((o) => o.code.toUpperCase() === code) ? "ok" : "invalid";

  let discount = 0;
  let freeShipping = subtotal > 0 && subtotal >= data.freeShip;
  const applied: string[] = [];

  // "Buy 2, get the 3rd free": in every group of 3 units (most expensive first), the cheapest is free.
  for (const o of active.filter((x) => x.type === "b2g1")) {
    const units = items
      .flatMap((i) => Array.from({ length: i.qty }, () => i))
      .sort((a, b) => b.price - a.price);
    let got = 0;
    for (let n = 2; n < units.length; n += 3) {
      const item = units[n];
      item.free = (item.free ?? 0) + 1;
      got += item.price;
    }
    if (got > 0) {
      discount += got;
      applied.push(o.name);
    }
  }
  for (const o of active.filter((x) => x.type === "percent")) {
    const pct = Math.min(100, Math.max(0, o.value));
    const d = Math.round(((subtotal - discount) * pct) / 100);
    if (d > 0) {
      discount += d;
      applied.push(o.name);
    }
  }
  for (const o of active.filter((x) => x.type === "amount")) {
    if (o.value > 0) {
      discount += o.value;
      applied.push(o.name);
    }
  }
  for (const o of active.filter((x) => x.type === "freeship")) {
    if (subtotal > 0) {
      freeShipping = true;
      applied.push(o.name);
    }
  }
  discount = Math.min(discount, subtotal);

  let shipping: number | null = null;
  if (input.wilaya !== null) {
    const rate = data.rates.find((r) => r.code === input.wilaya);
    shipping = freeShipping ? 0 : rate ? (input.mode === "desk" ? rate.desk : rate.home) : null;
  }
  const total = subtotal - discount + (shipping ?? 0);
  return { items, subtotal, discount, shipping, total, offers: applied, coupon, problems };
}
