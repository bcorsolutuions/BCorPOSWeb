# 13 — Development Phases

## Phase 0 — Foundations (infrastructure, no business features)
- Repo scaffolding (frontend + backend solution structure, see
  [14 — Folder Structure](14-folder-structure.md))
- Clean Architecture skeleton, CI pipeline (build/lint/test on PR)
- Identity/Auth module (JWT, RBAC, tenant/company/branch entities)
- Multi-tenancy plumbing (EF Core global filters, TenantContext middleware)
- i18n/RTL scaffolding (locale routing, base Tailwind logical-property setup)
- Base UI shell: shadcn/ui theme, layout shells (public/dashboard/pos)
- **Exit criteria:** can log in, switch locale/RTL, see an empty
  role-aware dashboard shell, tenant isolation tests pass in CI.

## Phase 1 — MVP: Core POS + Inventory (single-branch retail viable)
- Inventory: products, categories, UoM, stock ledger, basic stock adjustment
- POS Billing: sale screen, barcode scan, cash/card payment, hold/recall,
  basic returns, receipt printing, shift open/close, X/Z report
- Sales Management: invoice list, basic customer linkage (no full CRM yet)
- System Administration: company/branch setup, user/role management,
  number series
- Reports & Analytics: sales summary, stock on-hand, basic export
- License Management: trial/edition entitlement enforcement (minimum
  viable — full reseller tooling comes later)
- **Exit criteria:** a single-branch retail shop can run daily operations
  end-to-end on the platform.

## Phase 2 — Multi-Branch, Purchase, CRM
- Multi-branch: branch switcher, stock transfer, branch-scoped reporting
- Purchase Management: requisition → PO → GRN → supplier invoice
- Customer Management / CRM: profiles, groups, credit terms, loyalty points
- Employee Management: profiles, roles, PIN login, basic attendance
- Approval workflow engine (generic, reused by void/discount/PO limits)
- Dashboard: role-aware tiles, cross-branch consolidated view
- **Exit criteria:** a multi-branch trading/wholesale business is fully
  operational; approval chains functioning.

## Phase 3 — Industry Verticals: Restaurant & Supermarket packs
- Restaurant Management: tables, KOT, Kitchen Display Screen (SignalR),
  modifiers/combos, split bills, reservations
- Supermarket/Retail: scale/barcode integrations, promotions engine (BOGO,
  tiered), shelf-tag printing
- Offline POS mode: local queue, idempotent sync, conflict-flagging
- **Exit criteria:** restaurant and supermarket business types fully
  supported; POS works through a simulated connectivity outage.

## Phase 4 — Accounting, Tally, Payment Gateways, Messaging
- Accounting/ERP Integration: chart of accounts, auto journal entries, tax
  reports, GL export
- Tally Integration: XML export/import, sync scheduler
- Payment Gateway Integration: at least 2 providers (1 international, 1
  regional), webhook-based settlement
- SMS/Email/WhatsApp Integration: transactional templates, delivery
  tracking, basic campaign sending
- **Exit criteria:** invoices flow to accounting automatically; a card
  payment can be taken end-to-end; a low-stock alert can reach a manager
  by WhatsApp.

## Phase 5 — License/SaaS Hardening, Pharmacy/Specialty verticals
- Full License Management: reseller portfolio view, on-prem hardware-lock
  activation, offline grace/lock enforcement, usage metering/upsell alerts
- Inventory: batch/lot/expiry tracking, serial/IMEI tracking (Pharmacy,
  Electronics, Fashion packs)
- Bakery/Cold Store: recipe/BOM costing, production consumption
- **Exit criteria:** on-premise installer produces a fully licensed,
  self-contained deployment; pharmacy/electronics business types supported.

## Phase 6 — AI Features
- Demand forecasting & smart reorder suggestions
- Anomaly detection (voids/discounts/refunds/shrinkage signals)
- Natural-language report query
- Dynamic pricing/promotion suggestions
- **Exit criteria:** AI add-on entitlement unlocks working forecast and
  anomaly dashboards backed by real historical transaction data (needs
  Phase 1–3 data volume to be meaningful — sequenced deliberately last).

## Phase 7 — Scale & Polish
- Performance hardening (load testing shared-schema SaaS topology),
  read-replica reporting if needed
- Advanced report builder (custom/self-serve)
- Mobile companion app (read-only dashboards / approvals on the go) via
  the same API
- Extraction of highest-load modules (Reports, AI) into standalone
  services if a specific tenant's scale requires it (see
  [02 — System Architecture](02-system-architecture.md) — deferred by
  design, not a Phase 1 concern)

## Cross-Phase (continuous, every phase)
- Bilingual QA (every new screen ships with `en` + `ar` translations, RTL
  screenshot tests) — never deferred to a later phase, see
  [09](09-i18n-strategy.md)/[10](10-rtl-strategy.md).
- Security review gate per phase (see [11 — Security Plan](11-security-plan.md)).
- Cross-tenant isolation regression tests run in CI from Phase 0 onward.
