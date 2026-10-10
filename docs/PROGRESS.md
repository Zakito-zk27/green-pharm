# Progress tracker

Claude Code: read this file first in every new chat, then read only the current phase in `docs/PHASES.md`. After each step, update this file and commit.

## Current position

- Phase: 0 (Foundations)
- Step: 1 done (scaffold). Next: step 2 (i18n with next-intl + self-hosted fonts)
- Waiting on owner: nothing yet

## Phases

- [ ] Phase 0: Foundations
- [ ] Phase 1: Public storefront with real orders (COD)
- [ ] Phase 2: Admin dashboard core
- [ ] Phase 3: Notifications, offers, statistics
- [ ] Phase 4: Store Designer (persisted)
- [ ] Phase 5: Landing-page builder
- [ ] Phase 6: Integrations (pixels, DHD Express, optional Chargily)
- [ ] Phase 7: Hardening and launch

## Decisions made

(add one line per decision, newest last)
- 2026-10-10: Next.js 16.4 (App Router, src/ dir) + TypeScript + Tailwind 4, ESLint 9 + Prettier, Vitest 5. App lives in `kit/` next to docs and reference.
- 2026-10-10: `npm run check` = typecheck (next typegen + tsc) + lint + test + build; run after every step.
- 2026-10-10: Owner rule: inside a phase, keep going step by step without waiting; stop at phase end, [OWNER] items, unfixable failures, or design changes.
- 2026-10-10: Next.js 16.4 (App Router, src/ dir) + TypeScript + Tailwind 4, ESLint 9 + Prettier, Vitest 5. App lives in `kit/` next to docs and reference.
- 2026-10-10: `npm run check` = typecheck (next typegen + tsc) + lint + test + build; run after every step.
- 2026-10-10: Owner rule: inside a phase, keep going step by step without waiting; stop at phase end, [OWNER] items, unfixable failures, or design changes.

## Owner actions pending

(accounts, keys, content the owner still has to provide)

## Known issues

(none yet)
