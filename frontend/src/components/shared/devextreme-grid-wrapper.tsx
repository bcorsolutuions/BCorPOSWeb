"use client";

// DevExtreme's theme CSS is loaded dynamically by DevExtremeThemeLink (see
// components/providers/devextreme-theme-link.tsx), swapped to follow the
// app's light/dark/gulf theme instead of being pinned to light here.
import { useLocale, useTranslations } from "next-intl";
import DataGrid, {
  Column,
  Export,
  FilterRow,
  HeaderFilter,
  Pager,
  Paging,
  Scrolling,
  SearchPanel,
  Selection,
  Toolbar,
  Item as ToolbarItem,
} from "devextreme-react/data-grid";
import { isRtl } from "@/i18n/config";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import type { DataGridWrapperProps } from "./grid-types";

/**
 * DevExpress (DevExtreme) DataGrid backend — kept in the codebase as an
 * opt-in provider (NEXT_PUBLIC_GRID_PROVIDER=devextreme) alongside the free
 * ag-grid-wrapper.tsx default. See data-grid-wrapper.tsx for the switch.
 */
export function DevExtremeGridWrapper<T extends object>({
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
  const rtlEnabled = isRtl(locale);

  return (
    <DataGrid
      dataSource={dataSource}
      keyExpr={keyExpr}
      rtlEnabled={rtlEnabled}
      showBorders
      showRowLines
      rowAlternationEnabled
      allowColumnReordering
      allowColumnResizing
      columnAutoWidth
      loadPanel={{ enabled: !!loading }}
      onRowClick={onRowClick ? (e) => onRowClick(e.data as T) : undefined}
      noDataText={t("common.noData")}
      height="100%"
    >
      <Selection mode="single" />
      <Scrolling mode="virtual" />
      <FilterRow visible />
      <HeaderFilter visible />
      <SearchPanel visible placeholder={t("common.search")} width={260} />
      <Export enabled allowExportSelectedData={false} />
      <Paging defaultPageSize={25} />
      <Pager showPageSizeSelector allowedPageSizes={[10, 25, 50, 100]} showInfo />

      <Toolbar>
        <ToolbarItem name="searchPanel" location="before" />
        {onAddNew && (
          <ToolbarItem location="after">
            <Button size="sm" onClick={onAddNew}>
              <Plus className="me-1 h-4 w-4" />
              {t(addLabelKey)}
            </Button>
          </ToolbarItem>
        )}
        <ToolbarItem name="exportButton" location="after" />
        <ToolbarItem name="columnChooserButton" location="after" />
      </Toolbar>

      {columns.map((col) => (
        <Column
          key={col.dataField}
          dataField={col.dataField}
          caption={t(col.captionKey)}
          dataType={col.dataType}
          width={col.width}
          cellRender={col.cellRender}
        />
      ))}
    </DataGrid>
  );
}
