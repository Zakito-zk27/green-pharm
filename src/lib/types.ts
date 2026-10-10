// Shared data shapes for the store. The local data store (src/lib/server/db.ts) and,
// later, the Supabase tables use the same fields.

export type L2 = { ar: string; fr: string };

export type SkinType = "oily" | "dry" | "combo" | "normal" | "sens";
export const SKIN_TYPES: SkinType[] = ["oily", "dry", "combo", "normal", "sens"];

export type Category = { id: string; name: L2 };

export type Variant = {
  id: string;
  label: L2;
  price: number;
  oldPrice: number | null;
  stock: number;
};

export type Product = {
  id: number;
  name: L2;
  tagline: L2;
  description: L2;
  cat: string;
  skins: SkinType[];
  emoji: string;
  color: string; // background behind the emoji when there is no photo
  images: string[];
  variants: Variant[];
  rating: number;
  soldBase: number; // sales before the online store (from the prototype), added to real sales
  sold?: number; // units in confirmed, shipped or delivered orders (kept up to date by applyStatus)
  published: boolean;
  createdAt: string;
};

/** What the storefront receives: published products with the sales count resolved. */
export type PublicProduct = Omit<Product, "soldBase" | "sold" | "published" | "createdAt"> & {
  sold: number;
};

export type OrderStatus = "new" | "confirmed" | "shipping" | "delivered" | "returned" | "cancelled";
export const ORDER_STATUSES: OrderStatus[] = [
  "new",
  "confirmed",
  "shipping",
  "delivered",
  "returned",
  "cancelled",
];

export type DeliveryMode = "home" | "desk";

export type OrderItem = {
  productId: number;
  variantId: string;
  name: L2;
  variantLabel: L2;
  price: number;
  qty: number;
  free?: number; // units given for free by an offer
};

export type OrderEvent = { at: string; status: OrderStatus; note?: string; by: string };

export type Order = {
  id: number;
  createdAt: string;
  name: string;
  phone: string;
  wilaya: number;
  commune: string;
  address: string;
  mode: DeliveryMode;
  items: OrderItem[];
  subtotal: number;
  discount: number;
  shipping: number;
  total: number;
  coupon: string;
  offers: string[]; // names of the offers applied
  status: OrderStatus;
  history: OrderEvent[];
  note: string;
  tracking: string;
  source: string; // "store" or "landing:<slug>"
  lang: "ar" | "fr";
  stockApplied: boolean;
};

export type DeliveryRate = { code: number; home: number; desk: number };

export type OfferType = "percent" | "amount" | "freeship" | "b2g1";
export type Offer = {
  id: string;
  name: string;
  desc: string;
  type: OfferType;
  value: number; // percent or amount in DA; ignored for freeship / b2g1
  code: string; // empty = applied automatically
  minTotal: number;
  firstOnly: boolean; // only for a phone number's first order
  on: boolean;
  startsAt: string; // ISO date or ""
  endsAt: string;
};

export type StockMove = {
  at: string;
  productId: number;
  variantId: string;
  delta: number;
  reason: "order" | "cancel" | "return" | "manual";
  orderId?: number;
  by: string;
};

export type BlacklistEntry = { phone: string; reason: string; at: string };

export type LandingBlock =
  | { k: "hero"; title: L2; text: L2 }
  | { k: "features"; title: L2; lines: L2 }
  | { k: "reviews"; title: L2; lines: L2 }
  | { k: "countdown"; title: L2; hours: number }
  | { k: "form"; title: L2 };

export type LandingPage = {
  id: string;
  slug: string;
  productId: number;
  blocks: LandingBlock[];
  published: boolean;
  metaPixel: string;
  tiktokPixel: string;
  createdAt: string;
  countdownEnds: string;
};

export type AdminLook = {
  name: string;
  color: string;
  side: string;
  accent: string;
  radius: number;
};

export type Settings = {
  freeShip: number;
  lowStock: number;
  metaPixel: string;
  tiktokPixel: string;
  admin: AdminLook;
};

/* ===== Store Designer config: same shape as DEFAULT in reference/store.html ===== */

export type SectionKey = "hero" | "trust" | "best" | "shop" | "how" | "reviews";
export type Section = {
  k: SectionKey | `c:${string}`;
  on: boolean;
  bg: "none" | "soft" | "brand" | "dark";
  pad: "none" | "sm" | "md" | "lg";
  align: "start" | "center";
};
export type CustomBanner = {
  id: string;
  image: string;
  link: string;
  title: L2;
  text: L2;
  btn: L2;
};

export type StoreConfig = {
  name: string;
  logo: string;
  langs: { ar: boolean; fr: boolean };
  defLang: "ar" | "fr";
  color: string;
  bg: "cream" | "blush" | "white" | "dark";
  radius: number;
  font: "IBM Plex Sans Arabic" | "Cairo" | "Tajawal";
  cols: number;
  ann: boolean;
  annBg: string;
  sticky: boolean;
  wa: { on: boolean; number: string };
  hero: { layout: "split" | "center"; image: string; art: boolean };
  card: { ratio: "1/1" | "4/5"; rating: boolean; old: boolean; badges: boolean };
  best: { auto: boolean; interval: number; count: number };
  social: { phone: string; instagram: string; facebook: string; tiktok: string };
  sections: Section[];
  custom: CustomBanner[];
  texts: Record<string, Partial<L2>>;
};

export type ConfigVersion = { at: string; config: StoreConfig };

export type DB = {
  version: 1;
  nextOrderId: number;
  nextProductId: number;
  categories: Category[];
  products: Product[];
  orders: Order[];
  rates: DeliveryRate[];
  offers: Offer[];
  stockMoves: StockMove[];
  blacklist: BlacklistEntry[];
  landings: LandingPage[];
  settings: Settings;
  config: { published: StoreConfig; draft: StoreConfig; history: ConfigVersion[] };
};
