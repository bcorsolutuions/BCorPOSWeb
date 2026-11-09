# 15 — Suggested Packages

## NuGet (Backend — ASP.NET Core 8)

**Core / Web**
- `Microsoft.AspNetCore.Authentication.JwtBearer`
- `Asp.Versioning.Mvc` / `Asp.Versioning.Mvc.ApiExplorer`
- `Swashbuckle.AspNetCore` or `NSwag.AspNetCore` (OpenAPI + TS client codegen)
- `Microsoft.AspNetCore.RateLimiting` (built-in .NET 8 middleware)

**CQRS / Validation / Mapping**
- `MediatR`
- `FluentValidation.AspNetCore`
- `Mapster` (or `AutoMapper` if the team prefers it)

**Data**
- `Microsoft.EntityFrameworkCore.SqlServer`
- `Microsoft.EntityFrameworkCore.Design`
- `EFCore.NamingConventions` (if snake_case is ever wanted; optional)
- `Z.EntityFramework.Plus.EFCore` (batch operations) — evaluate necessity
  before adding
- `Dapper` (for hot-path read queries/reports where EF overhead matters)

**Identity / Security**
- `Microsoft.AspNetCore.Identity.EntityFrameworkCore`
- `Otp.NET` (TOTP MFA)
- `BCrypt.Net-Next` or rely on ASP.NET Core Identity's Argon2/PBKDF2 hasher

**Background Jobs / Messaging**
- `Hangfire.AspNetCore` + `Hangfire.SqlServer`
- `Azure.Messaging.ServiceBus` (cloud) or `RabbitMQ.Client` (on-prem option)
- `Microsoft.AspNetCore.SignalR` (+ `Microsoft.AspNetCore.SignalR.StackExchangeRedis` for backplane)

**Caching**
- `Microsoft.Extensions.Caching.StackExchangeRedis`

**Logging / Observability**
- `Serilog.AspNetCore`, `Serilog.Sinks.ApplicationInsights` / `Serilog.Sinks.Elasticsearch`
- `Microsoft.ApplicationInsights.AspNetCore` (cloud) or OpenTelemetry
  exporter (`OpenTelemetry.Extensions.Hosting`) for portability across
  cloud/on-prem observability backends

**Integrations**
- `Twilio` (SMS)
- WhatsApp Business Cloud API — no official SDK; typed `HttpClient` wrapper
  in `Infrastructure/ExternalServices/Messaging`
- Payment gateways: provider-specific SDKs (`Stripe.net`; regional
  gateways like PayTabs/Telr typically via REST — typed `HttpClient`
  wrappers)
- `System.Xml.Linq` (built-in) for Tally XML generation — no extra package
  needed

**Testing**
- `xunit`, `xunit.runner.visualstudio`
- `FluentAssertions`
- `Moq` or `NSubstitute`
- `Testcontainers.MsSql` (integration tests against a real SQL Server
  container, not a mocked provider)
- `WebApplicationFactory` (built into `Microsoft.AspNetCore.Mvc.Testing`)
  for API integration tests
- `Bogus` (test data generation)

## npm (Frontend — Next.js)

**Framework / Core**
- `next`, `react`, `react-dom`
- `typescript`

**Styling / UI**
- `tailwindcss`, `postcss`, `autoprefixer`
- `shadcn/ui` (CLI-scaffolded components, not a runtime dependency per se —
  components are copied into `packages/ui`)
- `@radix-ui/*` (underlying shadcn primitives; installed as shadcn adds
  each component)
- `class-variance-authority`, `clsx`, `tailwind-merge`
- `lucide-react` (icon set)
- `devextreme`, `devextreme-react` (DataGrid + other grid-adjacent widgets)

**Forms / Validation**
- `react-hook-form`
- `zod`
- `@hookform/resolvers`

**Data Fetching / State**
- `@tanstack/react-query`
- `zustand`
- `axios` or native `fetch` wrapper (typed client generated from OpenAPI)

**i18n**
- `next-intl`

**Real-time**
- `@microsoft/signalr`

**Offline (POS terminal)**
- `idb` (IndexedDB wrapper) or `dexie`
- `workbox-window` / `next-pwa` (or hand-rolled service worker) for PWA
  offline shell caching

**Dates/Numbers**
- Rely on native `Intl` APIs where possible; `date-fns` (+ `date-fns-tz`)
  if richer date arithmetic is needed; avoid `moment.js` (legacy/bloated)

**Tooling**
- `eslint`, `eslint-config-next`, `@typescript-eslint/*`
- `prettier`, `prettier-plugin-tailwindcss`
- `husky`, `lint-staged`
- `turbo` (monorepo task runner), `pnpm` (package manager)
- `openapi-typescript` or `@openapitools/openapi-generator-cli` (typed API
  client generation from the backend's OpenAPI spec)

**Testing**
- `vitest` or `jest` + `@testing-library/react`
- `playwright` (E2E, including the RTL/`ar` visual regression matrix
  described in [10 — RTL Strategy](10-rtl-strategy.md))

## Version/Update Policy

- Pin major versions in each workspace's lockfile; Dependabot/Renovate
  configured for weekly patch/minor PRs, manual review for majors.
- `npm audit` / `dotnet list package --vulnerable` run in CI on every PR
  (see [11 — Security Plan](11-security-plan.md)).
