# 06 — Database Module Design

## Multi-Tenancy Data Strategy

- **Default (SaaS shared):** single SQL Server database, every tenant-scoped
  table carries `TenantId` (and `CompanyId`, `BranchId` where applicable).
  EF Core global query filters enforce `TenantId = @current` on every query
  automatically; API middleware sets `@current` from JWT claims per request.
- **Enterprise / On-premise:** one database per tenant, identical schema,
  connection string resolved via a tenant→connection lookup at startup.
  `TenantId` column still present for consistency and safe data
  migration between topologies.
- **Never trust the filter alone:** row-level checks are duplicated in the
  Application layer (command/query handlers verify the resolved
  `TenantContext` against the entity being touched) as defense in depth.

## Schema Organization (per module, SQL Server schemas)

| Schema | Module | Representative tables |
|---|---|---|
| `id` | Identity/Auth | Users, Roles, Permissions, RolePermissions, RefreshTokens, UserBranches |
| `org` | Org/Tenancy | Tenants, Companies, Branches, FiscalYears, NumberSeries |
| `sales` | POS Billing / Sales | Invoices, InvoiceLines, Payments, Returns, HeldBills, Shifts, CashMovements |
| `rst` | Restaurant | Tables, TableSections, KOTs, KOTItems, Modifiers, Reservations |
| `inv` | Inventory | Products, ProductVariants, Warehouses, StockLedger, Batches, SerialNumbers, StockTransfers, StockCounts |
| `prc` | Purchase | Suppliers, PurchaseRequisitions, PurchaseOrders, GRNs, SupplierInvoices, DebitNotes |
| `crm` | Customer/CRM | Customers, CustomerGroups, LoyaltyPoints, CommunicationLog, Campaigns |
| `hr` | Employee | Employees, Attendance, Shift Schedules, Commissions |
| `acc` | Accounting | ChartOfAccounts, JournalEntries, JournalLines, TaxRules, TallySyncLog |
| `lic` | License Management | Licenses, LicenseFeatures, LicenseUsageCounters, ActivationLog |
| `sysadm` | System Admin | Settings, PrinterDevices, AuditLog, ImportExportJobs |
| `intg` | Integrations | PaymentGatewayConfig, SmsEmailWaTemplates, WebhookLog |
| `ai` | AI Features | ForecastResults, AnomalyFlags, AiJobRuns |

Cross-schema foreign keys are allowed (single database), but each module's
EF Core `DbContext` (or `DbContext` partial / bounded context) only maps
its own schema's entities — cross-module reads go through the Application
layer's query handlers, not direct EF navigation across module boundaries,
to keep modules independently extractable later.

## Key Table Sketches

### `org.Tenants`
`Id, Name, Subdomain, Edition, Status(Trial/Active/Suspended/Cancelled), CreatedAt`

### `org.Companies` / `org.Branches`
`Id, TenantId, Name, LegalName, TaxRegistrationNo, Currency, Timezone` /
`Id, CompanyId, Name, Code, Address, BusinessType(Restaurant/Retail/Pharmacy/...), IsActive`

### `inv.Products`
`Id, TenantId, CompanyId, SKU, BarcodeList, NameEn, NameAr, CategoryId,
UoMBaseId, IsWeighted, IsSerialTracked, IsBatchTracked, TaxRuleId, IsActive`

### `inv.StockLedger` (append-only, source of truth for on-hand qty)
`Id, TenantId, BranchId, ProductId, WarehouseId, MovementType(Sale/Purchase/
Transfer/Adjustment/Return/Production), Quantity, UnitCost, ReferenceType,
ReferenceId, BatchId, SerialNumberId, CreatedAt, CreatedByUserId`

On-hand stock is a **materialized/derived** value (view or cached
aggregate) computed from `StockLedger`, never stored as a mutable counter
that drifts — this keeps stock auditable and rebuildable.

### `sales.Invoices` / `sales.InvoiceLines`
`Id, TenantId, BranchId, InvoiceNo, Series, OrderType, CustomerId, Status
(Draft/Held/Completed/Voided/Returned), SubTotal, TaxTotal, DiscountTotal,
GrandTotal, IsOfflineSynced, ClientIdempotencyKey, CreatedAt, CreatedByUserId,
ShiftId` /
`Id, InvoiceId, ProductId, Qty, UnitPrice, DiscountAmount, TaxAmount,
LineTotal, KOTStatus (nullable, restaurant only)`

### `lic.Licenses`
`Id, TenantId, Edition, IssuedAt, ExpiresAt, MaxBranches, MaxUsers,
MaxTransactionsPerMonth, HardwareFingerprint (on-prem), Status
(Trial/Active/GracePeriod/Expired/Suspended)` +
`lic.LicenseFeatures (LicenseId, FeatureKey, IsEnabled)` — one row per
gated module/feature, checked at runtime by a `IFeatureEntitlementService`.

### `sysadm.AuditLog` (immutable)
`Id, TenantId, BranchId, UserId, EntityName, EntityId, Action
(Create/Update/Delete/Void/Approve), BeforeJson, AfterJson, IpAddress,
DeviceId, CreatedAt`

## Conventions

- Every table: `Id (uniqueidentifier, default newsequentialid())`,
  `TenantId`, `CreatedAt`, `CreatedByUserId`, `ModifiedAt`,
  `ModifiedByUserId`, `RowVersion (rowversion)` for optimistic concurrency.
- Soft delete via `IsDeleted` + `DeletedAt` on master data
  (Products, Customers, Suppliers, Employees); **hard delete is never used
  on financially significant tables** — voids/reversals only.
- Money columns: `decimal(18,4)`; quantity columns: `decimal(18,4)` to
  support fractional (weighted) items.
- All bilingual master data carries paired columns (`NameEn`, `NameAr`,
  `DescriptionEn`, `DescriptionAr`) rather than a separate translation
  table, for join simplicity on high-frequency POS lookups; low-frequency
  UI strings use the frontend i18n resource files instead (see
  [09 — i18n Strategy](09-i18n-strategy.md)).
- Indexing: composite index `(TenantId, BranchId, CreatedAt)` on all
  high-volume transactional tables to keep tenant-scoped range scans fast
  in the shared-schema topology.

## Migrations

- EF Core Code-First migrations per module's `DbContext`, applied via a
  startup migration runner (idempotent, safe to run on every deploy).
- On-premise upgrades run migrations through a guarded CLI step in the
  installer, with an automatic pre-migration backup.
