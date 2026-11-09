# 17 — Deployment Plan

## Environments

| Environment | Purpose | Data |
|---|---|---|
| `local` | Developer machine, Docker Compose for SQL Server/Redis | synthetic seed data |
| `dev` | Shared integration environment, auto-deployed on merge to `main` | synthetic/anonymized |
| `staging` | Pre-production, mirrors prod topology, used for UAT and release sign-off | anonymized copy of prod or realistic synthetic |
| `production` (SaaS) | Multi-tenant shared cloud environment | real |
| `production` (on-prem) | Customer-hosted, versioned installer releases | real, customer-owned |

## CI/CD Pipeline (GitHub Actions, or Azure DevOps equivalent)

```
On PR:
  - restore/build backend (dotnet build)
  - restore/build frontend (pnpm turbo build)
  - lint (eslint, dotnet format --verify-no-changes)
  - unit tests (xunit, vitest)
  - integration tests (Testcontainers-backed, real SQL Server container)
  - vulnerability scan (npm audit, dotnet list package --vulnerable)
  - OpenAPI contract diff check (fails if breaking change without version bump)

On merge to main:
  - all of the above, plus:
  - build & push container images (api, web) tagged with commit SHA
  - deploy to `dev` automatically
  - E2E smoke suite (Playwright) against `dev`

On release tag (vX.Y.Z):
  - promote images to `staging`
  - run full Playwright suite (en + ar, RTL matrix) against staging
  - manual approval gate -> promote to `production` (SaaS)
  - build on-prem installer artifact (versioned, signed) -> publish to
    release channel for partners/resellers to pull on their own schedule
```

## Cloud (SaaS) Topology

- Containerized (`api` and `web` as separate images), orchestrated via
  Azure Container Apps / AKS (or equivalent), behind a load balancer with
  autoscaling on CPU/request count.
- SQL Server: Azure SQL Database (shared elastic pool for smaller tenants,
  dedicated database tier for Enterprise-isolated tenants per
  [02 — System Architecture](02-system-architecture.md)).
- Redis: Azure Cache for Redis (SignalR backplane, query/entitlement
  cache).
- Blob storage: Azure Blob Storage for receipts, product images, report
  exports.
- Background jobs: Hangfire dashboard secured behind admin auth, running
  as part of the API host or a dedicated worker container at higher scale.
- Zero-downtime deploys: rolling updates behind health-check gates;
  EF Core migrations run as a separate pre-deploy step (idempotent
  migration runner), never inline in app startup for production to avoid
  multiple instances racing to migrate simultaneously.

## On-Premise Topology

- **Docker Compose** package: `api`, `sqlserver`, `redis`, `web` (or `web`
  built as static export served by `api`/nginx if the customer prefers a
  single process footprint) — one `docker-compose.onprem.yml` +
  environment file, installer script handles first-run migration + admin
  account bootstrap + license activation prompt.
- **Classic IIS** alternative for customers without Docker: published
  `dotnet publish` output behind IIS + SQL Server native install, `web`
  built as a Next.js standalone output or static export served
  separately.
- Backup: scheduled `sqlcmd`/`sqlpackage` backup job with configurable
  retention, documented restore procedure as part of the installer
  package.
- Updates: versioned installer releases, customer/partner-controlled
  timing (never auto-updates a production on-prem box silently), migration
  script run automatically as part of the documented upgrade procedure
  with a pre-upgrade backup enforced by the script itself.

## Monitoring & Alerting

- Centralized structured logs (Serilog → Application Insights for cloud,
  → local file + optional ELK/Seq for on-prem) with correlation IDs
  threaded from the frontend request through to background jobs.
- Health check endpoints (`/health/live`, `/health/ready`) wired to the
  orchestrator's liveness/readiness probes (cloud) or a simple monitoring
  script (on-prem).
- Alerting on: elevated 5xx rate, failed background jobs (esp. license
  sync, payment webhook processing), approaching-license-limit events,
  cross-tenant isolation test failures in CI (release-blocking, not just
  a notification).

## Rollback Strategy

- Cloud: previous container image tag redeployed via the same pipeline
  (images are immutable, tagged by commit SHA); DB migrations are written
  additive/backward-compatible within a release window so a code rollback
  doesn't require an immediate DB rollback.
- On-prem: installer keeps the previous version's artifacts and a
  pre-upgrade backup so a customer/partner can restore both app and DB to
  the prior known-good state if an upgrade fails validation.
