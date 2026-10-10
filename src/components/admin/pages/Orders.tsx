"use client";

import { useState } from "react";
import { blockPhone, saveOrderInfo, setOrderStatus } from "@/app/admin/actions";
import { groupThousands, ltr } from "@/lib/format";
import { ORDER_STATUSES, type Order, type OrderStatus } from "@/lib/types";
import {
  Dialog,
  Pill,
  STATUS,
  ago,
  dateFmt,
  fmt,
  num,
  phoneFmt,
  timeFmt,
  useAdmin,
  wilayaName,
} from "../ui";

const NEXT: Partial<Record<OrderStatus, [OrderStatus, string]>> = {
  new: ["confirmed", "تأكيد الطلب"],
  confirmed: ["shipping", "شحن"],
  shipping: ["delivered", "تم التسليم"],
};

function itemsText(o: Order) {
  const first = o.items[0];
  if (!first) return "";
  const more = o.items.length > 1 ? ` +${o.items.length - 1}` : "";
  return `${first.name.ar} × ${first.qty}${more}`;
}

export function OrdersTable({ list, onOpen }: { list: Order[]; onOpen?: (o: Order) => void }) {
  const { run, go, data } = useAdmin();
  const now = new Date(data.now).getTime();
  if (!list.length) return <div className="empty">لا توجد طلبات بهذه الحالة.</div>;
  const open = onOpen ?? ((o: Order) => go("orders", String(o.id)));
  return (
    <div className="tbl-wrap">
      <table>
        <thead>
          <tr>
            <th>الطلب</th>
            <th>العميل</th>
            <th>الولاية</th>
            <th>المنتج</th>
            <th>الإجمالي</th>
            <th>الحالة</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {list.map((o) => {
            const next = NEXT[o.status];
            return (
              <tr key={o.id} className="tr-click" onClick={() => open(o)}>
                <td>
                  {ltr("#" + o.id)}
                  <br />
                  <small className="muted">{ago(o.createdAt, now)}</small>
                </td>
                <td>
                  {o.name}
                  <br />
                  <small className="muted ltr">{phoneFmt(o.phone)}</small>
                </td>
                <td>{wilayaName(o.wilaya)}</td>
                <td>{itemsText(o)}</td>
                <td>{fmt(o.total)}</td>
                <td>
                  <Pill s={o.status} />
                </td>
                <td>
                  {next && (
                    <button
                      className={"btn sm" + (o.status === "new" ? " pri" : "")}
                      onClick={(e) => {
                        e.stopPropagation();
                        run(
                          setOrderStatus(o.id, next[0]),
                          `تم تحديث الطلب #${o.id}: ${STATUS[next[0]][0]}`,
                        );
                      }}
                    >
                      {next[1]}
                    </button>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

const PER_PAGE = 50;

export function Orders() {
  const { data, arg, go } = useAdmin();
  const [filter, setFilter] = useState<"all" | OrderStatus>("all");
  const [pg, setPg] = useState(0);
  const openId = /^\d+$/.test(arg) ? Number(arg) : null;
  const [prevArg, setPrevArg] = useState("");
  if (arg !== prevArg) {
    setPrevArg(arg);
    if (ORDER_STATUSES.includes(arg as OrderStatus)) setFilter(arg as OrderStatus);
  }
  const list = filter === "all" ? data.orders : data.orders.filter((o) => o.status === filter);
  const shown = list.slice(pg * PER_PAGE, (pg + 1) * PER_PAGE);
  const open = openId ? data.orders.find((o) => o.id === openId) : null;
  const f: ["all" | OrderStatus, string][] = [
    ["all", "الكل"],
    ...ORDER_STATUSES.map((s) => [s, STATUS[s][0]] as [OrderStatus, string]),
  ];

  return (
    <>
      <h1>الطلبات</h1>
      <p className="sub">أكّد الطلبات هاتفياً قبل الشحن لتقليل المرتجعات.</p>
      <div className="chips">
        {f.map(([k, l]) => {
          const n =
            k === "all" ? data.orders.length : data.orders.filter((o) => o.status === k).length;
          return (
            <button
              key={k}
              className="chip"
              aria-pressed={filter === k}
              onClick={() => {
                setFilter(k);
                setPg(0);
              }}
            >
              {l} <small className="muted">{num(n)}</small>
            </button>
          );
        })}
      </div>
      <div className="card">
        <OrdersTable list={shown} onOpen={(o) => go("orders", String(o.id))} />
        {list.length > PER_PAGE && (
          <div className="pager">
            <button className="btn sm" disabled={pg === 0} onClick={() => setPg(pg - 1)}>
              السابق
            </button>
            <span className="muted">
              {num(pg + 1)} / {num(Math.ceil(list.length / PER_PAGE))}
            </span>
            <button
              className="btn sm"
              disabled={(pg + 1) * PER_PAGE >= list.length}
              onClick={() => setPg(pg + 1)}
            >
              التالي
            </button>
          </div>
        )}
      </div>
      {open && (
        <OrderDialog
          key={open.id}
          o={open}
          onClose={() => go("orders", filter === "all" ? "" : filter)}
        />
      )}
    </>
  );
}

function confirmText(o: Order, storeName: string) {
  const items = o.items.map((i) => `${i.name.ar} (${i.variantLabel.ar}) × ${i.qty}`).join("، ");
  return `السلام عليكم ${o.name.split(" ")[0]}، معك ${storeName}. نؤكد معك طلبك رقم #${o.id}: ${items}. المبلغ عند الاستلام ${groupThousands(o.total)} دج، التوصيل إلى ${wilayaName(o.wilaya)} (${o.commune}). هل نؤكد الشحن؟`;
}

function OrderDialog({ o, onClose }: { o: Order; onClose: () => void }) {
  const { data, run, toast, owner } = useAdmin();
  const [note, setNote] = useState(o.note);
  const [tracking, setTracking] = useState(o.tracking);
  const [why, setWhy] = useState("");
  const past = data.orders.filter((x) => x.phone === o.phone);
  const delivered = past.filter((x) => x.status === "delivered").length;
  const returned = past.filter((x) => x.status === "returned").length;
  const blocked = data.blacklist.some((b) => b.phone === o.phone);
  const intl = "213" + o.phone.replace(/^0/, "");
  const msg = confirmText(o, data.settings.admin.name);
  const set = (s: OrderStatus) =>
    run(setOrderStatus(o.id, s, why), `تم تحديث الطلب #${o.id}: ${STATUS[s][0]}`).then(() =>
      setWhy(""),
    );
  const stockLow =
    o.status === "new" &&
    o.items.some(
      (i) =>
        (data.products.find((p) => p.id === i.productId)?.variants.find((v) => v.id === i.variantId)
          ?.stock ?? 0) < i.qty,
    );

  return (
    <Dialog
      title={`الطلب #${o.id}`}
      onClose={onClose}
      footer={
        <>
          <button className="btn" onClick={() => window.print()}>
            طباعة وصل التوصيل
          </button>
          <button
            className="btn pri"
            onClick={() => run(saveOrderInfo(o.id, note, tracking), "تم حفظ الملاحظة")}
          >
            حفظ الملاحظة والتتبع
          </button>
        </>
      }
    >
      <div className="row" style={{ justifyContent: "space-between" }}>
        <div className="row">
          <Pill s={o.status} />
          <small className="muted">
            {dateFmt(o.createdAt)} {timeFmt(o.createdAt)} ·{" "}
            {o.source === "store" ? "المتجر" : "صفحة هبوط: " + o.source.replace("landing:", "")} ·{" "}
            {o.lang === "fr" ? "Français" : "العربية"}
          </small>
        </div>
      </div>

      <div className="grid brandgrid">
        <div className="card">
          <h2>العميل</h2>
          <dl className="kv">
            <dt>الاسم</dt>
            <dd>{o.name}</dd>
            <dt>الهاتف</dt>
            <dd className="ltr">{phoneFmt(o.phone)}</dd>
            <dt>الولاية</dt>
            <dd>
              {ltr(o.wilaya)} - {wilayaName(o.wilaya)}
            </dd>
            <dt>البلدية</dt>
            <dd>{o.commune}</dd>
            <dt>العنوان</dt>
            <dd>{o.address}</dd>
            <dt>التوصيل</dt>
            <dd>{o.mode === "desk" ? "مكتب التوصيل" : "إلى المنزل"}</dd>
            <dt>سجلّه</dt>
            <dd>
              {num(past.length)} طلبات · {num(delivered)} مُسلَّم · {num(returned)} مرتجع{" "}
              {blocked && <b style={{ color: "var(--bad)" }}>· محظور</b>}
            </dd>
          </dl>
          <div className="row no-print" style={{ marginTop: 12 }}>
            <a className="btn sm pri" href={`tel:${o.phone}`}>
              📞 اتصال
            </a>
            <a
              className="btn sm"
              href={`https://wa.me/${intl}?text=${encodeURIComponent(msg)}`}
              target="_blank"
              rel="noopener"
            >
              واتساب
            </a>
            <button
              className="btn sm"
              onClick={() =>
                navigator.clipboard?.writeText(msg).then(() => toast("تم نسخ رسالة التأكيد"))
              }
            >
              نسخ رسالة التأكيد
            </button>
            {!blocked && (
              <button
                className="btn sm danger"
                onClick={() =>
                  confirm(`حظر الرقم ${o.phone}؟ لن يستطيع الطلب مجدداً.`) &&
                  run(blockPhone(o.phone, `الطلب #${o.id}`), "تمت إضافة الرقم إلى القائمة السوداء")
                }
              >
                حظر الرقم
              </button>
            )}
          </div>
        </div>
        <div className="card">
          <h2>المنتجات</h2>
          {o.items.map((i) => (
            <div
              key={i.productId + i.variantId}
              className="row"
              style={{ justifyContent: "space-between", padding: "4px 0" }}
            >
              <span>
                {i.name.ar} <small className="muted">({i.variantLabel.ar})</small> × {num(i.qty)}
                {i.free ? <small className="up"> · {num(i.free)} مجاناً</small> : null}
              </span>
              <span>{fmt(i.price * i.qty)}</span>
            </div>
          ))}
          <hr style={{ border: 0, borderTop: "1px solid var(--line)" }} />
          <dl className="kv">
            <dt>المنتجات</dt>
            <dd>{fmt(o.subtotal)}</dd>
            {o.discount > 0 && (
              <>
                <dt>التخفيض</dt>
                <dd className="up">
                  {fmt(-o.discount)}{" "}
                  <small className="muted">
                    {o.offers.join("، ")} {o.coupon && <span className="code">{o.coupon}</span>}
                  </small>
                </dd>
              </>
            )}
            <dt>التوصيل</dt>
            <dd>{o.shipping ? fmt(o.shipping) : "مجاني"}</dd>
            <dt>
              <b>المجموع عند الاستلام</b>
            </dt>
            <dd>
              <b>{fmt(o.total)}</b>
            </dd>
          </dl>
        </div>
      </div>

      <div className="card no-print">
        <h2>تغيير الحالة</h2>
        {stockLow && (
          <div className="alert">⚠️ المخزون الحالي أقل من الكمية المطلوبة لبعض المنتجات.</div>
        )}
        <div className="field">
          <label>ملاحظة على التغيير (اختياري)</label>
          <input
            value={why}
            onChange={(e) => setWhy(e.target.value)}
            placeholder="مثال: لم يرد على الهاتف"
          />
        </div>
        <div className="row">
          {o.status === "new" && (
            <button className="btn pri" onClick={() => set("confirmed")}>
              تأكيد الطلب (بعد الاتصال)
            </button>
          )}
          {o.status === "confirmed" && (
            <button className="btn pri" onClick={() => set("shipping")}>
              شحن
            </button>
          )}
          {o.status === "shipping" && (
            <button className="btn pri" onClick={() => set("delivered")}>
              تم التسليم
            </button>
          )}
          {o.status === "shipping" && (
            <button className="btn" onClick={() => set("returned")}>
              مرتجع
            </button>
          )}
          {(o.status === "new" || o.status === "confirmed") && (
            <button className="btn danger" onClick={() => set("cancelled")}>
              إلغاء الطلب
            </button>
          )}
          {(o.status === "cancelled" || (owner && o.status !== "new")) && (
            <button className="btn" onClick={() => set("new")}>
              إرجاع إلى «جديد»
            </button>
          )}
        </div>
        <p className="small muted">يُخصم المخزون عند التأكيد، ويعود عند الإلغاء أو الإرجاع.</p>
      </div>

      <div className="grid brandgrid">
        <div className="card">
          <div className="field">
            <label>ملاحظة داخلية</label>
            <textarea value={note} onChange={(e) => setNote(e.target.value)} />
          </div>
          <div className="field" style={{ margin: 0 }}>
            <label>رقم التتبع (شركة التوصيل)</label>
            <input value={tracking} onChange={(e) => setTracking(e.target.value)} dir="ltr" />
          </div>
        </div>
        <div className="card">
          <h2>سجل الطلب</h2>
          <ul className="hist">
            {[...o.history].reverse().map((h, i) => (
              <li key={i}>
                <Pill s={h.status} />{" "}
                <small className="muted">
                  {dateFmt(h.at)} {timeFmt(h.at)} · {h.by === "client" ? "العميل" : "المدير"}
                </small>
                {h.note && <div>{h.note}</div>}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </Dialog>
  );
}
