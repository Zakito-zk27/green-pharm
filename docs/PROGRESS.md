# Progress tracker

Claude Code: read this file first in every new chat.

## Current position

- 2026-10-10: on the owner's request, the whole site was built in one go from the prototypes, with a
  local data store instead of Supabase (see docs/DECISIONS.md, "Full build before Supabase").
- Works now, locally: storefront (AR/FR), cart and cash-on-delivery checkout with server-side prices,
  offers/coupons, landing pages, and the full admin dashboard (orders, products with images, stock,
  customers, blacklist, delivery prices, offers, statistics, Store Designer with
  live preview and publish, dashboard look, settings, pixels).
- Simplified (see DECISIONS.md): no staff, Telegram, DHD or stock pages; the store starts empty.
- Next: host on Cloudflare. The local JSON store must move to Cloudflare D1 (data) + R2 (images),
  and `src/proxy.ts` must become an edge `middleware.ts` (OpenNext does not run Node proxies yet).

## Phases (original roadmap in docs/PHASES.md)

- [x] Phase 0: Foundations (except step 7: Supabase/Vercel accounts)
- [x] Phase 1: Public storefront with real COD orders (local store; Supabase pending)
- [x] Phase 2: Admin dashboard core (password login; Supabase Auth pending)
- [x] Phase 3: Notifications (dashboard sound + alert; owner wants no email/Telegram), offers, statistics
- [x] Phase 4: Store Designer persisted (draft, publish, 10 versions)
- [x] Phase 5: Landing-page builder
- [x] Phase 6: Pixels done; no delivery-company integration and no card payment (owner's choice)
- [ ] Phase 7: Hardening and launch

## Owner actions pending

- [ ] Change the admin password in `.env.local` (generated randomly for local testing).
- [ ] Real delivery prices per wilaya: the owner will send them. Current values are test values.
- [ ] Real products, photos and prices: the owner's client adds them from admin → المنتجات.
- [ ] Real customer reviews (admin → تصميم المتجر → النصوص). Current ones are placeholders.
- [ ] Cloudflare account (free) in the client's name, to go online.
- [ ] Optional: Meta/TikTok pixel IDs.
- [ ] Confirm the dark-mode fix (docs/DECISIONS.md, "Theme tokens").

## Known issues

- The local data store does not work on Cloudflare or Vercel (no writable disk). Move to D1 + R2 first.
