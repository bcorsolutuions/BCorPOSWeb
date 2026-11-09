"use client";

import { useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Download, FileUp, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/components/ui/use-toast";
import { inventoryOpeningService, type OpeningLineCheck, type OpeningVerifyLineInput } from "@/lib/api/services/inventory-opening-service";
import { buildCsv, downloadTextFile, parseCsv } from "@/lib/import/csv";
import { isXlsx, parseXlsx } from "@/lib/import/xlsx";

const CHUNK = 1000;
const MAX_ROWS = 5000;

const COLUMN_ALIASES: Record<"code" | "qty" | "cost" | "unit" | "remarks", string[]> = {
  code: ["itemcode", "code", "sku", "inventorycode", "item", "itemno"],
  qty: ["qty", "quantity", "openingqty", "openingquantity"],
  cost: ["unitcost", "cost", "costprice", "rate", "unitrate"],
  unit: ["unit", "unitcode", "uom"],
  remarks: ["remarks", "remark", "note", "notes"],
};

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");

async function readText(bytes: ArrayBuffer): Promise<string> {
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    return new TextDecoder("windows-1252").decode(bytes);
  }
}

function toNumber(s: string | undefined): number | undefined | typeof NaN {
  const v = (s ?? "").trim().replace(/,/g, "");
  if (v === "") return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : NaN;
}

interface Parsed {
  fileName: string;
  rows: OpeningVerifyLineInput[];
  /** Row numbers whose quantity / cost cell is not a number (never sent as a value). */
  badNumbers: Map<number, string>;
}

/**
 * Bulk entry for an Inventory Opening: a spreadsheet / CSV of item code, quantity (and optional cost, unit, remarks). Every row is
 * verified against Item Master by the server before anything is added - unknown or inactive codes, wrong units, zero quantities and
 * duplicates are listed, the valid rows can still be added.
 */
export function OpeningImportDialog({
  open,
  onOpenChange,
  compId,
  siteId,
  location,
  existingKeys,
  onAdd,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  compId: string;
  siteId: string;
  location: string;
  /** "CODE|UNIT" of the lines already on the document (to flag rows that would duplicate them). */
  existingKeys: Set<string>;
  onAdd: (lines: OpeningLineCheck[], replace: boolean) => void;
}) {
  const t = useTranslations("inventoryOpening");
  const tc = useTranslations("common");
  const { toast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [parsed, setParsed] = useState<Parsed | null>(null);
  const [checks, setChecks] = useState<OpeningLineCheck[] | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [replace, setReplace] = useState(false);

  function reset() {
    setParsed(null);
    setChecks(null);
    setLocationError(null);
    setProgress(null);
    setReplace(false);
    if (fileRef.current) fileRef.current.value = "";
  }

  function downloadTemplate() {
    downloadTextFile(
      "inventory-opening-template.csv",
      buildCsv([
        ["ItemCode", "Qty", "UnitCost", "Unit", "Remarks"],
        ["# example - delete this row", 24, "0.350", "PCS", "Opening count 1 Nov"],
      ]),
    );
  }

  async function handleFile(file: File | undefined) {
    setChecks(null);
    setParsed(null);
    if (!file) return;

    let grid: string[][];
    try {
      const bytes = await file.arrayBuffer();
      grid = isXlsx(bytes) ? await parseXlsx(bytes) : parseCsv(await readText(bytes));
    } catch (e) {
      toast({ variant: "destructive", title: e instanceof Error ? e.message : String(e) });
      return;
    }
    const header = (grid[0] ?? []).map(norm);
    const col = (key: keyof typeof COLUMN_ALIASES) => header.findIndex((h) => COLUMN_ALIASES[key].includes(h));
    const idx = { code: col("code"), qty: col("qty"), cost: col("cost"), unit: col("unit"), remarks: col("remarks") };
    if (idx.code < 0 || idx.qty < 0) {
      toast({ variant: "destructive", title: t("importMissingColumns") });
      return;
    }

    const rows: OpeningVerifyLineInput[] = [];
    const badNumbers = new Map<number, string>();
    grid.slice(1).forEach((cells, i) => {
      if ((cells[0] ?? "").trim().startsWith("#")) return;
      const row = i + 2; // the row number in the user's spreadsheet
      const qty = toNumber(cells[idx.qty]);
      const cost = idx.cost >= 0 ? toNumber(cells[idx.cost]) : undefined;
      if (Number.isNaN(qty)) badNumbers.set(row, t("badQty"));
      else if (Number.isNaN(cost)) badNumbers.set(row, t("badCost"));
      rows.push({
        row,
        inventoryCode: (cells[idx.code] ?? "").trim(),
        unitCode: idx.unit >= 0 ? (cells[idx.unit] ?? "").trim() : undefined,
        qty: Number.isNaN(qty) ? undefined : qty,
        unitCost: Number.isNaN(cost) ? undefined : cost,
        remarks: idx.remarks >= 0 ? (cells[idx.remarks] ?? "").trim() : undefined,
      });
    });

    if (rows.length === 0) {
      toast({ variant: "destructive", title: t("importNoRows") });
      return;
    }
    if (rows.length > MAX_ROWS) {
      toast({ variant: "destructive", title: t("importTooMany", { max: MAX_ROWS }) });
      return;
    }
    setParsed({ fileName: file.name, rows, badNumbers });
    await verify(rows, badNumbers);
  }

  async function verify(rows: OpeningVerifyLineInput[], badNumbers: Map<number, string>) {
    const all: OpeningLineCheck[] = [];
    setProgress({ done: 0, total: rows.length });
    try {
      for (let i = 0; i < rows.length; i += CHUNK) {
        const res = await inventoryOpeningService.verify(compId, siteId, location || undefined, rows.slice(i, i + CHUNK));
        all.push(...res.lines);
        if (i === 0) setLocationError(res.locationError ?? null);
        setProgress({ done: Math.min(i + CHUNK, rows.length), total: rows.length });
      }
    } catch {
      toast({ variant: "destructive", title: tc("errorGeneric") });
      setProgress(null);
      return;
    }

    // Duplicates across chunks are caught here (the server only sees one chunk at a time); clashes with the lines already on the document
    // are decided at render time, because they depend on the "replace" choice.
    const seen = new Map<string, number>();
    for (const c of all) {
      const bad = badNumbers.get(c.row);
      if (bad) {
        // The unreadable number was sent as "missing"; say what is really wrong instead.
        c.errors = c.errors.filter((e) => e !== "Quantity is required.");
        c.errors.push(bad);
        c.valid = false;
      }
      if (!c.valid) continue;
      const key = `${c.inventoryCode.toUpperCase()}|${(c.unitCode ?? "").toUpperCase()}`;
      const first = seen.get(key);
      if (first != null) {
        c.errors.push(t("dupInFile", { row: first }));
        c.valid = false;
      } else seen.set(key, c.row);
    }
    setChecks(all);
    setProgress(null);
  }

  const keyOf = (c: OpeningLineCheck) => `${c.inventoryCode.toUpperCase()}|${(c.unitCode ?? "").toUpperCase()}`;
  const onDocument = (c: OpeningLineCheck) => c.valid && !replace && existingKeys.has(keyOf(c));
  const valid = (checks ?? []).filter((c) => c.valid && !onDocument(c));
  const problems = (checks ?? []).filter((c) => !c.valid || onDocument(c));
  const warned = valid.filter((c) => c.warnings.length > 0).length;

  function downloadProblems() {
    downloadTextFile(
      "inventory-opening-errors.csv",
      buildCsv([["Row", "ItemCode", "Problem"], ...problems.map((p) => [p.row, p.inventoryCode, [...p.errors, ...(onDocument(p) ? [t("dupOnDocument")] : [])].join(" | ")])]),
    );
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) reset();
        onOpenChange(o);
      }}
    >
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>{t("importTitle")}</DialogTitle>
        </DialogHeader>

        <p className="text-sm text-muted-foreground">{t("importIntro")}</p>

        <div className="flex flex-wrap items-center gap-2">
          <Button type="button" variant="outline" onClick={downloadTemplate}>
            <Download className="me-2 h-4 w-4" />
            {t("downloadTemplate")}
          </Button>
          <input
            ref={fileRef}
            type="file"
            accept=".xlsx,.csv,.txt,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            className="hidden"
            onChange={(e) => handleFile(e.target.files?.[0])}
          />
          <Button type="button" variant="outline" onClick={() => fileRef.current?.click()} disabled={!!progress}>
            <FileUp className="me-2 h-4 w-4" />
            {t("chooseFile")}
          </Button>
          {parsed && <span className="text-sm text-muted-foreground">{parsed.fileName} · {t("rowsRead", { count: parsed.rows.length })}</span>}
        </div>

        {progress && (
          <div className="space-y-1">
            <Progress value={(progress.done / progress.total) * 100} />
            <p className="flex items-center gap-2 text-xs text-muted-foreground">
              <Loader2 className="h-3 w-3 animate-spin" />
              {t("verifying", { done: progress.done, total: progress.total })}
            </p>
          </div>
        )}

        {locationError && <p className="rounded-md bg-destructive/10 p-2 text-sm text-destructive">{locationError}</p>}

        {checks && (
          <div className="space-y-3">
            <div className="flex flex-wrap gap-2 text-sm">
              <span className="rounded bg-green-100 px-2.5 py-1 font-medium text-green-800 dark:bg-green-900/40 dark:text-green-300">{t("validRows", { count: valid.length })}</span>
              <span className="rounded bg-red-100 px-2.5 py-1 font-medium text-red-800 dark:bg-red-900/40 dark:text-red-300">{t("errorRows", { count: problems.length })}</span>
              {warned > 0 && <span className="rounded bg-amber-100 px-2.5 py-1 font-medium text-amber-800 dark:bg-amber-900/40 dark:text-amber-300">{t("warnRows", { count: warned })}</span>}
            </div>

            {problems.length > 0 && (
              <div className="max-h-56 overflow-auto rounded-md border">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b bg-muted/50 text-muted-foreground">
                      <th className="w-16 px-2 py-1.5 text-start font-medium">{t("row")}</th>
                      <th className="w-40 px-2 py-1.5 text-start font-medium">{t("code")}</th>
                      <th className="px-2 py-1.5 text-start font-medium">{t("problem")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {problems.slice(0, 200).map((p) => (
                      <tr key={p.row} className="border-b last:border-0">
                        <td className="px-2 py-1 tabular-nums">{p.row}</td>
                        <td className="px-2 py-1 font-mono">{p.inventoryCode}</td>
                        <td className="px-2 py-1 text-destructive">{[...p.errors, ...(onDocument(p) ? [t("dupOnDocument")] : [])].join(" ")}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {problems.length > 200 && <p className="text-xs text-muted-foreground">{t("showingFirst", { count: 200 })}</p>}
            {problems.length > 0 && (
              <Button type="button" variant="link" size="sm" className="h-auto p-0" onClick={downloadProblems}>
                <Download className="me-1 h-3 w-3" />
                {t("downloadErrors")}
              </Button>
            )}

            {existingKeys.size > 0 && (
              <label className="flex items-center gap-2 text-sm">
                <Checkbox checked={replace} onCheckedChange={(v) => setReplace(v === true)} />
                {t("replaceLines")}
              </label>
            )}
          </div>
        )}

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            {tc("cancel")}
          </Button>
          <Button
            type="button"
            disabled={!checks || valid.length === 0 || !!locationError || !!progress}
            onClick={() => {
              onAdd(valid, replace);
              reset();
              onOpenChange(false);
            }}
          >
            {t("addValidRows", { count: valid.length })}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
