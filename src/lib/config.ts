// Store Designer config: fill missing keys from the defaults (like `normalize` in
// reference/store.html) and keep only safe values. Runs on the server before saving
// and again before rendering.

import { DEFAULT_CONFIG } from "./defaults";
import { isHexColor } from "./theme";
import type { CustomBanner, L2, Section, StoreConfig } from "./types";

const SECTION_KEYS = ["hero", "trust", "best", "shop", "how", "reviews"];

const pick = <T extends string | number>(v: unknown, allowed: readonly T[], fallback: T): T =>
  allowed.includes(v as T) ? (v as T) : fallback;
const bool = (v: unknown, fallback: boolean) => (typeof v === "boolean" ? v : fallback);
const obj = (v: unknown): Record<string, unknown> =>
  v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : {};

/** Plain text only: no tags, no control characters, limited length. */
export function cleanText(v: unknown, max = 400): string {
  if (typeof v !== "string") return "";
  return v
    .replace(/<[^>]*>/g, "")
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, "")
    .slice(0, max);
}

/** Links the store may render: anchors on the page, https, tel:. Everything else becomes #shop. */
export function safeLink(v: unknown): string {
  const s = cleanText(v, 300).trim();
  return /^(#[\w-]*|https:\/\/|http:\/\/|tel:)/.test(s) ? s : "#shop";
}

/** Social links must be http(s) URLs; anything else is dropped. */
export function safeUrl(v: unknown): string {
  const s = cleanText(v, 300).trim();
  return /^https?:\/\/[^\s"'<>]+$/.test(s) ? s : "";
}

/** Images: our own uploads/static files or https URLs. */
export function safeImage(v: unknown): string {
  const s = cleanText(v, 500).trim();
  return /^(\/media\/[\w.-]+|\/logo\.png|https:\/\/[^\s"'<>()]+)$/.test(s) ? s : "";
}

const l2 = (v: unknown, max = 200): L2 => {
  const o = obj(v);
  return { ar: cleanText(o.ar, max), fr: cleanText(o.fr, max) };
};

export function normalizeConfig(input: unknown): StoreConfig {
  const c = obj(input);
  const d = DEFAULT_CONFIG;
  const langs = obj(c.langs);
  const wa = obj(c.wa);
  const hero = obj(c.hero);
  const card = obj(c.card);
  const best = obj(c.best);
  const social = obj(c.social);

  const out: StoreConfig = {
    name: cleanText(c.name ?? d.name, 60) || d.name,
    logo: c.logo === undefined ? d.logo : safeImage(c.logo),
    langs: { ar: bool(langs.ar, d.langs.ar), fr: bool(langs.fr, d.langs.fr) },
    defLang: pick(c.defLang, ["ar", "fr"] as const, d.defLang),
    color: isHexColor(c.color) ? c.color : d.color,
    bg: pick(c.bg, ["cream", "blush", "white", "dark"] as const, d.bg),
    radius: pick(Number(c.radius), [6, 16, 26] as const, d.radius as 16),
    font: pick(c.font, ["IBM Plex Sans Arabic", "Cairo", "Tajawal"] as const, d.font),
    cols: pick(Number(c.cols), [2, 3, 4] as const, 4),
    ann: bool(c.ann, d.ann),
    annBg: isHexColor(c.annBg) ? c.annBg : d.annBg,
    sticky: bool(c.sticky, d.sticky),
    wa: {
      on: bool(wa.on, d.wa.on),
      number: cleanText(wa.number ?? d.wa.number, 20).replace(/[^\d+ ]/g, ""),
    },
    hero: {
      layout: pick(hero.layout, ["split", "center"] as const, d.hero.layout),
      image: safeImage(hero.image),
      art: bool(hero.art, d.hero.art),
    },
    card: {
      ratio: pick(card.ratio, ["1/1", "4/5"] as const, d.card.ratio),
      rating: bool(card.rating, d.card.rating),
      old: bool(card.old, d.card.old),
      badges: bool(card.badges, d.card.badges),
    },
    best: {
      auto: bool(best.auto, d.best.auto),
      interval: pick(Number(best.interval), [2000, 3200, 5000] as const, 3200),
      count: pick(Number(best.count), [3, 4, 6, 8] as const, 6),
    },
    social: {
      phone: cleanText(social.phone ?? d.social.phone, 30),
      instagram: social.instagram === undefined ? d.social.instagram : safeUrl(social.instagram),
      facebook: safeUrl(social.facebook),
      tiktok: safeUrl(social.tiktok),
    },
    sections: [],
    custom: [],
    texts: {},
  };

  const custom: CustomBanner[] = (Array.isArray(c.custom) ? c.custom : [])
    .slice(0, 12)
    .flatMap((b) => {
      const o = obj(b);
      const id = cleanText(o.id, 20).replace(/[^\w-]/g, "");
      if (!id) return [];
      return [
        {
          id,
          image: safeImage(o.image),
          link: safeLink(o.link),
          title: l2(o.title, 120),
          text: l2(o.text, 300),
          btn: l2(o.btn, 40),
        },
      ];
    });
  out.custom = custom;

  const seen = new Set<string>();
  const sections: Section[] = [];
  for (const s of Array.isArray(c.sections) ? c.sections : d.sections) {
    const o = obj(s);
    const k = String(o.k ?? "");
    const valid =
      SECTION_KEYS.includes(k) || (k.startsWith("c:") && custom.some((b) => "c:" + b.id === k));
    if (!valid || seen.has(k)) continue;
    seen.add(k);
    sections.push({
      k: k as Section["k"],
      on: bool(o.on, true),
      bg: pick(o.bg, ["none", "soft", "brand", "dark"] as const, "none"),
      pad: pick(o.pad, ["none", "sm", "md", "lg"] as const, "none"),
      align: pick(o.align, ["start", "center"] as const, "start"),
    });
  }
  for (const def of d.sections) if (!seen.has(def.k)) sections.push({ ...def });
  for (const b of custom)
    if (!seen.has("c:" + b.id))
      sections.push({ k: `c:${b.id}`, on: true, bg: "brand", pad: "md", align: "center" });
  out.sections = sections;

  const texts = obj(c.texts);
  for (const [k, v] of Object.entries(texts)) {
    if (!/^\w{1,30}$/.test(k)) continue;
    const t = l2(v, 400);
    if (t.ar || t.fr) out.texts[k] = t;
  }
  if (!out.langs.ar && !out.langs.fr) out.langs.ar = true;
  if (!out.langs[out.defLang]) out.defLang = out.langs.ar ? "ar" : "fr";
  return out;
}
