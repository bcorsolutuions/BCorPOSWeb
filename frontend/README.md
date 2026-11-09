# BCor POS Enterprise — Frontend

Next.js 15 (App Router) + TypeScript + TailwindCSS + shadcn/ui + DevExtreme
DataGrid frontend for SMART POS Enterprise. See
[../docs/blueprint](../docs/blueprint/README.md) for the full architecture
blueprint this app implements.

## Getting started

```bash
npm install
cp .env.example .env.local   # point API_BASE_URL at your ASP.NET Core API
npm run dev
```

Visit `http://localhost:3000` — it redirects to `/en/dashboard` (or
`/en/login` if unauthenticated).

## What's here

- `middleware.ts` — locale routing (`next-intl`) + coarse auth-gate redirect
- `src/i18n/` — the whole bilingual system in one place: locale config,
  request config, typed navigation helpers, `locales/{en,ar}.json`
  translation catalogs (see [09-i18n-strategy.md](../docs/blueprint/09-i18n-strategy.md)),
  `LanguageProvider`/`useLanguage` (routes + persists the chosen language to
  `localStorage`), `RTLProvider`/`useDirection` (drives `dir`/`lang` and
  Radix's direction context from the active language)
- `src/app/[locale]/(public|dashboard|pos)/` — the three layout shells and
  all 20 screens (see [08-frontend-structure.md](../docs/blueprint/08-frontend-structure.md))
- `src/components/ui/` — shadcn/ui primitives (hand-added, not via the CLI,
  so review `components.json` before running `npx shadcn add`)
- `src/components/shared/crud-data-grid-page.tsx` — the reusable grid+form
  pattern behind Item/Customer/Supplier/User master screens
- `src/lib/api/` — Axios client with JWT refresh + a CRUD service factory
  used by every master/transaction module
- `src/stores/` — Zustand stores (`auth-store`, `pos-cart-store`, `ui-store`)
- `src/components/pos/receipt.tsx` + `receipt-dialog.tsx` — bilingual
  thermal-receipt printing; the receipt's language is chosen independently
  of the app's own UI language (a customer may want an Arabic receipt
  while the till runs in English), so it resolves strings directly from
  `src/i18n/locales/*.json` rather than the app's active `next-intl` context

## Known scaffold gaps (intentional, next steps)

- Branch/company pickers use the current user's own IDs as placeholders —
  wire them to `/sysadmin/branches` and `/sysadmin/companies` once those
  endpoints exist.
- The offline POS queue uses `localStorage` for simplicity; swap for
  IndexedDB (`idb`) if the offline dataset grows beyond a few hundred
  queued sales.
- `middleware.ts`'s cookie check is a UX redirect only — it is not the
  security boundary (see [11-security-plan.md](../docs/blueprint/11-security-plan.md)).
- Language is stored in `localStorage` (per `LanguageProvider`) and mirrored
  onto the `/en/...` / `/ar/...` URL segment that actually drives routing
  and SSR — `localStorage` can't be read on the server, so it only
  reconciles the URL once, client-side, on first load of a session; explicit
  navigation to a specific locale URL always wins after that.
