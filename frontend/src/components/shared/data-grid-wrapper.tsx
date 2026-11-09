"use client";

import type { ReactElement } from "react";
import dynamicImport from "next/dynamic";
import { Skeleton } from "@/components/ui/skeleton";
import type { DataGridColumnDef, DataGridWrapperProps } from "./grid-types";

export type { DataGridColumnDef, DataGridWrapperProps };

// Single DevExtreme-or-AG-Grid switch point for the whole app — every
// module screen imports DataGridWrapper from here and never touches either
// backend directly, so flipping the provider is a one-line env change with
// zero call-site edits. DevExtreme is licensed software kept in the repo
// deliberately (not deleted) so it stays selectable, per the project
// owner's direction, without requiring a re-purchase/re-add of the
// dependency later — the free ag-grid-wrapper.tsx (AG Grid Community, MIT)
// is the default.
//
// Both backends are loaded via next/dynamic (not a static import) because a
// plain top-level `import` of both modules gets bundled into every grid
// page's initial JS regardless of which runtime branch is taken — confirmed
// via `npm run build`'s First Load JS report (~1MB on grid pages with a
// static import of both). next/dynamic gives each backend its own on-demand
// chunk, so only the provider actually selected by NEXT_PUBLIC_GRID_PROVIDER
// is ever fetched by the browser.
const GRID_PROVIDER = process.env.NEXT_PUBLIC_GRID_PROVIDER === "devextreme" ? "devextreme" : "free";

function GridLoadingFallback() {
  return <Skeleton className="h-full min-h-[300px] w-full" />;
}

const AgGridWrapperLazy = dynamicImport(() => import("./ag-grid-wrapper").then((m) => m.AgGridWrapper), {
  ssr: false,
  loading: GridLoadingFallback,
}) as <T extends object>(props: DataGridWrapperProps<T>) => ReactElement;

const DevExtremeGridWrapperLazy = dynamicImport(
  () => import("./devextreme-grid-wrapper").then((m) => m.DevExtremeGridWrapper),
  { ssr: false, loading: GridLoadingFallback },
) as <T extends object>(props: DataGridWrapperProps<T>) => ReactElement;

export function DataGridWrapper<T extends object>(props: DataGridWrapperProps<T>) {
  if (GRID_PROVIDER === "devextreme") {
    return <DevExtremeGridWrapperLazy<T> {...props} />;
  }
  return <AgGridWrapperLazy<T> {...props} />;
}
