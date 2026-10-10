"use client";

import { useState } from "react";
import { ltr } from "@/lib/format";
import { downloadCsv, fmt, num, useAdmin, wilayaName } from "../ui";
import { deliveryRate } from "./Home";

const DAY = 864e5;

export function Stats() {
  const { data } = useAdmin();
  const today = new Date(data.now).toISOString().slice(0, 10);
  const [from, setFrom] = useState(
    new Date(+new Date(data.now) - 29 * DAY).toISOString().slice(0, 10),
  );
  const [to, setTo] = useState(today);
  const [step, setStep] = useState<"day" | "week" | "month">("day");

  const list = data.orders.filter((o) => {
    const d = o.createdAt.slice(0, 10);
    return d >= from && d <= to;
  });
  const valid = list.filter((o) => o.status !== "cancelled");
  const revenue = valid.reduce((s, o) => s + o.total, 0);
  const delivered = list.filter((o) => o.status === "delivered");
  const rate = deliveryRate(list);
  const returned = list.filter((o) => o.status === "returned").length;
  const avg = valid.length ? Math.round(revenue / valid.length) : 0;

  const bucket = (iso: string) => {
    if (step === "day") return iso.slice(0, 10);
    if (step === "month") return iso.slice(0, 7);
    const d = new Date(iso.slice(0, 10));
    d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); // week starts Monday
    return d.toISOString().slice(0, 10);
  };
  const series = new Map<string, { n: number; total: number }>();
  for (const o of valid) {
    const k = bucket(o.createdAt);
    const r = series.get(k) ?? { n: 0, total: 0 };
    r.n++;
    r.total += o.total;
    series.set(k, r);
  }
  const rows = [...series.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  const maxT = Math.max(1, ...rows.map((r) => r[1].total));

  const top = new Map<number, { name: string; qty: number; total: number }>();
  for (const o of valid)
    for (const i of o.items) {
      const r = top.get(i.productId) ?? { name: i.name.ar, qty: 0, total: 0 };
      r.qty += i.qty;
      r.total += i.qty * i.price;
      top.set(i.productId, r);
    }
  const topList = [...top.values()].sort((a, b) => b.qty - a.qty).slice(0, 8);
  const maxQ = Math.max(1, ...topList.map((t) => t.qty));

  const wil = new Map<number, number>();
  for (const o of valid) wil.set(o.wilaya, (wil.get(o.wilaya) ?? 0) + 1);
  const wilList = [...wil.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10);
  const maxW = Math.max(1, ...wilList.map((w) => w[1]));

  return (
    <>
      <div className="row" style={{ justifyContent: "space-between" }}>
        <div>
          <h1>الإحصائيات</h1>
          <p className="sub">محسوبة من الطلبات الفعلية (بدون الملغاة).</p>
        </div>
        <button
          className="btn"
          onClick={() =>
            downloadCsv(`orders-${from}-${to}.csv`, [
              [
                "id",
                "date",
                "status",
                "name",
                "phone",
                "wilaya",
                "commune",
                "mode",
                "subtotal",
                "discount",
                "shipping",
                "total",
                "source",
              ],
              ...list.map((o) => [
                o.id,
                o.createdAt,
                o.status,
                o.name,
                o.phone,
                wilayaName(o.wilaya),
                o.commune,
                o.mode,
                o.subtotal,
                o.discount,
                o.shipping,
                o.total,
                o.source,
              ]),
            ])
          }
        >
          تصدير الطلبات CSV
        </button>
      </div>
      <div className="row" style={{ marginBottom: 14 }}>
        <div className="field" style={{ margin: 0 }}>
          <label>من</label>
          <input type="date" value={from} max={to} onChange={(e) => setFrom(e.target.value)} />
        </div>
        <div className="field" style={{ margin: 0 }}>
          <label>إلى</label>
          <input type="date" value={to} min={from} onChange={(e) => setTo(e.target.value)} />
        </div>
        <div className="chips" style={{ margin: "18px 0 0" }}>
          {(
            [
              ["day", "يومي"],
              ["week", "أسبوعي"],
              ["month", "شهري"],
            ] as const
          ).map(([k, l]) => (
            <button key={k} className="chip" aria-pressed={step === k} onClick={() => setStep(k)}>
              {l}
            </button>
          ))}
        </div>
      </div>
      <div className="grid kpis">
        <div className="card kpi">
          <small>المبيعات</small>
          <b>{fmt(revenue)}</b>
          <span className="d muted">{num(valid.length)} طلب</span>
        </div>
        <div className="card kpi">
          <small>متوسط قيمة الطلب</small>
          <b>{fmt(avg)}</b>
          <span className="d muted">&nbsp;</span>
        </div>
        <div className="card kpi">
          <small>نسبة الاستلام</small>
          <b>{rate === null ? "—" : ltr(rate + "%")}</b>
          <span className="d muted">{num(delivered.length)} مُسلَّم</span>
        </div>
        <div className="card kpi">
          <small>المرتجعات</small>
          <b>{num(returned)}</b>
          <span className="d muted">
            {list.length ? ltr(Math.round((returned / list.length) * 100) + "%") : "—"} من الطلبات
          </span>
        </div>
      </div>
      <div className="card" style={{ marginBottom: 14 }}>
        <h2>المبيعات حسب {step === "day" ? "اليوم" : step === "week" ? "الأسبوع" : "الشهر"}</h2>
        {rows.length === 0 ? (
          <div className="empty">لا توجد طلبات في هذه المدة.</div>
        ) : (
          <div className="hbars">
            {rows.map(([k, r]) => (
              <div key={k}>
                <span className="ltr">{k}</span>
                <i style={{ width: `${(r.total / maxT) * 100}%` }} />
                <small>{fmt(r.total)}</small>
              </div>
            ))}
          </div>
        )}
      </div>
      <div className="grid two">
        <div className="card">
          <h2>أكثر المنتجات مبيعاً</h2>
          {topList.length === 0 ? (
            <p className="muted">لا بيانات.</p>
          ) : (
            <div className="hbars">
              {topList.map((t) => (
                <div key={t.name}>
                  <span>{t.name}</span>
                  <i style={{ width: `${(t.qty / maxQ) * 100}%` }} />
                  <small>{num(t.qty)} قطعة</small>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="card">
          <h2>الطلبات حسب الولاية</h2>
          {wilList.length === 0 ? (
            <p className="muted">لا بيانات.</p>
          ) : (
            <div className="hbars">
              {wilList.map(([c, n]) => (
                <div key={c}>
                  <span>{wilayaName(c)}</span>
                  <i style={{ width: `${(n / maxW) * 100}%` }} />
                  <small>{num(n)}</small>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
