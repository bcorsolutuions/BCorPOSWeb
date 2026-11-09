# 11 — Security Plan

## Authentication

- **JWT bearer tokens**: short-lived access token (15 min) + long-lived
  refresh token (7–30 days, rotating on use, stored as a hashed value
  server-side so a stolen DB dump can't be replayed as a valid refresh
  token).
- Refresh tokens bound to device/session fingerprint; revocation list
  (`RefreshTokens.RevokedAt`) checked on every refresh, enabling
  "log out this device" and "log out everywhere" from the admin UI.
- **POS PIN login**: a lightweight secondary auth mode for cashier
  till-switching (fast PIN entry) that still resolves to the same
  underlying JWT/claims — PIN auth is scoped (till-only permissions) and
  time-boxed to the shift, never a substitute for the full account
  password on sensitive actions.
- Password policy: bcrypt/Argon2 hashing (ASP.NET Core Identity default
  hasher, upgraded to Argon2id), configurable complexity + lockout after N
  failed attempts, mandatory reset on first login for admin-created
  accounts.
- Optional MFA (TOTP) enforced for Tenant Owner / Company Admin roles and
  for the Platform Super Admin (mandatory, not optional, for the latter).

## Authorization

- **Policy-based RBAC**: permissions are `Module.Action` claims embedded
  in the JWT at login and re-derived server-side from the `RolePermissions`
  table on every token issuance/refresh (not solely trusted from an old
  token — a permission revoked mid-session takes effect on next refresh,
  and highly sensitive permission checks additionally re-query the DB
  live rather than trusting the JWT claim, e.g., `License.Manage`,
  `SysAdmin.*`).
- **Tenant/branch scoping** enforced at three layers (defense in depth):
  EF Core global query filter → Application-layer explicit
  `TenantContext` check in the handler → API-level policy requiring a
  matching tenant claim. A bug in any one layer alone cannot leak
  cross-tenant data.
- Custom `[RequirePermission("Inventory.AdjustStock")]` attribute /
  policy provider resolves permissions dynamically (not a fixed enum),
  so new modules/permissions don't require a code redeploy to register —
  only a data seed.

## Data Protection

- TLS 1.2+ enforced everywhere (HSTS on the web app); on-prem installer
  provisions a self-signed or Let's Encrypt cert by default, never ships
  plaintext HTTP as the default.
- Sensitive columns (payment gateway API keys/secrets, SMTP credentials,
  WhatsApp API tokens) encrypted at rest via SQL Server Always
  Encrypted or application-level envelope encryption (Data Protection
  API), never stored as plain text in `intg.PaymentGatewayConfig` etc.
- PII minimization: full card numbers are never stored (payment gateways
  handle card data via tokenization/hosted fields — PCI scope stays with
  the gateway, not BCor POS).
- Backups (on-prem) encrypted at rest; cloud backups encrypted via
  provider-managed keys (Azure Storage Service Encryption) at minimum,
  customer-managed keys as an enterprise option.

## Tenant Isolation Hardening

- Shared-schema tenants: automated test suite includes cross-tenant
  isolation tests (attempt to fetch/mutate Tenant B's data using Tenant
  A's token) run in CI as a release gate, not just a manual check.
- Rate limiting and quota enforcement per tenant to prevent one tenant's
  load/abuse from degrading others in the shared SaaS topology.
- Audit log (`sysadm.AuditLog`) is append-only (no `UPDATE`/`DELETE`
  grants on that table even for the application's own SQL login beyond
  `INSERT`), so a compromised app-tier credential still can't erase its
  own trail.

## OWASP Top 10 Coverage

| Risk | Mitigation |
|---|---|
| Broken access control | Policy-based RBAC + tenant scoping at 3 layers (above) |
| Cryptographic failures | TLS everywhere, encrypted secrets at rest, no card data stored |
| Injection | EF Core parameterized queries only; no raw SQL string concatenation; input validated via FluentValidation/Zod at both API and UI boundaries |
| Insecure design | Threat-modeled per module during design review (esp. Payments, License, Auth) |
| Security misconfiguration | Infra-as-code for environment config, no default/sample credentials shipped, security headers (CSP, X-Frame-Options, X-Content-Type-Options) set globally |
| Vulnerable/outdated components | Dependabot/`dotnet list package --vulnerable` + `npm audit` gated in CI |
| Identification/auth failures | Lockout policy, rotating refresh tokens, MFA for privileged roles |
| Software/data integrity failures | Signed license tokens (see [12](12-saas-licensing.md)), CI artifact signing for on-prem installers |
| Logging/monitoring failures | Centralized structured logging (Serilog → Application Insights/ELK), audit log, alerting on repeated auth failures / anomalous admin actions |
| SSRF | Outbound integration calls (payment/SMS/WhatsApp webhooks) go through an allow-listed egress config, no user-controlled arbitrary URL fetch |

## Application-Level Fraud/Abuse Controls (POS-specific)

- Void/discount/refund anomaly thresholds trigger the AI anomaly module
  ([17 AI Features](03-modules.md)) and surface in the audit dashboard —
  security here also means protecting the business from internal
  shrinkage, not just external attackers.
- Every price override, manual discount, and void requires the acting
  user's own re-authentication (PIN) even if a manager already unlocked
  the terminal, so actions are never misattributed to "whoever was logged
  in."

## Compliance Posture

- Design supports GDPR-style data subject requests (export/delete
  customer PII) via a dedicated admin action that respects the "never hard
  delete financial records" rule by anonymizing PII fields on linked
  invoices rather than deleting the invoice itself.
- VAT/tax audit-trail requirements (common in GCC/EU) satisfied by the
  immutable invoice + audit log design (no destructive edits post-issue,
  only linked credit/debit notes).
