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
