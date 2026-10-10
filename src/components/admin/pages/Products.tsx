"use client";

import { useState } from "react";
import {
  deleteCategory,
  deleteProduct,
  saveCategory,
  saveProduct,
  setPublished,
  uploadImage,
} from "@/app/admin/actions";
import { SKIN_TYPES, type Product, type SkinType, type Variant } from "@/lib/types";
import { Dialog, Switch, fmt, num, resizeImage, useAdmin } from "../ui";

export const SKIN_AR: Record<SkinType, string> = {
  oily: "دهنية",
  dry: "جافة",
  combo: "مختلطة",
  normal: "عادية",
  sens: "حساسة",
};

const stockOf = (p: Product) => p.variants.reduce((s, v) => s + v.stock, 0);

export function Products() {
  const { data, arg, go, owner, run } = useAdmin();
  const [edit, setEdit] = useState<Product | "new" | null>(null);
  const [cats, setCats] = useState(false);
  const fromUrl = /^\d+$/.test(arg) ? data.products.find((p) => p.id === Number(arg)) : null;
  const current = edit ?? fromUrl ?? null;
  const low = data.settings.lowStock;

  return (
    <>
      <div className="row" style={{ justifyContent: "space-between" }}>
        <div>
          <h1>المنتجات</h1>
          <p className="sub">{num(data.products.length)} منتجات في المتجر.</p>
        </div>
        <div className="row">
          {owner && (
            <button className="btn" onClick={() => setCats(true)}>
              الأصناف
            </button>
          )}
          <button className="btn pri" onClick={() => setEdit("new")}>
            + إضافة منتج
          </button>
        </div>
      </div>
      <div className="grid prod-grid">
        {data.products.map((p) => {
          const q = stockOf(p);
          return (
            <div
              className="card"
              key={p.id}
              style={{ cursor: "pointer", opacity: p.published ? 1 : 0.6 }}
              onClick={() => setEdit(p)}
            >
              {p.images[0] ? (
                <img className="thumb ph" src={p.images[0]} alt="" />
              ) : (
                <div
                  className="thumb"
                  style={{
                    background: p.color,
                    height: 120,
                    display: "grid",
                    placeItems: "center",
                    fontSize: 34,
                    border: 0,
                  }}
                >
                  {p.emoji}
                </div>
              )}
              <b>{p.name.ar}</b>
              <div className="row" style={{ justifyContent: "space-between", marginTop: 4 }}>
                <span>{fmt(p.variants[0]?.price ?? 0)}</span>
                <span
                  className={"stock " + (q === 0 ? "down" : q <= low ? "" : "up")}
                  style={q > 0 && q <= low ? { color: "var(--warn)" } : undefined}
                >
                  {q === 0 ? "نفد" : q <= low ? <>آخر القطع ({num(q)})</> : <>متوفر ({num(q)})</>}
                </span>
              </div>
              <div
                className="row"
                style={{ justifyContent: "space-between", marginTop: 8 }}
                onClick={(e) => e.stopPropagation()}
              >
                <small className="muted">
                  {p.published ? "منشور" : "مخفي"} · بيع {num((data.sold[p.id] ?? 0) + p.soldBase)}
                </small>
                <Switch
                  on={p.published}
                  label={`نشر ${p.name.ar}`}
                  onChange={(v) =>
                    run(setPublished(p.id, v), v ? "تم نشر المنتج" : "تم إخفاء المنتج")
                  }
                />
              </div>
            </div>
          );
        })}
      </div>
      {current && (
        <ProductDialog
          p={current === "new" ? null : current}
          onClose={() => {
            setEdit(null);
            if (fromUrl) go("products");
          }}
        />
      )}
      {cats && <CategoriesDialog onClose={() => setCats(false)} />}
    </>
  );
}

function blank(cat: string): Product {
  return {
    id: 0,
    name: { ar: "", fr: "" },
    tagline: { ar: "", fr: "" },
    description: { ar: "", fr: "" },
    cat,
    skins: [],
    emoji: "🧴",
    color: "#e8efe9",
    images: [],
    variants: [{ id: "v1", label: { ar: "", fr: "" }, price: 0, oldPrice: null, stock: 0 }],
    rating: 5,
    soldBase: 0,
    published: true,
    createdAt: "",
  };
}

function ProductDialog({ p, onClose }: { p: Product | null; onClose: () => void }) {
  const { data, run, toast } = useAdmin();
  const [f, setF] = useState<Product>(() =>
    structuredClone(p ?? blank(data.categories[0]?.id ?? "")),
  );
  const [busy, setBusy] = useState(false);
  const set = <K extends keyof Product>(k: K, v: Product[K]) => setF((x) => ({ ...x, [k]: v }));
  const setL = (k: "name" | "tagline" | "description", l: "ar" | "fr", v: string) =>
    setF((x) => ({ ...x, [k]: { ...x[k], [l]: v } }));
  const setV = (i: number, patch: Partial<Variant>) =>
    setF((x) => ({ ...x, variants: x.variants.map((v, j) => (j === i ? { ...v, ...patch } : v)) }));

  async function upload(files: FileList | null) {
    if (!files?.length) return;
    setBusy(true);
    try {
      const urls: string[] = [];
      for (const file of [...files].slice(0, 8 - f.images.length)) {
        const fd = new FormData();
        fd.append("file", await resizeImage(file, 1200), "image.jpg");
        urls.push(await uploadImage(fd));
      }
      setF((x) => ({ ...x, images: [...x.images, ...urls] }));
    } catch {
      toast("تعذّر رفع الصورة. استعمل JPG أو PNG أقل من 3 ميغا.");
    } finally {
      setBusy(false);
    }
  }
  const moveImg = (i: number, d: number) =>
    setF((x) => {
      const imgs = [...x.images];
      const j = i + d;
      if (j < 0 || j >= imgs.length) return x;
      [imgs[i], imgs[j]] = [imgs[j], imgs[i]];
      return { ...x, images: imgs };
    });

  async function save() {
    if (!f.name.ar.trim() && !f.name.fr.trim()) return toast("اكتب اسم المنتج.");
    if (f.variants.some((v) => !v.price)) return toast("كل حجم يحتاج سعراً.");
    if (
      await run(saveProduct(p ? f : { ...f, id: undefined as unknown as number }), "تم حفظ المنتج")
    )
      onClose();
  }

  return (
    <Dialog
      title={p ? "تعديل المنتج" : "إضافة منتج"}
      onClose={onClose}
      wide
      footer={
        <>
          {p && (
            <button
              className="btn danger"
              style={{ marginInlineEnd: "auto" }}
              onClick={async () =>
                confirm("حذف هذا المنتج نهائياً؟ الطلبات القديمة تبقى كما هي.") &&
                (await run(deleteProduct(p.id), "تم حذف المنتج")) &&
                onClose()
              }
            >
              حذف
            </button>
          )}
          <button className="btn" onClick={onClose}>
            إلغاء
          </button>
          <button className="btn pri" onClick={save} disabled={busy}>
            حفظ المنتج
          </button>
        </>
      }
    >
      <div className="f2">
        <div className="field">
          <label>الاسم (عربي)</label>
          <input value={f.name.ar} onChange={(e) => setL("name", "ar", e.target.value)} />
        </div>
        <div className="field">
          <label>Nom (français)</label>
          <input dir="ltr" value={f.name.fr} onChange={(e) => setL("name", "fr", e.target.value)} />
        </div>
        <div className="field">
          <label>وصف قصير (عربي)</label>
          <input value={f.tagline.ar} onChange={(e) => setL("tagline", "ar", e.target.value)} />
        </div>
        <div className="field">
          <label>Accroche (français)</label>
          <input
            dir="ltr"
            value={f.tagline.fr}
            onChange={(e) => setL("tagline", "fr", e.target.value)}
          />
        </div>
        <div className="field">
          <label>الوصف الكامل (عربي)</label>
          <textarea
            value={f.description.ar}
            onChange={(e) => setL("description", "ar", e.target.value)}
          />
        </div>
        <div className="field">
          <label>Description (français)</label>
          <textarea
            dir="ltr"
            value={f.description.fr}
            onChange={(e) => setL("description", "fr", e.target.value)}
          />
        </div>
      </div>

      <div className="card">
        <h2>الأحجام والأسعار والمخزون</h2>
        <div className="vrow muted" style={{ fontSize: 12.5 }}>
          <span>الحجم (عربي)</span>
          <span>Format (FR)</span>
          <span>السعر (دج)</span>
          <span>السعر القديم</span>
          <span>المخزون</span>
          <span />
        </div>
        {f.variants.map((v, i) => (
          <div className="vrow" key={i}>
            <input
              value={v.label.ar}
              placeholder="30 مل"
              onChange={(e) => setV(i, { label: { ...v.label, ar: e.target.value } })}
              aria-label="الحجم بالعربية"
            />
            <input
              dir="ltr"
              value={v.label.fr}
              placeholder="30 ml"
              onChange={(e) => setV(i, { label: { ...v.label, fr: e.target.value } })}
              aria-label="Format"
            />
            <input
              type="number"
              min={0}
              value={v.price || ""}
              onChange={(e) => setV(i, { price: Number(e.target.value) })}
              aria-label="السعر"
            />
            <input
              type="number"
              min={0}
              value={v.oldPrice ?? ""}
              onChange={(e) =>
                setV(i, { oldPrice: e.target.value ? Number(e.target.value) : null })
              }
              aria-label="السعر القديم"
            />
            <input
              type="number"
              min={0}
              value={v.stock}
              onChange={(e) => setV(i, { stock: Number(e.target.value) })}
              aria-label="المخزون"
            />
            <button
              className="mini"
              disabled={f.variants.length === 1}
              onClick={() =>
                set(
                  "variants",
                  f.variants.filter((_, j) => j !== i),
                )
              }
              aria-label="حذف الحجم"
            >
              ✕
            </button>
          </div>
        ))}
        <button
          className="btn sm"
          onClick={() =>
            set("variants", [
              ...f.variants,
              {
                id: "v" + Date.now().toString(36),
                label: { ar: "", fr: "" },
                price: f.variants[0]?.price ?? 0,
                oldPrice: null,
                stock: 0,
              },
            ])
          }
        >
          + حجم آخر
        </button>
        <p className="small muted">السعر القديم اختياري: يظهر مشطوباً مع شارة الخصم.</p>
      </div>

      <div className="card">
        <h2>الصور</h2>
        <div className="imgs">
          {f.images.map((src, i) => (
            <figure key={src}>
              <img src={src} alt="" />
              <button
                className="mini"
                onClick={() =>
                  set(
                    "images",
                    f.images.filter((x) => x !== src),
                  )
                }
                aria-label="حذف الصورة"
              >
                ✕
              </button>
              <span className="mv">
                <button className="mini" onClick={() => moveImg(i, -1)} aria-label="قبل">
                  →
                </button>
                <button className="mini" onClick={() => moveImg(i, 1)} aria-label="بعد">
                  ←
                </button>
              </span>
            </figure>
          ))}
        </div>
        <div className="field" style={{ marginTop: 10, marginBottom: 0 }}>
          <label>
            {busy ? "جارٍ الرفع…" : "أضف صوراً (تُضغط تلقائياً). الصورة الأولى هي الرئيسية."}
          </label>
          <input
            type="file"
            accept="image/*"
            multiple
            disabled={busy || f.images.length >= 8}
            onChange={(e) => {
              upload(e.target.files);
              e.target.value = "";
            }}
          />
        </div>
        <div className="f2" style={{ marginTop: 10 }}>
          <div className="field">
            <label>رمز بديل عند غياب الصورة</label>
            <input value={f.emoji} onChange={(e) => set("emoji", e.target.value)} />
          </div>
          <div className="field">
            <label>لون الخلفية</label>
            <input type="color" value={f.color} onChange={(e) => set("color", e.target.value)} />
          </div>
        </div>
      </div>

      <div className="f3">
        <div className="field">
          <label>الصنف</label>
          <select value={f.cat} onChange={(e) => set("cat", e.target.value)}>
            {data.categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name.ar}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label>التقييم (من 5)</label>
          <input
            type="number"
            min={0}
            max={5}
            step={0.1}
            value={f.rating}
            onChange={(e) => set("rating", Number(e.target.value))}
          />
        </div>
        <div className="field">
          <label>الحالة</label>
          <div className="lrow">
            <span>{f.published ? "منشور في المتجر" : "مخفي"}</span>
            <Switch on={f.published} label="منشور" onChange={(v) => set("published", v)} />
          </div>
        </div>
      </div>
      <div className="field">
        <label>مناسب لبشرة</label>
        <div className="checks">
          {SKIN_TYPES.map((s) => (
            <label key={s}>
              <input
                type="checkbox"
                checked={f.skins.includes(s)}
                onChange={(e) =>
                  set("skins", e.target.checked ? [...f.skins, s] : f.skins.filter((x) => x !== s))
                }
              />
              {SKIN_AR[s]}
            </label>
          ))}
        </div>
      </div>
    </Dialog>
  );
}

function CategoriesDialog({ onClose }: { onClose: () => void }) {
  const { data, run } = useAdmin();
  const [n, setN] = useState({ id: "", ar: "", fr: "" });
  return (
    <Dialog title="أصناف المنتجات" onClose={onClose}>
      {data.categories.map((c) => (
        <div className="blk" key={c.id}>
          <span>
            {c.name.ar}{" "}
            <small className="muted">
              · {c.name.fr} · <span className="ltr">{c.id}</span>
            </small>
          </span>
          <button
            className="mini"
            aria-label="حذف"
            onClick={() => run(deleteCategory(c.id), "تم حذف الصنف")}
            disabled={data.products.some((p) => p.cat === c.id)}
            title="لا يمكن حذف صنف يحتوي منتجات"
          >
            ✕
          </button>
        </div>
      ))}
      <div className="card">
        <h2>صنف جديد</h2>
        <div className="f3">
          <div className="field">
            <label>الاسم (عربي)</label>
            <input value={n.ar} onChange={(e) => setN({ ...n, ar: e.target.value })} />
          </div>
          <div className="field">
            <label>Nom (FR)</label>
            <input dir="ltr" value={n.fr} onChange={(e) => setN({ ...n, fr: e.target.value })} />
          </div>
          <div className="field">
            <label>المعرّف (حروف لاتينية)</label>
            <input
              dir="ltr"
              value={n.id}
              placeholder="sun"
              onChange={(e) => setN({ ...n, id: e.target.value })}
            />
          </div>
        </div>
        <button
          className="btn pri"
          onClick={async () =>
            (await run(saveCategory(n.id, { ar: n.ar, fr: n.fr }), "تمت إضافة الصنف")) &&
            setN({ id: "", ar: "", fr: "" })
          }
        >
          إضافة
        </button>
      </div>
    </Dialog>
  );
}
