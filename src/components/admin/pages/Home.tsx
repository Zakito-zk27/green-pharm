"use client";

import { ltr } from "@/lib/format";
import type { Order } from "@/lib/types";
import { fmt, num, useAdmin } from "../ui";
import { OrdersTable } from "./Orders";

const DAY = 864e5;
const WEEKDAYS = ["أ", "ن", "ث", "ر", "خ", "ج", "س"]; // Sunday first, like Date.getDay()

const counted = (o: Order) => o.status !== "cancelled";
const startOfDay = (t: number) => {
  const d = new Date(t);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
};

/** Delivered / (delivered + returned) over the given orders. */
export function deliveryRate(list: Order[]): number | null {
  const done = list.filter((o) => o.status === "delivered").length;
  const ret = list.filter((o) => o.status === "returned").length;
  return done + ret ? Math.round((done / (done + ret)) * 100) : null;
}

export function Home() {
  const { data, go } = useAdmin();
  const now = new Date(data.now).getTime();
  const today = startOfDay(now);
  const salesOn = (from: number, to: number) =>
    data.orders.filter(
      (o) => counted(o) && +new Date(o.createdAt) >= from && +new Date(o.createdAt) < to,
    );
  const todaySales = salesOn(today, today + DAY).reduce((s, o) => s + o.total, 0);
  const ySales = salesOn(today - DAY, today).reduce((s, o) => s + o.total, 0);
  const diff = ySales ? Math.round(((todaySales - ySales) / ySales) * 100) : null;
  const rate = deliveryRate(data.orders);
  const rateWeek = deliveryRate(data.orders.filter((o) => +new Date(o.createdAt) >= now - 7 * DAY));
  const low = data.products.flatMap((p) =>
    p.variants.filter((v) => v.stock <= data.settings.lowStock).map((v) => ({ p, v })),
  );
  const days = Array.from({ length: 7 }, (_, i) => {
    const from = today - (6 - i) * DAY;
    return {
      label: i === 6 ? "اليوم" : WEEKDAYS[new Date(from).getDay()],
      n: salesOn(from, from + DAY).length,
    };
  });
  const max = Math.max(1, ...days.map((d) => d.n));
  const newCount = data.orders.filter((o) => o.status === "new").length;

  return (
    <>
      <h1>مرحباً بك 👋</h1>
      <p className="sub">هذا ملخص متجرك اليوم.</p>
      <div className="grid kpis">
        <div className="card kpi">
          <small>مبيعات اليوم</small>
          <b>{fmt(todaySales)}</b>
          {diff === null ? (
            <span className="d muted">لا مبيعات أمس للمقارنة</span>
          ) : (
            <span className={"d " + (diff >= 0 ? "up" : "down")}>
              {diff >= 0 ? "▲" : "▼"} {ltr(Math.abs(diff) + "%")} عن أمس
            </span>
          )}
        </div>
        <div className="card kpi">
          <small>طلبات جديدة</small>
          <b>{num(newCount)}</b>
          <span className="d">بانتظار التأكيد الهاتفي</span>
        </div>
        <div className="card kpi">
          <small>نسبة الاستلام الفعلية</small>
          <b>{rate === null ? "—" : ltr(rate + "%")}</b>
          <span className="d muted">
            {rateWeek === null ? (
              "مُسلَّم ÷ (مُسلَّم + مرتجع)"
            ) : (
              <>هذا الأسبوع: {ltr(rateWeek + "%")}</>
            )}
          </span>
        </div>
        <div className="card kpi">
          <small>منتجات منخفضة المخزون</small>
          <b>{num(low.length)}</b>
          <span className="d">تحتاج إعادة تزويد</span>
        </div>
      </div>
      <div className="grid two">
        <div className="card">
          <div className="row" style={{ justifyContent: "space-between" }}>
            <h2>الطلبات حسب اليوم</h2>
            <small className="muted">آخر 7 أيام</small>
          </div>
          <div className="bars">
            {days.map((d, i) => (
              <div key={i} className={"bar" + (i === 6 ? " today" : "")}>
                <em>{num(d.n)}</em>
                <i style={{ height: `${Math.max(2, (d.n / max) * 100)}%` }} />
                <span>{d.label}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="card">
          <h2>تنبيهات المخزون</h2>
          {low.length === 0 && <p className="muted">كل المنتجات متوفرة بكمية كافية.</p>}
          {low.slice(0, 8).map(({ p, v }) => (
            <div className="alert" key={p.id + v.id}>
              {p.emoji}
              <span>
                <b>{p.name.ar}</b> ({v.label.ar}):{" "}
                {v.stock === 0 ? "نفد من المخزون" : <>بقي {num(v.stock)} قطع</>}
              </span>
            </div>
          ))}
        </div>
      </div>
      <div className="card">
        <div className="row" style={{ justifyContent: "space-between" }}>
          <h2>أحدث الطلبات</h2>
          <button className="btn sm" onClick={() => go("orders")}>
            عرض كل الطلبات
          </button>
        </div>
        <OrdersTable list={data.orders.slice(0, 5)} />
      </div>
    </>
  );
}
