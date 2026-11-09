# 02 — System Architecture

## High-Level Architecture (text diagram)

```
                                   ┌─────────────────────────────┐
                                   │        Clients               │
                                   │  Web (Next.js, RTL/LTR)      │
                                   │  POS Terminal (PWA, offline) │
                                   │  Kitchen Display (WS client) │
                                   │  Mobile (future, same API)   │
                                   └───────────────┬───────────────┘
                                                    │ HTTPS (JWT bearer)
                                                    ▼
                                   ┌─────────────────────────────┐
                                   │   API Gateway / BFF layer     │
                                   │  Next.js Route Handlers or    │
                                   │  YARP reverse proxy           │
                                   │  - rate limiting               │
                                   │  - request logging             │
                                   └───────────────┬───────────────┘
                                                    ▼
                     ┌────────────────────────────────────────────────────┐
                     │            ASP.NET Core 8 Web API                    │
                     │  ┌───────────────┐ ┌───────────────┐ ┌────────────┐ │
                     │  │ Auth/Identity │ │ Sales/POS      │ │ Inventory  │ │
                     │  ├───────────────┤ ├───────────────┤ ├────────────┤ │
                     │  │ Purchase      │ │ CRM/Customer   │ │ Employee   │ │
                     │  ├───────────────┤ ├───────────────┤ ├────────────┤ │
                     │  │ Reports       │ │ License Mgmt   │ │ SysAdmin   │ │
                     │  ├───────────────┤ ├───────────────┤ ├────────────┤ │
                     │  │ Accounting/   │ │ Integrations   │ │ AI/ML      │ │
                     │  │ Tally bridge  │ │ (SMS/Email/WA/ │ │ services   │ │
                     │  │               │ │  Payment GW)   │ │            │ │
                     │  └───────────────┘ └───────────────┘ └────────────┘ │
                     │      Cross-cutting: Tenant middleware, RBAC,         │
                     │      MediatR pipeline (validation, logging, audit)   │
                     └───────────────┬──────────────────┬────────────────┘
                                     ▼                  ▼
                     ┌───────────────────────┐  ┌──────────────────────┐
                     │  SQL Server            │  │  Supporting services  │
                     │  - Shared schema, or   │  │  - Redis (cache,      │
                     │  - DB-per-tenant       │  │    session, SignalR   │
                     │  (on-prem/enterprise)  │  │    backplane)         │
                     │                        │  │  - Blob/File storage  │
                     │                        │  │    (receipts, images) │
                     │                        │  │  - Message queue      │
                     │                        │  │    (Azure Service Bus │
                     │                        │  │    / RabbitMQ) for    │
                     │                        │  │    sync + integrations│
                     └───────────────────────┘  └──────────────────────┘
```

## Architectural Style

- **Backend:** Clean Architecture (Domain → Application → Infrastructure →
  API) with CQRS via MediatR. Each business module is a vertical slice
  (feature folder) inside Application, not a horizontal service-per-layer
  spread.
- **Frontend:** Next.js App Router, server components for data-heavy
  read views (reports, dashboards), client components for interactive
  POS/grid screens. BFF route handlers proxy to the ASP.NET Core API,
  attach the JWT, and can aggregate calls to reduce client round-trips.
- **Not microservices in v1.** A modular monolith (one deployable API,
  logically separated by module) is intentional: it matches team size,
  keeps cross-module transactions (e.g., Sale → Inventory → Accounting)
  simple, and avoids distributed-transaction complexity. Modules are built
  with clear boundaries (separate DbContext schemas, no cross-module
  direct EF navigation) so any module can be extracted into its own
  service later if a specific tenant's scale demands it (most likely
  candidates: Reports/Analytics, AI services, Integrations).

## Multi-Tenancy Model

Three-level scoping on every business entity: **Tenant → Company → Branch**.

- **Tenant** = a SaaS customer account (or one on-prem installation).
  Carries the subscription/license.
- **Company** = a legal entity under a tenant (a tenant can run multiple
  companies, e.g., a group owning three restaurant brands).
- **Branch** = a physical or logical outlet under a company.

Tenancy resolution strategy:

- **SaaS (cloud):** subdomain or path-based tenant resolution
  (`{tenant}.smartpos.app` or a login that resolves tenant from the
  authenticated user), shared SQL Server with `TenantId` discriminator
  column on every table + EF Core global query filters, enforced again at
  the API middleware level (defense in depth — never trust the filter
  alone).
- **Enterprise / On-premise:** dedicated database per tenant (same schema),
  selected via connection-string resolution at startup or via a central
  license server call. This isolates large customers and satisfies
  data-residency requirements without a different codebase.
- **Tenant context propagation:** a `TenantContext` (Tenant/Company/Branch
  IDs + license entitlements) is resolved once per request from JWT claims,
  injected as a scoped service, and consumed by the EF Core global filters,
  MediatR pipeline behaviors, and authorization handlers.

## Offline POS Mode

- POS terminal client (PWA) keeps a local IndexedDB cache of: today's price
  list, tax rules, active promotions, and a queue of unsynced sale
  transactions.
- Sales made offline are assigned a client-generated idempotency key
  (GUID) and queued; on reconnect, a sync endpoint replays the queue
  idempotently (server dedupes by key) and returns authoritative
  server-assigned invoice numbers.
- Conflict policy: offline sales never fail at the till (never block a
  cashier); inventory oversell conflicts are resolved server-side after
  sync and flagged for manager review rather than rejected.

## Cross-Cutting Concerns

- **Validation:** FluentValidation validators run as a MediatR pipeline
  behavior before the handler executes.
- **Audit logging:** a pipeline behavior + EF Core `SaveChanges`
  interceptor writes an immutable audit trail (who/what/when/before-after)
  for all `Create/Update/Delete` commands on financially significant
  entities.
- **Caching:** Redis for reference data (tax rules, price lists, license
  entitlements) with short TTL + explicit invalidation on write.
- **Real-time:** SignalR (Redis backplane) for Kitchen Display Screen order
  push, table status updates, and live dashboard tiles.
- **Background jobs:** Hangfire or a hosted-service worker for report
  generation, scheduled SMS/email/WhatsApp campaigns, license expiry
  checks, and AI batch jobs (forecasting, anomaly scoring).

## Deployment Topologies

1. **Pure SaaS (multi-tenant shared):** single API + single DB (or
   sharded DB per region), scaled horizontally behind a load balancer.
2. **Dedicated cloud tenant:** same container images, isolated DB and
   optionally isolated API instance for a large customer needing SLA/data
   isolation.
3. **On-premise:** Docker Compose (API + SQL Server + Redis) or classic
   IIS + SQL Server install on the customer's server, with the POS
   terminal PWA served locally; license validated against an offline
   license file with periodic phone-home when internet is available.

See [17 — Deployment Plan](17-deployment-plan.md) for CI/CD and environment
detail, and [12 — SaaS Licensing Plan](12-saas-licensing.md) for how
entitlements are enforced per topology.
