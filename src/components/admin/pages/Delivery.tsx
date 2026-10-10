"use client";

import { useState } from "react";
import { saveRates } from "@/app/admin/actions";
import { WILAYAS } from "@/data/wilayas";
import { ltr } from "@/lib/format";
import { useAdmin } from "../ui";

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
