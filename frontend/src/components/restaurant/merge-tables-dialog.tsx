"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import type { FloorStatusEntry } from "@/types/restaurant";

/**
 * Folds one or more other occupied tables' open KOTs/held bills onto the
 * current table (the target) — e.g. two tables were pushed together for one
 * party. Only tables with IsMergeAllowed are offered; the backend re-checks
 * this on both the target and every source regardless (RestaurantOperationsController.MergeTables).
 */
export function MergeTablesDialog({
  open,
  onOpenChange,
  targetTableCode,
  entries,
  onConfirm,
  submitting,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  targetTableCode: string;
  entries: FloorStatusEntry[];
  onConfirm: (sourceTableCodes: string[]) => void;
  submitting?: boolean;
}) {
  const t = useTranslations("restaurant");
  const tc = useTranslations("common");
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const mergeableTables = entries
    .filter(
      (e) =>
        e.table.code !== targetTableCode &&
        e.table.currentStatus === "OCCUPIED" &&
        e.table.active &&
        e.table.isMergeAllowed,
    )
    .map((e) => e.table);

  function toggle(code: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(code)) next.delete(code);
      else next.add(code);
      return next;
    });
  }

  function handleOpenChange(next: boolean) {
    if (!next) setSelected(new Set());
    onOpenChange(next);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{t("mergeInto", { table: targetTableCode })}</DialogTitle>
          <DialogDescription>{t("selectSourceTables")}</DialogDescription>
        </DialogHeader>

        <div className="max-h-64 space-y-1 overflow-y-auto rounded-md border p-2">
          {mergeableTables.length === 0 && (
            <p className="px-1 py-1.5 text-sm text-muted-foreground">{t("noMergeableTables")}</p>
          )}
          {mergeableTables.map((table) => (
            <label key={table.code} className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-muted">
              <Checkbox checked={selected.has(table.code)} onCheckedChange={() => toggle(table.code)} />
              {table.tableName} ({table.code})
            </label>
          ))}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)}>
            {tc("cancel")}
          </Button>
          <Button disabled={selected.size === 0 || submitting} onClick={() => onConfirm(Array.from(selected))}>
            {t("confirmMerge")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
