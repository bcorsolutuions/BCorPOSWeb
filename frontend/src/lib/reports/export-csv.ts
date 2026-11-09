import type { ReportResult } from "@/lib/api/services/dashboard-service";

// CSV rather than a real .xlsx — opens directly in Excel/Sheets with zero
// added dependencies (no xlsx/exceljs in this project), which covers the
// practical "export to Excel" ask without a new library just for this one
// screen. Quoting: wrap every cell in double quotes and escape embedded
// quotes by doubling them (RFC 4180) — column/product names can contain
// commas (e.g. "Half Hands Bleach", but also free-text remarks elsewhere).
function csvCell(value: string | number | undefined): string {
  const s = value == null ? "" : String(value);
  return `"${s.replace(/"/g, '""')}"`;
}

export function reportToCsv(result: ReportResult, columnLabels: Record<string, string>, totalLabel: string): string {
  const lines: string[] = [];
  lines.push(result.columns.map((c) => csvCell(columnLabels[c] ?? c)).join(","));
  for (const row of result.rows) {
    lines.push(result.columns.map((c) => csvCell(row[c])).join(","));
  }
  if (result.totals) {
    lines.push(
      result.columns
        .map((c, i) => csvCell(i === 0 ? totalLabel : result.totals?.[c]))
        .join(","),
    );
  }
  // Leading BOM so Excel (Windows) detects UTF-8 instead of guessing the
  // system codepage and mangling non-ASCII branch/product names.
  return "﻿" + lines.join("\r\n");
}

export function downloadCsv(filename: string, csv: string) {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
