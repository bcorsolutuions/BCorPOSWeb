"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Download, FileUp, Loader2, ShieldCheck, Upload } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/components/ui/use-toast";
import {
  importService,
  ImportChunkError,
  type ImportResult,
  type ImportRowStatus,
} from "@/lib/api/services/import-service";
import { posLookupService } from "@/lib/api/services/pos-lookup-service";
import { buildCsv, downloadTextFile, parseCsv } from "@/lib/import/csv";
import { isXlsx, parseXlsx } from "@/lib/import/xlsx";
import { IMPORT_ENTITIES, getImportEntity, matchColumns, templateRows } from "@/lib/import/import-entities";
import { useAuthStore } from "@/stores/auth-store";
import { cn } from "@/lib/utils";

interface ParsedFile {
  fileName: string;
  rows: Record<string, string>[];
  unknownHeaders: string[];
  missingRequired: string[];
}

const MAX_RENDERED_ROWS = 500;
// Only files big enough to take a while get the "processing x of y" line.
const CHUNK_NOTICE_MIN = 250;

const STATUS_STYLES: Record<ImportRowStatus, string> = {
  Created: "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300",
  Updated: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300",
  Skipped: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300",
  Error: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300",
};

// Strict UTF-8 first (Excel's "CSV UTF-8", and what our own template is);
// older "CSV (Comma delimited)" saves are the machine's ANSI codepage.
async function readFileText(bytes: ArrayBuffer): Promise<string> {
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    return new TextDecoder("windows-1252").decode(bytes);
  }
}

export default function ImportDataPage() {
  // useSearchParams (for ?entity=) must sit under a Suspense boundary.
  return (
    <Suspense>
      <ImportDataPageContent />
    </Suspense>
  );
}

function ImportDataPageContent() {
  const t = useTranslations("import");
  const tc = useTranslations("common");
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const searchParams = useSearchParams();
  const compId = useAuthStore((s) => s.user?.compId ?? "");
  const userName = useAuthStore((s) => s.user?.userName ?? "");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [entityKey, setEntityKey] = useState(getImportEntity(searchParams.get("entity")).key);
  const config = getImportEntity(entityKey);

  const [siteId, setSiteId] = useState("");
  const [updateExisting, setUpdateExisting] = useState(true);
  const [createMissing, setCreateMissing] = useState(true);
  const [parsed, setParsed] = useState<ParsedFile | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [errorsOnly, setErrorsOnly] = useState(false);

  const { data: sites = [] } = useQuery({
    queryKey: ["import-sites", compId],
    queryFn: () => posLookupService.getSites(compId),
    enabled: !!compId,
  });
  useEffect(() => {
    const first = sites[0];
    if (!siteId && first) setSiteId(first.siteID);
  }, [sites, siteId]);

  // A different entity, file or option means any earlier preview no longer
  // describes what Import would do — never leave a stale "valid" result up.
  function clearResult() {
    setResult(null);
    setErrorsOnly(false);
  }
  function changeEntity(key: string) {
    setEntityKey(key);
    setParsed(null);
    clearResult();
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function downloadTemplate() {
    downloadTextFile(`${config.key}-import-template.csv`, buildCsv(templateRows(config)));
  }

  async function handleFile(file: File | undefined) {
    clearResult();
    if (!file) return;
    let grid: string[][];
    try {
      const bytes = await file.arrayBuffer();
      grid = isXlsx(bytes) ? await parseXlsx(bytes) : parseCsv(await readFileText(bytes));
    } catch (e) {
      toast({ variant: "destructive", title: e instanceof Error ? e.message : String(e) });
      return;
    }
    if (grid.length === 0) {
      setParsed({ fileName: file.name, rows: [], unknownHeaders: [], missingRequired: config.columns.filter((c) => c.required).map((c) => c.key) });
      return;
    }

    const { indexByKey, unknownHeaders, missingRequired } = matchColumns(config, grid[0] ?? []);
    const rows: Record<string, string>[] = [];
    grid.slice(1).forEach((cells, i) => {
      // "#..." in the first cell marks the template's example/comment rows.
      if ((cells[0] ?? "").trim().startsWith("#")) return;
      const row: Record<string, string> = { __row: String(i + 2) };
      for (const [key, idx] of Object.entries(indexByKey)) row[key] = (cells[idx] ?? "").trim();
      rows.push(row);
    });
    setParsed({ fileName: file.name, rows, unknownHeaders, missingRequired });
  }

  const [progress, setProgress] = useState<{ processed: number; total: number } | null>(null);

  const run = useMutation({
    mutationFn: (dryRun: boolean) => {
      setProgress(null);
      return importService.run(
        compId,
        config.key,
        userName,
        {
          siteId,
          dryRun,
          updateExisting,
          createMissing: config.supportsCreateMissing ? createMissing : false,
          rows: parsed?.rows ?? [],
        },
        (processed, total) => setProgress({ processed, total }),
      );
    },
    onSuccess: (data) => {
      setResult(data);
      if (!data.dryRun) {
        for (const key of config.invalidateKeys) queryClient.invalidateQueries({ queryKey: [key] });
        toast({ title: t("importDone", { count: data.created + data.updated }) });
      }
    },
    onError: (err: unknown) => {
      const chunkError = err instanceof ImportChunkError ? err : null;
      const cause = chunkError ? chunkError.cause : err;
      const message = (cause as { response?: { data?: { message?: string } } })?.response?.data?.message;
      if (chunkError && chunkError.processed > 0) {
        // The earlier chunks were already saved - say so, and refresh the lists.
        for (const key of config.invalidateKeys) queryClient.invalidateQueries({ queryKey: [key] });
        toast({
          title: t("importStopped", { count: chunkError.processed }),
          description: message || tc("errorGeneric"),
          variant: "destructive",
        });
        return;
      }
      toast({ title: message || tc("errorGeneric"), variant: "destructive" });
    },
    onSettled: () => setProgress(null),
  });

  const canRun = !!parsed && parsed.rows.length > 0 && parsed.missingRequired.length === 0 && !!siteId && !run.isPending;
  const importable = result ? result.created + result.updated : 0;

  const visibleRows = useMemo(() => {
    const rows = result?.rows ?? [];
    return (errorsOnly ? rows.filter((r) => r.status === "Error") : rows).slice(0, MAX_RENDERED_ROWS);
  }, [result, errorsOnly]);

  function downloadErrors() {
    if (!result) return;
    const problems = result.rows.filter((r) => r.status === "Error");
    downloadTextFile(
      `${config.key}-import-errors.csv`,
      buildCsv([["Row", "Key", "Status", "Messages"], ...problems.map((r) => [r.rowNumber, r.key ?? "", r.status, r.messages.join(" | ")])]),
    );
  }

  return (
    <div className="space-y-4">
      <PageHeader title={t("title")} description={t("subtitle")} />

      <Card>
        <CardContent className="space-y-4 p-4">
          <h2 className="text-sm font-semibold">{t("step1")}</h2>
          <div className="flex flex-wrap items-end gap-4">
            <div className="space-y-1">
              <Label>{t("entity")}</Label>
              <Select value={entityKey} onValueChange={changeEntity}>
                <SelectTrigger className="w-64">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {IMPORT_ENTITIES.map((e) => (
                    <SelectItem key={e.key} value={e.key}>
                      {t(e.labelKey)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button variant="outline" onClick={downloadTemplate}>
              <Download className="me-2 h-4 w-4" />
              {t("downloadTemplate")}
            </Button>
          </div>
          <p className="text-sm text-muted-foreground">{t(config.descriptionKey)}</p>
          <p className="text-xs text-muted-foreground">{t("templateNote")}</p>

          <details className="rounded-md border">
            <summary className="cursor-pointer select-none px-3 py-2 text-sm font-medium">{t("columnGuide")}</summary>
            <div className="overflow-x-auto border-t">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("column")}</TableHead>
                    <TableHead>{t("requiredLabel")}</TableHead>
                    <TableHead>{t("exampleLabel")}</TableHead>
                    <TableHead>{t("whatToEnter")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {config.columns.map((c) => (
                    <TableRow key={c.key}>
                      <TableCell className="font-mono text-xs">{c.key}</TableCell>
                      <TableCell>{c.required ? tc("yes") : ""}</TableCell>
                      <TableCell className="font-mono text-xs">{c.example}</TableCell>
                      <TableCell className="text-sm">{c.description}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </details>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-4 p-4">
          <h2 className="text-sm font-semibold">{t("step2")}</h2>
          <div className="flex flex-wrap items-end gap-4">
            <div className="space-y-1">
              <Label>{tc("branch")}</Label>
              <Select
                value={siteId}
                onValueChange={(v) => {
                  setSiteId(v);
                  clearResult();
                }}
              >
                <SelectTrigger className="w-56">
                  <SelectValue placeholder={tc("branch")} />
                </SelectTrigger>
                <SelectContent>
                  {sites.map((s) => (
                    <SelectItem key={s.siteID} value={s.siteID}>
                      {s.siteName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>{t("file")}</Label>
              <div className="flex items-center gap-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.csv,.txt,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                  className="hidden"
                  onChange={(e) => handleFile(e.target.files?.[0])}
                />
                <Button variant="outline" onClick={() => fileInputRef.current?.click()}>
                  <FileUp className="me-2 h-4 w-4" />
                  {t("chooseFile")}
                </Button>
                {parsed && <span className="text-sm text-muted-foreground">{parsed.fileName}</span>}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-x-6 gap-y-2">
            <label className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={updateExisting}
                onCheckedChange={(v) => {
                  setUpdateExisting(v === true);
                  clearResult();
                }}
              />
              {t("updateExisting")}
            </label>
            {config.supportsCreateMissing && (
              <label className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={createMissing}
                  onCheckedChange={(v) => {
                    setCreateMissing(v === true);
                    clearResult();
                  }}
                />
                {t("createMissing")}
              </label>
            )}
          </div>

          {parsed && (
            <div className="space-y-1 text-sm">
              <p>{t("rowsRead", { count: parsed.rows.length })}</p>
              {parsed.missingRequired.length > 0 && (
                <p className="font-medium text-destructive">
                  {t("missingColumns", { names: parsed.missingRequired.join(", ") })}
                </p>
              )}
              {parsed.unknownHeaders.length > 0 && (
                <p className="text-muted-foreground">{t("ignoredColumns", { names: parsed.unknownHeaders.join(", ") })}</p>
              )}
              {parsed.rows.length === 0 && parsed.missingRequired.length === 0 && (
                <p className="text-destructive">{t("noRows")}</p>
              )}
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            <Button variant="outline" disabled={!canRun} onClick={() => run.mutate(true)}>
              {run.isPending && run.variables === true ? (
                <Loader2 className="me-2 h-4 w-4 animate-spin" />
              ) : (
                <ShieldCheck className="me-2 h-4 w-4" />
              )}
              {t("validate")}
            </Button>
            <Button disabled={!canRun || !result?.dryRun || importable === 0} onClick={() => run.mutate(false)}>
              {run.isPending && run.variables === false ? (
                <Loader2 className="me-2 h-4 w-4 animate-spin" />
              ) : (
                <Upload className="me-2 h-4 w-4" />
              )}
              {t("importRows", { count: importable })}
            </Button>
            {run.isPending && progress && progress.total > CHUNK_NOTICE_MIN && (
              <span className="self-center text-sm text-muted-foreground">
                {t("processing", { done: progress.processed, total: progress.total })}
              </span>
            )}
          </div>
        </CardContent>
      </Card>

      {result && (
        <Card>
          <CardContent className="space-y-4 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-sm font-semibold">{t("results")}</h2>
              <p className="text-sm text-muted-foreground">{result.dryRun ? t("validationOnly") : t("importFinished")}</p>
            </div>

            <div className="flex flex-wrap gap-2 text-sm">
              {(
                [
                  ["Created", result.created, t("created")],
                  ["Updated", result.updated, t("updated")],
                  ["Skipped", result.skipped, t("skipped")],
                  ["Error", result.failed, t("errors")],
                ] as const
              ).map(([status, count, label]) => (
                <span key={status} className={cn("rounded px-2.5 py-1 font-medium", STATUS_STYLES[status])}>
                  {label}: {count}
                </span>
              ))}
            </div>

            {result.notes.length > 0 && (
              <ul className="list-inside list-disc text-sm text-muted-foreground">
                {result.notes.map((n) => (
                  <li key={n}>{n}</li>
                ))}
              </ul>
            )}

            <div className="flex flex-wrap items-center gap-4">
              <label className="flex items-center gap-2 text-sm">
                <Checkbox checked={errorsOnly} onCheckedChange={(v) => setErrorsOnly(v === true)} />
                {t("showErrorsOnly")}
              </label>
              {result.failed > 0 && (
                <Button variant="outline" size="sm" onClick={downloadErrors}>
                  <Download className="me-2 h-4 w-4" />
                  {t("downloadErrors")}
                </Button>
              )}
              {!result.dryRun && (
                <Button variant="link" size="sm" asChild>
                  <Link href={config.listHref}>{t("viewRecords")}</Link>
                </Button>
              )}
            </div>

            <div className="max-h-[420px] overflow-auto rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-16">{t("rowCol")}</TableHead>
                    <TableHead className="w-48">{t("keyCol")}</TableHead>
                    <TableHead className="w-28">{t("statusCol")}</TableHead>
                    <TableHead>{t("messagesCol")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {visibleRows.map((r) => (
                    <TableRow key={r.rowNumber}>
                      <TableCell>{r.rowNumber}</TableCell>
                      <TableCell className="font-mono text-xs">{r.key}</TableCell>
                      <TableCell>
                        <span className={cn("rounded px-2 py-0.5 text-xs font-medium", STATUS_STYLES[r.status])}>
                          {t(`status${r.status}`)}
                        </span>
                      </TableCell>
                      <TableCell className="text-sm">{r.messages.join(" ")}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            {result.rows.length > MAX_RENDERED_ROWS && (
              <p className="text-xs text-muted-foreground">{t("showingFirst", { count: MAX_RENDERED_ROWS })}</p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
