"use client";

// One-product landing page for ads. Same look and the same cash-on-delivery checkout as the store;
// orders are recorded with the page as their source.

import { useEffect, useMemo, useState } from "react";
import { ltr } from "@/lib/format";
import type { Catalog } from "@/lib/server/catalog";
import { themeVars } from "@/lib/theme";
import type { LandingPage, PublicProduct, StoreConfig } from "@/lib/types";
import { Checkout } from "./Checkout";
import { Pixels, track } from "./Pixels";
import { makeTexts, stars, type Lang, type TX } from "./text";

function Countdown({
  ends,
  label,
  t,
}: {
  ends: string;
  label: string;
  t: ReturnType<typeof makeTexts>;
}) {
  const [left, setLeft] = useState<number | null>(null);
  useEffect(() => {
    const tick = () => setLeft(Math.max(0, new Date(ends).getTime() - Date.now()));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [ends]);
  if (left === null || left === 0) return null;
  const h = Math.floor(left / 3600e3);
  const m = Math.floor((left % 3600e3) / 60e3);
  const s = Math.floor((left % 60e3) / 1000);
  const box = (n: number, l: string) => (
    <div
      style={{
        background: "var(--side)",
        color: "#fff",
        borderRadius: 10,
        padding: "8px 12px",
        minWidth: 64,
        textAlign: "center",
      }}
    >
      <b style={{ fontSize: 22 }}>{String(n).padStart(2, "0")}</b>
      <br />
      <small>{l}</small>
    </div>
  );
  return (
    <section className="blk" style={{ textAlign: "center" }}>
      <h2 className="t">{label}</h2>
      <div style={{ display: "flex", gap: 8, justifyContent: "center", direction: "ltr" }}>
        {box(h, t.T("hrs"))}
        {box(m, t.T("mins"))}
        {box(s, t.T("secs"))}
      </div>
    </section>
  );
}

export function LandingView({
  lp,
  product: p,
  catalog,
  config,
  locale,
  tx,
}: {
  lp: LandingPage;
  product: PublicProduct;
  catalog: Catalog;
  config: StoreConfig;
  locale: Lang;
  tx: TX;
}) {
  const t = useMemo(() => makeTexts(tx, config, locale), [tx, config, locale]);
  const { T, fmt, li, L } = t;
  const first = Math.max(
    0,
    p.variants.findIndex((v) => v.stock > 0),
  );
  const [vi, setVi] = useState(first);
  const [q, setQ] = useState(1);
  const v = p.variants[vi] ?? p.variants[0];
  const lines = useMemo(
    () => (v.stock > 0 ? [{ productId: p.id, variantId: v.id, qty: Math.min(q, v.stock) }] : []),
    [p.id, v, q],
  );
  const [img, setImg] = useState(0);

  useEffect(() => {
    const d = document.documentElement;
    for (const [k, val] of Object.entries(
      themeVars({
        color: config.color,
        bg: config.bg,
        radius: config.radius,
        font: config.font,
        cols: config.cols,
        annBg: config.annBg,
        ratio: config.card.ratio,
      }),
    ))
      d.style.setProperty(k, val);
    track("ViewContent", { content_ids: [String(p.id)], content_type: "product" });
  }, [config, p.id]);

  const form = () => document.getElementById("order")?.scrollIntoView({ behavior: "smooth" });
  const off = v.oldPrice ? Math.round((1 - v.price / v.oldPrice) * 100) : 0;

  return (
    <div style={{ paddingBottom: 90 }}>
      <Pixels
        meta={lp.metaPixel || catalog.metaPixel}
        tiktok={lp.tiktokPixel || catalog.tiktokPixel}
      />
      {config.ann && <div className="ann">{T("ann")}</div>}
      <main className="wrap main" style={{ maxWidth: 620, paddingTop: 16 }}>
        {lp.blocks.map((b) => {
          if (b.k === "hero")
            return (
              <section className="blk" key="hero">
                <div
                  className="big"
                  style={{
                    background: p.color,
                    borderRadius: "calc(var(--radius) * 1.4)",
                    height: "auto",
                    minHeight: 230,
                    aspectRatio: p.images.length ? "1/1" : undefined,
                  }}
                >
                  {p.images.length ? (
                    <img src={p.images[img] ?? p.images[0]} alt={li(p.name)} />
                  ) : (
                    p.emoji
                  )}
                  {off > 0 && (
                    <span className="tag" style={{ fontSize: 15 }}>
                      {ltr("-" + off + "%")}
                    </span>
                  )}
                  {p.images.length > 1 && (
                    <div className="dots">
                      {p.images.map((_, i) => (
                        <button
                          key={i}
                          aria-label={String(i + 1)}
                          aria-current={i === img}
                          onClick={() => setImg(i)}
                        />
                      ))}
                    </div>
                  )}
                </div>
                <h1 style={{ fontSize: 28, lineHeight: 1.3, margin: "16px 0 6px" }}>
                  {li(b.title) || li(p.name)}
                </h1>
                <p style={{ color: "var(--muted)", margin: "0 0 8px", fontSize: 17 }}>
                  {li(b.text)}
                </p>
                <div className="stars">{stars(p.rating)}</div>
                <div className="price">
                  <b style={{ fontSize: 26 }}>{fmt(v.price)}</b>
                  {v.oldPrice ? <s>{fmt(v.oldPrice)}</s> : null}
                </div>
                <button className="btn block" style={{ marginTop: 14 }} onClick={form}>
                  {T("orderNow")}
                </button>
              </section>
            );
          if (b.k === "features")
            return (
              <section className="blk" data-bg="soft" data-pad="md" key="features">
                <h2 className="t">{li(b.title)}</h2>
                {li(b.lines)
                  .split("\n")
                  .filter(Boolean)
                  .map((l, i) => (
                    <p key={i} style={{ margin: "6px 0" }}>
                      <b className="ok">✓</b> {l}
                    </p>
                  ))}
              </section>
            );
          if (b.k === "reviews")
            return (
              <section className="blk" key="reviews">
                <h2 className="t">{li(b.title)}</h2>
                <div style={{ display: "grid", gap: 10 }}>
                  {li(b.lines)
                    .split("\n")
                    .filter(Boolean)
                    .map((l, i) => (
                      <div className="rv" key={i}>
                        <span className="stars">★★★★★</span>
                        <p>{l}</p>
                      </div>
                    ))}
                </div>
              </section>
            );
          if (b.k === "countdown")
            return lp.countdownEnds ? (
              <Countdown key="cd" ends={lp.countdownEnds} label={li(b.title)} t={t} />
            ) : null;
          return (
            <section
              className="blk"
              id="order"
              key="form"
              style={{
                background: "var(--card)",
                border: "1px solid var(--line)",
                borderRadius: "calc(var(--radius) * 1.2)",
                overflow: "hidden",
              }}
            >
              <div className="pad">
                <h2 className="t" style={{ marginBottom: 8 }}>
                  {li(b.title)}
                </h2>
                {p.variants.length > 1 && (
                  <>
                    <div style={{ fontWeight: 600 }}>{T("size")}</div>
                    <div className="opts">
                      {p.variants.map((x, i) => (
                        <button
                          key={x.id}
                          className="chip s"
                          disabled={x.stock === 0}
                          aria-pressed={i === vi}
                          onClick={() => {
                            setVi(i);
                            setQ(1);
                          }}
                        >
                          {li(x.label)} · {fmt(x.price)}
                        </button>
                      ))}
                    </div>
                  </>
                )}
                <div style={{ fontWeight: 600, marginBottom: 6 }}>{T("qty")}</div>
                <div className="qty">
                  <button aria-label="-" onClick={() => setQ(Math.max(1, q - 1))}>
                    −
                  </button>
                  <span>{ltr(q)}</span>
                  <button aria-label="+" onClick={() => setQ(Math.min(v.stock, q + 1))}>
                    +
                  </button>
                </div>
                {v.stock === 0 && <p className="ferr">{T("outStock")}</p>}
              </div>
              <Checkout
                t={t}
                catalog={catalog}
                lines={lines}
                source={"landing:" + lp.slug}
                onOrdered={() => {}}
                inline
              />
            </section>
          );
        })}
        <footer style={{ textAlign: "center" }}>
          <b>{config.name}</b> · {T("fContact")} <bdi dir="ltr">{config.social.phone}</bdi>
          <div>{T("fReturn")}</div>
        </footer>
      </main>
      {lp.blocks.some((b) => b.k === "form") && (
        <button className="bar lp" onClick={form}>
          <span>
            {T("orderNow")} · {L === "ar" ? "الدفع عند الاستلام" : "paiement à la livraison"}
          </span>
          <span>{fmt(v.price * q)}</span>
        </button>
      )}
    </div>
  );
}
