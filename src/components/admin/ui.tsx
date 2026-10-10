"use client";

// Small shared pieces for the dashboard, ported from reference/admin-dashboard.html.

import { createContext, useContext, useEffect, type ReactNode } from "react";
import type { AdminData } from "@/app/admin/actions";
import { WILAYAS } from "@/data/wilayas";
import { groupThousands, ltr } from "@/lib/format";
import type { OrderStatus } from "@/lib/types";

/** Price in dinars with numbers isolated from RTL ("2 700 دج", never "700 2"). */
export const fmt = (n: number) => ltr(groupThousands(Math.round(n))) + " دج";
export const num = (n: number | string) => ltr(typeof n === "number" ? groupThousands(n) : n);
export const phoneFmt = (p: string) =>
  ltr(p.replace(/^(\d{4})(\d{2})(\d{2})(\d{2})$/, "$1 $2 $3 $4"));
export const wilayaName = (code: number) =>
  WILAYAS.find((w) => w.code === code)?.ar ?? String(code);

export const STATUS: Record<OrderStatus, [string, string]> = {
  new: ["جديد", "s-new"],
  confirmed: ["مؤكد", "s-conf"],
  shipping: ["قيد الشحن", "s-ship"],
  delivered: ["مُسلَّم", "s-done"],
  returned: ["مرتجع", "s-ret"],
  cancelled: ["ملغى", "s-can"],
};

export function Pill({ s }: { s: OrderStatus }) {
  return <span className={"pill " + STATUS[s][1]}>{STATUS[s][0]}</span>;
}

export function Switch({
  on,
  onChange,
  label,
}: {
  on: boolean;
  onChange: (v: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      className="switch"
      role="switch"
      aria-checked={on}
      aria-label={label}
      onClick={() => onChange(!on)}
    />
  );
}

export function ago(iso: string, now = Date.now()): string {
  const m = Math.floor((now - new Date(iso).getTime()) / 60000);
  if (m < 1) return "الآن";
  if (m < 60) return `قبل ${ltr(m)} د`;
  const h = Math.floor(m / 60);
  if (h < 24) return `قبل ${ltr(h)} س`;
  const d = Math.floor(h / 24);
  if (d === 1) return "أمس";
  if (d === 2) return "قبل يومين";
  return dateFmt(iso);
}

export const dateFmt = (iso: string) => {
  const d = new Date(iso);
  return ltr(
    `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`,
  );
};
export const timeFmt = (iso: string) => {
  const d = new Date(iso);
  return ltr(`${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`);
};

export function Dialog({
  title,
  onClose,
  children,
  footer,
  wide,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  wide?: boolean;
}) {
  useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", k);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", k);
      document.body.style.overflow = "";
    };
  }, [onClose]);
  return (
    <div className="dlg-bg" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div
        className="dlg"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        style={wide ? { maxWidth: 980 } : undefined}
      >
        <div className="dlg-h">
          <h2>{title}</h2>
          <button className="icon-btn" onClick={onClose} aria-label="إغلاق">
            ✕
          </button>
        </div>
        <div className="dlg-b">{children}</div>
        {footer && <div className="dlg-f">{footer}</div>}
      </div>
    </div>
  );
}

export type Page =
  | "home"
  | "orders"
  | "products"
  | "landing"
  | "offers"
  | "stats"
  | "customers"
  | "blacklist"
  | "delivery"
  | "design"
  | "settings";

export type Ctx = {
  data: AdminData;
  /** Run an admin action; shows `ok` on success or the error in the toast. Resolves to true on success. */
  run: (p: Promise<AdminData>, ok?: string) => Promise<boolean>;
  toast: (m: string) => void;
  go: (p: Page, arg?: string) => void;
  arg: string;
  owner: boolean;
};

export const AdminCtx = createContext<Ctx | null>(null);
export function useAdmin(): Ctx {
  const c = useContext(AdminCtx);
  if (!c) throw new Error("AdminCtx missing");
  return c;
}

/** Resize an image in the browser before upload (from `resizeImg` in the prototype). */
export function resizeImage(
  file: File,
  max: number,
  mime: "image/jpeg" | "image/png" = "image/jpeg",
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const im = new Image();
    im.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("image"));
    };
    im.onload = () => {
      const k = Math.min(1, max / Math.max(im.width, im.height));
      const c = document.createElement("canvas");
      c.width = Math.round(im.width * k);
      c.height = Math.round(im.height * k);
      c.getContext("2d")!.drawImage(im, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url);
      c.toBlob((b) => (b ? resolve(b) : reject(new Error("image"))), mime, 0.82);
    };
    im.src = url;
  });
}

export function downloadCsv(name: string, rows: (string | number)[][]) {
  const csv =
    "﻿" +
    rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\r\n");
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}
