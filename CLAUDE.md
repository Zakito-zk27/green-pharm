# Project: Green Pharm — Algerian dermo-cosmetic e-commerce (storefront + admin dashboard)

## What we are building

A complete online store for cosmetics and skincare products for the **Algerian market**, built for a client.

- **Storefront** (what visitors see): mobile-first, fast, bilingual **Arabic (RTL) + French (LTR)**, language chosen by the visitor.
- **Admin dashboard**: manage products, orders, customers, stock, statistics, offers, landing pages, delivery prices, and a **"Store Designer"** that lets the admin edit the whole storefront (colors, fonts, logo, section order/visibility, banners, every text in both languages).
- **Cash on delivery (COD)** checkout is the core flow. Online payment (Chargily: CIB / Edahabia) is optional, later.
- New-order notifications to the owner (PWA push, email, Telegram/WhatsApp), landing-page builder (no code), offers/coupons, Meta/TikTok pixels, delivery-company integration (DHD Express; see Brand section).

## Source of truth for design and behavior

Approved HTML prototypes are in `/reference`:

- `reference/store.html` — the storefront prototype. It contains: the full AR/FR text dictionary (`TX`), the design config schema (`DEFAULT`), the 58 wilayas (AR + FR), delivery-rate logic, checkout validation, best-sellers carousel, edit-mode hooks. **Port its visual design and behavior faithfully.**
- `reference/admin-dashboard.html` — the admin prototype (all pages, plus the Store Designer).
  The client approved this design. Do not redesign; improve code quality, not the look. Ask before changing UX.
  The client approved with additions still to be discussed. Do not build those until the owner provides them.

## Brand: Green Pharm (Instagram: @_green_pharm, based in Alger)

- Founded by a pharmacist; sells **original dermo-cosmetic products**; delivery to all 58 wilayas; Instagram bio is in French, customers write Arabic and French.
- **Delivery company: DHD Express** (the page advertises "service DHD, 58 wilayas"). Integrate DHD in phase 6; confirm with the owner whether DHD has an API or only manual waybills. Do not guess the API.
- Logo: `reference/logo-green-pharm.png` (black botanical "GP" monogram + serif "Green Pharm" on cream). The logo itself has no color, so the palette is a proposal: forest green `#2f5d46` (primary), cream background `#fbf8f0`, dark green `#1d2b24` (announcement bar / dark sections). The owner can change all of this in the Store Designer.
- The Instagram highlights show what customers need from the site: skin-type guidance ("تحديد نوع البشرة"), delivery info, returns/feedback ("Vos retours"), important notices. Keep the skin-type filter prominent.
- Reviews in the prototype are placeholders: replace with real customer feedback before launch.

## Stack (decided)

- Next.js (App Router) + TypeScript, deployed on Vercel.
- Supabase: Postgres, Auth, Storage (+ Row Level Security on every table).
- Tailwind CSS with CSS variables for theme tokens (brand color, radius, font) so the Store Designer config can drive the theme at runtime.
- i18n with `next-intl` (ar default, fr). `dir` switches rtl/ltr. Remember the visitor's language choice.
- Images: Supabase Storage (or Cloudinary), compressed, lazy-loaded. Target: page load under 3 s on 4G.

## Algeria-specific rules

- Phone validation: after removing spaces/dots/dashes, must match `^0[567]\d{8}$`.
- 58 wilayas (names in AR + FR in the prototype). Each has two delivery prices: home delivery and desk/stop-desk pickup. Free shipping above a configurable threshold (prototype: 6000 DA).
- Currency: DA (دج). Display with thousands separators.
- **Arabic number rendering:** in RTL text, wrap numbers in Unicode LTR isolates (U+2066 … U+2069) or `<bdi dir="ltr">`, otherwise "2 700" renders as "700 2" and "-20%" as "%20-". The prototype has a `fixNums` helper; keep this behavior everywhere (prices, discounts, phones, order numbers).
- Order statuses: new, confirmed, shipping, delivered, returned, cancelled. Orders are confirmed by phone before shipping.
- Fake-order protection: phone validation, duplicate/rate limiting per phone and IP, blacklist of phone numbers.

## Security rules (non-negotiable)

- **Never trust the client for prices.** Recompute totals (products, offers, delivery) on the server when creating an order.
- Service-role key only on the server. Never in client code or git.
- RLS on all tables; admin/staff roles via Supabase Auth. Public users can only read published products/settings and create orders through a server route.
- Validate all input on the server. Escape/sanitize any admin-provided text rendered to visitors.
- Secrets in environment variables; provide `.env.example`.

## Data model (starting point, refine as needed)

categories, products, product_variants (size, price, stock), product_images, wilayas, delivery_rates (home_price, desk_price), orders, order_items, customers, blacklist, offers/coupons, stock_movements, store_config (single row, `jsonb` = the Store Designer config), user roles.
The Store Designer config uses the same shape as `DEFAULT` in `reference/store.html`; text overrides are stored as `texts[key] = { ar, fr }`.

## How to work (important: usage limits)

- Work in **small, verifiable steps**. After each step: summarize what changed, how to run/test it, then **stop and wait**.
- Start every new phase by making a short plan and asking the owner only the questions that block progress.
- Commit after each working step with a clear message.
- Prefer simple, readable code over clever abstractions. Add tests for pricing, validation, and order creation.
- Write a short `docs/` note whenever a decision is made (env vars, deploy steps, how to add a product).
- The owner is not a professional developer: explain deploy/account steps in plain language (Arabic is fine), one at a time.

## Phases and progress (read this every new chat)

The full roadmap is in `docs/PHASES.md` and the live status is in `docs/PROGRESS.md`.

1. At the start of every chat: read `docs/PROGRESS.md`, then read **only the current phase** in `docs/PHASES.md` (not the whole file; it saves the owner's usage limit).
2. Phases in order: 0 Foundations, 1 Public storefront with real COD orders, 2 Admin core, 3 Notifications/offers/statistics, 4 Store Designer persisted, 5 Landing-page builder, 6 Integrations (pixels, DHD Express, optional Chargily), 7 Hardening and launch.
3. Before each phase: short plan, wait for the owner's OK. Inside a phase: one step at a time, then stop until the owner says "continue".
4. After every step: update `docs/PROGRESS.md` (position, decisions, pending owner actions), commit.
5. Never start the next phase without the owner's approval. Client additions go in the "Client additions" section of `docs/PHASES.md` and are not built until approved.
