# 10 — RTL Layout Strategy

## Principle

`lang`/`dir` are set once at the HTML root (`app/[locale]/layout.tsx`) and
every layer below (Tailwind, shadcn/ui, DevExtreme) mirrors from that
single source of truth — no per-component `if (locale === 'ar')` branching
for layout, only for content that is genuinely direction-dependent (icons
implying motion, charts, phone number formatting).

```
<html lang={locale} dir={locale === 'ar' ? 'rtl' : 'ltr'}>
```

## TailwindCSS

- Use **Tailwind logical properties** exclusively instead of physical
  left/right utilities: `ms-4`/`me-4` (margin-inline-start/end) instead of
  `ml-4`/`mr-4`, `ps-/pe-` instead of `pl-/pr-`, `start-/end-` instead of
  `left-/right-`, `text-start`/`text-end` instead of `text-left`/
  `text-right`. Tailwind v3.3+ ships these natively; enforce via an
  ESLint/stylelint rule that flags raw `ml-`, `mr-`, `pl-`, `pr-`, `left-`,
  `right-` utility classes in review.
- Flexbox/grid direction: Tailwind's `flex-row` already reverses visually
  under `dir="rtl"` per CSS spec — no `rtl:flex-row-reverse` hacks needed
  if logical properties are used consistently.
- For the rare genuinely-physical case (e.g., a decorative background
  gradient that should always point the same screen direction regardless
  of language), use explicit `rtl:` / `ltr:` Tailwind variants rather than
  JS branching.

## shadcn/ui

- shadcn components are Radix-based and largely direction-agnostic
  already; the main adjustments needed:
  - `Sheet`/`Drawer` slide-in side (`side="right"` in LTR should become
    the *inline-end* side) — wrap in a small helper that maps
    `start`/`end` to the correct physical `side` prop based on the current
    locale.
  - `DropdownMenu`/`Select` alignment (`align="start"`/`"end"`) — Radix
    already respects `dir` context; ensure the root `dir` attribute is
    propagated via `<DirectionProvider>` (Radix) at the app root so every
    portal-rendered popover (which mounts outside the normal DOM tree)
    still inherits the correct direction.
- Icons that imply direction (chevrons for "next/back", arrows) are
  mirrored via a small `RtlAwareIcon` wrapper that flips `ChevronRight`
  ↔ `ChevronLeft` based on locale, rather than relying on CSS transform on
  every icon usage individually.

## DevExtreme React DataGrid

- DevExtreme has native `rtlEnabled` prop — set once at a global config
  level (`config({ rtlEnabled: locale === 'ar' })` or per-grid via the
  shared `DataGridWrapper`) so column order, sort/filter icons, paging
  controls, and context menus all mirror automatically.
- Column definitions themselves don't need direction-specific ordering —
  DevExtreme reverses visual column order under `rtlEnabled` while keeping
  the underlying `dataField` order stable in code.
- Export (Excel/PDF) templates: verify Arabic text shaping/right-alignment
  in exported files specifically — this is the most common DevExtreme RTL
  gap and needs explicit QA per release (see
  [16 — Coding Standards](16-coding-standards.md) test checklist).

## POS Receipt / Print Layout

- Thermal receipt templates are rendered server-side (or client-side via a
  print-specific component) with their own directional layout logic since
  they're not part of the normal Tailwind flow — Arabic receipts
  right-align text blocks and reverse the qty/price column order to match
  local printed-receipt convention.

## Mixed-Direction Content

- Numbers, prices, and Latin product codes inside Arabic RTL text use
  `unicode-bidi: plaintext` / `dir="auto"` on the specific inline element
  so numerals don't get visually reordered incorrectly next to Arabic
  text (a common bug: "١٢٣ ريال" reading backwards when naively embedded
  in an RTL block without isolation).

## Testing

- Every module's primary screens are screenshot-tested in both `ltr`/`en`
  and `rtl`/`ar` modes as part of the visual regression suite; RTL is
  treated as a first-class test matrix dimension, not an occasional manual
  check (see [16 — Coding Standards](16-coding-standards.md)).
