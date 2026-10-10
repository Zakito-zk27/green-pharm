"use server";

// Every admin change goes through these actions. Each one checks the session (and the
// owner role where needed) on the server, validates its input, saves, and expires the
// storefront cache it affects.

import { randomBytes } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import { updateTag } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cleanText, normalizeConfig, safeImage } from "@/lib/config";
import { DEFAULT_CONFIG } from "@/lib/defaults";
import { isValidAlgerianPhone, normalizePhone } from "@/lib/phone";
import { SESSION_COOKIE, SESSION_DAYS, samePassword, signSession, type Role } from "@/lib/session";
import { isHexColor } from "@/lib/theme";
import { requireRole } from "@/lib/server/auth";
import { readDB, UPLOAD_DIR, writeDB } from "@/lib/server/db";
import { applyStatus, moveStock } from "@/lib/server/orders";
import { soldCounts } from "@/lib/server/catalog";
import {
  ORDER_STATUSES,
  SKIN_TYPES,
  type DB,
  type L2,
  type LandingBlock,
  type LandingPage,
  type Offer,
  type OrderStatus,
  type Product,
  type Settings,
  type SkinType,
  type StoreConfig,
} from "@/lib/types";

export type AdminData = Omit<DB, "config" | "stockMoves"> & {
  role: Role;
  stockMoves: DB["stockMoves"];
  sold: Record<number, number>;
  config: { draft: StoreConfig; published: StoreConfig; history: string[] };
  now: string;
};

function view(db: DB, role: Role): AdminData {
  const { config, stockMoves, ...rest } = db;
  return {
    ...rest,
    role,
    stockMoves: stockMoves.slice(0, 300),
    sold: Object.fromEntries(soldCounts(db)),
    config: {
      draft: normalizeConfig(config.draft),
      published: normalizeConfig(config.published),
      history: config.history.map((h) => h.at),
    },
    now: new Date().toISOString(),
  };
}

/* ===== session ===== */

export async function login(_: unknown, form: FormData): Promise<{ error: string } | undefined> {
  const pw = String(form.get("password") ?? "");
  const owner = process.env.ADMIN_PASSWORD;
  const staff = process.env.STAFF_PASSWORD;
  if (!owner) return { error: "لم يتم ضبط كلمة سر المدير بعد (ADMIN_PASSWORD في .env.local)." };
  let role: Role | null = null;
  if (samePassword(pw, owner)) role = "owner";
  else if (staff && samePassword(pw, staff)) role = "staff";
  if (!role) {
    await new Promise((r) => setTimeout(r, 800)); // slow down guessing
    return { error: "كلمة السر غير صحيحة." };
  }
  (await cookies()).set(SESSION_COOKIE, await signSession(role), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_DAYS * 86400,
  });
  redirect("/admin");
}

export async function logout() {
  (await cookies()).delete(SESSION_COOKIE);
  redirect("/admin/login");
}

export async function getAdminData(): Promise<AdminData> {
  const role = await requireRole();
  return view(await readDB(), role);
}

/** Small poll for new orders (sound + notification in the dashboard). */
export async function latestOrderId(): Promise<number> {
  await requireRole();
  const db = await readDB();
  return db.orders[0]?.id ?? 0;
}

async function mutate(
  ownerOnly: boolean,
  fn: (db: DB, role: Role) => void,
  tags: ("catalog" | "config")[] = [],
) {
  const role = await requireRole(ownerOnly);
  const data = await writeDB((db) => {
    fn(db, role);
    return view(db, role);
  });
  for (const t of tags) updateTag(t);
  return data;
}

/* ===== orders ===== */

export async function setOrderStatus(id: number, status: OrderStatus, note = "") {
  if (!ORDER_STATUSES.includes(status)) throw new Error("bad status");
  return mutate(
    false,
    (db, role) => {
      const o = db.orders.find((x) => x.id === id);
      if (o) applyStatus(db, o, status, role, cleanText(note, 300));
    },
    ["catalog"],
  );
}

export async function saveOrderInfo(id: number, note: string, tracking: string) {
  return mutate(false, (db) => {
    const o = db.orders.find((x) => x.id === id);
    if (!o) return;
    o.note = cleanText(note, 1000);
    o.tracking = cleanText(tracking, 60);
  });
}

/* ===== products ===== */

const l2 = (v: unknown, max = 200): L2 => {
  const o = (v ?? {}) as Partial<L2>;
  return { ar: cleanText(o.ar, max).trim(), fr: cleanText(o.fr, max).trim() };
};
const money = (v: unknown) => Math.max(0, Math.min(10_000_000, Math.round(Number(v) || 0)));

export async function saveProduct(input: Partial<Product>) {
  return mutate(
    false,
    (db) => {
      const name = l2(input.name, 120);
      if (!name.ar && !name.fr) throw new Error("name");
      const variants = (input.variants ?? []).slice(0, 20).map((v, i) => ({
        id: cleanText(v.id, 20).replace(/[^\w-]/g, "") || `v${Date.now().toString(36)}${i}`,
        label: l2(v.label, 60),
        price: money(v.price),
        oldPrice: v.oldPrice ? money(v.oldPrice) || null : null,
        stock: Math.max(0, Math.round(Number(v.stock) || 0)),
      }));
      if (!variants.length) throw new Error("variants");
      const clean = {
        name,
        tagline: l2(input.tagline, 160),
        description: l2(input.description, 2000),
        cat: db.categories.some((c) => c.id === input.cat)
          ? String(input.cat)
          : (db.categories[0]?.id ?? ""),
        skins: (input.skins ?? []).filter((s): s is SkinType => SKIN_TYPES.includes(s as SkinType)),
        emoji: cleanText(input.emoji, 8) || "🧴",
        color: isHexColor(input.color) ? input.color : "#e8efe9",
        images: (input.images ?? []).map(safeImage).filter(Boolean).slice(0, 8),
        rating: Math.min(5, Math.max(0, Number(input.rating) || 5)),
        published: input.published !== false,
      };
      const existing = input.id ? db.products.find((p) => p.id === input.id) : undefined;
      if (existing) {
        // Stock changes made here are logged as manual adjustments.
        for (const v of variants) {
          const before = existing.variants.find((x) => x.id === v.id)?.stock ?? 0;
          if (v.stock !== before) {
            db.stockMoves.unshift({
              at: new Date().toISOString(),
              productId: existing.id,
              variantId: v.id,
              delta: v.stock - before,
              reason: "manual",
              by: "admin",
            });
          }
        }
        Object.assign(existing, clean, { variants });
      } else {
        db.products.push({
          id: db.nextProductId++,
          ...clean,
          variants,
          soldBase: 0,
          createdAt: new Date().toISOString(),
        });
      }
    },
    ["catalog"],
  );
}

export async function deleteProduct(id: number) {
  return mutate(
    false,
    (db) => {
      db.products = db.products.filter((p) => p.id !== id);
    },
    ["catalog"],
  );
}

export async function setPublished(id: number, published: boolean) {
  return mutate(
    false,
    (db) => {
      const p = db.products.find((x) => x.id === id);
      if (p) p.published = published;
    },
    ["catalog"],
  );
}

export async function adjustStock(productId: number, variantId: string, delta: number) {
  return mutate(
    false,
    (db, role) => {
      const d = Math.round(Number(delta) || 0);
      if (d) moveStock(db, productId, variantId, d, "manual", role);
    },
    ["catalog"],
  );
}

export async function saveCategory(id: string, name: L2) {
  return mutate(
    true,
    (db) => {
      const clean = l2(name, 40);
      const key = cleanText(id, 20)
        .toLowerCase()
        .replace(/[^a-z0-9]/g, "");
      if (!key || (!clean.ar && !clean.fr)) throw new Error("category");
      const c = db.categories.find((x) => x.id === key);
      if (c) c.name = clean;
      else db.categories.push({ id: key, name: clean });
    },
    ["catalog"],
  );
}

export async function deleteCategory(id: string) {
  return mutate(
    true,
    (db) => {
      if (db.products.some((p) => p.cat === id)) throw new Error("category in use");
      db.categories = db.categories.filter((c) => c.id !== id);
    },
    ["catalog"],
  );
}

/** Upload one image (already resized in the browser). Returns its public URL. */
export async function uploadImage(form: FormData): Promise<string> {
  await requireRole();
  const file = form.get("file");
  if (!(file instanceof File) || file.size === 0) throw new Error("file");
  if (file.size > 3 * 1024 * 1024) throw new Error("too big");
  const buf = Buffer.from(await file.arrayBuffer());
  const ext =
    buf[0] === 0xff && buf[1] === 0xd8
      ? "jpg"
      : buf.subarray(0, 4).toString("hex") === "89504e47"
        ? "png"
        : buf.subarray(0, 4).toString() === "RIFF" && buf.subarray(8, 12).toString() === "WEBP"
          ? "webp"
          : null;
  if (!ext) throw new Error("type");
  await fs.mkdir(UPLOAD_DIR, { recursive: true });
  const name = `${Date.now().toString(36)}-${randomBytes(6).toString("hex")}.${ext}`;
  await fs.writeFile(path.join(UPLOAD_DIR, name), buf);
  return `/media/${name}`;
}

/* ===== delivery ===== */

export async function saveRates(
  rates: { code: number; home: number; desk: number }[],
  freeShip: number,
) {
  return mutate(
    true,
    (db) => {
      for (const r of rates) {
        const row = db.rates.find((x) => x.code === Number(r.code));
        if (row) {
          row.home = money(r.home);
          row.desk = money(r.desk);
        }
      }
      db.settings.freeShip = money(freeShip);
    },
    ["catalog"],
  );
}

/* ===== offers ===== */

export async function saveOffer(input: Offer) {
  return mutate(
    true,
    (db) => {
      const type = (["percent", "amount", "freeship", "b2g1"] as const).includes(input.type)
        ? input.type
        : "percent";
      const date = (v: string) => (/^\d{4}-\d{2}-\d{2}$/.test(v ?? "") ? v : "");
      const clean: Offer = {
        id: cleanText(input.id, 20).replace(/[^\w]/g, "") || "o" + Date.now().toString(36),
        name: cleanText(input.name, 80).trim() || "عرض",
        desc: cleanText(input.desc, 160),
        type,
        value:
          type === "percent"
            ? Math.min(100, Math.max(0, Math.round(Number(input.value) || 0)))
            : money(input.value),
        code: cleanText(input.code, 30)
          .toUpperCase()
          .replace(/[^A-Z0-9_-]/g, ""),
        minTotal: money(input.minTotal),
        firstOnly: !!input.firstOnly,
        on: !!input.on,
        startsAt: date(input.startsAt),
        endsAt: date(input.endsAt),
      };
      const i = db.offers.findIndex((o) => o.id === clean.id);
      if (i >= 0) db.offers[i] = clean;
      else db.offers.push(clean);
    },
    ["catalog"],
  );
}

export async function deleteOffer(id: string) {
  return mutate(
    true,
    (db) => {
      db.offers = db.offers.filter((o) => o.id !== id);
    },
    ["catalog"],
  );
}

/* ===== blacklist ===== */

export async function blockPhone(phone: string, reason: string) {
  return mutate(false, (db) => {
    const p = normalizePhone(phone);
    if (!isValidAlgerianPhone(p) || db.blacklist.some((b) => b.phone === p)) return;
    db.blacklist.unshift({
      phone: p,
      reason: cleanText(reason, 200),
      at: new Date().toISOString(),
    });
  });
}

export async function unblockPhone(phone: string) {
  return mutate(true, (db) => {
    db.blacklist = db.blacklist.filter((b) => b.phone !== phone);
  });
}

/* ===== Store Designer ===== */

export async function saveDraft(cfg: unknown) {
  return mutate(true, (db) => {
    db.config.draft = normalizeConfig(cfg);
  });
}

export async function publishConfig(cfg: unknown) {
  return mutate(
    true,
    (db) => {
      const clean = normalizeConfig(cfg);
      db.config.history.unshift({ at: new Date().toISOString(), config: db.config.published });
      db.config.history = db.config.history.slice(0, 10);
      db.config.published = clean;
      db.config.draft = clean;
    },
    ["config"],
  );
}

export async function restoreVersion(index: number) {
  return mutate(true, (db) => {
    const v = db.config.history[index];
    if (v) db.config.draft = normalizeConfig(v.config);
  });
}

export async function resetDraft() {
  return mutate(true, (db) => {
    db.config.draft = DEFAULT_CONFIG;
  });
}

/* ===== landing pages ===== */

function cleanBlock(b: LandingBlock): LandingBlock | null {
  switch (b.k) {
    case "hero":
      return { k: "hero", title: l2(b.title, 120), text: l2(b.text, 200) };
    case "features":
      return { k: "features", title: l2(b.title, 120), lines: l2(b.lines, 1000) };
    case "reviews":
      return { k: "reviews", title: l2(b.title, 120), lines: l2(b.lines, 1500) };
    case "countdown":
      return {
        k: "countdown",
        title: l2(b.title, 120),
        hours: Math.min(720, Math.max(1, Math.round(Number(b.hours) || 24))),
      };
    case "form":
      return { k: "form", title: l2(b.title, 120) };
    default:
      return null;
  }
}

export async function saveLanding(input: LandingPage) {
  return mutate(
    true,
    (db) => {
      const slug = cleanText(input.slug, 60)
        .toLowerCase()
        .replace(/[^a-z0-9-]/g, "-")
        .replace(/-+/g, "-")
        .replace(/^-|-$/g, "");
      if (!slug) throw new Error("slug");
      if (db.landings.some((l) => l.slug === slug && l.id !== input.id))
        throw new Error("slug taken");
      if (!db.products.some((p) => p.id === Number(input.productId))) throw new Error("product");
      const blocks = (input.blocks ?? [])
        .slice(0, 12)
        .map(cleanBlock)
        .filter((b): b is LandingBlock => !!b);
      const existing = db.landings.find((l) => l.id === input.id);
      const cd = blocks.find((b) => b.k === "countdown");
      const clean: LandingPage = {
        id: existing?.id ?? "lp" + Date.now().toString(36),
        slug,
        productId: Number(input.productId),
        blocks,
        published: !!input.published,
        metaPixel: cleanText(input.metaPixel, 40).replace(/[^\w]/g, ""),
        tiktokPixel: cleanText(input.tiktokPixel, 40).replace(/[^\w]/g, ""),
        createdAt: existing?.createdAt ?? new Date().toISOString(),
        countdownEnds:
          cd && cd.k === "countdown"
            ? existing?.countdownEnds && input.countdownEnds === existing.countdownEnds
              ? existing.countdownEnds
              : new Date(Date.now() + cd.hours * 3600e3).toISOString()
            : "",
      };
      if (existing) Object.assign(existing, clean);
      else db.landings.unshift(clean);
    },
    ["catalog"],
  );
}

export async function deleteLanding(id: string) {
  return mutate(
    true,
    (db) => {
      db.landings = db.landings.filter((l) => l.id !== id);
    },
    ["catalog"],
  );
}

/* ===== settings ===== */

export async function saveSettings(input: Partial<Settings>) {
  return mutate(
    true,
    (db) => {
      const s = db.settings;
      if (input.lowStock !== undefined)
        s.lowStock = Math.max(0, Math.min(1000, Math.round(Number(input.lowStock) || 0)));
      if (input.metaPixel !== undefined)
        s.metaPixel = cleanText(input.metaPixel, 40).replace(/[^\w]/g, "");
      if (input.tiktokPixel !== undefined)
        s.tiktokPixel = cleanText(input.tiktokPixel, 40).replace(/[^\w]/g, "");
      if (input.admin) {
        const a = input.admin;
        s.admin = {
          name: cleanText(a.name, 60) || s.admin.name,
          color: isHexColor(a.color) ? a.color : s.admin.color,
          side: isHexColor(a.side) ? a.side : s.admin.side,
          accent: isHexColor(a.accent) ? a.accent : s.admin.accent,
          radius: [6, 12, 20].includes(Number(a.radius)) ? Number(a.radius) : s.admin.radius,
        };
      }
    },
    ["catalog"],
  );
}
