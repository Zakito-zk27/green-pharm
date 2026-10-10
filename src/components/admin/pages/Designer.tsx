"use client";

// Store Designer, ported from reference/admin-dashboard.html: General / Sections / Texts tabs,
// a live preview of the real storefront in an iframe (click any text or section to edit it),
// draft saved automatically, "Publish" makes it live.

import { useCallback, useEffect, useRef, useState } from "react";
import {
  publishConfig,
  resetDraft,
  restoreVersion,
  saveDraft,
  uploadImage,
} from "@/app/admin/actions";
import type { StoreConfig } from "@/lib/types";
import ar from "../../../../messages/ar.json";
import fr from "../../../../messages/fr.json";
import { Switch, dateFmt, resizeImage, timeFmt, useAdmin } from "../ui";

const TXD = { ar: ar.store as Record<string, string>, fr: fr.store as Record<string, string> };

const SECN: Record<string, string> = {
  hero: "الواجهة الرئيسية",
  trust: "مزايا الثقة",
  best: "الأكثر مبيعاً (شريط متحرك)",
  shop: "المنتجات",
  how: "كيف أطلب؟",
  reviews: "آراء الزبونات",
};
const TXG: [string, string[]][] = [
  ["الشريط العلوي والتنقل", ["ann", "nav_shop", "nav_how", "nav_rev", "langBtn"]],
  ["الواجهة الرئيسية", ["heroT", "heroS", "cta"]],
  ["مزايا الثقة", ["t1a", "t1b", "t2a", "t2b", "t3a", "t3b", "t4a", "t4b"]],
  ["الأكثر مبيعاً", ["bestT", "bestTag", "sold"]],
  [
    "المنتجات والفلاتر",
    [
      "shopT",
      "skinL",
      "c_all",
      "c_serum",
      "c_moist",
      "c_clean",
      "c_mask",
      "c_set",
      "s_all",
      "s_oily",
      "s_dry",
      "s_combo",
      "s_normal",
      "s_sens",
      "tag_out",
      "tag_low",
      "emptyG",
    ],
  ],
  ["كيف أطلب؟", ["h1t", "h1p", "h2t", "h2p", "h3t", "h3p"]],
  ["آراء الزبونات", ["revT", "r1", "r1n", "r2", "r2n", "r3", "r3n"]],
  ["التذييل", ["fContact", "fReturn"]],
  [
    "صفحة المنتج",
    ["size", "qty", "addCart", "orderNow", "inStock", "outStock", "left", "suits", "added"],
  ],
  [
    "السلة والطلب",
    [
      "cart",
      "checkout",
      "emptyC",
      "cont",
      "viewCart",
      "remain",
      "gotFree",
      "details",
      "fName",
      "fPhone",
      "fWil",
      "fCom",
      "fAddr",
      "choose",
      "eName",
      "ePhone",
      "eWil",
      "eCom",
      "eAddr",
      "home",
      "relay",
      "pickWil",
      "cheaper",
      "codT",
      "codD",
      "sProd",
      "sShip",
      "sTot",
      "free",
      "shipWait",
      "confirm",
      "callNote",
    ],
  ],
  ["شاشة تأكيد الطلب", ["doneT", "thanks", "orderNo", "callYou", "deliverTo", "dueCod"]],
];

type Path = string;
const getPath = (o: unknown, p: Path): unknown =>
  p.split(".").reduce<unknown>((a, k) => (a == null ? a : (a as Record<string, unknown>)[k]), o);
function setPath<T>(o: T, p: Path, v: unknown): T {
  const c = structuredClone(o);
  const ks = p.split(".");
  const last = ks.pop()!;
  (ks.reduce<unknown>((a, k) => (a as Record<string, unknown>)[k], c) as Record<string, unknown>)[
    last
  ] = v;
  return c;
}

export function Designer() {
  const { data, run, toast } = useAdmin();
  const [DS, setDS] = useState<StoreConfig>(data.config.draft);
  const [pLang, setPLang] = useState<"ar" | "fr">("ar");
  const [pDev, setPDev] = useState<"mobile" | "desktop">("mobile");
  const [tab, setTab] = useState<"general" | "sections" | "texts">("general");
  const [selSec, setSelSec] = useState("hero");
  const [editOn, setEditOn] = useState(true);
  const [pView, setPView] = useState("page");
  const [dirty, setDirty] = useState(false);
  const [search, setSearch] = useState("");
  const [openGroup, setOpenGroup] = useState<string | null>(null);
  const [frameEl, setFrameEl] = useState<HTMLIFrameElement | null>(null);
  const wrap = useRef<HTMLDivElement>(null);
  const focusKey = useRef<string | null>(null);

  const send = useCallback(
    (m: unknown) => frameEl?.contentWindow?.postMessage(m, location.origin),
    [frameEl],
  );
  const update = (next: StoreConfig) => {
    setDS(next);
    setDirty(true);
  };
  const set = (p: Path, v: unknown) => update(setPath(DS, p, v));

  // Live preview + automatic draft save.
  useEffect(() => {
    send({ t: "cfg", cfg: DS });
    if (!dirty) return;
    const id = setTimeout(() => {
      saveDraft(DS).catch(() => toast("تعذّر حفظ المسودة"));
    }, 1200);
    return () => clearTimeout(id);
  }, [DS, dirty, send, toast]);

  // Messages from the preview.
  useEffect(() => {
    const onMsg = (e: MessageEvent) => {
      if (!frameEl || e.source !== frameEl.contentWindow || e.origin !== location.origin) return;
      const m = e.data || {};
      if (m.t === "ready") {
        send({ t: "cfg", cfg: DS });
        send({ t: "lang", lang: pLang });
        send({ t: "edit", on: editOn });
        if (pView !== "page") send({ t: "view", what: pView });
      } else if (m.t === "pick") {
        if (m.kind === "text") {
          setTab("texts");
          const g = TXG.find((x) => x[1].includes(m.key))?.[0] ?? "أخرى";
          setOpenGroup(g);
          focusKey.current = m.key;
        } else if (m.kind === "sec") {
          setTab("sections");
          setSelSec(m.key);
        } else {
          setTab("general");
          focusKey.current = "dsName";
        }
      } else if (m.t === "lang") setPLang(m.lang);
    };
    window.addEventListener("message", onMsg);
    return () => window.removeEventListener("message", onMsg);
  });

  useEffect(() => {
    if (!focusKey.current) return;
    const k = focusKey.current;
    focusKey.current = null;
    const el = document.getElementById(
      k === "dsName" ? "dsName" : `tx-${k}-${pLang}`,
    ) as HTMLInputElement | null;
    el?.scrollIntoView({ block: "center" });
    el?.focus();
  });

  // Scale the preview to the available width.
  const W = pDev === "mobile" ? 390 : 1200;
  const H = 780;
  const [scale, setScale] = useState(1);
  const fit = useCallback(() => {
    const w = wrap.current;
    if (w) setScale(Math.min(1, (w.clientWidth || W) / W));
  }, [W]);
  useEffect(() => {
    fit();
    window.addEventListener("resize", fit);
    return () => window.removeEventListener("resize", fit);
  }, [fit]);

  async function img(path: Path, file: File | undefined, logo = false) {
    if (!file) return;
    try {
      const fd = new FormData();
      fd.append(
        "file",
        await resizeImage(file, logo ? 320 : 1100, logo ? "image/png" : "image/jpeg"),
        logo ? "logo.png" : "image.jpg",
      );
      set(path, await uploadImage(fd));
    } catch {
      toast("تعذّر قراءة الصورة");
    }
  }

  /* ----- field builders (same as the prototype) ----- */
  const fld = (path: Path, label: string, type = "text", extra: Record<string, unknown> = {}) => (
    <div className="field">
      <label>{label}</label>
      <input
        type={type}
        value={String(getPath(DS, path) ?? "")}
        onChange={(e) => set(path, e.target.value)}
        {...extra}
      />
    </div>
  );
  const selb = (path: Path, label: string, opts: [string | number, string][], num = false) => (
    <div className="field">
      <label>{label}</label>
      <select
        value={String(getPath(DS, path))}
        onChange={(e) => set(path, num ? Number(e.target.value) : e.target.value)}
      >
        {opts.map(([v, l]) => (
          <option key={v} value={v}>
            {l}
          </option>
        ))}
      </select>
    </div>
  );
  const tog = (path: Path, label: string) => (
    <div className="lrow">
      <span>{label}</span>
      <Switch
        on={!!getPath(DS, path)}
        label={label}
        onChange={(v) => {
          if (path === "langs.ar" || path === "langs.fr") {
            const other = path === "langs.ar" ? "fr" : "ar";
            if (!v && !DS.langs[other]) return toast("يجب إبقاء لغة واحدة على الأقل");
            let next = setPath(DS, path, v);
            if (!next.langs[next.defLang]) next = { ...next, defLang: next.langs.ar ? "ar" : "fr" };
            update(next);
            if (!next.langs[pLang]) {
              const l = next.langs.ar ? "ar" : "fr";
              setPLang(l);
              send({ t: "lang", lang: l });
            }
            return;
          }
          set(path, v);
        }}
      />
    </div>
  );
  const imgf = (path: Path, label: string, logo = false) => {
    const v = getPath(DS, path) as string;
    return (
      <div className="field">
        <label>{label}</label>
        {v && (
          <>
            <img className="thumb" src={v} alt="" />
            <div className="row" style={{ marginBottom: 6 }}>
              <button className="btn sm" onClick={() => set(path, "")}>
                إزالة الصورة
              </button>
            </div>
          </>
        )}
        <input
          type="file"
          accept="image/*"
          onChange={(e) => {
            img(path, e.target.files?.[0], logo);
            e.target.value = "";
          }}
        />
      </div>
    );
  };
  const dcard = (t: string, body: React.ReactNode) => (
    <div className="card">
      <h2>{t}</h2>
      {body}
    </div>
  );

  const secName = (k: string) => {
    if (k.startsWith("c:")) {
      const c = DS.custom.find((x) => "c:" + x.id === k);
      return "بانر: " + (c?.title.ar || "بدون عنوان");
    }
    return SECN[k] ?? k;
  };

  function genPanel() {
    const sw = ["#2f5d46", "#b8325a", "#7a4ea8", "#c2563a", "#2f7d6a", "#2c5d9a", "#a8802a"];
    return (
      <>
        {dcard(
          "اللغات",
          <>
            {tog("langs.ar", "العربية (من اليمين لليسار)")}
            {tog("langs.fr", "Français (de gauche à droite)")}
            {selb("defLang", "اللغة الافتراضية للزائر الجديد", [
              ["ar", "العربية"],
              ["fr", "Français"],
            ])}
            <p className="sub small">
              عند تفعيل اللغتين يظهر زر تبديل اللغة في المتجر ويتذكّر اختيار الزائر.
            </p>
          </>,
        )}
        {dcard(
          "الهوية والألوان",
          <>
            {fld("name", "اسم المتجر", "text", { id: "dsName" })}
            {imgf("logo", "الشعار (يُفضّل PNG بخلفية شفافة)", true)}
            {fld("color", "اللون الرئيسي", "color")}
            <div className="swatches" style={{ marginBottom: 14 }}>
              {sw.map((c) => (
                <button
                  key={c}
                  className="sw"
                  style={{ background: c }}
                  aria-label={c}
                  onClick={() => set("color", c)}
                />
              ))}
            </div>
            {selb("bg", "خلفية المتجر", [
              ["cream", "كريمية"],
              ["blush", "وردية ناعمة"],
              ["white", "بيضاء"],
              ["dark", "داكنة"],
            ])}
            {selb("font", "الخط", [
              ["IBM Plex Sans Arabic", "IBM Plex Sans Arabic"],
              ["Cairo", "Cairo"],
              ["Tajawal", "Tajawal"],
            ])}
            {selb(
              "radius",
              "استدارة الزوايا",
              [
                [6, "حادة"],
                [16, "متوسطة"],
                [26, "ناعمة جداً"],
              ],
              true,
            )}
          </>,
        )}
        {dcard(
          "الرأس والتواصل",
          <>
            {tog("sticky", "تثبيت الرأس عند التمرير")}
            {tog("ann", "الشريط الإعلاني العلوي")}
            {fld("annBg", "لون الشريط الإعلاني", "color")}
            {tog("wa.on", "زر واتساب العائم")}
            {fld("wa.number", "رقم واتساب", "text", { dir: "ltr", placeholder: "0550123456" })}
          </>,
        )}
        {dcard(
          "التذييل وروابط التواصل",
          <>
            {fld("social.phone", "رقم خدمة العملاء", "text", { dir: "ltr" })}
            {fld("social.instagram", "رابط إنستغرام", "text", {
              dir: "ltr",
              placeholder: "https://instagram.com/...",
            })}
            {fld("social.facebook", "رابط فيسبوك", "text", {
              dir: "ltr",
              placeholder: "https://facebook.com/...",
            })}
            {fld("social.tiktok", "رابط تيك توك", "text", {
              dir: "ltr",
              placeholder: "https://tiktok.com/@...",
            })}
          </>,
        )}
        {dcard(
          "النسخ السابقة",
          data.config.history.length ? (
            <div className="grid" style={{ gap: 6 }}>
              {data.config.history.map((at, i) => (
                <div className="lrow" key={at}>
                  <span>
                    منشورة حتى {dateFmt(at)} {timeFmt(at)}
                  </span>
                  <button
                    className="btn sm"
                    onClick={async () => {
                      if (
                        await run(restoreVersion(i), "تمت استعادة النسخة كمسودة. راجعها ثم انشر.")
                      )
                        location.reload();
                    }}
                  >
                    استعادة
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className="sub small" style={{ margin: 0 }}>
              تظهر هنا آخر 10 نسخ منشورة.
            </p>
          ),
        )}
      </>
    );
  }

  function secEditor(i: number) {
    const s = DS.sections[i];
    const k = s.k;
    const b = `sections.${i}.`;
    let extra: React.ReactNode = (
      <p className="sub small">لتعديل نصوص هذا القسم اضغط عليها في المعاينة.</p>
    );
    if (k === "hero")
      extra = (
        <>
          {selb("hero.layout", "تخطيط الواجهة", [
            ["split", "نص وصورة جنباً إلى جنب"],
            ["center", "نص في الوسط"],
          ])}
          {imgf("hero.image", "صورة الواجهة الرئيسية")}
          {tog("hero.art", "إظهار الرسم الافتراضي (إن لم تُرفع صورة)")}
        </>
      );
    else if (k === "best")
      extra = (
        <>
          {tog("best.auto", "تحريك تلقائي")}
          {selb(
            "best.interval",
            "سرعة التحريك",
            [
              [2000, "سريع"],
              [3200, "متوسط"],
              [5000, "بطيء"],
            ],
            true,
          )}
          {selb(
            "best.count",
            "عدد المنتجات",
            [
              [3, "3"],
              [4, "4"],
              [6, "6"],
              [8, "8"],
            ],
            true,
          )}
        </>
      );
    else if (k === "shop")
      extra = (
        <>
          {selb(
            "cols",
            "المنتجات في الصف (حاسوب)",
            [
              [2, "2"],
              [3, "3"],
              [4, "4"],
            ],
            true,
          )}
          {selb("card.ratio", "شكل صورة المنتج", [
            ["1/1", "مربع"],
            ["4/5", "طولي"],
          ])}
          {tog("card.rating", "إظهار التقييم")}
          {tog("card.old", "إظهار السعر القديم")}
          {tog("card.badges", "إظهار شارات الخصم")}
        </>
      );
    else if (k.startsWith("c:")) {
      const ci = DS.custom.findIndex((c) => "c:" + c.id === k);
      if (ci >= 0) {
        const c = `custom.${ci}.`;
        extra = (
          <>
            {fld(c + "title.ar", "العنوان (عربي)")}
            {fld(c + "title.fr", "Titre (français)", "text", { dir: "ltr" })}
            {fld(c + "text.ar", "النص (عربي)")}
            {fld(c + "text.fr", "Texte (français)", "text", { dir: "ltr" })}
            {fld(c + "btn.ar", "نص الزر (عربي)")}
            {fld(c + "btn.fr", "Bouton (français)", "text", { dir: "ltr" })}
            {fld(c + "link", "رابط الزر (#shop أو https://…)", "text", { dir: "ltr" })}
            {imgf(c + "image", "صورة البانر")}
          </>
        );
      }
    }
    return dcard(
      "إعدادات: " + secName(k),
      <>
        {selb(b + "bg", "خلفية القسم", [
          ["none", "بدون"],
          ["soft", "ناعمة بلون البراند"],
          ["brand", "لون البراند"],
          ["dark", "داكنة"],
        ])}
        {selb(b + "pad", "المسافة الداخلية", [
          ["none", "بدون"],
          ["sm", "صغيرة"],
          ["md", "متوسطة"],
          ["lg", "كبيرة"],
        ])}
        {selb(b + "align", "محاذاة النص", [
          ["start", "حسب اللغة"],
          ["center", "وسط"],
        ])}
        {extra}
      </>,
    );
  }

  function secPanel() {
    const mv = (i: number, d: number) => {
      const j = i + d;
      if (j < 0 || j >= DS.sections.length) return;
      const s = [...DS.sections];
      [s[i], s[j]] = [s[j], s[i]];
      update({ ...DS, sections: s });
    };
    const idx = DS.sections.findIndex((s) => s.k === selSec);
    return (
      <>
        {dcard(
          "أقسام الصفحة",
          <>
            {DS.sections.map((s, i) => (
              <div
                key={s.k}
                className={"blk srow" + (s.k === selSec ? " on" : "")}
                onClick={(e) => {
                  if ((e.target as Element).closest("button")) return;
                  setSelSec(s.k);
                  send({ t: "sel", kind: "sec", key: s.k });
                }}
              >
                <span>{secName(s.k)}</span>
                <button className="mini" onClick={() => mv(i, -1)} aria-label="أعلى">
                  ↑
                </button>
                <button className="mini" onClick={() => mv(i, 1)} aria-label="أسفل">
                  ↓
                </button>
                {s.k.startsWith("c:") && (
                  <button
                    className="mini"
                    aria-label="حذف"
                    onClick={() => {
                      update({
                        ...DS,
                        custom: DS.custom.filter((c) => "c:" + c.id !== s.k),
                        sections: DS.sections.filter((_, j) => j !== i),
                      });
                      if (selSec === s.k) setSelSec("hero");
                    }}
                  >
                    🗑
                  </button>
                )}
                <Switch
                  on={s.on}
                  label="إظهار القسم"
                  onChange={(v) => set(`sections.${i}.on`, v)}
                />
              </div>
            ))}
            <div className="row" style={{ marginTop: 8 }}>
              <button
                className="btn sm"
                onClick={() => {
                  const id = "b" + Date.now().toString(36);
                  const sections = [...DS.sections];
                  sections.splice(1, 0, {
                    k: `c:${id}`,
                    on: true,
                    bg: "brand",
                    pad: "md",
                    align: "center",
                  });
                  update({
                    ...DS,
                    custom: [
                      ...DS.custom,
                      {
                        id,
                        image: "",
                        link: "#shop",
                        title: { ar: "عرض خاص هذا الأسبوع", fr: "Offre spéciale de la semaine" },
                        text: {
                          ar: "خصم على منتجات مختارة لفترة محدودة.",
                          fr: "Remise sur une sélection de produits, durée limitée.",
                        },
                        btn: { ar: "استفيدي من العرض", fr: "Profiter de l’offre" },
                      },
                    ],
                    sections,
                  });
                  setSelSec("c:" + id);
                  setTimeout(() => send({ t: "sel", kind: "sec", key: "c:" + id }), 300);
                }}
              >
                + بانر ترويجي
              </button>
            </div>
          </>,
        )}
        {idx >= 0 && secEditor(idx)}
      </>
    );
  }

  function textsPanel() {
    const used = new Set(TXG.flatMap((g) => g[1]));
    const left = Object.keys(TXD.ar).filter((k) => !used.has(k));
    const groups: [string, string[]][] = [
      ...TXG.map(([t, ks]) => [t, ks.filter((k) => k in TXD.ar)] as [string, string[]]),
      ["أخرى", left],
    ];
    const q = search.trim().toLowerCase();
    const setText = (k: string, l: "ar" | "fr", v: string) => {
      const texts = { ...DS.texts };
      const o = { ar: texts[k]?.ar ?? "", fr: texts[k]?.fr ?? "", [l]: v };
      if (!o.ar && !o.fr) delete texts[k];
      else texts[k] = o;
      update({ ...DS, texts });
    };
    return (
      <>
        {dcard(
          "كل نصوص المتجر",
          <>
            <div className="field" style={{ margin: 0 }}>
              <label>بحث</label>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="مثال: الدفع، السلة، Livraison"
              />
            </div>
            <p className="sub small">
              اترك الحقل فارغاً لاستخدام النص الافتراضي (يظهر باهتاً). الحقل الأول بالعربية والثاني
              بالفرنسية.
            </p>
          </>,
        )}
        {groups.map(([t, keys]) => {
          const rows = keys.filter(
            (k) => !q || (k + " " + TXD.ar[k] + " " + TXD.fr[k]).toLowerCase().includes(q),
          );
          if (!rows.length) return null;
          return (
            <details
              key={t}
              className="card tg"
              open={!!q || openGroup === t}
              onToggle={(e) =>
                e.currentTarget.open ? setOpenGroup(t) : openGroup === t && setOpenGroup(null)
              }
            >
              <summary>
                {t} <small className="muted">({rows.length})</small>
              </summary>
              {rows.map((k) => (
                <div className="trow" key={k}>
                  <div className="tl">
                    {TXD.ar[k].slice(0, 44)}{" "}
                    {/\{0\}/.test(TXD.ar[k]) && (
                      <small className="muted">({"{0}"} = قيمة تلقائية)</small>
                    )}
                  </div>
                  <input
                    type="text"
                    id={`tx-${k}-ar`}
                    value={DS.texts[k]?.ar ?? ""}
                    placeholder={TXD.ar[k]}
                    onChange={(e) => setText(k, "ar", e.target.value)}
                  />
                  <input
                    type="text"
                    id={`tx-${k}-fr`}
                    dir="ltr"
                    value={DS.texts[k]?.fr ?? ""}
                    placeholder={TXD.fr[k]}
                    onChange={(e) => setText(k, "fr", e.target.value)}
                  />
                </div>
              ))}
            </details>
          );
        })}
      </>
    );
  }

  const chip = (on: boolean, label: string, onClick: () => void, hidden = false) =>
    hidden ? null : (
      <button key={label} className="chip" aria-pressed={on} onClick={onClick}>
        {label}
      </button>
    );

  return (
    <>
      <div className="row" style={{ justifyContent: "space-between" }}>
        <div>
          <h1>تصميم المتجر</h1>
          <p className="sub">
            اضغط على أي عنصر في المعاينة لتعديله، أو استخدم الأدوات على الجانب. التعديلات تُحفظ
            كمسودة، ولا يراها الزوار إلا بعد «نشر التصميم».
          </p>
        </div>
        <div className="row">
          <button
            className="btn"
            onClick={async () => {
              if (
                confirm("استعادة التصميم الافتراضي في المسودة؟") &&
                (await run(resetDraft(), "تمت استعادة التصميم الافتراضي"))
              )
                location.reload();
            }}
          >
            استعادة الافتراضي
          </button>
          <button
            className="btn pri"
            onClick={async () => {
              if (await run(publishConfig(DS), "تم نشر التصميم. ستظهر التغييرات للزوار فوراً."))
                setDirty(false);
            }}
          >
            نشر التصميم
          </button>
        </div>
      </div>
      <div className="ds">
        <div className="dscol">
          <div className="segc tabs">
            {(
              [
                ["general", "عام"],
                ["sections", "الأقسام"],
                ["texts", "النصوص"],
              ] as const
            ).map(([k, l]) => chip(tab === k, l, () => setTab(k)))}
          </div>
          <div className="dspanel">
            {tab === "general" ? genPanel() : tab === "sections" ? secPanel() : textsPanel()}
          </div>
        </div>
        <div>
          <div className="pv-bar">
            <div className="segc">
              {chip(pDev === "mobile", "جوال", () => setPDev("mobile"))}
              {chip(pDev === "desktop", "حاسوب", () => setPDev("desktop"))}
            </div>
            <div className="segc">
              {chip(
                pLang === "ar",
                "العربية",
                () => {
                  setPLang("ar");
                  send({ t: "lang", lang: "ar" });
                },
                !DS.langs.ar,
              )}
              {chip(
                pLang === "fr",
                "Français",
                () => {
                  setPLang("fr");
                  send({ t: "lang", lang: "fr" });
                },
                !DS.langs.fr,
              )}
            </div>
            <div className="lrow" style={{ gap: 8, padding: 0 }}>
              <span>تعديل مباشر</span>
              <Switch
                on={editOn}
                label="تعديل مباشر"
                onChange={(v) => {
                  setEditOn(v);
                  send({ t: "edit", on: v });
                }}
              />
            </div>
          </div>
          <div className="pv-bar">
            <span className="muted" style={{ fontSize: 13 }}>
              عرض:
            </span>
            <div className="segc">
              {(
                [
                  ["page", "الصفحة"],
                  ["product", "صفحة المنتج"],
                  ["cart", "السلة والطلب"],
                  ["success", "تأكيد الطلب"],
                ] as const
              ).map(([k, l]) =>
                chip(pView === k, l, () => {
                  setPView(k);
                  send({ t: "view", what: k });
                }),
              )}
            </div>
          </div>
          <div className="fw" ref={wrap} style={{ height: H * scale }}>
            <iframe
              id="sfFrame"
              ref={setFrameEl}
              title="معاينة المتجر"
              src="/ar"
              style={{
                width: W,
                height: H,
                transform: `scale(${scale})`,
                transformOrigin: "top center",
              }}
            />
          </div>
        </div>
      </div>
    </>
  );
}
