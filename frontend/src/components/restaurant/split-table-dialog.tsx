"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { buildSplitTableMoves, groupDraftLines, type DraftOrderLine, type SplitTableMove } from "@/lib/restaurant/kot-mappers";
import type { FloorStatusEntry } from "@/types/restaurant";

/**
 * Moves a chosen quantity of this table's already-sent order lines onto
 * another table — e.g. some guests physically move mid-meal and take part
 * of the order with them. Unlike Transfer (moves everything, source ends up
 * free), the source table keeps whatever isn't picked here. Operates on the
 * saved KOT's own lines (the `lines` prop), not any locally-added-but-not-
 * -yet-sent draft items — same as Transfer/Merge, which are also blind to
 * local draft state.
 */
export function SplitTableDialog({
  open,
  onOpenChange,
  fromTableCode,
  lines,
  entries,
  onConfirm,
  submitting,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  fromTableCode: string;
  lines: DraftOrderLine[];
  entries: FloorStatusEntry[];
  onConfirm: (input: { toTableCode: string; guestCount: number | null; moves: SplitTableMove[] }) => void;
  submitting?: boolean;
}) {
  const t = useTranslations("restaurant");
  const tc = useTranslations("common");
  const [toTableCode, setToTableCode] = useState("");
  const [guestCount, setGuestCount] = useState(1);
  const [moveByGroupKey, setMoveByGroupKey] = useState<Record<string, number>>({});

  const groups = useMemo(() => groupDraftLines(lines), [lines]);

  // A table that only has a held bill parked on it (no open KOT — needs
  // Recall first) isn't a sane split destination; everything else, free or
  // already running its own order, is fair game (moved lines just append).
  const candidateTables = entries
    .filter((e) => e.table.code !== fromTableCode && e.table.active && !(e.heldBillDocNo != null && e.openKotDocNo == null))
    .map((e) => e.table);

  const destinationHasOpenKot = entries.some((e) => e.table.code === toTableCode && e.openKotDocNo != null);
  const totalMoving = Object.values(moveByGroupKey).reduce((sum, q) => sum + (q || 0), 0);

  function setMove(key: string, qty: number, max: number) {
    setMoveByGroupKey((prev) => ({ ...prev, [key]: Math.max(0, Math.min(max, qty)) }));
  }

  function handleOpenChange(next: boolean) {
    if (!next) {
      setToTableCode("");
      setGuestCount(1);
      setMoveByGroupKey({});
    }
    onOpenChange(next);
  }

  function handleConfirm() {
    const moves = buildSplitTableMoves(groups, moveByGroupKey);
    if (!toTableCode || moves.length === 0) return;
    onConfirm({ toTableCode, guestCount: destinationHasOpenKot ? null : guestCount, moves });
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t("splitTable")}</DialogTitle>
          <DialogDescription>{t("splitTableDesc", { table: fromTableCode })}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1">
            <Label>{t("splitTableTo")}</Label>
            <Select value={toTableCode} onValueChange={setToTableCode}>
              <SelectTrigger>
                <SelectValue placeholder={t("splitTableTo")} />
              </SelectTrigger>
              <SelectContent>
                {candidateTables.length === 0 && (
                  <div className="px-2 py-1.5 text-sm text-muted-foreground">{t("noAvailableTables")}</div>
                )}
                {candidateTables.map((table) => (
                  <SelectItem key={table.code} value={table.code}>
                    {table.tableName} ({table.code}){table.currentStatus === "OCCUPIED" ? ` · ${t("occupied")}` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {toTableCode && !destinationHasOpenKot && (
            <div className="space-y-1">
              <Label>{t("guestCount")}</Label>
              <Input
                type="number"
                min={1}
                value={guestCount}
                onChange={(e) => setGuestCount(Math.max(1, Number(e.target.value) || 1))}
              />
            </div>
          )}

          <div className="max-h-72 space-y-2 overflow-y-auto">
            {groups.map((group) => {
              const priced = group.find((l) => l.comboCode || l.setMenuCode) ?? group[0];
              if (!priced) return null;
              const key = priced.comboInstanceId ?? priced.setMenuInstanceId ?? priced.draftId;
              const max = priced.qty;
              const moveQty = moveByGroupKey[key] ?? 0;
              return (
                <div key={key} className="flex items-center justify-between gap-2 rounded-md border p-2 text-sm">
                  <div>
                    <p className="font-medium">{priced.menuName}</p>
                    <p className="text-xs text-muted-foreground">{t("qtyOnTable", { qty: max })}</p>
                  </div>
                  <Input
                    type="number"
                    min={0}
                    max={max}
                    value={moveQty}
                    onChange={(e) => setMove(key, Number(e.target.value) || 0, max)}
                    className="w-20 text-center"
                  />
                </div>
              );
            })}
            {groups.length === 0 && <p className="text-sm text-muted-foreground">{tc("noData")}</p>}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)}>
            {tc("cancel")}
          </Button>
          <Button disabled={!toTableCode || totalMoving === 0 || submitting} onClick={handleConfirm}>
            {t("confirmSplit")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
