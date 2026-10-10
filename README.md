# Green Pharm store

Online store for Green Pharm (dermo-cosmetics, Algeria): bilingual storefront (Arabic RTL / French),
cash-on-delivery checkout, and an admin dashboard. Built with Next.js, Supabase and Tailwind.

- Roadmap: [docs/PHASES.md](docs/PHASES.md) · Live status: [docs/PROGRESS.md](docs/PROGRESS.md) ·
  Decisions: [docs/DECISIONS.md](docs/DECISIONS.md)
- Approved design (source of truth): [reference/](reference/)

## Run it on your computer

You need Node.js 24 (or newer) and npm.

```bash
npm install
cp .env.example .env.local   # then fill in the values (not needed yet in phase 0)
npm run dev
```

Open http://localhost:3000. You are sent to `/ar` (Arabic) or `/fr` (French).

- Admin dashboard: http://localhost:3000/admin (password: `ADMIN_PASSWORD` in `.env.local`)
- Landing pages: `/ar/p/<slug>` and `/fr/p/<slug>`, created in the admin
- Data lives in `.data/` (orders, products, settings in `db.json`; uploaded images in `uploads/`).
  Delete `.data/db.json` to start again from the prototype data. Not usable on Vercel yet (see
  docs/DECISIONS.md); Supabase replaces it.
- Owner guide (Arabic): [docs/OWNER-GUIDE-AR.md](docs/OWNER-GUIDE-AR.md)

## Commands

| Command             | What it does                                         |
| ------------------- | ---------------------------------------------------- |
| `npm run dev`       | Start the site locally, reloads on every change      |
| `npm test`          | Run the unit tests (prices, phone, numbers, wilayas) |
| `npm run typecheck` | Check TypeScript types                               |
| `npm run lint`      | Check code quality                                   |
| `npm run build`     | Build for production (what Vercel runs)              |
| `npm run check`     | All of the above, in order. Run before every commit  |
| `npm run format`    | Format all files with Prettier                       |

## Folders

```
messages/        Storefront texts, ar.json and fr.json (copied from the prototype)
src/app/         Pages: storefront and landing pages under [locale]/, dashboard under admin/
src/components/  Shared UI pieces
src/data/        Static data (the 58 wilayas)
src/i18n/        Language setup (next-intl)
src/lib/         Pricing, config validation, theme, formatting, phone, admin session
src/lib/server/  Data access (local store now, Supabase later), orders, notifications
src/proxy.ts     Sends visitors to /ar or /fr
```

## Secrets

Never commit `.env.local` or put keys in code. The Supabase service-role key is used only on the
server. See `.env.example`.
