"use client";

import { useMemo, useState } from "react";
import { blockPhone, unblockPhone } from "@/app/admin/actions";
import { ltr } from "@/lib/format";
import { isValidAlgerianPhone } from "@/lib/phone";
import { dateFmt, downloadCsv, fmt, num, phoneFmt, useAdmin, wilayaName } from "../ui";

export function Customers() {
  const { data, go, run } = useAdmin();
  const [q, setQ] = useState("");
  const rows = useMemo(() => {
    const by = new Map<
      string,
      {
        phone: string;
        name: string;
        wilaya: number;
        orders: number;
        delivered: number;
        returned: number;
        cancelled: number;
        spent: number;
        last: string;
      }
    >();
    for (const o of data.orders) {
      const r = by.get(o.phone) ?? {
        phone: o.phone,
        name: o.name,
        wilaya: o.wilaya,
        orders: 0,
        delivered: 0,
        returned: 0,
        cancelled: 0,
        spent: 0,
        last: o.createdAt,
      };
      r.orders++;
      if (o.status === "delivered") {
        r.delivered++;
        r.spent += o.total;
      }
      if (o.status === "returned") r.returned++;
      if (o.status === "cancelled") r.cancelled++;
      if (o.createdAt > r.last) r.last = o.createdAt;
      by.set(o.phone, r);
    }
    return [...by.values()].sort((a, b) => b.last.localeCompare(a.last));
  }, [data.orders]);
  const s = q.trim().toLowerCase();
  const shown = s
    ? rows.filter((r) => r.phone.includes(s.replace(/\s/g, "")) || r.name.toLowerCase().includes(s))
    : rows;
  const blocked = new Set(data.blacklist.map((b) => b.phone));

  return (
    <>
      <div className="row" style={{ justifyContent: "space-between" }}>
        <div>
          <h1>العملاء</h1>
          <p className="sub">
            {num(rows.length)} عميل. يُعتبر الرقم مشبوهاً إذا كانت مرتجعاته أو إلغاءاته أكثر من
            طلباته المسلّمة.
          </p>
        </div>
        <button
          className="btn"
          onClick={() =>
            downloadCsv("customers.csv", [
              ["phone", "name", "wilaya", "orders", "delivered", "returned", "cancelled", "spent"],
              ...rows.map((r) => [
                r.phone,
                r.name,
                wilayaName(r.wilaya),
                r.orders,
                r.delivered,
                r.returned,
                r.cancelled,
                r.spent,
              ]),
            ])
          }
        >
          تصدير CSV
        </button>
      </div>
      <div className="field" style={{ maxWidth: 360 }}>
        <input
          placeholder="بحث بالاسم أو الهاتف"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          aria-label="بحث في العملاء"
        />
      </div>
      <div className="card">
        {shown.length === 0 ? (
          <div className="empty">لا يوجد عملاء بعد. يظهرون هنا مع أول طلب.</div>
        ) : (
          <div className="tbl-wrap">
            <table>
              <thead>
                <tr>
                  <th>العميل</th>
                  <th>الولاية</th>
                  <th>الطلبات</th>
                  <th>مُسلَّم</th>
                  <th>مرتجع / ملغى</th>
                  <th>نسبة الاستلام</th>
                  <th>المشتريات</th>
                  <th>آخر طلب</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {shown.map((r) => {
                  const bad = r.returned + r.cancelled;
                  const rate =
                    r.delivered + r.returned
                      ? Math.round((r.delivered / (r.delivered + r.returned)) * 100)
                      : null;
                  const suspicious = bad > 0 && bad >= r.delivered;
                  return (
                    <tr key={r.phone}>
                      <td>
                        {r.name} {suspicious && <span className="pill s-ret">مشبوه</span>}{" "}
                        {blocked.has(r.phone) && <span className="pill s-can">محظور</span>}
                        <br />
                        <small className="muted ltr">{phoneFmt(r.phone)}</small>
                      </td>
                      <td>{wilayaName(r.wilaya)}</td>
                      <td>
                        <button
                          className="btn sm"
                          onClick={() =>
                            go(
                              "orders",
                              String(data.orders.find((o) => o.phone === r.phone)?.id ?? ""),
                            )
                          }
                        >
                          {num(r.orders)}
                        </button>
                      </td>
                      <td>{num(r.delivered)}</td>
                      <td>
                        {num(r.returned)} / {num(r.cancelled)}
                      </td>
                      <td>{rate === null ? "—" : ltr(rate + "%")}</td>
                      <td>{fmt(r.spent)}</td>
                      <td>{dateFmt(r.last)}</td>
                      <td>
                        {!blocked.has(r.phone) && (
                          <button
                            className="btn sm danger"
                            onClick={() =>
                              confirm(`حظر ${r.phone}؟`) &&
                              run(blockPhone(r.phone, "من صفحة العملاء"), "تم حظر الرقم")
                            }
                          >
                            حظر
                          </button>
                        )}
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

export function Blacklist() {
  const { data, run, owner } = useAdmin();
  const [phone, setPhone] = useState("");
  const [reason, setReason] = useState("");
  const ok = isValidAlgerianPhone(phone);
  return (
    <>
      <h1>القائمة السوداء</h1>
      <p className="sub">الأرقام هنا لا تستطيع إتمام أي طلب في المتجر أو صفحات الهبوط.</p>
      <div className="card" style={{ marginBottom: 14 }}>
        <div className="f3">
          <div className="field">
            <label>رقم الهاتف</label>
            <input
              type="tel"
              dir="ltr"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="05 / 06 / 07 XX XX XX XX"
            />
          </div>
          <div className="field">
            <label>السبب</label>
            <input
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="مثال: رفض الاستلام مرتين"
            />
          </div>
          <div className="field">
            <label>&nbsp;</label>
            <button
              className="btn pri"
              disabled={!ok}
              onClick={async () =>
                (await run(blockPhone(phone, reason), "تمت إضافة الرقم")) &&
                (setPhone(""), setReason(""))
              }
            >
              إضافة إلى القائمة
            </button>
          </div>
        </div>
      </div>
      <div className="card">
        {data.blacklist.length === 0 ? (
          <div className="empty">القائمة فارغة.</div>
        ) : (
          <div className="tbl-wrap">
            <table style={{ minWidth: 420 }}>
              <thead>
                <tr>
                  <th>الرقم</th>
                  <th>السبب</th>
                  <th>التاريخ</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {data.blacklist.map((b) => (
                  <tr key={b.phone}>
                    <td className="ltr">{phoneFmt(b.phone)}</td>
                    <td>{b.reason}</td>
                    <td>{dateFmt(b.at)}</td>
                    <td>
                      {owner && (
                        <button
                          className="btn sm"
                          onClick={() => run(unblockPhone(b.phone), "تم رفع الحظر")}
                        >
                          رفع الحظر
                        </button>
                      )}
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
