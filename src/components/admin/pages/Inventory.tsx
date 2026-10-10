"use client";

import { useState } from "react";
import { adjustStock } from "@/app/admin/actions";
import { ltr } from "@/lib/format";
import { dateFmt, num, timeFmt, useAdmin } from "../ui";

export function Inventory() {
  const { data, run } = useAdmin();
  const [delta, setDelta] = useState<Record<string, string>>({});
  const low = data.settings.lowStock;
  return (
    <>
      <h1>المخزون</h1>
      <p className="sub">
        الكميات حسب المنتج والحجم. يُخصم المخزون تلقائياً عند تأكيد الطلب ويعود عند الإلغاء أو
        الإرجاع.
      </p>
      <div className="card inv">
        <div className="tbl-wrap">
          <table style={{ minWidth: 520 }}>
            <thead>
              <tr>
                <th>المنتج</th>
                <th>الحجم</th>
                <th style={{ textAlign: "center" }}>الكمية</th>
                <th>تعديل يدوي (+ / −)</th>
              </tr>
            </thead>
            <tbody>
              {data.products.flatMap((p) =>
                p.variants.map((v, i) => {
                  const k = p.id + ":" + v.id;
                  return (
                    <tr key={k}>
                      <td>{i === 0 ? p.name.ar : ""}</td>
                      <td>{v.label.ar}</td>
                      <td
                        className={"q " + (v.stock === 0 ? "out" : v.stock <= low ? "low" : "ok")}
                      >
                        {v.stock === 0 ? "نفد" : num(v.stock)}
                      </td>
                      <td>
                        <div className="row" style={{ flexWrap: "nowrap" }}>
                          <input
                            className="num"
                            type="number"
                            value={delta[k] ?? ""}
                            placeholder="+10"
                            aria-label={`تعديل مخزون ${p.name.ar} ${v.label.ar}`}
                            onChange={(e) => setDelta({ ...delta, [k]: e.target.value })}
                          />
                          <button
                            className="btn sm"
                            disabled={!Number(delta[k])}
                            onClick={async () =>
                              (await run(
                                adjustStock(p.id, v.id, Number(delta[k])),
                                "تم تعديل المخزون",
                              )) && setDelta({ ...delta, [k]: "" })
                            }
                          >
                            تطبيق
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                }),
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

const REASON: Record<string, string> = {
  order: "تأكيد طلب",
  cancel: "إلغاء طلب",
  return: "مرتجع",
  manual: "تعديل يدوي",
};

export function Moves() {
  const { data, go } = useAdmin();
  const name = (pid: number, vid: string) => {
    const p = data.products.find((x) => x.id === pid);
    const v = p?.variants.find((x) => x.id === vid);
    return p ? `${p.name.ar} (${v?.label.ar ?? vid})` : `#${pid}`;
  };
  return (
    <>
      <h1>حركات المخزون</h1>
      <p className="sub">كل دخول وخروج للمخزون، الأحدث أولاً.</p>
      <div className="card">
        {data.stockMoves.length === 0 ? (
          <div className="empty">
            لا توجد حركات بعد. تظهر هنا عند تأكيد الطلبات أو تعديل المخزون.
          </div>
        ) : (
          <div className="tbl-wrap">
            <table>
              <thead>
                <tr>
                  <th>التاريخ</th>
                  <th>المنتج</th>
                  <th>الحركة</th>
                  <th>السبب</th>
                  <th>بواسطة</th>
                </tr>
              </thead>
              <tbody>
                {data.stockMoves.map((m, i) => (
                  <tr key={i}>
                    <td>
                      {dateFmt(m.at)} {timeFmt(m.at)}
                    </td>
                    <td>{name(m.productId, m.variantId)}</td>
                    <td className={m.delta > 0 ? "up" : "down"}>
                      {ltr((m.delta > 0 ? "+" : "") + m.delta)}
                    </td>
                    <td>
                      {REASON[m.reason]}
                      {m.orderId && (
                        <button
                          className="btn sm"
                          style={{ marginInlineStart: 6 }}
                          onClick={() => go("orders", String(m.orderId))}
                        >
                          {ltr("#" + m.orderId)}
                        </button>
                      )}
                    </td>
                    <td>{m.by === "owner" ? "المدير" : m.by === "staff" ? "موظف" : m.by}</td>
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

export function DeadStock() {
  const { data } = useAdmin();
  const [days, setDays] = useState(30);
  const since = new Date(data.now).getTime() - days * 864e5;
  const recent = new Set(
    data.orders
      .filter((o) => +new Date(o.createdAt) >= since && o.status !== "cancelled")
      .flatMap((o) => o.items.map((i) => i.productId + ":" + i.variantId)),
  );
  const rows = data.products.flatMap((p) =>
    p.variants.filter((v) => v.stock > 0 && !recent.has(p.id + ":" + v.id)).map((v) => ({ p, v })),
  );
  return (
    <>
      <h1>المخزون الراكد</h1>
      <p className="sub">
        منتجات متوفرة في المخزون لم تُطلب خلال المدة المختارة. فكّر في عرض أو تخفيض لها.
      </p>
      <div className="chips">
        {[14, 30, 60, 90].map((d) => (
          <button key={d} className="chip" aria-pressed={days === d} onClick={() => setDays(d)}>
            آخر {num(d)} يوماً
          </button>
        ))}
      </div>
      <div className="card">
        {rows.length === 0 ? (
          <div className="empty">لا يوجد مخزون راكد في هذه المدة.</div>
        ) : (
          <div className="tbl-wrap">
            <table style={{ minWidth: 420 }}>
              <thead>
                <tr>
                  <th>المنتج</th>
                  <th>الحجم</th>
                  <th>الكمية</th>
                  <th>قيمة المخزون</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(({ p, v }) => (
                  <tr key={p.id + v.id}>
                    <td>
                      {p.emoji} {p.name.ar}
                    </td>
                    <td>{v.label.ar}</td>
                    <td>{num(v.stock)}</td>
                    <td>
                      {ltr(String(v.stock * v.price).replace(/\B(?=(\d{3})+(?!\d))/g, " "))} دج
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
