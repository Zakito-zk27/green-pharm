"use client";

// Dashboard shell ported from reference/admin-dashboard.html: sidebar (RTL), top bar with
// search, light/dark, notifications, mobile drawer. Pages live in ./pages.

import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { useRouter } from "next/navigation";
import { getAdminData, latestOrderId, logout, type AdminData } from "@/app/admin/actions";
import { normalizePhone } from "@/lib/phone";
import { AdminCtx, num, type Ctx, type Page } from "./ui";
import { Blacklist, Customers } from "./pages/Customers";
import { Delivery, Shipping } from "./pages/Delivery";
import { Designer } from "./pages/Designer";
import { Home } from "./pages/Home";
import { DeadStock, Inventory, Moves } from "./pages/Inventory";
import { Landing } from "./pages/Landing";
import { Offers } from "./pages/Offers";
import { Orders } from "./pages/Orders";
import { Products } from "./pages/Products";
import { Brand, Settings } from "./pages/Settings";
import { Stats } from "./pages/Stats";

const ICON: Record<string, string> = {
  home: '<path d="M3 11l9-8 9 8M5 10v10h5v-6h4v6h5V10"/>',
  cart: '<path d="M3 4h2l2.5 11h10L20 7H6M9 20a1 1 0 100-2 1 1 0 000 2zM17 20a1 1 0 100-2 1 1 0 000 2z"/>',
  box: '<path d="M3 7l9-4 9 4v10l-9 4-9-4zM3 7l9 4 9-4M12 11v10"/>',
  page: '<rect x="4" y="3" width="16" height="18" rx="2"/><path d="M8 8h8M8 12h8M8 16h5"/>',
  tag: '<path d="M3 12V4h8l10 10-8 8zM7.5 8.5h.01"/>',
  users:
    '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c.5-4 3-6 6.5-6s6 2 6.5 6M16 5a3.5 3.5 0 010 7M18 14c2 .6 3.2 2.4 3.5 6"/>',
  ban: '<circle cx="12" cy="12" r="9"/><path d="M5.6 5.6l12.8 12.8"/>',
  truck:
    '<path d="M2 6h12v10H2zM14 9h4l3 3v4h-7M6 19a2 2 0 100-4 2 2 0 000 4zM17 19a2 2 0 100-4 2 2 0 000 4z"/>',
  grid: '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>',
  list: '<path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  gear: '<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M2 12h3M19 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1"/>',
  brush: '<path d="M18 3l3 3-9 9-3-3zM9 12c-3 0-4 2-4 4s-1 3-2 4c3 1 8 0 8-4"/>',
  chart: '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
  out: '<path d="M15 4h4v16h-4M10 8l-4 4 4 4M6 12h10"/>',
};

// [icon, label, page, owner only]
const NAV: [string, [string, string, Page, boolean?][]][] = [
  [
    "البيع",
    [
      ["home", "الرئيسية", "home"],
      ["cart", "الطلبات", "orders"],
      ["box", "المنتجات", "products"],
    ],
  ],
  [
    "التسويق",
    [
      ["page", "صفحات الهبوط", "landing", true],
      ["tag", "العروض والتخفيضات", "offers", true],
      ["chart", "الإحصائيات", "stats"],
    ],
  ],
  [
    "الزبائن",
    [
      ["users", "العملاء", "customers"],
      ["ban", "القائمة السوداء", "blacklist"],
    ],
  ],
  [
    "التوصيل",
    [
      ["truck", "أسعار التوصيل", "delivery", true],
      ["truck", "شركات التوصيل", "shipping"],
    ],
  ],
  [
    "المخزون",
    [
      ["grid", "المخزون", "inventory"],
      ["list", "حركات المخزون", "moves"],
      ["clock", "المخزون الراكد", "dead"],
    ],
  ],
  [
    "المتجر",
    [
      ["brush", "تصميم المتجر", "design", true],
      ["gear", "مظهر اللوحة", "brand", true],
      ["gear", "الإعدادات", "settings", true],
    ],
  ],
];
const PAGES = new Set(NAV.flatMap((g) => g[1].map((i) => i[2])));

function beep() {
  try {
    const ac = new AudioContext();
    const o = ac.createOscillator();
    const g = ac.createGain();
    o.connect(g);
    g.connect(ac.destination);
    o.frequency.value = 880;
    g.gain.setValueAtTime(0.15, ac.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + 0.6);
    o.start();
    o.stop(ac.currentTime + 0.6);
  } catch {
    /* sound blocked until the first click */
  }
}

export function AdminApp() {
  const router = useRouter();
  const [data, setData] = useState<AdminData | null>(null);
  const [page, setPage] = useState<Page>("home");
  const [arg, setArg] = useState("");
  const [sideOpen, setSideOpen] = useState(false);
  const [toastMsg, setToastMsg] = useState("");
  const [q, setQ] = useState("");
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const lastId = useRef(0);
  const searchRef = useRef<HTMLInputElement>(null);

  const toast = useCallback((m: string) => {
    setToastMsg(m);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setToastMsg(""), 3200);
  }, []);

  const fail = useCallback(
    (e: unknown) => {
      const msg = e instanceof Error ? e.message : "";
      if (msg.includes("login")) {
        router.replace("/admin/login");
        return;
      }
      toast(
        msg.includes("owner")
          ? "هذه العملية للمدير فقط."
          : "تعذّر الحفظ. تحقق من البيانات وأعد المحاولة.",
      );
    },
    [toast, router],
  );

  const load = useCallback(async () => {
    try {
      const d = await getAdminData();
      setData(d);
      lastId.current = d.orders[0]?.id ?? 0;
    } catch (e) {
      fail(e);
    }
  }, [fail]);

  // Page from the URL (?p=orders), kept in sync with back/forward.
  useEffect(() => {
    const read = () => {
      const u = new URL(location.href);
      const p = u.searchParams.get("p") as Page;
      setPage(PAGES.has(p) ? p : "home");
      setArg(u.searchParams.get("a") ?? "");
    };
    // The page comes from the browser URL, only readable after hydration.
    read();
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
    window.addEventListener("popstate", read);
    return () => window.removeEventListener("popstate", read);
  }, [load]);

  // New orders: check every 20 s, then sound, toast and a system notification.
  useEffect(() => {
    const id = setInterval(async () => {
      if (document.hidden && !("Notification" in window)) return;
      try {
        const latest = await latestOrderId();
        if (latest > lastId.current && lastId.current !== 0) {
          await load();
          beep();
          toast(`🔔 طلب جديد #${latest}`);
          if ("Notification" in window && Notification.permission === "granted")
            new Notification("طلب جديد", { body: `#${latest}`, icon: "/logo.png" });
        }
        lastId.current = Math.max(lastId.current, latest);
      } catch {
        /* offline: try again next time */
      }
    }, 20000);
    return () => clearInterval(id);
  }, [load, toast]);

  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        searchRef.current?.focus();
      }
    };
    document.addEventListener("keydown", k);
    return () => document.removeEventListener("keydown", k);
  }, []);

  const go = useCallback((p: Page, a = "") => {
    setPage(p);
    setArg(a);
    setSideOpen(false);
    setQ("");
    const u = new URL(location.href);
    u.searchParams.set("p", p);
    if (a) u.searchParams.set("a", a);
    else u.searchParams.delete("a");
    history.pushState(null, "", u);
    window.scrollTo(0, 0);
  }, []);

  const run = useCallback(
    async (p: Promise<AdminData>, ok?: string) => {
      try {
        setData(await p);
        if (ok) toast(ok);
        return true;
      } catch (e) {
        fail(e);
        return false;
      }
    },
    [toast, fail],
  );

  const hits = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!data || s.length < 2) return [];
    const digits = normalizePhone(s).replace(/^#/, "");
    const orders = data.orders
      .filter(
        (o) =>
          String(o.id).includes(digits) ||
          o.phone.includes(digits) ||
          o.name.toLowerCase().includes(s),
      )
      .slice(0, 6)
      .map((o) => ({
        k: "o" + o.id,
        label: `#${o.id} · ${o.name}`,
        sub: o.phone,
        act: () => go("orders", String(o.id)),
      }));
    const products = data.products
      .filter((p) => (p.name.ar + " " + p.name.fr).toLowerCase().includes(s))
      .slice(0, 5)
      .map((p) => ({
        k: "p" + p.id,
        label: p.name.ar,
        sub: p.name.fr,
        act: () => go("products", String(p.id)),
      }));
    return [...orders, ...products];
  }, [q, data, go]);

  if (!data) {
    return (
      <div className="empty" style={{ paddingTop: 120 }}>
        جارٍ التحميل…
      </div>
    );
  }

  const owner = data.role === "owner";
  const newCount = data.orders.filter((o) => o.status === "new").length;
  const a = data.settings.admin;
  const look = {
    "--brand": a.color,
    "--side": a.side,
    "--accent": a.accent,
    "--radius": a.radius + "px",
  } as CSSProperties;
  const ctx: Ctx = { data, run, toast, go, arg, owner };
  const ownerOnly = NAV.flatMap((g) => g[1]).find((i) => i[2] === page)?.[3];

  const PAGE: Record<Page, () => React.ReactNode> = {
    home: () => <Home />,
    orders: () => <Orders />,
    products: () => <Products />,
    landing: () => <Landing />,
    offers: () => <Offers />,
    stats: () => <Stats />,
    customers: () => <Customers />,
    blacklist: () => <Blacklist />,
    delivery: () => <Delivery />,
    shipping: () => <Shipping />,
    inventory: () => <Inventory />,
    moves: () => <Moves />,
    dead: () => <DeadStock />,
    design: () => <Designer />,
    brand: () => <Brand />,
    settings: () => <Settings />,
  };

  return (
    <AdminCtx.Provider value={ctx}>
      <div className="app" style={look}>
        <aside className={"side" + (sideOpen ? " open" : "")} aria-label="القائمة الرئيسية">
          <div className="logo">
            <div className="logo-mark">{(a.name || "G").trim().charAt(0)}</div>
            <div>
              <b>{a.name}</b>
              <small>لوحة التحكم · {owner ? "المدير" : "موظف"}</small>
            </div>
          </div>
          <nav>
            {NAV.map(([g, items]) => (
              <div key={g}>
                <div className="grp">{g}</div>
                {items
                  .filter((i) => owner || !i[3])
                  .map(([ic, t, p]) => {
                    const cnt = p === "orders" ? newCount : 0;
                    return (
                      <button
                        key={p}
                        className="nav"
                        aria-current={p === page ? "page" : undefined}
                        onClick={() => go(p)}
                      >
                        <svg viewBox="0 0 24 24" dangerouslySetInnerHTML={{ __html: ICON[ic] }} />
                        <span>{t}</span>
                        {cnt > 0 && <span className="cnt">{num(cnt)}</span>}
                      </button>
                    );
                  })}
              </div>
            ))}
            <div className="grp" />
            <a className="nav" href="/" target="_blank" rel="noopener">
              <svg viewBox="0 0 24 24" dangerouslySetInnerHTML={{ __html: ICON.page }} />
              <span>عرض المتجر</span>
            </a>
            <button className="nav" onClick={() => logout()}>
              <svg viewBox="0 0 24 24" dangerouslySetInnerHTML={{ __html: ICON.out }} />
              <span>تسجيل الخروج</span>
            </button>
          </nav>
        </aside>
        <div className={"scrim" + (sideOpen ? " show" : "")} onClick={() => setSideOpen(false)} />

        <div className="main">
          <header className="top">
            <button
              className="icon-btn burger"
              aria-label="فتح القائمة"
              onClick={() => setSideOpen(true)}
            >
              <svg viewBox="0 0 24 24">
                <path d="M4 7h16M4 12h16M4 17h16" />
              </svg>
            </button>
            <div className="search">
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
              >
                <circle cx="11" cy="11" r="7" />
                <path d="M20 20l-3.5-3.5" />
              </svg>
              <input
                ref={searchRef}
                placeholder="ابحث عن طلب، منتج أو رقم هاتف"
                aria-label="بحث"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && hits[0]?.act()}
              />
              <span className="kbd">Ctrl+K</span>
              {hits.length > 0 && (
                <div className="search-pop">
                  {hits.map((h) => (
                    <button key={h.k} className="search-hit" onClick={h.act}>
                      <b>{h.label}</b> <small className="muted ltr">{h.sub}</small>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="spacer" />
            <button
              className="icon-btn"
              aria-label="تبديل الوضع الليلي"
              onClick={() => {
                const d = document.documentElement;
                const dark = getComputedStyle(d).getPropertyValue("--bg").trim() === "#17111a";
                d.setAttribute("data-theme", dark ? "light" : "dark");
              }}
            >
              <svg viewBox="0 0 24 24">
                <path d="M20 14.5A8 8 0 019.5 4 8 8 0 1020 14.5z" />
              </svg>
            </button>
            <button
              className="icon-btn"
              aria-label="الإشعارات"
              onClick={() => {
                if ("Notification" in window && Notification.permission === "default")
                  Notification.requestPermission();
                go("orders", "new");
              }}
            >
              <svg viewBox="0 0 24 24">
                <path d="M6 9a6 6 0 1112 0c0 6 2 7 2 7H4s2-1 2-7M10 20a2 2 0 004 0" />
              </svg>
              {newCount > 0 && <span className="badge">{num(newCount)}</span>}
            </button>
          </header>
          <main className="content">
            {ownerOnly && !owner ? (
              <div className="empty">
                <h1>هذه الصفحة للمدير فقط</h1>
              </div>
            ) : (
              PAGE[page]()
            )}
          </main>
        </div>
      </div>
      <div className={"toast" + (toastMsg ? " show" : "")} role="status" aria-live="polite">
        <span>{toastMsg}</span>
      </div>
    </AdminCtx.Provider>
  );
}
