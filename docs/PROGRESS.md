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
- Moved to Cloudflare: data in D1, images in a second D1 database (see DECISIONS.md). Tested
  locally with D1: add product with photo, order, confirm, stock and sales counts.
- Next: deploy. Build must run on Linux (Cloudflare Git integration), create the two D1 databases,
  put their ids in `wrangler.jsonc`, set the `ADMIN_PASSWORD` and `ADMIN_SECRET` secrets.

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
- [x] Real delivery prices per wilaya: the owner confirmed the current values (2026-10-10).
- [ ] Real products, photos and prices: the owner's client adds them from admin → المنتجات.
- [ ] Real customer reviews (admin → تصميم المتجر → النصوص). Current ones are placeholders.
- [ ] Cloudflare account (free) in the client's name, to go online.
- [ ] Optional: Meta/TikTok pixel IDs.
- [ ] Confirm the dark-mode fix (docs/DECISIONS.md, "Theme tokens").

## Known issues

- `npm run deploy` from Windows produces a broken build (OpenNext limitation). Build on Linux.
