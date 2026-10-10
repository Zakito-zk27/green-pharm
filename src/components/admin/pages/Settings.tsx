"use client";

import { useState } from "react";
import { saveSettings } from "@/app/admin/actions";
import { useAdmin } from "../ui";

export function Settings() {
  const { data, run } = useAdmin();
  const [s, setS] = useState({
    lowStock: data.settings.lowStock,
    metaPixel: data.settings.metaPixel,
    tiktokPixel: data.settings.tiktokPixel,
  });
  return (
    <>
      <h1>الإعدادات</h1>
      <p className="sub">
        إعدادات عامة للمتجر. أسعار التوصيل والشحن المجاني في صفحة «أسعار التوصيل».
      </p>
      <div className="grid brandgrid">
        <div className="card">
          <h2>المخزون</h2>
          <div className="field">
            <label>تنبيه «آخر القطع» عندما تصل الكمية إلى</label>
            <input
              type="number"
              min={0}
              value={s.lowStock}
              onChange={(e) => setS({ ...s, lowStock: Number(e.target.value) })}
            />
          </div>
          <h2>تتبع الإعلانات</h2>
          <div className="field">
            <label>Meta Pixel ID</label>
            <input
              type="text"
              dir="ltr"
              placeholder="123456789012345"
              value={s.metaPixel}
              onChange={(e) => setS({ ...s, metaPixel: e.target.value })}
            />
          </div>
          <div className="field">
            <label>TikTok Pixel ID</label>
            <input
              type="text"
              dir="ltr"
              placeholder="C1A2B3..."
              value={s.tiktokPixel}
              onChange={(e) => setS({ ...s, tiktokPixel: e.target.value })}
            />
          </div>
          <button className="btn pri" onClick={() => run(saveSettings(s), "تم حفظ الإعدادات")}>
            حفظ الإعدادات
          </button>
        </div>
        <div className="card">
          <h2>الإشعارات</h2>
          <p className="small muted" style={{ marginTop: 0 }}>
            لوحة التحكم تتحقق من الطلبات الجديدة كل 20 ثانية وتصدر صوتاً. اضغط على الجرس 🔔 مرة
            واحدة للسماح بإشعارات الجهاز.
          </p>
          <h2 style={{ marginTop: 18 }}>الحسابات</h2>
          <p className="small muted" style={{ marginTop: 0 }}>
            كلمة سر المدير تُضبط في إعدادات الاستضافة (<span className="ltr">ADMIN_PASSWORD</span>).
          </p>
        </div>
      </div>
    </>
  );
}
