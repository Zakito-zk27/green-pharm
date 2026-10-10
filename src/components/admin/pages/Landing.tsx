"use client";

import { useState } from "react";
import { deleteLanding, saveLanding } from "@/app/admin/actions";
import { groupThousands } from "@/lib/format";
import type { LandingBlock, LandingPage, Product } from "@/lib/types";
import { Switch, dateFmt, num, useAdmin } from "../ui";

const BLK: Record<LandingBlock["k"], string> = {
  hero: "العنوان والصورة",
  features: "المزايا",
  reviews: "التقييمات",
  countdown: "عدّاد تنازلي",
  form: "نموذج الطلب",
};

function newBlock(k: LandingBlock["k"], p?: Product): LandingBlock {
  switch (k) {
    case "hero":
      return {
        k,
        title: { ar: p?.name.ar ?? "", fr: p?.name.fr ?? "" },
        text: { ar: p?.tagline.ar ?? "", fr: p?.tagline.fr ?? "" },
      };
    case "features":
      return {
        k,
        title: { ar: "لماذا هذا المنتج؟", fr: "Pourquoi ce produit ?" },
        lines: {
          ar: "منتج أصلي مضمون\nبنصيحة صيدلانية\nالدفع عند الاستلام",
          fr: "Produit original garanti\nConseillé par une pharmacienne\nPaiement à la livraison",
        },
      };
    case "reviews":
      return {
        k,
        title: { ar: "آراء الزبونات", fr: "Avis clientes" },
        lines: {
          ar: "«لاحظت الفرق بعد أسبوعين» — أمينة، الجزائر",
          fr: "« J’ai vu la différence en deux semaines » — Amina, Alger",
        },
      };
    case "countdown":
      return { k, title: { ar: "ينتهي العرض بعد", fr: "L’offre se termine dans" }, hours: 48 };
    case "form":
      return {
        k,
        title: {
          ar: "اطلبي الآن · الدفع عند الاستلام",
          fr: "Commandez maintenant · paiement à la livraison",
        },
      };
  }
}

const TEMPLATES: [string, LandingBlock["k"][]][] = [
  ["كلاسيكي", ["hero", "features", "reviews", "form"]],
  ["عرض محدود", ["hero", "countdown", "features", "form"]],
  ["بسيط", ["hero", "form"]],
];

export function Landing() {
  const { data } = useAdmin();
  const [edit, setEdit] = useState<LandingPage | null>(null);
  if (edit) return <Editor initial={edit} onClose={() => setEdit(null)} />;
  const p0 = data.products[0];
  return (
    <>
      <div className="row" style={{ justifyContent: "space-between" }}>
        <div>
          <h1>صفحات الهبوط</h1>
          <p className="sub">
            صفحة لمنتج واحد للإعلانات، مع نموذج طلب بالدفع عند الاستلام. لا حاجة لأي كود.
          </p>
        </div>
      </div>
      <div className="card" style={{ marginBottom: 14 }}>
        <h2>صفحة جديدة من قالب</h2>
        <div className="row">
          {TEMPLATES.map(([n, ks]) => (
            <button
              key={n}
              className="btn"
              disabled={!p0}
              onClick={() =>
                setEdit({
                  id: "",
                  slug: "",
                  productId: p0.id,
                  blocks: ks.map((k) => newBlock(k, p0)),
                  published: false,
                  metaPixel: "",
                  tiktokPixel: "",
                  createdAt: "",
                  countdownEnds: "",
                })
              }
            >
              + {n} <small className="muted">({ks.map((k) => BLK[k]).join("، ")})</small>
            </button>
          ))}
        </div>
      </div>
      <div className="card">
        {data.landings.length === 0 ? (
          <div className="empty">لا توجد صفحات بعد. اختر قالباً للبدء.</div>
        ) : (
          <div className="tbl-wrap">
            <table>
              <thead>
                <tr>
                  <th>الصفحة</th>
                  <th>المنتج</th>
                  <th>الحالة</th>
                  <th>الطلبات</th>
                  <th>أُنشئت</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {data.landings.map((l) => {
                  const p = data.products.find((x) => x.id === l.productId);
                  const orders = data.orders.filter((o) => o.source === "landing:" + l.slug).length;
                  return (
                    <tr key={l.id} className="tr-click" onClick={() => setEdit(l)}>
                      <td className="ltr">/ar/p/{l.slug}</td>
                      <td>{p?.name.ar ?? "—"}</td>
                      <td>
                        {l.published ? (
                          <span className="pill s-done">منشورة</span>
                        ) : (
                          <span className="pill s-can">مسودة</span>
                        )}
                      </td>
                      <td>{num(orders)}</td>
                      <td>{dateFmt(l.createdAt)}</td>
                      <td>
                        <a
                          className="btn sm"
                          href={`/ar/p/${l.slug}`}
                          target="_blank"
                          rel="noopener"
                          onClick={(e) => e.stopPropagation()}
                        >
                          فتح
                        </a>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}

function Editor({ initial, onClose }: { initial: LandingPage; onClose: () => void }) {
  const { data, run, toast } = useAdmin();
  const [f, setF] = useState(initial);
  const [lang, setLang] = useState<"ar" | "fr">("ar");
  const p = data.products.find((x) => x.id === f.productId);
  const setB = (i: number, b: LandingBlock) =>
    setF((x) => ({ ...x, blocks: x.blocks.map((y, j) => (j === i ? b : y)) }));
  const mv = (i: number, d: number) =>
    setF((x) => {
      const b = [...x.blocks];
      const j = i + d;
      if (j < 0 || j >= b.length) return x;
      [b[i], b[j]] = [b[j], b[i]];
      return { ...x, blocks: b };
    });
  const missing = (Object.keys(BLK) as LandingBlock["k"][]).filter(
    (k) => !f.blocks.some((b) => b.k === k),
  );
  const url = typeof window !== "undefined" ? `${location.origin}/ar/p/${f.slug}` : "";

  async function save(published = f.published) {
    if (!f.slug.trim()) return toast("اكتب رابط الصفحة (حروف لاتينية).");
    if (!f.blocks.some((b) => b.k === "form"))
      return toast("أضف «نموذج الطلب» حتى يستطيع الزوار الطلب.");
    const ok = await run(
      saveLanding({ ...f, published }),
      published ? "تم نشر صفحة الهبوط" : "تم حفظ الصفحة",
    );
    if (ok) onClose();
  }

  const txt = (i: number, b: LandingBlock, key: "title" | "text" | "lines", area = false) => {
    const val = (b as Record<string, unknown>)[key] as { ar: string; fr: string };
    const El = area ? "textarea" : "input";
    return (
      <div className="f2">
        <div className="field" style={{ margin: 0 }}>
          <El
            value={val.ar}
            onChange={(e) =>
              setB(i, { ...b, [key]: { ...val, ar: e.target.value } } as LandingBlock)
            }
            aria-label={key + " ar"}
          />
        </div>
        <div className="field" style={{ margin: 0 }}>
          <El
            dir="ltr"
            value={val.fr}
            onChange={(e) =>
              setB(i, { ...b, [key]: { ...val, fr: e.target.value } } as LandingBlock)
            }
            aria-label={key + " fr"}
          />
        </div>
      </div>
    );
  };

  return (
    <>
      <div className="row" style={{ justifyContent: "space-between" }}>
        <div>
          <h1>{initial.id ? "تعديل صفحة الهبوط" : "صفحة هبوط جديدة"}</h1>
          <p className="sub">رتّب الكتل بالأسهم وشاهد النتيجة فوراً.</p>
        </div>
        <div className="row">
          {initial.id && (
            <button
              className="btn danger"
              onClick={async () =>
                confirm("حذف هذه الصفحة؟") &&
                (await run(deleteLanding(initial.id), "تم حذف الصفحة")) &&
                onClose()
              }
            >
              حذف
            </button>
          )}
          <button className="btn" onClick={onClose}>
            رجوع
          </button>
          <button className="btn" onClick={() => save(false)}>
            حفظ كمسودة
          </button>
          <button className="btn pri" onClick={() => save(true)}>
            نشر الصفحة
          </button>
        </div>
      </div>
      <div className="grid lp">
        <div className="card">
          <h2>الكتل</h2>
          {f.blocks.map((b, i) => (
            <div key={b.k}>
              <div className="blk">
                <span>{BLK[b.k]}</span>
                <button className="mini" onClick={() => mv(i, -1)} aria-label="أعلى">
                  ↑
                </button>
                <button className="mini" onClick={() => mv(i, 1)} aria-label="أسفل">
                  ↓
                </button>
                <button
                  className="mini"
                  onClick={() =>
                    setF((x) => ({ ...x, blocks: x.blocks.filter((_, j) => j !== i) }))
                  }
                  aria-label="حذف"
                >
                  ✕
                </button>
              </div>
              <div style={{ margin: "0 0 12px", display: "grid", gap: 6 }}>
                {txt(i, b, "title")}
                {b.k === "hero" && txt(i, b, "text")}
                {(b.k === "features" || b.k === "reviews") && txt(i, b, "lines", true)}
                {b.k === "countdown" && (
                  <div className="field" style={{ margin: 0 }}>
                    <label>المدة بالساعات</label>
                    <input
                      type="number"
                      min={1}
                      value={b.hours}
                      onChange={(e) => setB(i, { ...b, hours: Number(e.target.value) })}
                    />
                  </div>
                )}
              </div>
            </div>
          ))}
          <div className="grid" style={{ marginTop: 10, gap: 6 }}>
            {missing.length ? (
              missing.map((k) => (
                <button
                  key={k}
                  className="btn sm"
                  onClick={() => setF((x) => ({ ...x, blocks: [...x.blocks, newBlock(k, p)] }))}
                >
                  + {BLK[k]}
                </button>
              ))
            ) : (
              <small className="muted">كل الكتل مضافة.</small>
            )}
          </div>
        </div>
        <div className="card">
          <h2>الإعدادات</h2>
          <div className="field">
            <label>المنتج</label>
            <select
              value={f.productId}
              onChange={(e) => setF({ ...f, productId: Number(e.target.value) })}
            >
              {data.products.map((x) => (
                <option key={x.id} value={x.id}>
                  {x.name.ar}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label>رابط الصفحة (حروف لاتينية وأرقام)</label>
            <input
              type="text"
              dir="ltr"
              placeholder="serum-vitamine-c"
              value={f.slug}
              onChange={(e) =>
                setF({ ...f, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-") })
              }
            />
          </div>
          {f.slug && (
            <div className="row" style={{ marginBottom: 14 }}>
              <span className="code">{url}</span>
              <button
                className="btn sm"
                onClick={() =>
                  navigator.clipboard?.writeText(url).then(() => toast("تم نسخ الرابط"))
                }
              >
                نسخ الرابط
              </button>
            </div>
          )}
          <div className="field">
            <label>Meta Pixel ID (اختياري، يغلب على الإعداد العام)</label>
            <input
              type="text"
              placeholder="123456789012345"
              dir="ltr"
              value={f.metaPixel}
              onChange={(e) => setF({ ...f, metaPixel: e.target.value })}
            />
          </div>
          <div className="field">
            <label>TikTok Pixel ID</label>
            <input
              type="text"
              placeholder="C1A2B3..."
              dir="ltr"
              value={f.tiktokPixel}
              onChange={(e) => setF({ ...f, tiktokPixel: e.target.value })}
            />
          </div>
          <div className="lrow">
            <span>منشورة</span>
            <Switch
              on={f.published}
              label="منشورة"
              onChange={(v) => setF({ ...f, published: v })}
            />
          </div>
        </div>
        <div>
          <div className="chips" style={{ justifyContent: "center" }}>
            <button className="chip" aria-pressed={lang === "ar"} onClick={() => setLang("ar")}>
              العربية
            </button>
            <button className="chip" aria-pressed={lang === "fr"} onClick={() => setLang("fr")}>
              Français
            </button>
          </div>
          <div className="phone" dir={lang === "ar" ? "rtl" : "ltr"}>
            {f.blocks.map((b) => (
              <PhoneBlock key={b.k} b={b} p={p} lang={lang} />
            ))}
          </div>
        </div>
      </div>
    </>
  );
}

/** Preview blocks, as `phoneBlock()` in the prototype. */
function PhoneBlock({ b, p, lang }: { b: LandingBlock; p?: Product; lang: "ar" | "fr" }) {
  const v = p?.variants[0];
  if (b.k === "hero")
    return (
      <div className="hero">
        {p?.images[0] ? (
          <img src={p.images[0]} alt="" style={{ width: "100%", borderRadius: 10 }} />
        ) : (
          <div style={{ fontSize: 46 }}>{p?.emoji}</div>
        )}
        <b>{b.title[lang]}</b>
        <span>{b.text[lang]}</span>
        {v && (
          <div style={{ marginTop: 8, fontSize: 18, fontWeight: 700 }}>
            {groupThousands(v.price)} {lang === "ar" ? "دج" : "DA"}
          </div>
        )}
      </div>
    );
  if (b.k === "features" || b.k === "reviews")
    return (
      <div className="sec">
        <b>{b.title[lang]}</b>
        <div>
          {b.lines[lang]
            .split("\n")
            .filter(Boolean)
            .map((l, i) => (
              <div key={i}>
                {b.k === "features" ? "✓ " : "★★★★★ "}
                {l}
              </div>
            ))}
        </div>
      </div>
    );
  if (b.k === "countdown")
    return (
      <div className="sec" style={{ textAlign: "center" }}>
        <b>{b.title[lang]}</b>
        <div className="cd" style={{ marginTop: 6 }}>
          <div>
            <b>{String(b.hours).padStart(2, "0")}</b>
            <br />
            <small>{lang === "ar" ? "ساعة" : "h"}</small>
          </div>
          <div>
            <b>00</b>
            <br />
            <small>{lang === "ar" ? "دقيقة" : "min"}</small>
          </div>
          <div>
            <b>00</b>
            <br />
            <small>{lang === "ar" ? "ثانية" : "s"}</small>
          </div>
        </div>
      </div>
    );
  return (
    <div className="sec">
      <b>{b.title[lang]}</b>
      <div style={{ marginTop: 8 }}>
        {(lang === "ar"
          ? ["الاسم الكامل", "رقم الهاتف", "الولاية", "البلدية"]
          : ["Nom complet", "Téléphone", "Wilaya", "Commune"]
        ).map((x) => (
          <input key={x} placeholder={x} readOnly />
        ))}
        <button className="go">{lang === "ar" ? "تأكيد الطلب" : "Confirmer la commande"}</button>
      </div>
    </div>
  );
}
