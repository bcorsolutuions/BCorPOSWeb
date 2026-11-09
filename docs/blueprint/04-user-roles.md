# 04 — User Roles

Roles are seeded as system defaults but the Permission Matrix Editor (System
Administration module) allows a tenant admin to create custom roles with
fine-grained permission grants. Permissions are `Module.Action` strings
(e.g., `Sales.Void`, `Inventory.AdjustStock`, `License.Manage`) checked via
ASP.NET Core policy-based authorization, sourced from JWT role/permission
claims and re-validated server-side per request.

## Role Catalog

| Role | Scope | Description |
|---|---|---|
| **Platform Super Admin** | Cross-tenant | BCor internal. Manages all tenants, licensing, platform health. Not visible to tenant users. |
| **Reseller / Partner Admin** | Portfolio of tenants | Manages licenses/onboarding for the tenants they sold/deployed. |
| **Tenant Owner / Group CEO** | Tenant (all companies) | Full control across all companies & branches under the tenant; billing/subscription owner. |
| **Company Admin** | Single company (all its branches) | Full control within one company: settings, users, branches, reports. |
| **Branch Manager** | Single branch | Operational control of one branch: stock, staff, approvals, daily reports. |
| **Accountant / Finance** | Company or Tenant | Accounting/Tally module, tax reports, GL export, read access to sales/purchase. |
| **Purchase Officer** | Branch or Company | Purchase Management module: PO creation, GRN, supplier management. |
| **Inventory Officer / Store Keeper** | Branch | Inventory module: stock count, transfer, adjustment. |
| **Sales Supervisor** | Branch | Approve discounts/voids/returns beyond cashier limits, view sales reports. |
| **Cashier / Waiter** | Branch (till-level) | POS Billing only; PIN-based quick login; restricted price/discount override. |
| **Kitchen Staff** | Branch | Kitchen Display Screen only — sees/acknowledges KOTs, no financial data. |
| **HR / Employee Admin** | Company | Employee Management module: attendance, roles, commission. |
| **CRM/Marketing Officer** | Company | Customer Management, campaign creation (SMS/Email/WhatsApp). |
| **Auditor (read-only)** | Company or Tenant | Read-only access to reports, audit log; no write permissions anywhere. |
| **API / Integration Service Account** | Tenant | Non-interactive; scoped tokens for payment gateway callbacks, e-commerce sync, etc. |

## Permission Matrix (representative excerpt)

| Permission | Owner | Company Admin | Branch Mgr | Sales Supervisor | Cashier | Purchase Officer | Inventory Officer | Accountant | Auditor |
|---|---|---|---|---|---|---|---|---|---|
| POS.Sell | ✅ | ✅ | ✅ | ✅ | ✅ | – | – | – | – |
| POS.VoidBill | ✅ | ✅ | ✅ | ✅ | ⛔ (needs approval) | – | – | – | – |
| POS.OverrideDiscount | ✅ | ✅ | ✅ | ✅ | ⛔ (needs approval) | – | – | – | – |
| Inventory.AdjustStock | ✅ | ✅ | ✅ | – | – | – | ✅ | – | 👁 |
| Inventory.TransferBranch | ✅ | ✅ | ✅ | – | – | – | ✅ | – | 👁 |
| Purchase.CreatePO | ✅ | ✅ | ✅ (limit) | – | – | ✅ | – | – | 👁 |
| Purchase.ApprovePO | ✅ | ✅ | ✅ (limit) | – | – | – | – | – | – |
| Reports.ViewFinancial | ✅ | ✅ | ✅ (own branch) | – | – | – | – | ✅ | 👁 |
| Accounting.PostJournal | ✅ | ✅ | – | – | – | – | – | ✅ | – |
| Employee.ManageRoles | ✅ | ✅ | – | – | – | – | – | – | – |
| License.Manage | ✅ (tenant) | – | – | – | – | – | – | – | – |
| SysAdmin.CompanySettings | ✅ | ✅ | – | – | – | – | – | – | – |
| CRM.SendCampaign | ✅ | ✅ | – | – | – | – | – | – | – |

Legend: ✅ full, 👁 read-only, ⛔ blocked unless escalated/approved, – no access.
Exact matrix is data-driven (stored in `RolePermissions` table), the above
is illustrative of the granularity expected.

## Escalation / Approval Pattern

Cashier-level sensitive actions (void after payment, discount beyond
threshold, price override, negative stock sale) raise an **approval
request** consumable by a Branch Manager or Sales Supervisor either via a
manager PIN entered at the till, or via a pending-approval queue on their
own device — both paths are logged with the approver's identity attached
to the original transaction for audit.
