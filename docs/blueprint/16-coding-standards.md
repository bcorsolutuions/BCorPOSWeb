# 16 — Coding Standards

## General Principles

- Follow this repository's overarching engineering defaults: no
  speculative abstraction, no dead code, no comments that restate what the
  code already says, validate only at real system boundaries. Module
  boundaries described in [02](02-system-architecture.md)/[07](07-api-structure.md)
  are load-bearing — don't reach across them for a shortcut.

## Backend (C# / ASP.NET Core)

- Naming: PascalCase for types/methods/public members, camelCase for
  locals/parameters, `_camelCase` for private fields, `I`-prefixed
  interfaces. Async methods suffixed `Async`.
- One public type per file; file name matches the type name.
- Commands/Queries are immutable records (`public record CreateInvoiceCommand(...)`).
- Handlers do one thing: orchestrate domain logic + persistence via the
  Application-layer interfaces — no direct `DbContext` use outside
  Infrastructure repository implementations.
- Controllers are thin: parse request → `mediator.Send()` → return result;
  no business logic, no direct EF/DB access in the API project.
- Nullable reference types enabled solution-wide (`<Nullable>enable</Nullable>`);
  no `#pragma warning disable` for nullability without a documented reason.
- `dotnet format` + `.editorconfig` enforced in CI; a PR with formatting
  diffs fails the build, not left to reviewer nitpicking.
- Domain entities protect their own invariants (private setters, factory
  methods/constructors, domain methods like `invoice.Void(reason, userId)`
  instead of anemic public setters + external logic scattered in handlers).
- Every command handler that mutates a financially significant entity
  raises a domain event consumed by the audit pipeline behavior — this is
  not optional per-handler, it's enforced by the pipeline itself.

## Frontend (TypeScript / Next.js)

- Strict TypeScript (`strict: true`); no `any` without an inline
  justification comment; prefer `unknown` + narrowing.
- Functional components only, named exports (no default exports for
  components, to keep refactors/renames grep-able).
- Server Components by default; `"use client"` only where interactivity/
  browser APIs are genuinely needed — don't default every file to client.
- All user-facing literal strings go through `next-intl` — no hardcoded
  UI text (see [09 — i18n Strategy](09-i18n-strategy.md)); enforced by
  lint rule where feasible, otherwise PR-review gate.
- No physical-direction Tailwind utilities (`ml-`, `mr-`, `pl-`, `pr-`,
  `left-`, `right-`) — logical properties only (see
  [10 — RTL Strategy](10-rtl-strategy.md)); enforced via a custom
  ESLint/stylelint rule.
- Form validation schemas (Zod) are the single source of truth; don't
  duplicate validation logic in the component body.
- `eslint` + `prettier` + `prettier-plugin-tailwindcss` enforced in CI and
  via `lint-staged` pre-commit.

## Testing Expectations

- Backend: unit tests for domain logic and command/query handlers
  (mocked infra); integration tests (`Testcontainers.MsSql` +
  `WebApplicationFactory`) for full request→DB round trips on each
  module's critical paths (sale creation, stock movement, license
  entitlement enforcement, cross-tenant isolation).
- Frontend: component tests for shared/complex components (grids, forms,
  offline queue logic); Playwright E2E for the golden paths per module
  (open a sale, complete a purchase order, run a report) — each golden
  path run in both `en`/LTR and `ar`/RTL.
- A PR that changes business logic without a corresponding test change is
  a review blocker, not a style nit.

## Git Workflow

- Trunk-based with short-lived feature branches, PR required to merge to
  `main` (or `develop` if a release-branch model is adopted — decide once
  and document, don't mix).
- Conventional commit prefixes (`feat:`, `fix:`, `refactor:`, `chore:`,
  `docs:`, `test:`) for changelog generation.
- One logical change per PR; large module rollouts (e.g., Restaurant
  Management) land as a sequence of reviewable PRs behind a
  license-feature flag, not one giant PR.
- CI must pass (build, lint, unit tests, integration tests,
  vulnerability scan) before merge; no `--no-verify` bypasses.

## Code Review Checklist (module PRs)

- [ ] Tenant/branch scoping present on every new query/command touching
      tenant data
- [ ] Audit trail triggered for financially significant mutations
- [ ] `en` + `ar` translation keys added together (see
      [09](09-i18n-strategy.md))
- [ ] No physical-direction CSS utilities introduced
- [ ] License entitlement check added if the feature is edition-gated
- [ ] Tests added/updated for the new behavior
- [ ] No secrets/connection strings committed (check `git status` diff
      before pushing, per repo-wide safety practice)
