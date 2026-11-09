// Shared contract between every DataGridWrapper backend implementation
// (ag-grid-wrapper.tsx, devextreme-grid-wrapper.tsx) — see data-grid-wrapper.tsx
// for the provider switch. Kept in its own file so neither implementation
// has to import the other (or the router) just to get these types.
export interface DataGridColumnDef {
  dataField: string;
  captionKey: string;
  dataType?: "string" | "number" | "date" | "boolean";
  width?: number | string;
  cellRender?: (data: { data: Record<string, unknown> }) => React.ReactNode;
}

export interface DataGridWrapperProps<T> {
  dataSource: T[];
  columns: DataGridColumnDef[];
  loading?: boolean;
  onAddNew?: () => void;
  onRowClick?: (row: T) => void;
  addLabelKey?: string;
  keyExpr?: string;
}
