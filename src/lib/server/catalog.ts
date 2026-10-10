import "server-only";

// What visitors may read, cached until an admin change expires the tag
// ("config" for the Store Designer, "catalog" for products, prices, delivery and offers).

import { cacheLife, cacheTag } from "next/cache";
import { normalizeConfig } from "@/lib/config";
import type {
  Category,
  DB,
  DeliveryRate,
  LandingPage,
  Offer,
  PublicProduct,
  StoreConfig,
} from "@/lib/types";
import { readDB } from "./db";

export type Catalog = {
  products: PublicProduct[];
  categories: Category[];
  rates: DeliveryRate[];
  freeShip: number;
  autoOffers: Offer[]; // offers without a code; coupon codes stay on the server
  hasCoupons: boolean;
  metaPixel: string;
  tiktokPixel: string;
};

const SOLD_STATUSES = new Set(["confirmed", "shipping", "delivered"]);

export function soldCounts(db: DB): Map<number, number> {
  const sold = new Map<number, number>();
  for (const o of db.orders) {
    if (!SOLD_STATUSES.has(o.status)) continue;
    for (const i of o.items) sold.set(i.productId, (sold.get(i.productId) ?? 0) + i.qty);
  }
  return sold;
}

export async function getPublishedConfig(): Promise<StoreConfig> {
  "use cache";
  cacheTag("config");
  cacheLife("max");
  const db = await readDB();
  return normalizeConfig(db.config.published);
}

/** A published landing page by its slug, or null. */
export async function getLanding(slug: string): Promise<LandingPage | null> {
  "use cache";
  cacheTag("catalog");
  cacheLife("max");
  const db = await readDB();
  return db.landings.find((l) => l.slug === slug && l.published) ?? null;
}

export async function getCatalog(): Promise<Catalog> {
  "use cache";
  cacheTag("catalog");
  cacheLife("max");
  const db = await readDB();
  const sold = soldCounts(db);
  return {
    products: db.products
      .filter((p) => p.published && p.variants.length > 0)
      .map((p) => ({
        id: p.id,
        name: p.name,
        tagline: p.tagline,
        description: p.description,
        cat: p.cat,
        skins: p.skins,
        emoji: p.emoji,
        color: p.color,
        images: p.images,
        variants: p.variants,
        rating: p.rating,
        sold: p.soldBase + (sold.get(p.id) ?? 0),
      })),
    categories: db.categories,
    rates: db.rates,
    freeShip: db.settings.freeShip,
    autoOffers: db.offers.filter((o) => o.code === ""),
    hasCoupons: db.offers.some((o) => o.on && o.code !== ""),
    metaPixel: db.settings.metaPixel,
    tiktokPixel: db.settings.tiktokPixel,
  };
}
