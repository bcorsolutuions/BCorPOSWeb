"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { FloorStatusEntry } from "@/types/restaurant";

/**
 * Moves the current table's open KOT/held bill onto a free table — e.g. the
 * kitchen needs this table back, or the guests asked to move. Only tables
 * that are AVAILABLE are offered: RestaurantOperationsController.TransferTable
 * refuses an occupied destination outright (§ "Destination table is already occupied").
 */
export function TransferTableDialog({
  open,
  onOpenChange,
  fromTableCode,
  entries,
  onConfirm,
  submitting,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  fromTableCode: string;
  entries: FloorStatusEntry[];
  onConfirm: (toTableCode: string) => void;
  submitting?: boolean;
}) {
  const t = useTranslations("restaurant");
  const tc = useTranslations("common");
  const [toTableCode, setToTableCode] = useState<string>("");

  const availableTables = entries
    .filter((e) => e.table.code !== fromTableCode && e.table.currentStatus === "AVAILABLE" && e.table.active)
    .map((e) => e.table);

  function handleOpenChange(next: boolean) {
    if (!next) setToTableCode("");
    onOpenChange(next);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{t("transferTable")}</DialogTitle>
          <DialogDescription>{t("transferTableDesc", { table: fromTableCode })}</DialogDescription>
        </DialogHeader>

        <Select value={toTableCode} onValueChange={setToTableCode}>
          <SelectTrigger>
            <SelectValue placeholder={t("transferTo")} />
          </SelectTrigger>
          <SelectContent>
            {availableTables.length === 0 && (
              <div className="px-2 py-1.5 text-sm text-muted-foreground">{t("noAvailableTables")}</div>
            )}
            {availableTables.map((table) => (
              <SelectItem key={table.code} value={table.code}>
                {table.tableName} ({table.code})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)}>
            {tc("cancel")}
          </Button>
          <Button disabled={!toTableCode || submitting} onClick={() => onConfirm(toTableCode)}>
            {t("confirmTransfer")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
