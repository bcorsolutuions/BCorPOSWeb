# 01 — Product Vision

## Vision Statement

BCor POS Enterprise (branded **SMART POS**) is a unified, cloud-native point
of sale and retail/restaurant management platform that lets a single
operator run one shop or a thousand branches across multiple companies from
one login — in English or Arabic, online or fully offline at the till, and
hosted in the cloud or on the customer's own server — without switching
products as the business grows.

The platform replaces the fragmented buy-a-different-POS-per-industry model
(one product for restaurants, another for supermarkets, another for
pharmacies) with a single core engine that is *configured* per industry via
business-type profiles, rather than *forked* per industry.

## Guiding Principles

1. **One codebase, many industries.** Restaurant table/KOT flows, retail
   barcode/scale flows, and pharmacy batch/expiry flows are all built as
   optional modules on the same Sales/Inventory/Customer core — not
   separate products.
2. **Multi-tenant first, single-tenant always possible.** Every entity is
   scoped by `TenantId → CompanyId → BranchId`. The same code path serves a
   SaaS tenant sharing infrastructure and an on-premise customer with a
   dedicated database.
3. **Offline-resilient POS terminal.** The billing screen must keep taking
   sales during an internet or LAN-server outage and sync when connectivity
   returns; a POS that stops selling during downtime is not acceptable.
4. **Bilingual by construction, not by translation pass.** Arabic/RTL is a
   first-class layout mode designed in from the start, not a CSS patch
   applied later.
5. **Licensing is a feature gate, not a lock.** Modules and limits (branch
   count, user count, AI features, integrations) are controlled by license
   entitlements evaluated at runtime, so upgrading a plan is instant and
   does not require a deployment.
6. **Auditable by default.** Every financial mutation (sale, void, refund,
   stock adjustment, price override) is attributable to a user, a device,
   and a timestamp, and is reversible only through a compensating entry —
   never a hard delete.

## Target Industries & How the Core Adapts

| Industry | What differs | How it's handled |
|---|---|---|
| Restaurant / QSR / Café / Bar | Tables, KOT, kitchen display, modifiers, split bills, delivery aggregators | Restaurant Management module on top of core Sales |
| Bakery / Cold Store | Production/recipe costing, weight-based pricing, short shelf life | Recipe/BOM in Inventory + expiry tracking |
| Supermarket / Grocery / Retail | Barcode/scale integration, promotions, shelf-level stock | Supermarket/Retail module, POS scale & scanner drivers |
| Trading / Wholesale | Bulk pricing tiers, credit terms, LPO-driven purchase | Purchase + Sales credit workflows, tiered pricing |
| Pharmacy | Batch/expiry/lot tracking, regulatory reporting, prescription linkage | Inventory batch/expiry engine, controlled-item flags |
| Electronics / Fashion / Hardware | Serial number tracking, variants (size/color), warranty | Product variant matrix, serial/IMEI tracking |

## Primary Personas

- **Business Owner / Group CEO** — needs cross-company, cross-branch
  consolidated dashboards and control over licensing/subscriptions.
- **Branch Manager** — needs day-to-day operational control: stock,
  staff shifts, daily Z-reports, approvals.
- **Cashier / Waiter** — needs a fast, keyboard/touch-optimized billing
  screen that works even when the network is down.
- **Accountant** — needs GL-ready exports, Tally/ERP integration, VAT/tax
  compliance reports.
- **IT Reseller / Implementation Partner** — deploys the on-premise edition
  for a customer, manages licenses across a portfolio of clients.
- **Platform Super Admin** (BCor internal) — manages tenants, licensing,
  system health, and feature rollout across the whole SaaS fleet.

## Differentiators

- Single platform spans SaaS multi-tenant *and* on-premise single-tenant
  without a different codebase.
- Native Arabic RTL, not a translated afterthought — Arabic numerals,
  Hijri-aware date display option, RTL-mirrored DevExtreme grids.
- AI features (demand forecasting, anomaly detection on voids/discounts,
  smart reorder suggestions, natural-language reports) built on the same
  transactional data, not bolted on via a separate analytics product.
- License Management is a first-class module, not an external system —
  resellers and the platform owner manage entitlements from within the app.

## Non-Goals (v1)

- Not a general-purpose ERP (accounting depth is delivered via integration
  with Tally/QuickBooks/Zoho, not by reimplementing full GL/AP/AR).
- Not a marketplace/e-commerce storefront (POS-first; e-commerce is a
  future integration point via API, not a v1 module).
