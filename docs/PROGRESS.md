# Progress tracker

Claude Code: read this file first in every new chat.

## Current position

- 2026-10-10: on the owner's request, the whole site was built in one go from the prototypes, with a
  local data store instead of Supabase (see docs/DECISIONS.md, "Full build before Supabase").
- Works now, locally: storefront (AR/FR), cart and cash-on-delivery checkout with server-side prices,
  offers/coupons, landing pages, and the full admin dashboard (orders, products with images, stock,
  customers, blacklist, delivery prices, DHD manual export, offers, statistics, Store Designer with
  live preview and publish, dashboard look, settings, pixels).
- Next: connect Supabase (tables + RLS + Auth + Storage) to replace `src/lib/server/db.ts` and the
  password login, then deploy on Vercel.

## Phases (original roadmap in docs/PHASES.md)

- [x] Phase 0: Foundations (except step 7: Supabase/Vercel accounts)
- [x] Phase 1: Public storefront with real COD orders (local store; Supabase pending)
- [x] Phase 2: Admin dashboard core (password login; Supabase Auth pending)
- [x] Phase 3: Notifications (dashboard + Telegram; email pending a provider), offers, statistics
- [x] Phase 4: Store Designer persisted (draft, publish, 10 versions)
- [x] Phase 5: Landing-page builder
- [~] Phase 6: Pixels done; DHD manual flow done (API unknown); Chargily not started
- [ ] Phase 7: Hardening and launch

## Owner actions pending

- [ ] Change the admin and staff passwords in `.env.local` (generated randomly for local testing).
- [ ] Real delivery prices per wilaya (admin → أسعار التوصيل). Current values are test values.
- [ ] Real products, photos and prices (admin → المنتجات). Current ones come from the prototype.
- [ ] Real customer reviews (admin → تصميم المتجر → النصوص). Current ones are placeholders.
- [ ] Create the Supabase project and Vercel project in the client's name (needed to go online).
- [ ] Ask DHD Express whether they offer an API.
- [ ] Optional: Telegram bot token + chat id; Meta/TikTok pixel IDs.
- [ ] Confirm the dark-mode fix (docs/DECISIONS.md, "Theme tokens").

## Known issues

- The local data store does not work on Vercel (read-only disk). Use Supabase before deploying there.
