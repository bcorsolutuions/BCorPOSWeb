"use client";

import { useMemo, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useTheme } from "next-themes";
import { AgGridReact } from "ag-grid-react";
import {
  ModuleRegistry,
  AllCommunityModule,
  themeQuartz,
  colorSchemeLight,
  colorSchemeDark,
  type ColDef,
  type ICellRendererParams,
  type GridApi,
  type GridReadyEvent,
  type RowClickedEvent,
} from "ag-grid-community";
import { Plus, Download, Columns3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { isRtl } from "@/i18n/config";
import { formatDate } from "@/lib/utils";
import type { DataGridWrapperProps } from "./grid-types";

// Registered once at module scope, not per render/mount.
ModuleRegistry.registerModules([AllCommunityModule]);

// AG Grid v33+'s Theming API — CSS custom properties composed from parts,
// not a full stylesheet swap like DevExtreme needed (see
// devextreme-theme-link.tsx). "gulf" is a light-background palette (see
// globals.css's .gulf block), so it uses the light color scheme too.
const lightTheme = themeQuartz.withPart(colorSchemeLight);
const darkTheme = themeQuartz.withPart(colorSchemeDark);

/**
 * Free (AG Grid Community, MIT-licensed) DataGrid backend — the default
 * provider. See data-grid-wrapper.tsx for the NEXT_PUBLIC_GRID_PROVIDER
 * switch back to DevExtreme (devextreme-grid-wrapper.tsx).
 *
 * Feature parity notes vs. the DevExtreme backend: per-column filters use
 * AG Grid Community's floating text/number/date filters rather than
 * DevExtreme's "distinct values" header-filter dropdown (that's an AG Grid
 * Enterprise feature — Set Filter); export is CSV only (Excel export is
 * also Enterprise-only there).
 */
export function AgGridWrapper<T extends object>({
  dataSource,
  columns,
  loading,
  onAddNew,
  onRowClick,
  addLabelKey = "common.add",
  keyExpr = "id",
}: DataGridWrapperProps<T>) {
  const locale = useLocale();
  const t = useTranslations();
  const { resolvedTheme } = useTheme();
  const rtlEnabled = isRtl(locale);
  const gridApiRef = useRef<GridApi<T> | null>(null);
  const [quickFilter, setQuickFilter] = useState("");
  const [hiddenCols, setHiddenCols] = useState<Set<string>>(new Set());

  const colDefs = useMemo<ColDef<T>[]>(
    () =>
      columns.map((col) => {
        const def: ColDef<T> = {
          field: col.dataField as ColDef<T>["field"],
          headerName: t(col.captionKey),
          width: typeof col.width === "number" ? col.width : undefined,
          flex: col.width ? undefined : 1,
          resizable: true,
          sortable: true,
          filter:
            col.dataType === "number"
              ? "agNumberColumnFilter"
              : col.dataType === "date"
                ? "agDateColumnFilter"
                : "agTextColumnFilter",
          floatingFilter: true,
          hide: hiddenCols.has(col.dataField),
        };
        if (col.dataType === "date") {
          def.valueFormatter = (p) => (p.value ? formatDate(p.value as string, locale) : "");
        }
        if (col.dataType === "boolean" && !col.cellRender) {
          def.cellRenderer = (p: ICellRendererParams<T>) => (p.value ? "✓" : "");
        }
        if (col.cellRender) {
          const render = col.cellRender;
          def.cellRenderer = (p: ICellRendererParams<T>) => render({ data: (p.data ?? {}) as Record<string, unknown> });
        }
        return def;
      }),
    [columns, t, hiddenCols, locale],
  );

  const theme = resolvedTheme === "dark" ? darkTheme : lightTheme;

  return (
    <div className="flex h-full flex-col gap-2">
      <div className="flex items-center gap-2">
        <Input
          value={quickFilter}
          onChange={(e) => setQuickFilter(e.target.value)}
          placeholder={t("common.search")}
          className="max-w-[260px]"
        />
        <div className="ms-auto flex items-center gap-2">
          {onAddNew && (
            <Button size="sm" onClick={onAddNew}>
              <Plus className="me-1 h-4 w-4" />
              {t(addLabelKey)}
            </Button>
          )}
          <Button
            size="icon"
            variant="outline"
            onClick={() => gridApiRef.current?.exportDataAsCsv()}
            aria-label={t("common.export")}
            title={t("common.export")}
          >
            <Download className="h-4 w-4" />
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="icon" variant="outline" aria-label={t("common.columns")} title={t("common.columns")}>
                <Columns3 className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {columns.map((col) => (
                <DropdownMenuCheckboxItem
                  key={col.dataField}
                  checked={!hiddenCols.has(col.dataField)}
                  onCheckedChange={(checked) => {
                    setHiddenCols((prev) => {
                      const next = new Set(prev);
                      if (checked) next.delete(col.dataField);
                      else next.add(col.dataField);
                      return next;
                    });
                  }}
                >
                  {t(col.captionKey)}
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className="min-h-0 flex-1">
        <AgGridReact<T>
          theme={theme}
          rowData={dataSource}
          columnDefs={colDefs}
          getRowId={(p) => String((p.data as Record<string, unknown>)[keyExpr])}
          quickFilterText={quickFilter}
          rowSelection="single"
          enableRtl={rtlEnabled}
          loading={loading}
          pagination
          paginationPageSize={25}
          paginationPageSizeSelector={[10, 25, 50, 100]}
          domLayout="normal"
          overlayNoRowsTemplate={t("common.noData")}
          onGridReady={(e: GridReadyEvent<T>) => {
            gridApiRef.current = e.api;
          }}
          onRowClicked={
            onRowClick
              ? (e: RowClickedEvent<T>) => {
                  // A custom cellRenderer's own interactive element (e.g. the
                  // Item Master photo/print-label icon buttons) still bubbles
                  // up to AG Grid's own row-click detection even after
                  // event.stopPropagation() in the renderer's onClick — AG
                  // Grid's internal listener isn't a plain bubble-phase DOM
                  // listener a descendant can stop that way. Bail out here
                  // instead, the officially documented workaround: skip the
                  // row click entirely when it originated inside a button.
                  const target = (e.event as MouseEvent | undefined)?.target as HTMLElement | null;
                  if (target?.closest("button")) return;
                  e.data && onRowClick(e.data);
                }
              : undefined
          }
        />
      </div>
    </div>
  );
}
