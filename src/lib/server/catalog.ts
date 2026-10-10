import "server-only";

// What visitors may read. Read from the database on every request (no orders are loaded), so
// admin changes show on the store immediately.

import { cache } from "react";
import { normalizeConfig } from "@/lib/config";
import type {
  Category,
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

export type StoreData = { config: StoreConfig; catalog: Catalog; landings: LandingPage[] };

/** Everything the storefront needs, in one database round trip (shared by layout and page). */
export const getStoreData = cache(async (): Promise<StoreData> => {
  const db = await readDB();
  return {
    config: normalizeConfig(db.config.published),
    landings: db.landings.filter((l) => l.published),
    catalog: {
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
          sold: p.soldBase + (p.sold ?? 0),
        })),
      categories: db.categories,
      rates: db.rates,
      freeShip: db.settings.freeShip,
      autoOffers: db.offers.filter((o) => o.code === ""),
      hasCoupons: db.offers.some((o) => o.on && o.code !== ""),
      metaPixel: db.settings.metaPixel,
      tiktokPixel: db.settings.tiktokPixel,
    },
  };
});
