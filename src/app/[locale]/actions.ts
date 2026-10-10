"use server";

import { headers } from "next/headers";
import { normalizePhone } from "@/lib/phone";
import { priceCart, type CartLine, type PriceResult } from "@/lib/pricing";
import { readDB } from "@/lib/server/db";
import { createOrder, isFirstOrder, type CreateResult, type OrderInput } from "@/lib/server/orders";
import type { DeliveryMode } from "@/lib/types";

async function clientIp() {
  const h = await headers();
  return (h.get("x-forwarded-for")?.split(",")[0] ?? h.get("x-real-ip") ?? "local").trim();
}

/** Place a cash-on-delivery order. Totals are recomputed on the server. */
export async function placeOrder(input: OrderInput): Promise<CreateResult> {
  return createOrder(input, await clientIp());
}

/** Server-side price for the cart, used when a coupon is typed or the phone number is known. */
export async function quoteCart(q: {
  lines: CartLine[];
  wilaya: number | null;
  mode: DeliveryMode;
  coupon: string;
  phone: string;
}): Promise<
  Pick<PriceResult, "subtotal" | "discount" | "shipping" | "total" | "offers" | "coupon">
> {
  const phone = normalizePhone(String(q.phone ?? ""));
  const db = await readDB(/^0[567]\d{8}$/.test(phone) ? { orders: { phone } } : {});
  const r = priceCart(
    {
      lines: (q.lines ?? []).slice(0, 30),
      wilaya: q.wilaya,
      mode: q.mode === "desk" ? "desk" : "home",
      coupon: String(q.coupon ?? "").slice(0, 30),
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
  return {
    subtotal: r.subtotal,
    discount: r.discount,
    shipping: r.shipping,
    total: r.total,
    offers: r.offers,
    coupon: r.coupon,
  };
}
