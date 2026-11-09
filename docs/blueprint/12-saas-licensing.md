# 12 — SaaS Licensing Plan

## Editions

| Edition | Target | Highlights |
|---|---|---|
| **Starter** | Single shop, 1 branch | POS Billing, basic Inventory, basic Reports, 2 users |
| **Professional** | Growing multi-branch business | + Purchase, CRM, Employee, Restaurant *or* Retail module (choose one industry pack), up to N branches/users |
| **Enterprise** | Multi-company groups, wholesale/trading | All industry packs, Accounting/Tally integration, Payment Gateway, SMS/Email/WhatsApp, unlimited branches, API access |
| **AI Add-on** | Any edition | Forecasting, anomaly detection, NL report query — sold as an add-on entitlement on top of Professional/Enterprise |
| **On-Premise** | Data-residency/offline-priority customers | Same module set as Enterprise, perpetual or annual license, dedicated DB, offline-capable activation |

Edition is not a code branch — it is a set of `LicenseFeatures` rows (see
[06 — Database Design](06-database-design.md)) evaluated at runtime; every
module ships in every build, gated by entitlement.

## Entitlement Model

- `lic.Licenses`: one active license per tenant, carries `Edition`,
  `ExpiresAt`, `MaxBranches`, `MaxUsers`, `MaxTransactionsPerMonth`,
  `Status`.
- `lic.LicenseFeatures`: per-feature boolean/limit flags
  (`FeatureKey = "Restaurant.Module"`, `"Ai.Forecasting"`,
  `"Integration.Tally"`, `"Integration.PaymentGateway"`, ...).
- `IFeatureEntitlementService` (Application layer) is consulted:
  - **Server-side**, as a MediatR pipeline behavior guarding commands tied
    to a gated feature (returns `403 FEATURE_NOT_LICENSED` with the
    `errorCode` the frontend maps to an upgrade prompt).
  - **Client-side**, to hide/disable nav items and buttons for
    non-entitled features (UX only — never the actual security boundary).
- Limits (`MaxBranches`, `MaxUsers`) enforced at the creation command
  (`CreateBranchCommandHandler` checks current count against the license
  before allowing a new branch), not just at login.

## License Key & Activation Flow

- **Cloud/SaaS:** license is implicit in the tenant's subscription record
  (managed via Stripe/local payment provider billing) — no manual key
  entry needed; upgrading a plan updates `lic.Licenses` immediately via a
  billing-webhook handler, no deployment required.
- **On-Premise:** license key (signed, e.g., a JWT-like structure signed
  by BCor's private key) issued by the central License Server, activated
  against a **hardware fingerprint** (machine GUID + disk serial hash) so
  a key can't be copied to a second unlicensed server. Activation flow
  detailed in [05 — Workflows §6](05-workflows.md#6-license-activation-on-premise).
- Offline grace: on-prem app caches the last-validated signed license
  token locally and continues operating for a configurable grace window
  (e.g., 14 days) without phoning home, then enters **read-only/locked
  mode** (data remains visible and exportable, but new transactions are
  blocked) until re-validated — never silently deletes data.

## Reseller / Partner Model

- Reseller Admin role manages a portfolio of tenant licenses: issue trial,
  convert to paid, renew, suspend (e.g., on non-payment) — all logged in
  `lic.ActivationLog` with the acting reseller's identity.
- Commission/reporting for resellers is a Phase 2+ concern (tracked as a
  Reports module extension, not core license logic).

## Trial & Conversion

- Self-serve signup issues a 14-day full-feature trial (all modules
  unlocked at Professional-equivalent limits) to let prospects evaluate
  the whole platform; trial expiry triggers the same grace→locked flow as
  a paid expiry, with in-app upgrade prompts surfaced via the Dashboard
  and a persistent license-status badge (see
  [08 — Frontend Structure](08-frontend-structure.md)).

## Usage Metering

- `lic.LicenseUsageCounters` tracks rolling transaction count, active
  branch/user count; a scheduled job (Hangfire recurring, see
  [07 — API Structure](07-api-structure.md)) recalculates and flags
  approaching-limit tenants for proactive upsell notifications rather than
  a hard cutoff mid-month.

## Downgrade/Cancellation Safety

- Downgrading never deletes data created under a higher edition — it only
  hides/disables further use of the now-unlicensed feature; historical
  records remain readable in Reports so a lapsed customer's data integrity
  is preserved and reactivation is instant.
