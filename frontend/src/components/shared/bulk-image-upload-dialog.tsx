"use client";

import { useMemo, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Check, ImagePlus, Loader2, X } from "lucide-react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_SIZE_BYTES = 5 * 1024 * 1024;

type RowStatus = "pending" | "uploading" | "success" | "error" | "noMatch";

interface Row {
  file: File;
  code: string;
  matchedName?: string;
  status: RowStatus;
  message?: string;
}

/**
 * Bulk photo import for a master list — match each selected file's name
 * (minus extension) case-insensitively against an item's Code, then upload
 * each match through the SAME per-item upload function the single-photo
 * dialog uses (no new bulk backend endpoint — just looping the existing
 * one, which keeps server-side validation/behavior identical either way).
 */
export function BulkImageUploadDialog({
  open,
  onOpenChange,
  entities,
  uploadFn,
  onDone,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entities: { code: string; name: string }[];
  uploadFn: (code: string, file: File) => Promise<unknown>;
  onDone: () => void;
}) {
  const t = useTranslations("common");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [rows, setRows] = useState<Row[]>([]);
  const [running, setRunning] = useState(false);

  const codeMap = useMemo(() => {
    const map = new Map<string, { code: string; name: string }>();
    for (const entity of entities) map.set(entity.code.trim().toUpperCase(), entity);
    return map;
  }, [entities]);

  const summary = useMemo(() => {
    const success = rows.filter((r) => r.status === "success").length;
    const error = rows.filter((r) => r.status === "error").length;
    const noMatch = rows.filter((r) => r.status === "noMatch").length;
    return { success, error, noMatch, total: rows.length };
  }, [rows]);

  function handleFilesSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    e.target.value = "";
    if (files.length === 0) return;

    const nextRows: Row[] = files.map((file) => {
      const baseName = file.name.replace(/\.[^.]+$/, "").trim().toUpperCase();
      const match = codeMap.get(baseName);

      if (!ALLOWED_TYPES.includes(file.type)) {
        return { file, code: baseName, status: "error", message: t("invalidImageType") };
      }
      if (file.size > MAX_SIZE_BYTES) {
        return { file, code: baseName, status: "error", message: t("imageTooLarge") };
      }
      if (!match) {
        return { file, code: baseName, status: "noMatch", message: t("noMatchingItem") };
      }
      return { file, code: match.code, matchedName: match.name, status: "pending" };
    });

    setRows(nextRows);
  }

  async function handleStart() {
    setRunning(true);
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      if (!row || row.status !== "pending") continue;
      setRows((prev) => prev.map((r, idx) => (idx === i ? { ...r, status: "uploading" } : r)));
      try {
        await uploadFn(row.code, row.file);
        setRows((prev) => prev.map((r, idx) => (idx === i ? { ...r, status: "success" } : r)));
      } catch {
        setRows((prev) =>
          prev.map((r, idx) => (idx === i ? { ...r, status: "error", message: t("errorGeneric") } : r)),
        );
      }
    }
    setRunning(false);
    onDone();
  }

  function handleClose(nextOpen: boolean) {
    if (!nextOpen) {
      setRows([]);
      setRunning(false);
    }
    onOpenChange(nextOpen);
  }

  const pendingCount = rows.filter((r) => r.status === "pending").length;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{t("bulkUploadPhotos")}</DialogTitle>
          <DialogDescription>{t("bulkUploadPhotosHint")}</DialogDescription>
        </DialogHeader>

        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept={ALLOWED_TYPES.join(",")}
          className="hidden"
          onChange={handleFilesSelected}
        />

        <Button type="button" variant="outline" disabled={running} onClick={() => fileInputRef.current?.click()}>
          <ImagePlus className="me-1 h-4 w-4" />
          {t("selectPhotos")}
        </Button>

        {rows.length > 0 && (
          <>
            <div className="max-h-64 space-y-1 overflow-y-auto rounded-md border p-2 text-sm">
              {rows.map((row, idx) => (
                <div key={idx} className="flex items-center justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="truncate">{row.file.name}</p>
                    {row.matchedName && <p className="truncate text-xs text-muted-foreground">→ {row.matchedName}</p>}
                    {row.message && <p className="truncate text-xs text-destructive">{row.message}</p>}
                  </div>
                  {row.status === "pending" && <span className="text-xs text-muted-foreground">{t("pending")}</span>}
                  {row.status === "uploading" && <Loader2 className="h-4 w-4 shrink-0 animate-spin text-primary" />}
                  {row.status === "success" && <Check className="h-4 w-4 shrink-0 text-success" />}
                  {(row.status === "error" || row.status === "noMatch") && (
                    <X className="h-4 w-4 shrink-0 text-destructive" />
                  )}
                </div>
              ))}
            </div>

            {summary.total > 0 && (summary.success > 0 || summary.error > 0) && (
              <p className="text-xs text-muted-foreground">
                {summary.success}/{summary.total} {t("uploaded")}
                {summary.noMatch > 0 && ` · ${summary.noMatch} ${t("noMatchingItem")}`}
                {summary.error > 0 && ` · ${summary.error} ${t("errorGeneric")}`}
              </p>
            )}
          </>
        )}

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => handleClose(false)}>
            {t("close")}
          </Button>
          <Button type="button" disabled={pendingCount === 0 || running} onClick={handleStart}>
            {running ? <Loader2 className="me-1 h-4 w-4 animate-spin" /> : null}
            {t("startUpload")} {pendingCount > 0 ? `(${pendingCount})` : ""}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
