"use client";

import { useState } from "react";
import { deleteOffer, saveOffer } from "@/app/admin/actions";
import { ltr } from "@/lib/format";
import { isOfferActive } from "@/lib/pricing";
import type { Offer, OfferType } from "@/lib/types";
import { Dialog, Switch, dateFmt, fmt, useAdmin } from "../ui";

const TYPES: Record<OfferType, string> = {
  percent: "نسبة خصم (%)",
  amount: "مبلغ خصم (دج)",
  freeship: "شحن مجاني",
  b2g1: "اشترِ 2 والثالث مجاناً",
};

export function Offers() {
  const { data, run } = useAdmin();
  const [edit, setEdit] = useState<Offer | null>(null);
  const now = new Date(data.now);
  const used = (o: Offer) =>
    data.orders.filter((x) => x.status !== "cancelled" && x.offers.includes(o.name)).length;
  return (
    <>
      <div className="row" style={{ justifyContent: "space-between" }}>
        <div>
          <h1>العروض والتخفيضات</h1>
          <p className="sub">
            فعّل أو أوقف أي عرض بنقرة واحدة. العروض بدون كود تُطبَّق تلقائياً في السلة.
          </p>
        </div>
        <button
          className="btn pri"
          onClick={() =>
            setEdit({
              id: "",
              name: "",
              desc: "",
              type: "percent",
              value: 10,
              code: "",
              minTotal: 0,
              firstOnly: false,
              on: true,
              startsAt: "",
              endsAt: "",
            })
          }
        >
          + عرض جديد
        </button>
      </div>
      <div className="grid offers">
        {data.offers.map((o) => {
          const live = isOfferActive(o, now);
          return (
            <div className="card offer" key={o.id}>
              <div className="top2">
                <div style={{ cursor: "pointer" }} onClick={() => setEdit(o)}>
                  <h3>{o.name}</h3>
                  <div className="muted" style={{ fontSize: 14 }}>
                    {o.desc || TYPES[o.type]}
                  </div>
                </div>
                <Switch
                  on={o.on}
                  label={`تفعيل ${o.name}`}
                  onChange={(v) =>
                    run(
                      saveOffer({ ...o, on: v }),
                      v ? `تم تفعيل «${o.name}»` : `تم إيقاف «${o.name}»`,
                    )
                  }
                />
              </div>
              <div className="row" style={{ marginTop: 10, fontSize: 13 }}>
                {o.code ? (
                  <span className="code">{o.code}</span>
                ) : (
                  <span className="pill s-conf">تلقائي</span>
                )}
                {o.on && !live && <span className="pill s-can">خارج المدة</span>}
                {o.minTotal > 0 && <span className="muted">من {fmt(o.minTotal)}</span>}
                {o.endsAt && <span className="muted">حتى {dateFmt(o.endsAt)}</span>}
                <span className="muted">استُعمل {ltr(used(o))} مرة</span>
              </div>
            </div>
          );
        })}
      </div>
      {edit && (
        <OfferDialog
          o={edit}
          onClose={() => setEdit(null)}
          onSave={async (o) => (await run(saveOffer(o), "تم حفظ العرض")) && setEdit(null)}
          onDelete={async () => (await run(deleteOffer(edit.id), "تم حذف العرض")) && setEdit(null)}
        />
      )}
    </>
  );
}

function OfferDialog({
  o,
  onClose,
  onSave,
  onDelete,
}: {
  o: Offer;
  onClose: () => void;
  onSave: (o: Offer) => void;
  onDelete: () => void;
}) {
  const [f, setF] = useState(o);
  const set = <K extends keyof Offer>(k: K, v: Offer[K]) => setF((x) => ({ ...x, [k]: v }));
  return (
    <Dialog
      title={o.id ? "تعديل العرض" : "عرض جديد"}
      onClose={onClose}
      footer={
        <>
          {o.id && (
            <button
              className="btn danger"
              style={{ marginInlineEnd: "auto" }}
              onClick={() => confirm("حذف هذا العرض؟") && onDelete()}
            >
              حذف
            </button>
          )}
          <button className="btn" onClick={onClose}>
            إلغاء
          </button>
          <button className="btn pri" onClick={() => onSave(f)}>
            حفظ العرض
          </button>
        </>
      }
    >
      <div className="f2">
        <div className="field">
          <label>اسم العرض (يظهر للعميل في السلة)</label>
          <input value={f.name} onChange={(e) => set("name", e.target.value)} />
        </div>
        <div className="field">
          <label>وصف قصير</label>
          <input value={f.desc} onChange={(e) => set("desc", e.target.value)} />
        </div>
        <div className="field">
          <label>نوع العرض</label>
          <select value={f.type} onChange={(e) => set("type", e.target.value as OfferType)}>
            {Object.entries(TYPES).map(([k, l]) => (
              <option key={k} value={k}>
                {l}
              </option>
            ))}
          </select>
        </div>
        {(f.type === "percent" || f.type === "amount") && (
          <div className="field">
            <label>{f.type === "percent" ? "النسبة (%)" : "المبلغ (دج)"}</label>
            <input
              type="number"
              min={0}
              value={f.value}
              onChange={(e) => set("value", Number(e.target.value))}
            />
          </div>
        )}
        <div className="field">
          <label>كود التخفيض (فارغ = تلقائي للجميع)</label>
          <input
            dir="ltr"
            value={f.code}
            onChange={(e) => set("code", e.target.value.toUpperCase())}
            placeholder="WELCOME15"
          />
        </div>
        <div className="field">
          <label>أدنى مبلغ للطلب (دج)</label>
          <input
            type="number"
            min={0}
            value={f.minTotal}
            onChange={(e) => set("minTotal", Number(e.target.value))}
          />
        </div>
        <div className="field">
          <label>يبدأ في (اختياري)</label>
          <input type="date" value={f.startsAt} onChange={(e) => set("startsAt", e.target.value)} />
        </div>
        <div className="field">
          <label>ينتهي في (اختياري)</label>
          <input type="date" value={f.endsAt} onChange={(e) => set("endsAt", e.target.value)} />
        </div>
      </div>
      <div className="lrow">
        <span>للطلب الأول فقط (حسب رقم الهاتف)</span>
        <Switch on={f.firstOnly} label="للطلب الأول فقط" onChange={(v) => set("firstOnly", v)} />
      </div>
      <div className="lrow">
        <span>العرض مفعّل</span>
        <Switch on={f.on} label="مفعّل" onChange={(v) => set("on", v)} />
      </div>
    </Dialog>
  );
}
