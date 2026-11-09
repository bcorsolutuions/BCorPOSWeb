# 07 — API Module Structure (ASP.NET Core 8)

## Layering (Clean Architecture)

```
BCorPOS.Domain            - Entities, value objects, domain events, enums. No dependencies.
BCorPOS.Application       - CQRS commands/queries (MediatR), validators (FluentValidation),
                             interfaces (IRepository, IEmailSender, etc.), DTOs, mapping (Mapster/AutoMapper)
BCorPOS.Infrastructure     - EF Core DbContexts, repository impls, external service clients
                             (payment gateways, SMS/WhatsApp, Tally, Redis, Hangfire)
BCorPOS.Api                - Controllers (thin), middleware, filters, DI composition, Swagger
BCorPOS.Api.Contracts      - Shared request/response contracts (optionally published as a
                             package for frontend codegen / typed client generation)
```

Each business module is a **vertical slice inside Application**, e.g.:

```
Application/
  Sales/
    Commands/
      CreateInvoice/
        CreateInvoiceCommand.cs
        CreateInvoiceCommandHandler.cs
        CreateInvoiceCommandValidator.cs
      VoidInvoice/
      ApplyDiscount/
    Queries/
      GetInvoiceById/
      SearchInvoices/
    Dtos/
    Events/
      InvoiceCreatedEvent.cs (domain event -> triggers Inventory + Accounting handlers)
  Inventory/
    Commands/ Queries/ Dtos/ Events/
  Purchase/
  Crm/
  Employee/
  Reports/
  License/
  SysAdmin/
  Accounting/
  TallyIntegration/
  PaymentGateway/
  Messaging/          (SMS/Email/WhatsApp)
  Dashboard/
  Ai/
```

## Controller Structure & Versioned Routes

One controller per module aggregate root, thin (maps HTTP → MediatR
`Send`/`Publish` only, no business logic):

```
/api/v1/auth/login
/api/v1/auth/refresh-token
/api/v1/pos/invoices                 GET/POST
/api/v1/pos/invoices/{id}/void       POST
/api/v1/pos/invoices/{id}/payments   POST
/api/v1/pos/shifts/open              POST
/api/v1/pos/shifts/{id}/close        POST
/api/v1/restaurant/tables            GET/POST/PATCH
/api/v1/restaurant/kots              GET/POST
/api/v1/restaurant/kots/{id}/status  PATCH
/api/v1/inventory/products           GET/POST/PATCH/DELETE
/api/v1/inventory/stock-ledger       GET
/api/v1/inventory/transfers          GET/POST
/api/v1/inventory/counts             GET/POST
/api/v1/purchase/orders              GET/POST/PATCH
/api/v1/purchase/grn                 GET/POST
/api/v1/sales/quotations             GET/POST
/api/v1/crm/customers                GET/POST/PATCH
/api/v1/crm/campaigns                GET/POST
/api/v1/hr/employees                 GET/POST/PATCH
/api/v1/reports/sales-summary        GET
/api/v1/reports/custom               POST (report definition)
/api/v1/license/activate             POST
/api/v1/license/entitlements         GET
/api/v1/sysadmin/companies           GET/POST/PATCH
/api/v1/sysadmin/roles               GET/POST/PATCH
/api/v1/accounting/journal-entries   GET/POST
/api/v1/integrations/tally/sync      POST
/api/v1/integrations/payment/webhook/{provider}  POST
/api/v1/integrations/messaging/send  POST
/api/v1/dashboard/summary            GET
/api/v1/ai/forecast                  GET
/api/v1/ai/anomalies                 GET
```

- API versioned via URL segment (`/api/v1/...`) using `Asp.Versioning`;
  breaking changes ship as `/api/v2/...` with the old version kept until
  deprecation window closes (important for on-prem customers who upgrade
  on their own schedule).
- Bulk/offline-sync endpoints (`/api/v1/pos/invoices/sync-batch`) accept an
  array with per-item idempotency keys and return per-item status.

## Cross-Cutting Middleware Pipeline

```
Request
  -> Exception handling middleware (maps domain exceptions -> ProblemDetails)
  -> Correlation-Id middleware (adds/propagates X-Correlation-Id)
  -> Authentication (JWT bearer)
  -> Tenant resolution middleware (reads claims -> builds TenantContext,
       or resolves on-prem's single fixed tenant)
  -> Authorization (policy-based, permission claims)
  -> Rate limiting (per tenant/IP)
  -> Controller -> MediatR.Send(command/query)
       -> Pipeline behaviors: Logging -> Validation -> License entitlement
          check -> Transaction (DbContext) -> Audit -> Handler
  -> Response (standard envelope, see below)
```

## Response Envelope

```json
{
  "success": true,
  "data": { },
  "error": null,
  "meta": { "page": 1, "pageSize": 25, "total": 134, "correlationId": "..." }
}
```

Errors follow RFC 7807 `ProblemDetails` extended with an `errorCode`
(machine-readable, e.g., `INVENTORY_INSUFFICIENT_STOCK`) so the frontend
can localize error messages independent of the server's message string.

## Real-Time Endpoints (SignalR Hubs)

```
/hubs/kds            - Kitchen Display Screen (order push, status updates)
/hubs/dashboard       - live dashboard tiles
/hubs/notifications   - approval requests, license alerts, low-stock alerts
```

## Background Jobs (Hangfire)

- `RecurringJob`: nightly stock valuation, license expiry sweep, scheduled
  report delivery, loyalty point expiry.
- `Enqueue` (fire-and-forget): SMS/WhatsApp send, Tally sync push, AI
  forecast recompute after large stock/sales events.

## API Documentation & Client Generation

- Swagger/OpenAPI generated per version; `NSwag` or `openapi-typescript`
  used to generate a typed TypeScript client consumed by the Next.js BFF
  layer, keeping frontend request/response types in sync with the backend
  contracts automatically as part of CI.
