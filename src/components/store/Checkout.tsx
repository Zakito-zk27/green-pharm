"use client";

// Cart + delivery form + summary + confirmation, ported from `drawCart` / `submit` in
// reference/store.html. Also used by the landing pages (inline, without the sheet header).

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { placeOrder, quoteCart } from "@/app/[locale]/actions";
import { WILAYAS } from "@/data/wilayas";
import { ltr } from "@/lib/format";
import { isValidAlgerianPhone, normalizePhone } from "@/lib/phone";
import { priceCart, type CartLine } from "@/lib/pricing";
import type { Catalog } from "@/lib/server/catalog";
import type { DeliveryMode } from "@/lib/types";
import type { FieldError } from "@/lib/server/orders";
import type { Texts } from "./text";
import { track } from "./Pixels";

type Form = {
  name: string;
  phone: string;
  wil: string;
  com: string;
  addr: string;
  mode: DeliveryMode;
};
const EMPTY: Form = { name: "", phone: "", wil: "", com: "", addr: "", mode: "home" };

export type Done = {
  id: number;
  name: string;
  phone: string;
  wilaya: number;
  mode: DeliveryMode;
  total: number;
};

type Props = {
  t: Texts;
  catalog: Catalog;
  lines: CartLine[];
  source: string;
  /** Cart only: change a line quantity by `d` (removes it at 0). */
  onQty?: (productId: number, variantId: string, d: number) => void;
  onClose?: () => void;
  onOrdered: () => void;
  inline?: boolean;
  demo?: { form: Form; done?: Done } | null;
};

export function Checkout({
  t,
  catalog,
  lines,
  source,
  onQty,
  onClose,
  onOrdered,
  inline,
  demo,
}: Props) {
  const { T, fmt, li, L } = t;
  // The Store Designer preview remounts this with sample data (see Storefront `view`).
  const [f, setF] = useState<Form>(demo?.form ?? EMPTY);
  const [err, setErr] = useState<Set<FieldError>>(new Set());
  const [done, setDone] = useState<Done | null>(demo?.done ?? null);
  const [formError, setFormError] = useState("");
  const [couponInput, setCouponInput] = useState("");
  const [coupon, setCoupon] = useState("");
  const [pending, start] = useTransition();
  const [quote, setQuote] = useState<{
    key: string;
    r: Awaited<ReturnType<typeof quoteCart>>;
  } | null>(null);
  const root = useRef<HTMLDivElement>(null);

  const wilaya = f.wil === "" ? null : Number(f.wil);
  const local = useMemo(
    () =>
      priceCart(
        { lines, wilaya, mode: f.mode, coupon: "", firstOrder: false, now: new Date() },
        {
          products: catalog.products,
          rates: catalog.rates,
          offers: catalog.autoOffers,
          freeShip: catalog.freeShip,
        },
      ),
    [lines, wilaya, f.mode, catalog],
  );
  const phoneOk = isValidAlgerianPhone(f.phone);
  const key = JSON.stringify([
    lines,
    wilaya,
    f.mode,
    coupon,
    phoneOk ? normalizePhone(f.phone) : "",
  ]);
  const needServer = coupon !== "" || phoneOk;
  useEffect(() => {
    if (!needServer || !lines.length) return;
    let live = true;
    const id = setTimeout(() => {
      quoteCart({ lines, wilaya, mode: f.mode, coupon, phone: phoneOk ? f.phone : "" })
        .then((r) => live && setQuote({ key, r }))
        .catch(() => {});
    }, 250);
    return () => {
      live = false;
      clearTimeout(id);
    };
    // `key` covers every input of the quote.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, needServer]);
  const p = needServer && quote?.key === key ? quote.r : local;
  const couponState = coupon && quote?.key === key ? quote.r.coupon : "";

  const rate = wilaya ? catalog.rates.find((r) => r.code === wilaya) : null;
  const rem = catalog.freeShip - p.subtotal;
  const W = WILAYAS;

  const set = (k: keyof Form) => (e: { target: { value: string } }) =>
    setF((x) => ({ ...x, [k]: e.target.value }));

  function submit() {
    setFormError("");
    const ph = normalizePhone(f.phone);
    const bad = new Set<FieldError>();
    if (f.name.trim().length < 3) bad.add("name");
    if (!/^0[567]\d{8}$/.test(ph)) bad.add("phone");
    if (f.wil === "") bad.add("wil");
    if (f.com.trim().length <= 1) bad.add("com");
    if (f.addr.trim().length <= 3) bad.add("addr");
    setErr(bad);
    if (bad.size) {
      requestAnimationFrame(() => {
        const first = root.current?.querySelector<HTMLElement>(".field.err");
        first?.scrollIntoView({ block: "center" });
        first?.querySelector<HTMLElement>("input,select")?.focus();
      });
      return;
    }
    if (demo) return;
    start(async () => {
      try {
        const r = await placeOrder({
          name: f.name,
          phone: f.phone,
          wilaya: Number(f.wil),
          commune: f.com,
          address: f.addr,
          mode: f.mode,
          coupon,
          lines,
          lang: L,
          source,
        });
        if (r.ok) {
          track("Purchase", { value: r.order.total, currency: "DZD" });
          setDone({
            id: r.order.id,
            name: r.order.name,
            phone: r.order.phone,
            wilaya: r.order.wilaya,
            mode: r.order.mode,
            total: r.order.total,
          });
          onOrdered();
        } else if (r.error === "fields") setErr(new Set(r.fields));
        else if (r.error === "coupon") setCoupon("");
        else
          setFormError(
            T(r.error === "blocked" ? "errBlocked" : r.error === "rate" ? "errRate" : "errStock"),
          );
      } catch {
        setFormError(T("errNet"));
      }
    });
  }

  const head = (title: string) =>
    inline ? null : (
      <div className="sh-h">
        <b>{title}</b>
        <button className="ib" onClick={onClose} aria-label={T("close")}>
          ✕
        </button>
      </div>
    );

  if (done) {
    const w = W.find((x) => x.code === done.wilaya);
    const first = done.name.trim().split(" ")[0];
    return (
      <div ref={root}>
        {head(T("doneT"))}
        <div className="done">
          <div className="ck">✓</div>
          <h2 style={{ margin: "0 0 6px" }}>{T("thanks", first)}</h2>
          <p style={{ color: "var(--muted)", margin: "0 0 16px" }}>
            {T("orderNo")} <b dir="ltr">{ltr("#" + done.id)}</b>.{" "}
            {T("callYou", "\u0000")
              .split("\u0000")
              .map((part, i) =>
                i === 0 ? (
                  <span key={i}>{part}</span>
                ) : (
                  <span key={i}>
                    <b dir="ltr">{ltr(done.phone)}</b>
                    {part}
                  </span>
                ),
              )}
          </p>
          <div
            style={{
              background: "var(--card)",
              border: "1px solid var(--line)",
              borderRadius: 14,
              padding: 14,
              textAlign: "start",
            }}
          >
            <div className="sum" style={{ padding: 0 }}>
              <div>
                <span>{T("deliverTo")}</span>
                <span>
                  {w ? w[L] : ""} · {done.mode === "desk" ? T("relay") : T("home")}
                </span>
              </div>
              <div className="tot">
                <span>{T("dueCod")}</span>
                <span>{fmt(done.total)}</span>
              </div>
            </div>
          </div>
          {!inline && (
            <button
              className="btn block"
              style={{ marginTop: 16 }}
              onClick={() => {
                setDone(null);
                onClose?.();
              }}
            >
              {T("cont")}
            </button>
          )}
        </div>
      </div>
    );
  }

  const field = (k: FieldError, label: string, el: React.ReactNode, em: string) => (
    <div className={"field" + (err.has(k) ? " err" : "")} id={"f-" + k}>
      <label htmlFor={"in-" + k}>{label}</label>
      {el}
      <span className="em">{em}</span>
    </div>
  );

  return (
    <div ref={root}>
      {head(T("checkout"))}
      {local.items.length > 0 &&
        local.items.map((i) => {
          const prod = catalog.products.find((x) => x.id === i.productId);
          return (
            <div className="ci" key={i.productId + "-" + i.variantId}>
              <div className="th" style={{ background: prod?.color }}>
                {prod?.images[0] ? <img src={prod.images[0]} alt="" /> : prod?.emoji}
              </div>
              <div className="in">
                <b>{li(i.name)}</b>
                <div style={{ color: "var(--muted)", fontSize: 13 }}>
                  {li(i.variantLabel)} · {fmt(i.price)}
                </div>
              </div>
              {onQty ? (
                <div className="qty">
                  <button onClick={() => onQty(i.productId, i.variantId, -1)} aria-label="-">
                    −
                  </button>
                  <span>{ltr(i.qty)}</span>
                  <button onClick={() => onQty(i.productId, i.variantId, 1)} aria-label="+">
                    +
                  </button>
                </div>
              ) : (
                <b>× {ltr(i.qty)}</b>
              )}
            </div>
          );
        })}
      {rem > 0 ? (
        <div className="pad" style={{ fontSize: 14, color: "var(--muted)" }}>
          {T("remain", fmt(rem))}
        </div>
      ) : (
        <div className="pad ok" style={{ fontSize: 14 }}>
          {T("gotFree")}
        </div>
      )}
      <div className="pad" style={{ borderTop: "1px solid var(--line)" }}>
        <div style={{ fontWeight: 700, marginBottom: 10 }}>{T("details")}</div>
        {field(
          "name",
          T("fName"),
          <input id="in-name" value={f.name} onChange={set("name")} autoComplete="name" />,
          T("eName"),
        )}
        {field(
          "phone",
          T("fPhone"),
          <input
            id="in-phone"
            value={f.phone}
            onChange={set("phone")}
            inputMode="tel"
            dir="ltr"
            placeholder="05 / 06 / 07 XX XX XX XX"
            autoComplete="tel"
          />,
          T("ePhone"),
        )}
        <div className="two">
          {field(
            "wil",
            T("fWil"),
            <select id="in-wil" value={f.wil} onChange={set("wil")}>
              <option value="">{T("choose")}</option>
              {W.map((w) => (
                <option key={w.code} value={w.code}>
                  {w.code} - {w[L]}
                </option>
              ))}
            </select>,
            T("eWil"),
          )}
          {field(
            "com",
            T("fCom"),
            <input id="in-com" value={f.com} onChange={set("com")} />,
            T("eCom"),
          )}
        </div>
        {field(
          "addr",
          T("fAddr"),
          <input
            id="in-addr"
            value={f.addr}
            onChange={set("addr")}
            autoComplete="street-address"
          />,
          T("eAddr"),
        )}
        <div className="seg">
          <button
            type="button"
            aria-pressed={f.mode === "home"}
            onClick={() => setF((x) => ({ ...x, mode: "home" }))}
          >
            {T("home")}
            <small>{rate ? fmt(rate.home) : T("pickWil")}</small>
          </button>
          <button
            type="button"
            aria-pressed={f.mode === "desk"}
            onClick={() => setF((x) => ({ ...x, mode: "desk" }))}
          >
            {T("relay")}
            <small>{rate ? fmt(rate.desk) : T("cheaper")}</small>
          </button>
        </div>
        <div className="cod">
          <span style={{ fontSize: 22 }}>💵</span>
          <span>
            <b>{T("codT")}</b>
            <br />
            {T("codD")}
          </span>
        </div>
        {catalog.hasCoupons && (
          <>
            <div className="field" style={{ marginBottom: 4 }}>
              <label htmlFor="in-coupon">{T("couponL")}</label>
            </div>
            <div className="coupon">
              <input
                id="in-coupon"
                dir="ltr"
                value={couponInput}
                onChange={(e) => setCouponInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && setCoupon(couponInput.trim())}
                autoCapitalize="characters"
              />
              <button
                type="button"
                className="btn ghost"
                onClick={() => setCoupon(couponInput.trim())}
              >
                {T("couponApply")}
              </button>
            </div>
            {couponState === "ok" && <p className="cmsg ok">{T("couponOk")}</p>}
            {couponState === "invalid" && <p className="cmsg bad">{T("couponBad")}</p>}
          </>
        )}
      </div>
      <div className="sum">
        <div>
          <span>{T("sProd")}</span>
          <span>{fmt(p.subtotal)}</span>
        </div>
        {p.discount > 0 && (
          <div className="disc">
            <span>
              {T("sDisc")} <small style={{ color: "var(--muted)" }}>({p.offers.join("، ")})</small>
            </span>
            <span>{fmt(-p.discount)}</span>
          </div>
        )}
        <div>
          <span>{T("sShip")}</span>
          <span>
            {p.shipping === null ? (
              T("shipWait")
            ) : p.shipping === 0 ? (
              <b className="ok">{T("free")}</b>
            ) : (
              fmt(p.shipping)
            )}
          </span>
        </div>
        <div className="tot">
          <span>{T("sTot")}</span>
          <span>{fmt(p.total)}</span>
        </div>
      </div>
      <div className="pad">
        <button
          className="btn block"
          onClick={submit}
          disabled={pending || !lines.length}
          aria-busy={pending}
        >
          {pending ? T("sending") : `${T("confirm")} · ${fmt(p.total)}`}
        </button>
        {formError && (
          <p className="ferr" role="alert">
            {formError}
          </p>
        )}
        <p
          style={{ fontSize: 12.5, color: "var(--muted)", textAlign: "center", margin: "8px 0 0" }}
        >
          {T("callNote")}
        </p>
      </div>
    </div>
  );
}
