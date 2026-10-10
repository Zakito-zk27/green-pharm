// Default content, copied from the approved prototypes in reference/.
// The store starts from these values the first time it runs (see src/lib/server/db.ts).

import { WILAYAS } from "@/data/wilayas";
import type {
  Category,
  DB,
  DeliveryRate,
  Offer,
  Product,
  Settings,
  SkinType,
  StoreConfig,
} from "./types";

/** `DEFAULT` from reference/store.html. The logo is served from /public. */
export const DEFAULT_CONFIG: StoreConfig = {
  name: "Green Pharm",
  logo: "/logo.png",
  langs: { ar: true, fr: true },
  defLang: "ar",
  color: "#2f5d46",
  bg: "cream",
  radius: 16,
  font: "IBM Plex Sans Arabic",
  cols: 4,
  ann: true,
  annBg: "#1d2b24",
  sticky: true,
  wa: { on: false, number: "0550000000" },
  hero: { layout: "split", image: "", art: true },
  card: { ratio: "1/1", rating: true, old: true, badges: true },
  best: { auto: true, interval: 3200, count: 6 },
  social: {
    phone: "0550 00 00 00",
    instagram: "https://www.instagram.com/_green_pharm",
    facebook: "",
    tiktok: "",
  },
  sections: [
    { k: "hero", on: true, bg: "none", pad: "md", align: "start" },
    { k: "trust", on: true, bg: "none", pad: "none", align: "start" },
    { k: "best", on: true, bg: "none", pad: "none", align: "start" },
    { k: "shop", on: true, bg: "none", pad: "none", align: "start" },
    { k: "how", on: true, bg: "soft", pad: "md", align: "start" },
    { k: "reviews", on: true, bg: "none", pad: "none", align: "start" },
  ],
  custom: [],
  texts: {},
};

export const DEFAULT_CATEGORIES: Category[] = [
  { id: "serum", name: { ar: "سيروم", fr: "Sérums" } },
  { id: "moist", name: { ar: "مرطبات", fr: "Hydratants" } },
  { id: "clean", name: { ar: "تنظيف", fr: "Nettoyants" } },
  { id: "mask", name: { ar: "أقنعة", fr: "Masques" } },
  { id: "set", name: { ar: "مجموعات", fr: "Coffrets" } },
];

/** Test delivery prices from `rate()` in reference/store.html: [home, desk]. The owner sets the real ones. */
function prototypeRate(code: number): [number, number] {
  if ([16, 9, 35, 42].includes(code)) return [450, 300];
  if ([1, 8, 11, 33, 37, 49, 50, 52, 53, 54, 56].includes(code)) return [1400, 1000];
  if ([3, 7, 17, 30, 32, 39, 45, 47, 51, 55, 57, 58].includes(code)) return [900, 600];
  return [650, 400];
}

export const DEFAULT_RATES: DeliveryRate[] = WILAYAS.map((w) => {
  const [home, desk] = prototypeRate(w.code);
  return { code: w.code, home, desk };
});

type Seed = {
  n: [string, string];
  t: [string, string];
  cat: string;
  sk: SkinType[];
  e: string;
  c: string;
  v: [string, string, number, number | null, number][]; // label ar, label fr, price, old price, stock
  r: number;
  sold: number;
};

// `P` from reference/store.html, with the per-size stock from the admin prototype (`invVar`).
const SEED: Seed[] = [
  {
    n: ["سيروم فيتامين C", "Sérum vitamine C"],
    t: ["تفتيح وإشراقة", "Éclat et luminosité"],
    cat: "serum",
    sk: ["normal", "dry", "combo"],
    e: "🍊",
    c: "#fde7d2",
    v: [
      ["30 مل", "30 ml", 2700, 3400, 20],
      ["50 مل", "50 ml", 3900, 4800, 14],
    ],
    r: 4.8,
    sold: 420,
  },
  {
    n: ["كريم مرطب SPF50", "Crème hydratante SPF50"],
    t: ["ترطيب وحماية من الشمس", "Hydratation et protection solaire"],
    cat: "moist",
    sk: ["dry", "normal", "sens"],
    e: "☀️",
    c: "#fff3c9",
    v: [["50 مل", "50 ml", 3200, null, 6]],
    r: 4.7,
    sold: 310,
  },
  {
    n: ["غسول لطيف", "Gel nettoyant doux"],
    t: ["تنظيف يومي بدون جفاف", "Nettoyage quotidien sans dessécher"],
    cat: "clean",
    sk: ["sens", "dry", "normal"],
    e: "🫧",
    c: "#dff0f5",
    v: [
      ["150 مل", "150 ml", 2800, 3200, 40],
      ["250 مل", "250 ml", 3900, 4400, 18],
    ],
    r: 4.9,
    sold: 380,
  },
  {
    n: ["تونر الورد", "Tonique à la rose"],
    t: ["توازن وانتعاش", "Équilibre et fraîcheur"],
    cat: "clean",
    sk: ["normal", "sens", "combo"],
    e: "🌹",
    c: "#fbdde6",
    v: [
      ["100 مل", "100 ml", 2300, null, 3],
      ["200 مل", "200 ml", 3400, null, 0],
    ],
    r: 4.6,
    sold: 200,
  },
  {
    n: ["ماسك الطين", "Masque à l’argile"],
    t: ["تنقية المسام", "Purifie les pores"],
    cat: "mask",
    sk: ["oily", "combo"],
    e: "🌿",
    c: "#e0efdc",
    v: [["75 مل", "75 ml", 3900, 4500, 21]],
    r: 4.5,
    sold: 150,
  },
  {
    n: ["مقشر AHA", "Exfoliant AHA"],
    t: ["تقشير لطيف أسبوعياً", "Exfoliation douce hebdomadaire"],
    cat: "mask",
    sk: ["oily", "normal"],
    e: "✨",
    c: "#ece3f7",
    v: [["30 مل", "30 ml", 2500, null, 0]],
    r: 4.4,
    sold: 90,
  },
  {
    n: ["سيروم النياسيناميد", "Sérum niacinamide"],
    t: ["مسام أنعم وحبوب أقل", "Pores affinés, moins d’imperfections"],
    cat: "serum",
    sk: ["oily", "combo"],
    e: "💧",
    c: "#dcecf9",
    v: [["30 مل", "30 ml", 2600, 3000, 18]],
    r: 4.7,
    sold: 240,
  },
  {
    n: ["روتين العناية الكامل", "Routine complète"],
    t: ["غسول + تونر + سيروم + مرطب", "Nettoyant + tonique + sérum + hydratant"],
    cat: "set",
    sk: ["normal", "dry", "oily", "combo", "sens"],
    e: "🎁",
    c: "#f9e0e6",
    v: [["الحجم العادي", "Format standard", 9800, 12400, 9]],
    r: 4.9,
    sold: 260,
  },
];

export function seedProducts(now: string): Product[] {
  return SEED.map((s, i) => ({
    id: i + 1,
    name: { ar: s.n[0], fr: s.n[1] },
    tagline: { ar: s.t[0], fr: s.t[1] },
    description: { ar: "", fr: "" },
    cat: s.cat,
    skins: s.sk,
    emoji: s.e,
    color: s.c,
    images: [],
    variants: s.v.map((v, j) => ({
      id: `v${j + 1}`,
      label: { ar: v[0], fr: v[1] },
      price: v[2],
      oldPrice: v[3],
      stock: v[4],
    })),
    rating: s.r,
    soldBase: s.sold,
    published: true,
    createdAt: now,
  }));
}

/** `offers` from reference/admin-dashboard.html. */
export const DEFAULT_OFFERS: Offer[] = [
  {
    id: "o1",
    name: "خصم أول طلب",
    desc: "15% على الطلب الأول",
    type: "percent",
    value: 15,
    code: "WELCOME15",
    minTotal: 0,
    firstOnly: true,
    on: true,
    startsAt: "",
    endsAt: "",
  },
  {
    id: "o2",
    name: "اشترِ 2 والثالث مجاناً",
    desc: "على منتجات العناية بالبشرة",
    type: "b2g1",
    value: 0,
    code: "",
    minTotal: 0,
    firstOnly: false,
    on: true,
    startsAt: "",
    endsAt: "",
  },
  {
    id: "o3",
    name: "شحن مجاني",
    desc: "للطلبات فوق 6000 دج",
    type: "freeship",
    value: 0,
    code: "FREESHIP",
    minTotal: 6000,
    firstOnly: false,
    on: false,
    startsAt: "",
    endsAt: "",
  },
  {
    id: "o4",
    name: "عرض نهاية الأسبوع",
    desc: "-10% حتى الجمعة",
    type: "percent",
    value: 10,
    code: "WEEKEND10",
    minTotal: 0,
    firstOnly: false,
    on: false,
    startsAt: "",
    endsAt: "",
  },
];

export const DEFAULT_SETTINGS: Settings = {
  freeShip: 6000,
  lowStock: 6,
  metaPixel: "",
  tiktokPixel: "",
  admin: { name: "Green Pharm", color: "#2f5d46", side: "#1d2b24", accent: "#4f9c88", radius: 12 },
};

export function emptyDB(now: string): DB {
  return {
    version: 1,
    nextOrderId: 1001,
    nextProductId: SEED.length + 1,
    categories: DEFAULT_CATEGORIES,
    products: seedProducts(now),
    orders: [],
    rates: DEFAULT_RATES,
    offers: DEFAULT_OFFERS,
    stockMoves: [],
    blacklist: [],
    landings: [],
    settings: DEFAULT_SETTINGS,
    config: { published: DEFAULT_CONFIG, draft: DEFAULT_CONFIG, history: [] },
  };
}
