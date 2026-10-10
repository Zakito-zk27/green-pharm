"use client";

import { useState } from "react";
import { saveOrderInfo, saveRates, setOrderStatus } from "@/app/admin/actions";
import { WILAYAS } from "@/data/wilayas";
import { ltr } from "@/lib/format";
import type { Order } from "@/lib/types";
import { downloadCsv, fmt, num, phoneFmt, useAdmin, wilayaName } from "../ui";

export function Delivery() {
  const { data, run } = useAdmin();
  const [rates, setRates] = useState(() => data.rates.map((r) => ({ ...r })));
  const [free, setFree] = useState(data.settings.freeShip);
  const [all, setAll] = useState({ home: "", desk: "" });
  const set = (code: number, k: "home" | "desk", v: number) =>
    setRates((rs) => rs.map((r) => (r.code === code ? { ...r, [k]: v } : r)));
  return (
    <>
      <h1>أسعار التوصيل</h1>
      <p className="sub">
        يظهر السعر للعميل تلقائياً حسب الولاية ونوع التوصيل. الأسعار الحالية تجريبية: ضع أسعار شركة
        التوصيل الفعلية.
      </p>
      <div className="card" style={{ marginBottom: 14 }}>
        <div className="f3">
          <div className="field">
            <label>شحن مجاني للطلبات فوق (دج، 0 = بدون)</label>
            <input
              type="number"
              min={0}
              value={free}
              onChange={(e) => setFree(Number(e.target.value))}
            />
          </div>
          <div className="field">
            <label>تطبيق سعر واحد على كل الولايات</label>
            <div className="row" style={{ flexWrap: "nowrap" }}>
              <input
                className="num"
                type="number"
                placeholder="المنزل"
                value={all.home}
                onChange={(e) => setAll({ ...all, home: e.target.value })}
                aria-label="سعر المنزل لكل الولايات"
              />
              <input
                className="num"
                type="number"
                placeholder="المكتب"
                value={all.desk}
                onChange={(e) => setAll({ ...all, desk: e.target.value })}
                aria-label="سعر المكتب لكل الولايات"
              />
              <button
                className="btn sm"
                onClick={() =>
                  setRates((rs) =>
                    rs.map((r) => ({
                      ...r,
                      home: all.home ? Number(all.home) : r.home,
                      desk: all.desk ? Number(all.desk) : r.desk,
                    })),
                  )
                }
              >
                تطبيق
              </button>
            </div>
          </div>
        </div>
      </div>
      <div className="card">
        <div className="tbl-wrap">
          <table style={{ minWidth: 420 }}>
            <thead>
              <tr>
                <th>الولاية</th>
                <th>للمنزل (دج)</th>
                <th>مكتب التوصيل (دج)</th>
              </tr>
            </thead>
            <tbody>
              {rates.map((r) => {
                const w = WILAYAS.find((x) => x.code === r.code);
                return (
                  <tr key={r.code}>
                    <td>
                      {ltr(r.code)} - {w?.ar}
                    </td>
                    <td>
                      <input
                        className="num"
                        type="number"
                        min={0}
                        value={r.home}
                        onChange={(e) => set(r.code, "home", Number(e.target.value))}
                        aria-label={`سعر ${w?.ar} للمنزل`}
                      />
                    </td>
                    <td>
                      <input
                        className="num"
                        type="number"
                        min={0}
                        value={r.desk}
                        onChange={(e) => set(r.code, "desk", Number(e.target.value))}
                        aria-label={`سعر ${w?.ar} للمكتب`}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="row" style={{ marginTop: 12 }}>
          <button
            className="btn pri"
            onClick={() => run(saveRates(rates, free), "تم حفظ أسعار التوصيل")}
          >
            حفظ الأسعار
          </button>
        </div>
      </div>
    </>
  );
}

/** DHD Express, manual flow: export confirmed orders, print slips, paste tracking numbers. */
export function Shipping() {
  const { data, run } = useAdmin();
  const ready = data.orders.filter((o) => o.status === "confirmed");
  const [sel, setSel] = useState<Set<number>>(new Set());
  const [track, setTrack] = useState<Record<number, string>>({});
  const [printing, setPrinting] = useState<Order[] | null>(null);
  const chosen = ready.filter((o) => sel.has(o.id));
  const rows = (list: Order[]) => [
    [
      "reference",
      "nom",
      "telephone",
      "wilaya_code",
      "wilaya",
      "commune",
      "adresse",
      "type_livraison",
      "montant_cod",
      "produits",
    ],
    ...list.map((o) => [
      o.id,
      o.name,
      o.phone,
      o.wilaya,
      WILAYAS.find((w) => w.code === o.wilaya)?.fr ?? "",
      o.commune,
      o.address,
      o.mode === "desk" ? "stopdesk" : "domicile",
      o.total,
      o.items
        .map(
          (i) => `${i.name.fr || i.name.ar} (${i.variantLabel.fr || i.variantLabel.ar}) x${i.qty}`,
        )
        .join(" + "),
    ]),
  ];

  if (printing) {
    return (
      <div>
        <div className="row no-print" style={{ marginBottom: 14 }}>
          <button className="btn pri" onClick={() => window.print()}>
            طباعة
          </button>
          <button className="btn" onClick={() => setPrinting(null)}>
            رجوع
          </button>
        </div>
        {printing.map((o) => (
          <div key={o.id} className="card" style={{ marginBottom: 14, breakInside: "avoid" }}>
            <div className="row" style={{ justifyContent: "space-between" }}>
              <h2 style={{ margin: 0 }}>
                {data.settings.admin.name} · {ltr("#" + o.id)}
              </h2>
              <b>{fmt(o.total)} عند الاستلام</b>
            </div>
            <dl className="kv" style={{ marginTop: 10 }}>
              <dt>المستلم</dt>
              <dd>
                {o.name} · <span className="ltr">{phoneFmt(o.phone)}</span>
              </dd>
              <dt>العنوان</dt>
              <dd>
                {ltr(o.wilaya)} - {wilayaName(o.wilaya)} · {o.commune} · {o.address}
              </dd>
              <dt>التوصيل</dt>
              <dd>{o.mode === "desk" ? "مكتب التوصيل (Stop desk)" : "إلى المنزل"}</dd>
              <dt>المحتوى</dt>
              <dd>
                {o.items.map((i) => `${i.name.ar} (${i.variantLabel.ar}) × ${i.qty}`).join("، ")}
              </dd>
            </dl>
          </div>
        ))}
      </div>
    );
  }

  return (
    <>
      <h1>شركات التوصيل</h1>
      <p className="sub">
        التوصيل عبر DHD Express. إلى أن نعرف إن كانت DHD توفر ربطاً آلياً (API)، العمل يدوي: صدّر
        الطلبات المؤكدة، اطبع الوصولات، ثم ألصق رقم التتبع لكل طلب فينتقل إلى «قيد الشحن».
      </p>
      <div className="card">
        <div className="row" style={{ justifyContent: "space-between", marginBottom: 10 }}>
          <h2 style={{ margin: 0 }}>طلبات مؤكدة جاهزة للشحن ({num(ready.length)})</h2>
          <div className="row">
            <button
              className="btn sm"
              onClick={() =>
                setSel(sel.size === ready.length ? new Set() : new Set(ready.map((o) => o.id)))
              }
            >
              {sel.size === ready.length && ready.length ? "إلغاء التحديد" : "تحديد الكل"}
            </button>
            <button
              className="btn sm"
              disabled={!chosen.length}
              onClick={() =>
                downloadCsv(`dhd-${new Date().toISOString().slice(0, 10)}.csv`, rows(chosen))
              }
            >
              تصدير CSV
            </button>
            <button
              className="btn sm"
              disabled={!chosen.length}
              onClick={() => setPrinting(chosen)}
            >
              طباعة الوصولات
            </button>
          </div>
        </div>
        {ready.length === 0 ? (
          <div className="empty">لا توجد طلبات مؤكدة بانتظار الشحن.</div>
        ) : (
          <div className="tbl-wrap">
            <table>
              <thead>
                <tr>
                  <th />
                  <th>الطلب</th>
                  <th>العميل</th>
                  <th>الولاية</th>
                  <th>المبلغ</th>
                  <th>رقم التتبع</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {ready.map((o) => (
                  <tr key={o.id}>
                    <td>
                      <input
                        type="checkbox"
                        aria-label={`تحديد ${o.id}`}
                        checked={sel.has(o.id)}
                        onChange={(e) => {
                          const n = new Set(sel);
                          if (e.target.checked) n.add(o.id);
                          else n.delete(o.id);
                          setSel(n);
                        }}
                      />
                    </td>
                    <td>{ltr("#" + o.id)}</td>
                    <td>
                      {o.name}
                      <br />
                      <small className="muted ltr">{phoneFmt(o.phone)}</small>
                    </td>
                    <td>
                      {wilayaName(o.wilaya)} · {o.mode === "desk" ? "مكتب" : "منزل"}
                    </td>
                    <td>{fmt(o.total)}</td>
                    <td>
                      <input
                        className="num"
                        style={{ width: 150 }}
                        dir="ltr"
                        value={track[o.id] ?? o.tracking}
                        onChange={(e) => setTrack({ ...track, [o.id]: e.target.value })}
                        aria-label="رقم التتبع"
                      />
                    </td>
                    <td>
                      <button
                        className="btn sm pri"
                        disabled={!(track[o.id] ?? o.tracking).trim()}
                        onClick={async () => {
                          if (await run(saveOrderInfo(o.id, o.note, track[o.id] ?? o.tracking)))
                            await run(
                              setOrderStatus(
                                o.id,
                                "shipping",
                                "رقم التتبع: " + (track[o.id] ?? o.tracking),
                              ),
                              `الطلب #${o.id} قيد الشحن`,
                            );
                        }}
                      >
                        شحن
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
