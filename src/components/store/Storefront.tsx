"use client";

// The storefront, ported from reference/store.html (markup, classes and behavior).
// Data comes from the server (published products, delivery prices, Store Designer config).
// Inside the admin's Store Designer it runs in an iframe and follows its messages.

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter } from "@/i18n/navigation";
import { ltr } from "@/lib/format";
import type { CartLine } from "@/lib/pricing";
import type { Catalog } from "@/lib/server/catalog";
import { themeVars } from "@/lib/theme";
import type { PublicProduct, Section, StoreConfig } from "@/lib/types";
import { Checkout, type Done } from "./Checkout";
import { Pixels, track } from "./Pixels";
import { makeTexts, stars, type Lang, type TX } from "./text";

const CART_KEY = "gp-cart";
const SKINS = ["all", "oily", "dry", "combo", "normal", "sens"];

type View = "page" | "product" | "cart" | "success";

const totalStock = (p: PublicProduct) => p.variants.reduce((s, v) => s + v.stock, 0);

function applyTheme(c: StoreConfig) {
  const d = document.documentElement;
  const vars = themeVars({
    color: c.color,
    bg: c.bg,
    radius: c.radius,
    font: c.font,
    cols: c.cols,
    annBg: c.annBg,
    ratio: c.card.ratio,
  });
  for (const [k, v] of Object.entries(vars)) d.style.setProperty(k, v);
  if (c.bg === "dark") {
    d.setAttribute("data-theme", "dark");
    d.dataset.cfgDark = "1";
  } else if (d.dataset.cfgDark) {
    d.removeAttribute("data-theme");
    delete d.dataset.cfgDark;
  }
  d.dataset.bg = c.bg;
}

/** Store Designer: highlight the element being edited. */
function mark(kind: string, key: string) {
  document.querySelectorAll(".sel").forEach((e) => e.classList.remove("sel"));
  const el =
    kind === "text"
      ? document.querySelector(`[data-i18n="${CSS.escape(key)}"]`)
      : kind === "logo"
        ? document.querySelector('[data-pick="logo"]')
        : document.querySelector(`[data-sec="${CSS.escape(key)}"]`);
  if (el) {
    el.classList.add("sel");
    el.scrollIntoView({ block: "center", behavior: "smooth" });
  }
}

export function Storefront({
  locale,
  config,
  catalog,
  tx,
}: {
  locale: Lang;
  config: StoreConfig;
  catalog: Catalog;
  tx: TX;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [cfg, setCfg] = useState(config);
  const [L, setL] = useState<Lang>(locale);
  const [embedded, setEmbedded] = useState(false);
  const [editing, setEditing] = useState(false);
  const [cat, setCat] = useState("all");
  const [skin, setSkin] = useState("all");
  const [cart, setCart] = useState<CartLine[]>([]);
  const [sheet, setSheet] = useState<null | "product" | "cart">(null);
  const [cur, setCur] = useState<PublicProduct | null>(null);
  const [sel, setSel] = useState({ v: 0, q: 1, img: 0 });
  const [toastMsg, setToastMsg] = useState({ m: "", id: 0 });
  const [demo, setDemo] = useState<{ lines: CartLine[]; success: boolean } | null>(null);
  const [checkoutKey, setCheckoutKey] = useState(0);

  const t = useMemo(() => makeTexts(tx, cfg, L), [tx, cfg, L]);
  const { T, fmt, li } = t;
  const products = catalog.products;

  // Follow new props (language switch, new published config) without an extra effect.
  const [prev, setPrev] = useState({ locale, config });
  if (prev.locale !== locale || prev.config !== config) {
    setPrev({ locale, config });
    setL(locale);
    setCfg(config);
  }
  useEffect(() => applyTheme(cfg), [cfg]);
  useEffect(() => {
    document.documentElement.lang = L;
    document.documentElement.dir = L === "ar" ? "rtl" : "ltr";
    document.title = T("title");
  }, [L, T]);

  /* ----- cart, saved in the browser ----- */
  useEffect(() => {
    // Reading localStorage can only happen after hydration.
    if (window.parent !== window) return;
    try {
      const saved = JSON.parse(localStorage.getItem(CART_KEY) || "[]") as CartLine[];
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setCart(
        saved.filter((l) => {
          const v = products
            .find((p) => p.id === l.productId)
            ?.variants.find((x) => x.id === l.variantId);
          return v && v.stock > 0 && l.qty > 0;
        }),
      );
    } catch {
      /* private mode: start empty */
    }
  }, [products]);
  const saveCart = useCallback((next: CartLine[]) => {
    setCart(next);
    if (window.parent !== window) return;
    try {
      localStorage.setItem(CART_KEY, JSON.stringify(next));
    } catch {
      /* ignore */
    }
  }, []);

  const lines = demo ? demo.lines : cart;
  const count = lines.reduce((s, i) => s + i.qty, 0);
  const sub = lines.reduce((s, l) => {
    const v = products
      .find((p) => p.id === l.productId)
      ?.variants.find((x) => x.id === l.variantId);
    return s + (v ? v.price * l.qty : 0);
  }, 0);

  const toast = (m: string) => setToastMsg((t) => ({ m, id: t.id + 1 }));
  useEffect(() => {
    if (!toastMsg.m) return;
    const id = setTimeout(() => setToastMsg((t) => ({ ...t, m: "" })), 2400);
    return () => clearTimeout(id);
  }, [toastMsg.id, toastMsg.m]);

  const [ordered, setOrdered] = useState(false);
  function closeAll() {
    setSheet(null);
    if (ordered) {
      // Next time the cart opens, start from a fresh form instead of the confirmation.
      setOrdered(false);
      setCheckoutKey((k) => k + 1);
    }
  }
  const demoProp = useMemo(
    () =>
      demo
        ? {
            form: {
              name: "أمينة بن علي",
              phone: "0550123456",
              wil: "19",
              com: "سطيف",
              addr: "حي 5 جويلية",
              mode: "home" as const,
            },
            done: demo.success
              ? ({
                  id: 1001,
                  name: "أمينة بن علي",
                  phone: "0550123456",
                  wilaya: 19,
                  mode: "home",
                  total: 6150,
                } satisfies Done)
              : undefined,
          }
        : null,
    [demo],
  );
  useEffect(() => {
    if (!sheet) return;
    const k = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      setSheet(null);
      setOrdered(false);
    };
    document.addEventListener("keydown", k);
    return () => document.removeEventListener("keydown", k);
  }, [sheet]);
  useEffect(() => {
    document.body.style.overflow = sheet ? "hidden" : "";
  }, [sheet]);

  function openP(p: PublicProduct) {
    setCur(p);
    setSel({
      v: Math.max(
        0,
        p.variants.findIndex((v) => v.stock > 0),
      ),
      q: 1,
      img: 0,
    });
    setSheet("product");
    track("ViewContent", { content_ids: [String(p.id)], content_type: "product" });
  }
  function openCart() {
    setSheet("cart");
    if (count) track("InitiateCheckout", { value: sub, currency: "DZD" });
  }
  function add() {
    if (!cur) return;
    const v = cur.variants[sel.v];
    if (!v) return;
    const next = [...cart];
    const ex = next.find((i) => i.productId === cur.id && i.variantId === v.id);
    if (ex) ex.qty = Math.min(v.stock, ex.qty + sel.q);
    else next.push({ productId: cur.id, variantId: v.id, qty: sel.q });
    saveCart(next.map((x) => ({ ...x })));
    track("AddToCart", { content_ids: [String(cur.id)], value: v.price * sel.q, currency: "DZD" });
  }
  function changeQty(productId: number, variantId: string, d: number) {
    if (demo) return;
    const v = products.find((p) => p.id === productId)?.variants.find((x) => x.id === variantId);
    saveCart(
      cart
        .map((i) =>
          i.productId === productId && i.variantId === variantId
            ? { ...i, qty: Math.min(v?.stock ?? 0, i.qty + d) }
            : i,
        )
        .filter((i) => i.qty > 0),
    );
  }

  function switchLang() {
    const next: Lang = L === "ar" ? "fr" : "ar";
    if (embedded) {
      setL(next);
      window.parent.postMessage({ t: "lang", lang: next }, location.origin);
    } else router.replace(pathname, { locale: next });
  }

  /* ----- Store Designer preview (iframe) ----- */
  const view = useCallback(
    (w: View) => {
      setSheet(null);
      setDemo(null);
      if (w === "page") return;
      if (w === "product") {
        if (products[0]) openP(products[0]);
        return;
      }
      const demoLines = products
        .slice(0, 2)
        .map((p) => ({ productId: p.id, variantId: p.variants[0].id, qty: 1 }));
      setDemo({ lines: demoLines, success: w === "success" });
      setCheckoutKey((k) => k + 1);
      setSheet("cart");
    },
    [products],
  );
  useEffect(() => {
    if (window.parent === window) return;
    // Only known in the browser: are we inside the Store Designer preview?
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setEmbedded(true);
    const onMsg = (e: MessageEvent) => {
      if (e.source !== window.parent || e.origin !== location.origin) return;
      const m = e.data || {};
      if (m.t === "cfg") setCfg(m.cfg);
      else if (m.t === "lang" && (m.lang === "ar" || m.lang === "fr")) setL(m.lang);
      else if (m.t === "edit") setEditing(!!m.on);
      else if (m.t === "view") view(m.what);
      else if (m.t === "sel") mark(m.kind, m.key);
    };
    window.addEventListener("message", onMsg);
    window.parent.postMessage({ t: "ready" }, location.origin);
    return () => window.removeEventListener("message", onMsg);
  }, [view]);
  useEffect(() => {
    document.documentElement.classList.toggle("editing", editing);
    if (!editing) return;
    const pick = (kind: string, key: string, el: Element) => {
      document.querySelectorAll(".sel").forEach((x) => x.classList.remove("sel"));
      el.classList.add("sel");
      window.parent.postMessage({ t: "pick", kind, key }, location.origin);
    };
    const onClick = (e: MouseEvent) => {
      const target = e.target as Element;
      if (target.closest("#langBtn,#themeBtn,#cartBtn,.ov")) return;
      for (const [attr, kind] of [
        ["data-i18n", "text"],
        ["data-pick", "logo"],
        ["data-sec", "sec"],
      ] as const) {
        const el = target.closest(`[${attr}]`);
        if (el) {
          e.preventDefault();
          e.stopPropagation();
          pick(kind, el.getAttribute(attr)!, el);
          return;
        }
      }
    };
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, [editing]);

  /* ----- product card (`card()` in the prototype) ----- */
  function card(p: PublicProduct, rank?: number, best?: boolean) {
    const v = p.variants[0];
    const stock = totalStock(p);
    const off = v.oldPrice ? Math.round((1 - v.price / v.oldPrice) * 100) : 0;
    const tag = best ? (
      <span className="tag best-tag" data-i18n="bestTag">
        {T("bestTag")}
      </span>
    ) : stock === 0 ? (
      <span className="tag" style={{ background: "#666" }}>
        {T("tag_out")}
      </span>
    ) : stock <= 6 ? (
      <span className="tag low">{T("tag_low")}</span>
    ) : off > 0 ? (
      <span className="tag">{ltr("-" + off + "%")}</span>
    ) : null;
    return (
      <button key={p.id} className="pc" onClick={() => openP(p)}>
        <div className="im" style={{ background: p.color }}>
          {p.images[0] ? <img src={p.images[0]} alt={li(p.name)} loading="lazy" /> : p.emoji}
          {tag}
          {rank ? <span className="rank">{ltr(rank)}</span> : null}
        </div>
        <div className="bd">
          <span className="nm">{li(p.name)}</span>
          <span className="ty">{li(p.tagline)}</span>
          <span className="stars">{stars(p.rating)}</span>
          {best && <span className="sold">{T("sold", p.sold)}</span>}
          <div className="price">
            <b>{fmt(v.price)}</b>
            {v.oldPrice ? <s>{fmt(v.oldPrice)}</s> : null}
          </div>
        </div>
      </button>
    );
  }

  /* ----- sections ----- */
  const catKeys = ["all", ...catalog.categories.map((c) => c.id)];
  const catLabel = (id: string) => {
    if (id === "all") return T("c_all");
    const o = cfg.texts["c_" + id]?.[L];
    if (o) return o;
    if (tx[L]["c_" + id]) return T("c_" + id);
    return li(catalog.categories.find((c) => c.id === id)?.name);
  };
  const grid = products.filter(
    (p) => (cat === "all" || p.cat === cat) && (skin === "all" || p.skins.includes(skin as never)),
  );

  function sectionBody(s: Section) {
    switch (s.k) {
      case "hero":
        return (
          <div className="hero" data-layout={cfg.hero.layout}>
            <div>
              <h1 data-i18n="heroT">{T("heroT")}</h1>
              <p data-i18n="heroS">{T("heroS")}</p>
              <button
                className="btn"
                data-i18n="cta"
                onClick={() => document.getElementById("shop")?.scrollIntoView()}
              >
                {T("cta")}
              </button>
            </div>
            <div>
              {cfg.hero.image ? (
                <img className="heroimg" src={cfg.hero.image} alt="" />
              ) : cfg.hero.art ? (
                <div className="heroart" aria-hidden="true">
                  <span className="a">🧴</span>
                  <span className="b">🌿</span>
                  <span className="c">🍊</span>
                </div>
              ) : null}
            </div>
          </div>
        );
      case "trust":
        return (
          <div className="trust">
            {[
              ["💵", 1],
              ["🚚", 2],
              ["✅", 3],
              ["↩️", 4],
            ].map(([e, n]) => (
              <div key={n}>
                <em>{e}</em>
                <span>
                  <b data-i18n={`t${n}a`}>{T(`t${n}a`)}</b>
                  <span data-i18n={`t${n}b`}>{T(`t${n}b`)}</span>
                </span>
              </div>
            ))}
          </div>
        );
      case "best":
        return renderBest();
      case "shop":
        return (
          <>
            <h2 className="t" data-i18n="shopT">
              {T("shopT")}
            </h2>
            <div className="cats">
              {catKeys.map((c) => (
                <button key={c} className="chip" aria-pressed={c === cat} onClick={() => setCat(c)}>
                  {catLabel(c)}
                </button>
              ))}
            </div>
            <div className="skin">
              <small data-i18n="skinL">{T("skinL")}</small>
              {SKINS.map((c) => (
                <button
                  key={c}
                  className="chip s"
                  aria-pressed={c === skin}
                  onClick={() => setSkin(c)}
                >
                  {T("s_" + c)}
                </button>
              ))}
            </div>
            <div className="pg">
              {grid.length ? (
                grid.map((p) => card(p))
              ) : (
                <p
                  style={{
                    gridColumn: "1/-1",
                    textAlign: "center",
                    color: "var(--muted)",
                    padding: 30,
                  }}
                >
                  {T("emptyG")}
                </p>
              )}
            </div>
          </>
        );
      case "how":
        return (
          <div className="how">
            {[1, 2, 3].map((n) => (
              <div key={n}>
                <h3 data-i18n={`h${n}t`}>{T(`h${n}t`)}</h3>
                <p data-i18n={`h${n}p`}>{T(`h${n}p`)}</p>
              </div>
            ))}
          </div>
        );
      case "reviews":
        return (
          <>
            <h2 className="t" data-i18n="revT">
              {T("revT")}
            </h2>
            <div className="reviews">
              {[
                ["★★★★★", 1],
                ["★★★★★", 2],
                ["★★★★☆", 3],
              ].map(([s, n]) => (
                <div className="rv" key={n}>
                  <span className="stars">{s}</span>
                  <p data-i18n={`r${n}`}>{T(`r${n}`)}</p>
                  <small data-i18n={`r${n}n`}>{T(`r${n}n`)}</small>
                </div>
              ))}
            </div>
          </>
        );
      default: {
        const b = cfg.custom.find((x) => "c:" + x.id === s.k);
        if (!b) return null;
        const ext = /^https?:/.test(b.link);
        return (
          <>
            {b.image && <img className="cbimg" src={b.image} alt="" />}
            <div>
              <h2>{li(b.title)}</h2>
              <p>{li(b.text)}</p>
              {li(b.btn) && (
                <a
                  className="btn"
                  href={b.link}
                  {...(ext ? { target: "_blank", rel: "noopener" } : {})}
                >
                  {li(b.btn)}
                </a>
              )}
            </div>
          </>
        );
      }
    }
  }

  /* ----- best sellers carousel (auto-scroll, pauses on hover/touch/focus, off with reduced motion) ----- */
  const bestList = useMemo(
    () =>
      products
        .filter((p) => totalStock(p) > 0)
        .sort((a, b) => b.sold - a.sold)
        .slice(0, cfg.best.count),
    [products, cfg.best.count],
  );
  const trackRef = useRef<HTMLDivElement>(null);
  const bState = useRef({ idx: 0, paused: false, visible: true });
  const bGo = useCallback((i: number) => {
    const items = trackRef.current?.children;
    if (!items?.length) return;
    const n = items.length;
    bState.current.idx = (i + n) % n;
    (items[bState.current.idx] as HTMLElement).scrollIntoView({
      behavior: "smooth",
      block: "nearest",
      inline: "start",
    });
  }, []);
  useEffect(() => {
    const tr = trackRef.current;
    if (!tr) return;
    const s = bState.current;
    s.idx = 0;
    tr.scrollLeft = 0;
    let syncT: ReturnType<typeof setTimeout>;
    const sync = () => {
      const r = tr.getBoundingClientRect();
      const rtl = document.documentElement.dir === "rtl";
      let best = 0;
      let d = 1e9;
      [...tr.children].forEach((c, i) => {
        const b = c.getBoundingClientRect();
        const x = Math.abs(rtl ? b.right - r.right : b.left - r.left);
        if (x < d) {
          d = x;
          best = i;
        }
      });
      s.idx = best;
    };
    const onScroll = () => {
      clearTimeout(syncT);
      syncT = setTimeout(sync, 140);
    };
    const pause = () => (s.paused = true);
    const resume = () => (s.paused = false);
    const touch = () => {
      s.paused = true;
      setTimeout(resume, 6000);
    };
    tr.addEventListener("scroll", onScroll, { passive: true });
    tr.addEventListener("pointerenter", pause);
    tr.addEventListener("pointerleave", resume);
    tr.addEventListener("focusin", pause);
    tr.addEventListener("focusout", resume);
    tr.addEventListener("touchstart", touch, { passive: true });
    let io: IntersectionObserver | undefined;
    if ("IntersectionObserver" in window) {
      s.visible = false;
      io = new IntersectionObserver((es) => (s.visible = es[0].isIntersecting), {
        threshold: 0.25,
      });
      io.observe(tr);
    }
    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const timer =
      cfg.best.auto && !reduce
        ? setInterval(() => {
            if (s.paused || !s.visible || document.hidden || editing) return;
            bGo(s.idx + 1);
          }, cfg.best.interval)
        : undefined;
    return () => {
      clearInterval(timer);
      clearTimeout(syncT);
      io?.disconnect();
      tr.removeEventListener("scroll", onScroll);
      tr.removeEventListener("pointerenter", pause);
      tr.removeEventListener("pointerleave", resume);
      tr.removeEventListener("focusin", pause);
      tr.removeEventListener("focusout", resume);
      tr.removeEventListener("touchstart", touch);
    };
  }, [cfg.best.auto, cfg.best.interval, bestList, editing, bGo, L]);

  function renderBest() {
    return (
      <>
        <div className="bh">
          <h2 className="t" data-i18n="bestT">
            {T("bestT")}
          </h2>
          <div className="arrows">
            <button
              className="ib arr prev"
              aria-label="Previous"
              onClick={() => bGo(bState.current.idx - 1)}
            >
              <svg viewBox="0 0 24 24">
                <path d="M9 6l6 6-6 6" />
              </svg>
            </button>
            <button
              className="ib arr next"
              aria-label="Next"
              onClick={() => bGo(bState.current.idx + 1)}
            >
              <svg viewBox="0 0 24 24">
                <path d="M9 6l6 6-6 6" />
              </svg>
            </button>
          </div>
        </div>
        <div className="btrack" ref={trackRef} tabIndex={0}>
          {bestList.map((p, i) => card(p, i + 1, true))}
        </div>
      </>
    );
  }

  /* ----- product sheet (`drawP`) ----- */
  function productSheet() {
    if (!cur) return null;
    const p = cur;
    const v = p.variants[sel.v] ?? p.variants[0];
    const out = v.stock === 0;
    const skinList = p.skins.map((s) => T("s_" + s)).join(L === "ar" ? "، " : ", ");
    const imgs = p.images;
    return (
      <>
        <div className="sh-h">
          <b>{li(p.name)}</b>
          <button className="ib" onClick={closeAll} aria-label={T("close")}>
            ✕
          </button>
        </div>
        <div className="big" style={{ background: p.color }}>
          {imgs.length ? <img src={imgs[sel.img] ?? imgs[0]} alt={li(p.name)} /> : p.emoji}
          {imgs.length > 1 && (
            <div className="dots">
              {imgs.map((_, i) => (
                <button
                  key={i}
                  aria-label={String(i + 1)}
                  aria-current={i === sel.img}
                  onClick={() => setSel((s) => ({ ...s, img: i }))}
                />
              ))}
            </div>
          )}
        </div>
        <div className="pad">
          <div className="stars">
            {stars(p.rating)} <span style={{ color: "var(--muted)" }}>{ltr(p.rating)}</span>
          </div>
          <div className="price" style={{ padding: "4px 0 8px" }}>
            <b style={{ fontSize: 24 }}>{fmt(v.price)}</b>
            {v.oldPrice ? <s>{fmt(v.oldPrice)}</s> : null}
          </div>
          <p style={{ margin: "0 0 10px", color: "var(--muted)" }}>
            {li(p.tagline)}. {T("suits", skinList)}
          </p>
          {li(p.description) && <p className="desc">{li(p.description)}</p>}
          <div
            className={out ? "" : "ok"}
            style={v.stock > 0 && v.stock <= 6 ? { color: "#c9822b", fontWeight: 600 } : undefined}
          >
            {out ? (
              <span data-i18n="outStock">{T("outStock")}</span>
            ) : v.stock <= 6 ? (
              T("left", v.stock)
            ) : (
              <span data-i18n="inStock">{T("inStock")}</span>
            )}
          </div>
          <div style={{ marginTop: 14, fontWeight: 600 }}>
            <span data-i18n="size">{T("size")}</span>
          </div>
          <div className="opts">
            {p.variants.map((x, i) => (
              <button
                key={x.id}
                className="chip s"
                aria-pressed={i === sel.v}
                onClick={() => setSel((s) => ({ ...s, v: i, q: 1 }))}
              >
                {li(x.label)}
              </button>
            ))}
          </div>
          <div style={{ fontWeight: 600, marginBottom: 6 }}>
            <span data-i18n="qty">{T("qty")}</span>
          </div>
          <div className="qty">
            <button
              aria-label="-"
              onClick={() => setSel((s) => ({ ...s, q: Math.max(1, s.q - 1) }))}
            >
              −
            </button>
            <span>{ltr(sel.q)}</span>
            <button
              aria-label="+"
              onClick={() => setSel((s) => ({ ...s, q: Math.min(v.stock, s.q + 1) }))}
            >
              +
            </button>
          </div>
        </div>
        <div className="sticky">
          <button
            className="btn ghost"
            disabled={out}
            style={{ flex: 1 }}
            onClick={() => {
              add();
              closeAll();
              toast(T("added"));
            }}
          >
            <span data-i18n="addCart">{T("addCart")}</span>
          </button>
          <button
            className="btn"
            disabled={out}
            style={{ flex: 1.3 }}
            onClick={() => {
              add();
              openCart();
            }}
          >
            <span data-i18n="orderNow">{T("orderNow")}</span>
          </button>
        </div>
      </>
    );
  }

  const bodyCls = [
    !cfg.card.rating && "no-rating",
    !cfg.card.old && "no-old",
    !cfg.card.badges && "no-badges",
  ]
    .filter(Boolean)
    .join(" ");
  const social = [
    ["Instagram", cfg.social.instagram],
    ["Facebook", cfg.social.facebook],
    ["TikTok", cfg.social.tiktok],
  ].filter((x) => /^https?:\/\//.test(x[1]));
  const waHref = "https://wa.me/213" + String(cfg.wa.number).replace(/\D/g, "").replace(/^0/, "");

  return (
    <div className={bodyCls}>
      {!embedded && <Pixels meta={catalog.metaPixel} tiktok={catalog.tiktokPixel} />}
      {cfg.ann && (
        <div className="ann" data-i18n="ann">
          {T("ann")}
        </div>
      )}
      <header style={{ position: cfg.sticky ? "sticky" : "relative" }}>
        <div className="wrap hd">
          <a className="logo" href="#top" data-pick="logo">
            {cfg.logo ? <img src={cfg.logo} alt="" /> : <i>{(cfg.name || "B").trim().charAt(0)}</i>}
            <span>{cfg.name}</span>
          </a>
          <nav className="hnav">
            <a href="#shop" data-i18n="nav_shop">
              {T("nav_shop")}
            </a>
            <a href="#how" data-i18n="nav_how">
              {T("nav_how")}
            </a>
            <a href="#reviews" data-i18n="nav_rev">
              {T("nav_rev")}
            </a>
          </nav>
          <div className="sp" />
          {cfg.langs.ar && cfg.langs.fr && (
            <button className="lang" id="langBtn" aria-label="Langue / اللغة" onClick={switchLang}>
              {T("langBtn")}
            </button>
          )}
          <button
            className="ib"
            id="themeBtn"
            aria-label="Theme"
            onClick={() => {
              const d = document.documentElement;
              const dark = getComputedStyle(d).getPropertyValue("--bg").trim() === "#17111a";
              d.setAttribute("data-theme", dark ? "light" : "dark");
            }}
          >
            <svg viewBox="0 0 24 24">
              <path d="M20 14.5A8 8 0 019.5 4 8 8 0 1020 14.5z" />
            </svg>
          </button>
          <button className="ib" id="cartBtn" aria-label={T("cart")} onClick={openCart}>
            <svg viewBox="0 0 24 24">
              <path d="M3 4h2l2.5 11h10L20 7H6M9 20a1 1 0 100-2 1 1 0 000 2zM17 20a1 1 0 100-2 1 1 0 000 2z" />
            </svg>
            {count > 0 && <span className="cnt">{ltr(count)}</span>}
          </button>
        </div>
      </header>

      <main className="wrap main" id="top">
        {cfg.sections.map((s) =>
          s.on ? (
            <section
              key={s.k}
              id={
                s.k === "shop" || s.k === "how" || s.k === "reviews" || s.k === "best"
                  ? s.k
                  : undefined
              }
              className={
                "blk" +
                (s.k.startsWith("c:")
                  ? " cb" + (cfg.custom.find((b) => "c:" + b.id === s.k)?.image ? " has-img" : "")
                  : "")
              }
              data-sec={s.k}
              data-bg={s.bg}
              data-pad={s.pad}
              data-align={s.align}
            >
              {sectionBody(s)}
            </section>
          ) : null,
        )}
      </main>

      <footer>
        <div className="wrap">
          <div>
            <b>{cfg.name}</b> · <span data-i18n="fContact">{T("fContact")}</span>{" "}
            <bdi dir="ltr">{cfg.social.phone}</bdi>
          </div>
          <div className="soc">
            {social.map(([n, href]) => (
              <a key={n} href={href} target="_blank" rel="noopener">
                {n}
              </a>
            ))}
          </div>
          <div data-i18n="fReturn">{T("fReturn")}</div>
        </div>
      </footer>

      {cfg.wa.on && (
        <a
          className="wa"
          href={waHref}
          target="_blank"
          rel="noopener"
          aria-label={T("waT")}
          style={{ display: "grid" }}
        >
          <svg viewBox="0 0 24 24" fill="#fff">
            <path d="M12 2a10 10 0 00-8.6 15.1L2 22l5-1.3A10 10 0 1012 2zm5.2 14.1c-.2.6-1.3 1.2-1.8 1.2-.5.1-1 .2-3.3-.7-2.8-1.2-4.6-4-4.7-4.2-.1-.2-1.1-1.5-1.1-2.8s.7-2 1-2.3c.2-.3.5-.3.7-.3h.5c.2 0 .4 0 .6.5l.8 2c.1.2.1.4 0 .6l-.4.6-.5.5c-.2.2-.3.4-.1.7.2.3.8 1.4 1.8 2.2 1.2 1.1 2.2 1.4 2.5 1.6.3.1.5.1.7-.1l1-1.2c.2-.3.4-.2.7-.1l2 1c.3.1.5.2.5.3.1.2.1.7-.1 1.3z" />
          </svg>
        </a>
      )}
      {count > 0 && (
        <button className="bar" onClick={openCart}>
          <span>{T("viewCart", count)}</span>
          <span>{fmt(sub)}</span>
        </button>
      )}
      <div className={"ov" + (sheet ? " show" : "")} onClick={closeAll} />
      <div
        className={"sheet prod" + (sheet === "product" ? " show" : "")}
        role="dialog"
        aria-modal="true"
      >
        {sheet === "product" && productSheet()}
      </div>
      <div
        className={"sheet cart" + (sheet === "cart" ? " show" : "")}
        role="dialog"
        aria-modal="true"
      >
        {lines.length === 0 && !ordered ? (
          <>
            <div className="sh-h">
              <b>{T("cart")}</b>
              <button className="ib" onClick={closeAll} aria-label={T("close")}>
                ✕
              </button>
            </div>
            <div className="done" style={{ padding: "60px 20px" }}>
              <div style={{ fontSize: 48 }}>🛍️</div>
              <p style={{ color: "var(--muted)" }} data-i18n="emptyC">
                {T("emptyC")}
              </p>
              <button className="btn" onClick={closeAll}>
                {T("cont")}
              </button>
            </div>
          </>
        ) : (
          <Checkout
            key={checkoutKey}
            t={t}
            catalog={catalog}
            lines={lines}
            source="store"
            onQty={changeQty}
            onClose={closeAll}
            onOrdered={() => {
              setOrdered(true);
              saveCart([]);
            }}
            demo={demoProp}
          />
        )}
      </div>
      <div className={"toast" + (toastMsg.m ? " show" : "")} role="status" aria-live="polite">
        {toastMsg.m}
      </div>
    </div>
  );
}
