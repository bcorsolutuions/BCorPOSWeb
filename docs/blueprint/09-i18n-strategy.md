# 09 — Arabic/English i18n Strategy

## Library & Locale Routing

- **`next-intl`** for App Router: locale segment `app/[locale]/...`
  (`en`, `ar`), middleware detects browser/user preference and redirects
  to the locale-prefixed route, with the chosen locale persisted per user
  account (not just cookie) so it follows the user across devices.
- Locale switch is instant client-side (no full reload needed beyond the
  route segment change); direction (`dir`) flips together with locale.

## Translation Resource Structure

```
messages/
  en/
    common.json          # buttons, generic labels, validation messages
    pos.json
    inventory.json
    purchase.json
    sales.json
    crm.json
    hr.json
    reports.json
    admin.json
    license.json
    ai.json
    errors.json           # keyed by backend errorCode (INVENTORY_INSUFFICIENT_STOCK, ...)
  ar/
    (mirrors en/ exactly, same keys)
```

- Namespaced per module to keep bundles small (only the active module's
  namespace is loaded) and to let translators work file-by-file without
  merge conflicts.
- `errors.json` maps backend `errorCode` → localized message, decoupling
  UI language from server error strings entirely (see
  [07 — API Structure](07-api-structure.md) response envelope).

## Master-Data Bilinguality (not UI strings — actual business data)

Product names, category names, customer-facing receipt text, SMS/email/
WhatsApp templates, and printed report headers are **business data**, not
UI copy — they live in the database as paired columns
(`NameEn`/`NameAr`, `TemplateBodyEn`/`TemplateBodyAr`) per
[06 — Database Design](06-database-design.md), selected at query time by
the current locale, with graceful fallback to the other language if one is
blank (never show an empty label).

## Formatting Rules

- **Numbers/currency:** `Intl.NumberFormat` per locale; Arabic locale
  configurable per tenant to use either Arabic-Indic digits (٠١٢) or
  Western Arabic numerals (0123) — most POS/retail customers in the region
  prefer Western numerals for prices, so this is a tenant-level display
  setting, not hard-coded to locale.
- **Dates:** Gregorian by default for both locales (business/fiscal
  standard); optional Hijri secondary display on reports/receipts as a
  tenant setting, via `Intl.DateTimeFormat` with `islamic` calendar.
- **Pluralization/ICU messages:** handled through `next-intl`'s ICU
  message syntax (`{count, plural, one {...} other {...}}`), important
  because Arabic plural rules are more complex (6 forms) than English's 2.

## Translation Workflow

1. Developer adds a new UI string as a key in `en/*.json` first, PR-review
   gate: no hardcoded UI strings in components (enforced via ESLint rule
   flagging bare JSX text where feasible + a `no-literal-strings`-style
   check in code review).
2. `ar/*.json` key is added in the same PR with either a professional
   translation or a `// TODO-AR` marker; a scheduled job/report lists any
   keys present in `en` but missing/marked-TODO in `ar` so gaps never
   silently ship.
3. Native-speaker review pass before release (POS/retail domain
   terminology — e.g., "void", "hold bill", "GRN" — needs
   industry-correct Arabic, not literal translation).

## Backend Involvement

- API error codes and enum values are **never** localized server-side —
  the API returns stable machine keys (`errorCode`, enum names); all
  human-facing localization happens in the frontend `errors.json` /
  enum-label maps, so the same API serves both locales without
  content-negotiation complexity, and the on-prem edition doesn't need a
  separate localized API build.
- Exception: system-generated documents that leave the app boundary and
  aren't re-rendered by the frontend (e.g., a PDF invoice generated
  server-side for email attachment) — these accept an explicit `locale`
  parameter and render fully server-side using the same `messages/`
  resource files (shared via a small shared package or duplicated
  resource set in Infrastructure).

## RTL Note

Language and direction are handled as two related but distinct concerns —
see [10 — RTL Strategy](10-rtl-strategy.md) for the layout/CSS mirroring
approach.
