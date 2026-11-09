# 08 — Frontend Page Structure (Next.js App Router)

## Route Groups

```
app/
  [locale]/                          # en | ar, next-intl locale segment
    (public)/
      login/page.tsx
      forgot-password/page.tsx
      onboarding/page.tsx            # SaaS signup wizard
      license-expired/page.tsx
    (pos)/                           # dedicated layout: full-screen, touch-optimized, no sidebar
      pos/
        sale/page.tsx                # main billing screen
        tables/page.tsx              # restaurant floor view
        kds/page.tsx                 # kitchen display screen
        shift/open/page.tsx
        shift/close/page.tsx
    (dashboard)/                     # standard app shell: sidebar + topbar
      dashboard/page.tsx
      sales/
        invoices/page.tsx
        invoices/[id]/page.tsx
        quotations/page.tsx
        returns/page.tsx
      restaurant/
        tables/page.tsx
        reservations/page.tsx
        menu-builder/page.tsx
      inventory/
        products/page.tsx
        products/[id]/page.tsx
        stock-ledger/page.tsx
        transfers/page.tsx
        counts/page.tsx
        batches-expiry/page.tsx
      purchase/
        requisitions/page.tsx
        orders/page.tsx
        orders/[id]/page.tsx
        grn/page.tsx
        suppliers/page.tsx
      crm/
        customers/page.tsx
        customers/[id]/page.tsx
        campaigns/page.tsx
        loyalty/page.tsx
      hr/
        employees/page.tsx
        attendance/page.tsx
        commissions/page.tsx
      reports/
        sales/page.tsx
        inventory/page.tsx
        financial/page.tsx
        custom-builder/page.tsx
      accounting/
        chart-of-accounts/page.tsx
        journal-entries/page.tsx
        tax/page.tsx
      integrations/
        tally/page.tsx
        payment-gateways/page.tsx
        messaging/page.tsx
      license/
        overview/page.tsx
        activation/page.tsx
        usage/page.tsx
      admin/
        companies/page.tsx
        branches/page.tsx
        users/page.tsx
        roles-permissions/page.tsx
        settings/page.tsx
        audit-log/page.tsx
      ai/
        forecast/page.tsx
        anomalies/page.tsx
        ask/page.tsx                 # natural-language report query
  api/                                # Next.js route handlers (BFF)
    auth/[...nextauth]/route.ts (or custom JWT proxy)
    proxy/[...path]/route.ts         # generic authenticated proxy to ASP.NET Core API
```

## Layout Strategy

- `app/[locale]/layout.tsx` — root layout: sets `<html dir={locale==='ar'?'rtl':'ltr'} lang={locale}>`,
  loads fonts (Latin + Arabic-capable, e.g., IBM Plex Sans Arabic / Noto
  Kufi), wraps `next-intl` provider, theme provider (light/dark), and
  global toast/notification provider.
- `(dashboard)/layout.tsx` — sidebar (module navigation, permission-filtered),
  topbar (branch switcher, company switcher, locale switcher, user menu,
  license status badge), breadcrumb.
- `(pos)/layout.tsx` — minimal chrome, large touch targets, persistent
  offline-status indicator, shift/cash-drawer status, quick logout (PIN
  re-lock on idle).
- `(public)/layout.tsx` — centered auth card layout, locale switcher only.

## Component Organization

```
components/
  ui/                # shadcn/ui primitives (button, dialog, input, ...)
  shared/             # cross-module reusable: DataGridWrapper (DevExtreme),
                       # MoneyInput, BarcodeScannerInput, PermissionGate,
                       # BranchCompanySwitcher, RtlAwareIcon
  pos/                # POS-specific: ProductTile, CartLine, PaymentPad,
                       # HeldBillsDrawer, TableMap, KotCard
  inventory/, purchase/, crm/, hr/, reports/, admin/, license/, ai/
                       # module-specific components, colocated with their route where reasonable
```

## State & Data Fetching

- Server Components for read-heavy pages (reports, listing pages initial
  load) fetching directly through a typed server-side API client.
- Client Components + TanStack Query for interactive/mutating views (POS
  sale screen, forms) — handles optimistic updates and the offline queue.
- Zustand (or React Context for smaller scope) for POS-local state: current
  cart, held bills, shift state — persisted to IndexedDB for offline
  resilience.
- Forms: React Hook Form + Zod schemas shared (where feasible) with backend
  DTO shape via generated types, single source of truth for validation
  messages keyed for i18n.

## DevExtreme DataGrid Usage

- Wrapped once in `components/shared/DataGridWrapper.tsx` to centrally
  configure: RTL mode from locale context, column header i18n, export
  (Excel/PDF) with Arabic text support, server-side paging/sorting/filtering
  bound to the standard list-query contract used across all modules.

## Route Protection

- Middleware (`middleware.ts`) checks JWT presence/expiry and
  locale-prefixes the URL; fine-grained permission checks additionally
  applied per-page via a `PermissionGate`/`usePermission()` hook backed by
  the permission claims decoded from the JWT, re-validated by every API
  call server-side regardless of client-side gating.
