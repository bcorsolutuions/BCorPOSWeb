# SMART POS / BCor POS Enterprise — Software Blueprint

This folder is the architectural source of truth for BCor POS Enterprise, a
multi-tenant, multi-company, multi-branch SaaS-and-on-premise POS platform
covering Restaurant/QSR, Retail/Supermarket, Pharmacy, Wholesale/Trading and
general POS-based businesses, with full English/Arabic RTL support.

Read in this order for a first pass; refer back to individual files afterward.

| # | Document | Covers |
|---|----------|--------|
| 01 | [Product Vision](01-product-vision.md) | Vision, target industries, personas, differentiators |
| 02 | [System Architecture](02-system-architecture.md) | High-level architecture, multi-tenancy model, deployment topology |
| 03 | [Module List](03-modules.md) | All 17 core modules with sub-features |
| 04 | [User Roles](04-user-roles.md) | Role catalog and permission matrix |
| 05 | [Workflows](05-workflows.md) | Key business workflows as text diagrams |
| 06 | [Database Design](06-database-design.md) | Schema-per-module design, multi-tenancy strategy |
| 07 | [API Structure](07-api-structure.md) | ASP.NET Core API module/controller structure |
| 08 | [Frontend Structure](08-frontend-structure.md) | Next.js app router page structure |
| 09 | [i18n Strategy](09-i18n-strategy.md) | English/Arabic translation strategy |
| 10 | [RTL Strategy](10-rtl-strategy.md) | RTL layout strategy for Tailwind, shadcn/ui, DevExtreme |
| 11 | [Security Plan](11-security-plan.md) | AuthN/AuthZ, tenant isolation, OWASP, audit |
| 12 | [SaaS Licensing Plan](12-saas-licensing.md) | Editions, license keys, feature flags, on-prem licensing |
| 13 | [Development Phases](13-development-phases.md) | Phased roadmap from MVP to AI features |
| 14 | [Folder Structure](14-folder-structure.md) | Concrete frontend/backend directory trees |
| 15 | [Packages](15-packages.md) | Suggested NuGet and npm packages |
| 16 | [Coding Standards](16-coding-standards.md) | Naming, formatting, git, testing conventions |
| 17 | [Deployment Plan](17-deployment-plan.md) | CI/CD, environments, cloud and on-prem deployment |

## Product Snapshot

- **Product name:** SMART POS (brand) / BCor POS Enterprise (platform name)
- **Frontend:** Next.js 15 (App Router), TypeScript, TailwindCSS, shadcn/ui, DevExtreme React DataGrid, React Hook Form + Zod
- **Backend:** ASP.NET Core 8 Web API, Clean Architecture, CQRS via MediatR
- **Database:** SQL Server (shared-schema multi-tenant by default, DB-per-tenant option for enterprise/on-prem)
- **Auth:** JWT (access + refresh), Role-Based Access Control, tenant/branch claims
- **i18n:** English + Arabic, full RTL, `next-intl`
- **Deployment:** Cloud (Azure, containerized) and on-premise (Docker Compose / IIS), offline-capable POS terminal mode
