"use client";

// Meta and TikTok pixels. Loaded only when the owner sets an ID (admin → Settings, or per
// landing page). Events: ViewContent, AddToCart, InitiateCheckout, Purchase.

import Script from "next/script";

type Fn = (...a: unknown[]) => void;
type W = Window & { fbq?: Fn; ttq?: { track: Fn } };

const TT_EVENT: Record<string, string> = {
  ViewContent: "ViewContent",
  AddToCart: "AddToCart",
  InitiateCheckout: "InitiateCheckout",
  Purchase: "CompletePayment",
};

export function track(event: keyof typeof TT_EVENT, data: Record<string, unknown> = {}) {
  if (typeof window === "undefined") return;
  const w = window as W;
  try {
    w.fbq?.("track", event, data);
    w.ttq?.track(TT_EVENT[event], data);
  } catch {
    /* a blocked pixel must never break the store */
  }
}

const clean = (id: string) => id.replace(/[^\w]/g, "").slice(0, 40);

export function Pixels({ meta, tiktok }: { meta: string; tiktok: string }) {
  const m = clean(meta);
  const t = clean(tiktok);
  return (
    <>
      {m && (
        <Script id="meta-pixel" strategy="afterInteractive">
          {`!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init','${m}');fbq('track','PageView');`}
        </Script>
      )}
      {t && (
        <Script id="tiktok-pixel" strategy="afterInteractive">
          {`!function(w,d,t){w.TiktokAnalyticsObject=t;var ttq=w[t]=w[t]||[];ttq.methods=["page","track","identify","instances","debug","on","off","once","ready","alias","group","enableCookie","disableCookie"];ttq.setAndDefer=function(t,e){t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}};for(var i=0;i<ttq.methods.length;i++)ttq.setAndDefer(ttq,ttq.methods[i]);ttq.load=function(e){var i="https://analytics.tiktok.com/i18n/pixel/events.js";ttq._i=ttq._i||{};ttq._i[e]=[];ttq._i[e]._u=i;ttq._t=ttq._t||{};ttq._t[e]=+new Date;var o=d.createElement("script");o.type="text/javascript";o.async=!0;o.src=i+"?sdkid="+e+"&lib="+t;var a=d.getElementsByTagName("script")[0];a.parentNode.insertBefore(o,a)};ttq.load('${t}');ttq.page();}(window,document,'ttq');`}
        </Script>
      )}
    </>
  );
}
