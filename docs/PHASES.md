# Green Pharm store: full build roadmap

How to use this file

- Work **one phase at a time, one step at a time**. Read only the current phase section, not the whole file.
- Before starting a phase: write a short plan (files, tables, order) and wait for the owner's OK.
- After each step: summarize what changed, say how to test it, update `docs/PROGRESS.md`, commit, then **stop** until the owner says "continue".
- `[OWNER]` marks something only the owner can do (create an account, send a key, decide). Explain it in simple Arabic, one item at a time, and do not guess values.
- The approved design lives in `reference/`. Do not redesign. Port it faithfully.
- Skills, if installed: use `frontend-design` for new UI, `supabase-postgres-best-practices` for every schema/RLS/query step, `react-best-practices` for performance work, `webapp-testing` for browser tests.

Definition of done for every step: it runs, it is tested where logic is involved (pricing, validation, order creation, permissions), no secrets in git, and Arabic + French both work.

---

## Phase 0: Foundations

Goal: an empty but correct project the whole team can build on.

1. Scaffold Next.js (App Router) + TypeScript + Tailwind. ESLint + Prettier. Vitest for unit tests.
2. i18n with `next-intl`: `ar` (default, RTL) and `fr` (LTR). Language switch remembered in a cookie. Fonts: IBM Plex Sans Arabic, Cairo, Tajawal (self-hosted via `next/font`, not a runtime Google request).
3. Theme tokens as CSS variables (`--brand`, `--brand-ink`, `--brand-soft`, `--radius`, `--bg`, `--ink`, `--muted`, `--line`, `--cols`). Defaults from `reference/store.html` (`DEFAULT`): green `#2f5d46`, cream `#fbf8f0`, dark `#1d2b24`.
4. Shared helpers with tests: `fixNums` / LTR-isolate number formatting, `formatDA(amount)`, Algerian phone validation `^0[567]\d{8}$`, `normalizePhone`.
5. Static data: 58 wilayas (AR + FR, code 1-58) from the prototype.
6. `.env.example`, `README.md` (how to run), `docs/DECISIONS.md`. Git repo with a clean first commit.
7. `[OWNER]` Create the Supabase project and a Vercel project **in the client's name**. Send the Supabase URL and anon key. The service-role key goes only in local `.env.local` and Vercel env vars, never in chat or git.
   Done when: `npm run dev` shows a blank bilingual page with the brand theme, the language switch works, and unit tests for the helpers pass.

## Phase 1: Public storefront with real orders (cash on delivery)

Goal: a visitor can browse, add to cart and place an order that is saved in the database.

1. Database (migrations, all with RLS): `categories`, `products`, `product_variants` (size, price, old_price, stock), `product_images`, `wilayas`, `delivery_rates` (home_price, desk_price), `orders`, `order_items`, `customers`, `blacklist`, `store_config` (single row, jsonb), `settings` (free-shipping threshold). Seed with the prototype's products and the 58 wilayas.
2. Policies: public can read **published** products, categories, delivery rates and `store_config`. Public can **not** read or write orders, customers or the blacklist directly.
3. Storefront pages ported from `reference/store.html`: header (logo, language switch, cart), announcement bar, hero, trust row, **best-sellers carousel**, products grid with category + **skin-type filter**, "how to order", reviews, footer with social links.
4. Product sheet: images, variants (size), quantity, stock state (in stock / last pieces / out), price and old price, discount badge.
5. Cart (client state, persisted) and checkout in one panel: name, phone, wilaya, commune, address, delivery mode (home / desk). Live delivery price per wilaya, free-shipping progress, full summary before confirming.
6. **Server-side order creation** (route handler or server action): validate input (zod), recompute product prices, discounts and delivery from the database, check stock, reject blacklisted phones, rate-limit per IP and per phone, create `orders` + `order_items`, return the order number. Never trust prices sent by the browser.
7. Success screen with order number and amount due on delivery. The order starts as `new`.
8. Arabic numbers are correct everywhere (prices, `-20%`, phones, order numbers).
9. SEO and sharing: titles, descriptions, Open Graph image, `sitemap.xml`, `robots.txt`, favicon from the logo.
10. Images: upload placeholders to Supabase Storage, `next/image`, lazy loading.
    Done when: a real order from a phone browser appears in the `orders` table with correctly recomputed totals; tampering with the price in the request has no effect; AR and FR both complete the flow; Lighthouse mobile performance is reasonable (target 85+; refine in Phase 7).

## Phase 2: Admin dashboard core

Goal: the owner runs the shop without touching the database.

1. Auth with Supabase Auth, email + password. Roles: `owner` (everything) and `staff` (orders, products, stock; no settings or staff management). Enforce roles in RLS and in server actions, not only in the UI.
2. Admin shell ported from `reference/admin-dashboard.html`: sidebar (RTL), top bar with search, light/dark, mobile drawer.
3. **Products:** create, edit, delete, publish/unpublish; categories; variants with price and stock; multiple images with upload, reorder and compression; AR + FR name and description; skin types; "best seller" ranking from real sales.
4. **Orders:** list with filters and search (phone, name, number); detail page; status flow `new → confirmed → shipping → delivered`, plus `returned` and `cancelled`; phone-confirmation step with a call/WhatsApp link and a note field; status history log; printable waybill / delivery slip.
5. **Stock:** automatic deduction when an order is confirmed, restore when cancelled or returned; manual adjustments; `stock_movements` log; low-stock threshold and warning.
6. **Customers:** list, order history, delivered vs returned rate, fake-order flags. **Blacklist** management (phone numbers) used by checkout.
7. **Delivery rates editor:** the 58 wilayas, home and desk price each, free-shipping threshold.
8. Home dashboard with real numbers: today's sales, new orders, delivery success rate, low-stock products.
   Done when: the owner can add a product with images, see a storefront order arrive, confirm it, ship it and mark it delivered, and the stock numbers stay correct throughout. A `staff` account is blocked from owner-only pages at the database level.

## Phase 3: Notifications, offers, statistics

Goal: the owner hears about orders immediately and can run promotions.

1. **New-order notifications:** in-dashboard alert with sound, email, and **Telegram bot** message with the order summary. Optional: Web Push through the installed PWA (note: on iPhone, push works only after the site is added to the home screen). `[OWNER]` Create a Telegram bot with BotFather and send the token and chat id.
2. Customer-facing status messages (SMS/WhatsApp) only if the owner chooses a provider. Otherwise generate a ready-to-send text the staff can copy.
3. **Offers engine** applied by the server pricing function: coupon codes (percent or amount), "buy 2 get the third free", product bundles, free shipping above a threshold, date-limited offers, per-offer enable switch. Show the discount clearly in the cart and on the product card.
4. Tests for every offer type, including combinations and edge cases (zero or negative totals, expired offers, out-of-stock items).
5. **Statistics:** sales by day/week/month, top products, orders by wilaya, delivery success rate, returned rate, average order value; date-range filter; CSV export.
   Done when: a new order triggers Telegram + email within seconds, coupons and offers change the server-computed total correctly, and statistics match the raw order data.

## Phase 4: Store Designer (persisted)

Goal: the owner edits the whole storefront from the dashboard and publishes it.

1. Use `store_config` (jsonb) with the same shape as `DEFAULT` in `reference/store.html`: name, logo, languages and default language, color, background, radius, font, columns, announcement bar, sticky header, WhatsApp button, social links, hero (layout, image), card options, best-sellers settings, sections (order, visibility, background, spacing, alignment), custom banners, and `texts[key] = { ar, fr }` overrides for **every** text key in the `TX` dictionary.
2. Designer UI ported from the prototype (General / Sections / Texts tabs) with a **live preview** of the real storefront, preview as mobile/desktop and AR/FR, click-to-edit on text and sections.
3. **Draft vs published:** edits save as a draft; a "Publish" button copies to the live config and revalidates the storefront cache. A "Restore default" and a version history (last 10 versions).
4. Uploads (logo, hero, banners) go to Supabase Storage, resized and compressed; store URLs, not base64.
5. Validate and sanitize the whole config server-side: allowed keys and types, color formats, URL schemes (`https`, `tel`, anchors), text length limits, strip HTML from every text. Never render admin text as raw HTML.
6. The storefront reads the published config at request time (cached) and falls back to defaults if a key is missing.
   Done when: changing the color, logo, a section's order and a French text in the designer and clicking Publish updates the live storefront without a deploy, and a malicious value (script tag, `javascript:` link) is rejected or neutralized.

## Phase 5: Landing-page builder (no code)

Goal: the owner builds a one-product ad landing page from blocks.

1. Data: `landing_pages` (slug, product, language(s), blocks jsonb, status, pixel overrides) with RLS: public reads published pages only.
2. Blocks: hero (headline, image), benefits, before/after or gallery, reviews, FAQ, countdown timer, sticky "order now" bar, and the **embedded cash-on-delivery order form** (same server-side order creation as Phase 1, with the page recorded as the order source).
3. Builder UI: add, remove, reorder blocks, edit text in AR and FR, pick the product, choose from 2-3 ready templates, mobile-first preview, publish, copy the link.
4. Each page loads fast: server-rendered, minimal JS, optimized images.
5. Basic sanitization and limits as in Phase 4.
   Done when: the owner creates a landing page for one product in a few minutes, publishes it, and an order placed from it shows its source in the dashboard.

## Phase 6: Integrations

Goal: ads tracking and delivery handled from the dashboard.

1. **Meta Pixel and TikTok Pixel:** IDs set in settings and per landing page; events `ViewContent`, `AddToCart`, `InitiateCheckout`, `Purchase` (fire `Purchase` at order creation). Respect a simple consent notice if the owner wants one. Optional later: server-side conversion APIs. `[OWNER]` Provide the pixel IDs.
2. **Delivery company, DHD Express** (shown on the brand's Instagram). `[OWNER]` Ask DHD whether they offer an API and request credentials and documentation. If there is no API, build the manual flow: export the confirmed orders as the CSV/format DHD accepts, print waybills, and let staff paste the tracking number to move the order to `shipping`. If there is an API: create shipment from an order, store the tracking number, sync statuses (delivered / returned) with an authenticated webhook or scheduled job. Do not guess the API; read the documentation the owner provides.
3. Optional: **Chargily Pay** for CIB / Edahabia online payment as a second checkout option. `[OWNER]` Create the Chargily account and decide whether to offer it.
4. Optional: WhatsApp Business messages, only if the owner chooses a provider and accepts its cost.
   Done when: pixel events appear in the Meta/TikTok test tools, and orders can be sent to DHD (API or the manual export flow) with the tracking number saved.

## Phase 7: Hardening and launch

Goal: safe, fast, and handed over.

1. **Security review:** audit every table's RLS, confirm the service-role key is server-only, check every server action for auth and input validation, rate limiting on checkout and login, security headers (CSP, frame, referrer), no secrets in git history.
2. **Performance:** Lighthouse mobile target 90+ on the storefront; images optimized; fonts self-hosted; no layout shift; test on a throttled 4G profile (target under 3 s).
3. **Accessibility and RTL QA:** keyboard focus, contrast, labels, reduced motion, every screen checked in Arabic and French, numbers never reversed.
4. **Tests:** unit tests (pricing, offers, validation), and an end-to-end test of the full order flow in a real browser (visitor orders, admin confirms, stock changes).
5. **Operations:** error monitoring, database backups (confirm the Supabase plan's backup policy), an uptime check, and an owner-readable guide `docs/OWNER-GUIDE-AR.md` (add a product, handle an order, edit the design, run an offer, what to do if something breaks).
6. **Deploy:** production Vercel project, custom domain with HTTPS, production environment variables, production Supabase project separate from development. `[OWNER]` Buy the domain and add DNS records (explain step by step).
7. **Handover checklist:** all accounts (Vercel, Supabase, GitHub, domain, Telegram, pixels) are in the **client's** name; credentials delivered securely; the owner account created; a short training session; a warranty period for bug fixes agreed in writing.
   Done when: the checklist is complete, the full flow works in production on a real phone, and the client has logged in and placed and processed a test order themselves.

---

## Client additions (not approved for building yet)

The client approved the prototype and will send extra requirements. Record them here, discuss scope and effort with the owner, and only then schedule them into a phase.

- (none yet)
