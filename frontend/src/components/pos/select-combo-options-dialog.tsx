"use client";

import { useEffect, useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useCurrencyStore } from "@/stores/currency-store";
import { formatMoneyPlain, cn } from "@/lib/utils";
import type { ComboDetailDto, ComboMasterDto, ResolvedComboComponent } from "@/types/combo";

function componentCode(d: ComboDetailDto): string {
  return d.componentType === "Inventory" ? d.inventoryCode ?? "" : d.componentType === "Service" ? d.serviceCode ?? "" : d.menuCode ?? "";
}

/**
 * Shown when a combo tile is tapped and it has any optional row or any
 * multi-row group — resolves the "as sold" component list before it's added
 * to the cart (retail) or exploded into draft KOT lines (restaurant).
 * Shared by both pipelines, see kind-crafting-hamming.md's Combo Items plan.
 *
 * GroupNo buckets a combo's rows into named steps (e.g. "Choose your side").
 * A group's effective min/max is the max minimumSelection/maximumSelection
 * across its rows (see combo-detail-editor.tsx — admins set the same value
 * on every row in a group, same convention as groupName). Three rendering
 * modes per group:
 *   - maximumSelection > 1 on a multi-row group → checkboxes with a running
 *     count, capped at max, validated against min before Add is allowed
 *     (true "pick N of M", e.g. choose 2 of 4 sides).
 *   - AllowItemSubstitution + a multi-row group otherwise (max left at the
 *     schema default of 1) → the original radio pick, exactly one.
 *   - everything else → each row's own IsOptional flag (a checkbox when
 *     optional, a plain always-included line when not) — unchanged.
 */
export function SelectComboOptionsDialog({
  combo,
  resolveName,
  resolveKitchenCode,
  onOpenChange,
  onConfirm,
}: {
  combo: ComboMasterDto | null;
  /** Defaults to the raw code when not provided. */
  resolveName?: (detail: ComboDetailDto) => string;
  resolveKitchenCode?: (detail: ComboDetailDto) => string | null | undefined;
  onOpenChange: (open: boolean) => void;
  onConfirm: (resolvedComponents: ResolvedComboComponent[], quantity: number) => void;
}) {
  const t = useTranslations("combo");
  const tc = useTranslations("common");
  const locale = useLocale();
  const currency = useCurrencyStore((s) => s.currencyCode);
  const open = !!combo;

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [radioByGroup, setRadioByGroup] = useState<Record<number, string>>({});
  const [qty, setQty] = useState(1);

  const groups = useMemo(() => {
    if (!combo) return [];
    const byGroup = new Map<number, ComboDetailDto[]>();
    for (const d of combo.details) {
      const list = byGroup.get(d.groupNo) ?? [];
      list.push(d);
      byGroup.set(d.groupNo, list);
    }
    return Array.from(byGroup.entries()).sort((a, b) => a[0] - b[0]);
  }, [combo]);

  // A group's pick range is whatever its rows carry (see this file's top
  // comment) — max(...) rather than picking one row arbitrarily, since an
  // admin who left it unset on some rows shouldn't silently shrink the cap.
  function groupRange(rows: ComboDetailDto[]) {
    const max = Math.max(0, ...rows.map((r) => r.maximumSelection || 0));
    const min = Math.max(0, ...rows.map((r) => r.minimumSelection || 0));
    return { min, max };
  }

  useEffect(() => {
    if (!open || !combo) return;
    const initialSelected = new Set<string>();
    const initialRadio: Record<number, string> = {};
    for (const [groupNo, rows] of groups) {
      const { max } = groupRange(rows);
      const isCappedMultiSelect = rows.length > 1 && max > 1;
      const isSubstituteGroup = !isCappedMultiSelect && combo.allowItemSubstitution && rows.length > 1;
      if (isSubstituteGroup) {
        const def = rows.find((r) => r.isDefault) ?? rows[0];
        if (def) {
          initialRadio[groupNo] = def.id;
          initialSelected.add(def.id);
        }
      } else if (isCappedMultiSelect) {
        // Pre-select IsDefault rows, capped at max — same "start from the
        // author's picks" intent as the radio/flat branches, just bounded.
        const defaults = rows.filter((r) => r.isDefault).slice(0, max);
        for (const r of defaults) initialSelected.add(r.id);
      } else {
        for (const r of rows) {
          if (!r.isOptional || r.isDefault) initialSelected.add(r.id);
        }
      }
    }
    setSelectedIds(initialSelected);
    setRadioByGroup(initialRadio);
    setQty(1);
  }, [open, combo, groups]);

  if (!combo) return null;

  function pickRadio(groupNo: number, rows: ComboDetailDto[], id: string) {
    setRadioByGroup((prev) => ({ ...prev, [groupNo]: id }));
    setSelectedIds((prev) => {
      const next = new Set(prev);
      for (const r of rows) next.delete(r.id);
      next.add(id);
      return next;
    });
  }

  function toggleOptional(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  // Checked rows in this group toggle freely; an unchecked row past the cap
  // is inert (no-op) rather than bumping something else out — the cashier
  // unchecks one first, same physical motion as a paper order pad.
  function toggleCapped(groupNo: number, rows: ComboDetailDto[], id: string, max: number) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
        return next;
      }
      const selectedInGroup = rows.filter((r) => next.has(r.id)).length;
      if (selectedInGroup >= max) return prev;
      next.add(id);
      return next;
    });
  }

  const additionalTotal = combo.details
    .filter((d) => selectedIds.has(d.id))
    .reduce((sum, d) => sum + (d.additionalPrice || 0), 0);
  const lineTotal = combo.sellingPrice + additionalTotal;

  // First capped multi-select group that's still short of its minimum, if
  // any — blocks Add the same way a required field does, rather than
  // letting the cashier confirm an incomplete meal.
  const unmetGroup = groups.find(([, rows]) => {
    const { min, max } = groupRange(rows);
    if (!(rows.length > 1 && max > 1)) return false;
    return rows.filter((r) => selectedIds.has(r.id)).length < min;
  });

  function handleConfirm() {
    if (unmetGroup) return;
    const resolvedComponents: ResolvedComboComponent[] = combo!.details.map((d) => ({
      componentType: d.componentType,
      code: componentCode(d),
      name: resolveName ? resolveName(d) : componentCode(d),
      unitCode: d.unitCode ?? null,
      qty: d.quantity,
      additionalPrice: d.additionalPrice,
      isOptional: d.isOptional,
      selected: selectedIds.has(d.id),
      kitchenCode: resolveKitchenCode ? resolveKitchenCode(d) ?? null : null,
      groupNo: d.groupNo,
    }));
    onConfirm(resolvedComponents, qty);
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{combo.comboName}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <Label className="w-20">{t("quantity")}</Label>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="icon" onClick={() => setQty((q) => Math.max(1, q - 1))}>
                −
              </Button>
              <Input
                type="number"
                min={1}
                value={qty}
                onChange={(e) => setQty(Math.max(1, Number(e.target.value) || 1))}
                className="w-16 text-center"
              />
              <Button variant="outline" size="icon" onClick={() => setQty((q) => q + 1)}>
                +
              </Button>
            </div>
          </div>

          <div className="max-h-72 space-y-3 overflow-y-auto">
            {groups.map(([groupNo, rows]) => {
              const { min, max } = groupRange(rows);
              const isCappedMultiSelect = rows.length > 1 && max > 1;
              const isSubstituteGroup = !isCappedMultiSelect && combo.allowItemSubstitution && rows.length > 1;
              const selectedInGroup = rows.filter((r) => selectedIds.has(r.id)).length;
              return (
                <div key={groupNo} className="space-y-1">
                  {rows[0]?.groupName && (
                    <div className="flex items-baseline justify-between">
                      <Label className="text-xs text-muted-foreground">{rows[0].groupName}</Label>
                      {isCappedMultiSelect && (
                        <span className="text-xs text-muted-foreground">
                          {min === max ? t("pickExactly", { count: max }) : t("pickRange", { min, max })} ({selectedInGroup}/{max})
                        </span>
                      )}
                    </div>
                  )}
                  {isCappedMultiSelect ? (
                    <div className="space-y-1 rounded-md border p-2">
                      {rows.map((r) => {
                        const checked = selectedIds.has(r.id);
                        const atCap = !checked && selectedInGroup >= max;
                        return (
                          <label
                            key={r.id}
                            className={cn(
                              "flex items-center justify-between gap-2 rounded-md px-2 py-1 text-sm",
                              atCap && "opacity-50",
                            )}
                          >
                            <span className="flex items-center gap-2">
                              <Checkbox
                                checked={checked}
                                disabled={atCap}
                                onCheckedChange={() => toggleCapped(groupNo, rows, r.id, max)}
                              />
                              {resolveName ? resolveName(r) : componentCode(r)}
                            </span>
                            {r.additionalPrice > 0 && (
                              <span className="text-xs text-muted-foreground">
                                +{formatMoneyPlain(r.additionalPrice, currency, locale)}
                              </span>
                            )}
                          </label>
                        );
                      })}
                    </div>
                  ) : isSubstituteGroup ? (
                    <div className="space-y-1 rounded-md border p-2">
                      {rows.map((r) => (
                        <button
                          key={r.id}
                          type="button"
                          onClick={() => pickRadio(groupNo, rows, r.id)}
                          className={cn(
                            "flex w-full items-center justify-between rounded-md px-2 py-1.5 text-start text-sm hover:bg-muted",
                            radioByGroup[groupNo] === r.id && "bg-muted font-medium",
                          )}
                        >
                          <span>{resolveName ? resolveName(r) : componentCode(r)}</span>
                          {r.additionalPrice > 0 && (
                            <span className="text-xs text-muted-foreground">
                              +{formatMoneyPlain(r.additionalPrice, currency, locale)}
                            </span>
                          )}
                        </button>
                      ))}
                    </div>
                  ) : (
                    rows.map((r) =>
                      r.isOptional ? (
                        <label key={r.id} className="flex items-center justify-between gap-2 rounded-md px-2 py-1 text-sm">
                          <span className="flex items-center gap-2">
                            <Checkbox checked={selectedIds.has(r.id)} onCheckedChange={() => toggleOptional(r.id)} />
                            {resolveName ? resolveName(r) : componentCode(r)}
                          </span>
                          {r.additionalPrice > 0 && (
                            <span className="text-xs text-muted-foreground">
                              +{formatMoneyPlain(r.additionalPrice, currency, locale)}
                            </span>
                          )}
                        </label>
                      ) : (
                        <p key={r.id} className="px-2 py-1 text-sm text-muted-foreground">
                          {resolveName ? resolveName(r) : componentCode(r)}
                        </p>
                      ),
                    )
                  )}
                </div>
              );
            })}
          </div>

          <div className="flex items-center justify-between border-t pt-2 text-sm font-semibold">
            <span>{t("lineTotal")}</span>
            <span>{formatMoneyPlain(lineTotal, currency, locale)}</span>
          </div>

          {unmetGroup && unmetGroup[1][0]?.groupName && (
            <p className="text-xs text-destructive">
              {t("selectMoreToConfirm", { min: groupRange(unmetGroup[1]).min, group: unmetGroup[1][0].groupName })}
            </p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {tc("cancel")}
          </Button>
          <Button onClick={handleConfirm} disabled={!!unmetGroup}>
            {tc("add")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
