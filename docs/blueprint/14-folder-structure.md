# 14 — Folder Structure

## Repository Layout (monorepo)

```
BCorPOSWeb/
  backend/
    src/
      BCorPOS.Domain/
      BCorPOS.Application/
      BCorPOS.Infrastructure/
      BCorPOS.Api/
      BCorPOS.Api.Contracts/
    tests/
      BCorPOS.Domain.Tests/
      BCorPOS.Application.Tests/
      BCorPOS.Api.IntegrationTests/
    BCorPOS.sln
  frontend/
    apps/
      web/                    # the Next.js app
    packages/
      ui/                     # shared shadcn/ui-based component library
      config/                 # shared eslint/tsconfig/tailwind config
      api-client/             # generated typed API client (from OpenAPI)
    package.json               # workspace root (pnpm/turborepo)
    pnpm-workspace.yaml
    turbo.json
  docs/
    blueprint/                 # this document set
  infra/
    docker/
      docker-compose.cloud.yml
      docker-compose.onprem.yml
    k8s/                        # optional, for larger cloud deployments
    scripts/
  .github/workflows/
```

## Backend Detail (`backend/src/BCorPOS.Application`)

```
BCorPOS.Application/
  Common/
    Behaviors/            # ValidationBehavior, LoggingBehavior, AuditBehavior,
                           # LicenseEntitlementBehavior, TransactionBehavior
    Interfaces/            # IAppDbContext, ICurrentUserService, ITenantContext,
                           # IDateTimeProvider, IEmailSender, ISmsSender, IWhatsAppSender
    Exceptions/
    Mappings/
  Auth/
  Sales/
    Commands/ Queries/ Dtos/ Events/ Validators/
  Restaurant/
  Inventory/
  Purchase/
  Crm/
  Hr/
  Reports/
  License/
  SysAdmin/
  Accounting/
  TallyIntegration/
  PaymentGateway/
  Messaging/
  Dashboard/
  Ai/
  DependencyInjection.cs
```

## Backend Detail (`backend/src/BCorPOS.Infrastructure`)

```
BCorPOS.Infrastructure/
  Persistence/
    AppDbContext.cs
    Configurations/         # IEntityTypeConfiguration<T> per entity, grouped by module folder
    Migrations/
    Interceptors/            # AuditSaveChangesInterceptor, SoftDeleteInterceptor
  Identity/
  Tenancy/                    # TenantResolutionMiddleware, connection-string resolver (on-prem)
  ExternalServices/
    PaymentGateways/          # StripeAdapter, PayTabsAdapter, TelrAdapter, ...
    Messaging/                # TwilioSmsAdapter, WhatsAppBusinessAdapter, SmtpEmailAdapter
    Tally/                    # TallyXmlExporter, TallyXmlImporter
    Ai/                       # forecasting/anomaly model client wrappers
  Caching/                    # RedisCacheService
  BackgroundJobs/              # Hangfire job definitions
  DependencyInjection.cs
```

## Frontend Detail (`frontend/apps/web/src`)

```
src/
  app/
    [locale]/...               # see 08-frontend-structure.md for full route tree
    api/
  components/
    ui/ shared/ pos/ inventory/ purchase/ crm/ hr/ reports/ admin/ license/ ai/
  lib/
    api/                        # typed API client wrapper, auth token handling
    auth/
    permissions/                # usePermission(), PermissionGate
    offline/                    # IndexedDB queue, sync worker (POS offline mode)
    utils/
  hooks/
  stores/                       # Zustand stores (pos-cart, shift, ui)
  messages/                     # i18n JSON resources (see 09-i18n-strategy.md)
  styles/
    globals.css
  middleware.ts
  types/                        # shared TS types (mirrors backend DTOs where not codegenned)
public/
  fonts/                        # Latin + Arabic webfonts
  icons/
```

## Naming Conventions Across the Tree

- Backend: PascalCase files/classes, one public type per file, folder name
  matches feature (`CreateInvoice/CreateInvoiceCommand.cs`).
- Frontend: kebab-case route folders (Next.js convention), PascalCase
  component files, camelCase hooks/utilities prefixed `use` for hooks.
- Shared module names are consistent end-to-end: `Inventory` (backend
  folder) ↔ `inventory` (frontend route + messages namespace) ↔ `inv`
  (DB schema) — a single grep term finds a module across the whole stack.
