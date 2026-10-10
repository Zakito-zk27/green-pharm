import "server-only";

// New-order message to the owner's Telegram. Active only when TELEGRAM_BOT_TOKEN and
// TELEGRAM_CHAT_ID are set (see .env.example). Failures are logged, never shown to the client.

import { WILAYAS } from "@/data/wilayas";
import type { Order } from "@/lib/types";

const fmt = (n: number) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, " ") + " دج";

export async function notifyNewOrder(order: Order) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chat = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chat) return;
  const w = WILAYAS.find((x) => x.code === order.wilaya);
  const text = [
    `🛍️ طلب جديد #${order.id}`,
    `${order.name} · ${order.phone}`,
    `${w?.ar ?? ""} · ${order.commune} · ${order.mode === "desk" ? "مكتب التوصيل" : "المنزل"}`,
    ...order.items.map((i) => `• ${i.name.ar} (${i.variantLabel.ar}) × ${i.qty}`),
    `المجموع: ${fmt(order.total)}`,
  ].join("\n");
  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ chat_id: chat, text }),
    });
    if (!res.ok) console.error("Telegram notification failed", res.status);
  } catch (e) {
    console.error("Telegram notification failed", e);
  }
}
