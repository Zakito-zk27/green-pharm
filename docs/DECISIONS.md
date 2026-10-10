# Decisions

Short notes on technical decisions and why. Newest last.

## 2026-10-10 — Stack versions

Next.js 16.4 (App Router, `src/` dir, Turbopack, `cacheComponents` on), React 19, TypeScript, Tailwind CSS 4,
ESLint 9 + Prettier, Vitest 5. Node 24, so `@types/node` is `^24`.

## 2026-10-10 — Languages and routing

- `next-intl` 4 with locales `ar` (default, `dir="rtl"`) and `fr` (`dir="ltr"`). Every page lives under
  `src/app/[locale]/`, so URLs are `/ar/...` and `/fr/...`.
- `src/proxy.ts` (Next 16's new name for middleware) redirects `/` to the right language: the
  `NEXT_LOCALE` cookie first, then the browser language, otherwise Arabic.
- The cookie is written when the visitor uses the language switch and lasts one year.
- The locale is read with `next/root-params` in `src/i18n/request.ts`.
- All storefront texts come from the prototype's `TX` dictionary, copied as is into `messages/ar.json` and
  `messages/fr.json` (namespace `store`). A test checks both files have the same keys.

## 2026-10-10 — No next-intl plugin

`createNextIntlPlugin` loads `@swc/core` on startup (only needed for next-intl's experimental message
extractor). On Windows its native binary refuses to load (strict folder-permission check). The plugin's
only job for us is one alias, so `next.config.ts` sets `turbopack.resolveAlias["next-intl/config"]`
directly. If we ever need the extractor, revisit this.

## 2026-10-10 — Fonts

IBM Plex Sans Arabic (default), Cairo and Tajawal through `next/font/google`. Next downloads them at build
time and serves them from our own domain, so visitors never call Google. Only IBM Plex is preloaded; the
other two are for the Store Designer.

## 2026-10-10 — Theme tokens

- `src/lib/theme.ts` turns the Store Designer config (same fields as `DEFAULT` in the prototype) into CSS
  variables on `<html>`. Values are validated first (hex colors only, radius 0–32, 2–4 columns, ratio
  1/1 or 4/5, known fonts and backgrounds), so admin input can't inject CSS.
- `src/app/globals.css` holds the prototype's `:root` tokens; Tailwind can use them (`bg-brand`,
  `text-ink`, `border-line`, `rounded-theme`…).
- **Dark-mode fix (to confirm with owner):** in the prototype, a phone in dark mode with the cream
  background got light text on cream (unreadable). The dark rules now come after the background rules,
  so dark mode shows the full dark palette. Light mode looks exactly like the prototype.

## 2026-10-10 — Full build before Supabase (owner's request)

The owner asked to build the whole site now instead of waiting for the Supabase account.

- **Data:** a local JSON store (`.data/db.json`, git-ignored, created from the prototype data on first
  run). All access goes through `src/lib/server/` (`db.ts`, `catalog.ts`, `orders.ts`) and the admin
  actions in `src/app/admin/actions.ts`. Writes are serialized and atomic. Uploaded images go to
  `.data/uploads/` and are served by `/media/<name>`.
  **Limit:** this works on a computer or a VPS with a disk (`npm run build && npm start`), **not on
  Vercel** (read-only disk). Moving to Supabase replaces these server files only; pages and
  components don't change.
- **Admin login:** password in `ADMIN_PASSWORD` (role `owner`) and optional `STAFF_PASSWORD` (role
  `staff`), session cookie signed with `ADMIN_SECRET` (HMAC-SHA256, 14 days). The proxy blocks
  `/admin` without a valid cookie and every server action checks the role again. Replaced by Supabase
  Auth later.
- **Prices:** `src/lib/pricing.ts` is the single pricing function (products, offers, delivery). The
  cart uses it for display; `placeOrder` runs it again on the server with stored prices.
- **Offers:** percent, fixed amount, free shipping, "buy 2 get the 3rd free"; optional code, minimum
  total, first order only, start/end dates. Coupon codes never reach the browser; the cart asks the
  server (`quoteCart`).
- **Stock:** taken when an order is confirmed (or shipped/delivered), given back when it is cancelled,
  returned or set back to "new". Every change is logged in `stockMoves`.
- **Caching:** the storefront reads cached data (`"use cache"` with tags `catalog` and `config`);
  admin changes expire the tag, so the store updates without a deploy.
- **Store Designer:** edits auto-save as a draft; "Publish" makes them live and keeps the last 10
  published versions. The preview is the real storefront in an iframe, talking through
  `postMessage` restricted to the same origin.
- **Notifications:** the dashboard checks for new orders every 20 s (sound, toast, system
  notification). Telegram message when `TELEGRAM_BOT_TOKEN` and `TELEGRAM_CHAT_ID` are set. Email
  needs a provider (not chosen yet).
- **DHD Express:** manual flow (CSV export, printable slips, tracking number moves the order to
  "shipping") until we know whether DHD has an API.
- **Additions to the prototype UI** (needed for real use, same visual language): coupon field and
  discount line in the cart, product editor dialog, order detail dialog, landing page public view,
  login page. Bug fixes: admin header overflow on phones, toast edge visible when hidden.
- Tailwind's preflight reset is not loaded: the ported prototype CSS relies on browser defaults.
