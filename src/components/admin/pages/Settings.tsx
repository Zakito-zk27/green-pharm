"use client";

import { useState } from "react";
import { saveSettings } from "@/app/admin/actions";
import type { AdminLook } from "@/lib/types";
import { useAdmin } from "../ui";

/** "مظهر اللوحة": colors of the dashboard itself (brandPage in the prototype). */
export function Brand() {
  const { data, run } = useAdmin();
  const [a, setA] = useState<AdminLook>(data.settings.admin);
  const pal: [string, string][] = [
    ["#2f5d46", "أخضر نباتي"],
    ["#b8325a", "وردي رمّاني"],
    ["#7a4ea8", "بنفسجي"],
    ["#c2563a", "مرجاني"],
    ["#2f7d6a", "أخضر عشبي"],
    ["#2c5d9a", "أزرق"],
    ["#a8802a", "ذهبي"],
  ];
  const set = <K extends keyof AdminLook>(k: K, v: AdminLook[K]) => setA((x) => ({ ...x, [k]: v }));
  return (
    <>
      <h1>مظهر لوحة التحكم</h1>
      <p className="sub">
        هذا يغيّر ألوان لوحة التحكم نفسها. لتغيير مظهر المتجر الذي يراه الزوار افتح «تصميم المتجر».
      </p>
      <div className="grid brandgrid">
        <div className="card">
          <div className="field">
            <label>اسم المتجر</label>
            <input type="text" value={a.name} onChange={(e) => set("name", e.target.value)} />
          </div>
          <div className="field">
            <label>اللون الرئيسي</label>
            <input type="color" value={a.color} onChange={(e) => set("color", e.target.value)} />
          </div>
          <div className="field">
            <label>لون القائمة الجانبية</label>
            <input type="color" value={a.side} onChange={(e) => set("side", e.target.value)} />
          </div>
          <div className="field">
            <label>لون النجاح والتوفر</label>
            <input type="color" value={a.accent} onChange={(e) => set("accent", e.target.value)} />
          </div>
          <div className="field">
            <label>استدارة الزوايا</label>
            <select value={a.radius} onChange={(e) => set("radius", Number(e.target.value))}>
              <option value={6}>حادة</option>
              <option value={12}>متوسطة</option>
              <option value={20}>ناعمة</option>
            </select>
          </div>
          <button
            className="btn pri"
            onClick={() => run(saveSettings({ admin: a }), "تم حفظ مظهر اللوحة")}
          >
            حفظ
          </button>
        </div>
        <div className="card">
          <h2>ألوان جاهزة</h2>
          <div className="swatches">
            {pal.map(([c, n]) => (
              <button
                key={c}
                className="sw"
                style={{ background: c }}
                title={n}
                aria-label={n}
                onClick={() => set("color", c)}
              />
            ))}
          </div>
        </div>
      </div>
    </>
  );
}

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
          <p className="small muted">
            رسائل تيليغرام: أنشئ بوتاً عبر @BotFather، ثم ضع{" "}
            <span className="ltr">TELEGRAM_BOT_TOKEN</span> و
            <span className="ltr">TELEGRAM_CHAT_ID</span> في إعدادات الاستضافة.
          </p>
          <h2 style={{ marginTop: 18 }}>الحسابات</h2>
          <p className="small muted" style={{ marginTop: 0 }}>
            كلمة سر المدير وكلمة سر الموظف تُضبطان في إعدادات الاستضافة (
            <span className="ltr">ADMIN_PASSWORD</span> و<span className="ltr">STAFF_PASSWORD</span>
            ). الموظف يرى الطلبات والمنتجات والمخزون فقط.
          </p>
        </div>
      </div>
    </>
  );
}
