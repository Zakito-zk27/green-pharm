"use server";

import { after } from "next/server";
import { headers } from "next/headers";
import { normalizePhone } from "@/lib/phone";
import { priceCart, type CartLine, type PriceResult } from "@/lib/pricing";
import { readDB } from "@/lib/server/db";
import { notifyNewOrder } from "@/lib/server/notify";
import { createOrder, isFirstOrder, type CreateResult, type OrderInput } from "@/lib/server/orders";
import type { DeliveryMode } from "@/lib/types";

async function clientIp() {
  const h = await headers();
  return (h.get("x-forwarded-for")?.split(",")[0] ?? h.get("x-real-ip") ?? "local").trim();
}

/** Place a cash-on-delivery order. Totals are recomputed on the server. */
export async function placeOrder(input: OrderInput): Promise<CreateResult> {
  const result = await createOrder(input, await clientIp());
  if (result.ok) {
    const id = result.order.id;
    after(async () => {
      const db = await readDB();
      const order = db.orders.find((o) => o.id === id);
      if (order) await notifyNewOrder(order);
    });
  }
  return result;
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
  const db = await readDB();
  const r = priceCart(
    {
      lines: (q.lines ?? []).slice(0, 30),
      wilaya: q.wilaya,
      mode: q.mode === "desk" ? "desk" : "home",
      coupon: String(q.coupon ?? "").slice(0, 30),
      firstOrder: isFirstOrder(db, normalizePhone(String(q.phone ?? ""))),
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
