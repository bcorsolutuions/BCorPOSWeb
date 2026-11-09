// Minimal RFC 4180 CSV reader/writer for master-data import/export. No
// library on purpose (the project avoids xlsx/exceljs — see
// lib/reports/export-csv.ts): Excel opens and saves CSV directly.

/**
 * Parses CSV text into rows of cells. Handles a leading BOM, quoted cells
 * (with "" escapes and embedded commas/newlines), CRLF or LF line ends, and
 * the three delimiters Excel actually writes depending on the machine's
 * regional settings (comma, semicolon, tab) — sniffed from the header line.
 * Completely empty lines are dropped.
 */
export function parseCsv(text: string): string[][] {
  const src = text.replace(/^﻿/, "");
  const headerLine = src.split(/\r?\n/, 1)[0] ?? "";
  const delimiter =
    [",", ";", "\t"]
      .map((d) => ({ d, n: headerLine.split(d).length }))
      .sort((a, b) => b.n - a.n)[0]?.d ?? ",";

  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let inQuotes = false;

  const endCell = () => {
    row.push(cell);
    cell = "";
  };
  const endRow = () => {
    endCell();
    if (row.some((c) => c.trim() !== "")) rows.push(row);
    row = [];
  };

  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (inQuotes) {
      if (ch === '"') {
        if (src[i + 1] === '"') {
          cell += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        cell += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === delimiter) {
      endCell();
    } else if (ch === "\n") {
      endRow();
    } else if (ch === "\r") {
      // swallow — the "\n" that follows ends the row
    } else {
      cell += ch;
    }
  }
  if (cell !== "" || row.length > 0) endRow();
  return rows;
}

function csvCell(value: string | number | null | undefined): string {
  const s = value == null ? "" : String(value);
  return `"${s.replace(/"/g, '""')}"`;
}

/** Builds CSV text (with a UTF-8 BOM so Excel doesn't mangle non-ASCII names). */
export function buildCsv(rows: (string | number | null | undefined)[][]): string {
  return "﻿" + rows.map((r) => r.map(csvCell).join(",")).join("\r\n");
}

export function downloadTextFile(filename: string, content: string, mime = "text/csv;charset=utf-8;") {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
