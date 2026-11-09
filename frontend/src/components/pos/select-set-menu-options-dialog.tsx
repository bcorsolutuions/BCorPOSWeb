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
import type { SetMenuGroupItemDto, SetMenuMasterDto, ResolvedSetMenuComponent } from "@/types/set-menu";

/**
 * Shown when a Set Menu tile is tapped — resolves the "as sold" course
 * selections before they're exploded into draft KOT lines (see
 * kot-mappers.ts's buildSetMenuDraftLines). Structurally mirrors
 * select-combo-options-dialog.tsx's just-built min/max checkbox-with-cap
 * logic, but iterates real SetMenuGroup rows (in Sequence order) instead of
 * ad-hoc groupNo buckets — each course's MinSelection/MaxSelection/
 * IsRequired/GroupName come straight off the master, not inferred from
 * repeated column values. See kind-crafting-hamming.md's Set Menu plan.
 *
 * Two rendering modes per course:
 *   - MaxSelection > 1 → checkboxes with a running count, capped at max,
 *     validated against min before Add is allowed ("choose any 2 sides").
 *   - MaxSelection <= 1 → radio pick (defaults to IsDefault/first choice) —
 *     covers every example in the spec ("Choose 1").
 */
export function SelectSetMenuOptionsDialog({
  setMenu,
  resolveName,
  resolveKitchenCode,
  onOpenChange,
  onConfirm,
}: {
  setMenu: SetMenuMasterDto | null;
  /** Defaults to the raw menuCode when not provided. */
  resolveName?: (item: SetMenuGroupItemDto) => string;
  resolveKitchenCode?: (item: SetMenuGroupItemDto) => string | null | undefined;
  onOpenChange: (open: boolean) => void;
  onConfirm: (resolvedComponents: ResolvedSetMenuComponent[], quantity: number) => void;
}) {
  const t = useTranslations("setMenu");
  const tc = useTranslations("common");
  const locale = useLocale();
  const currency = useCurrencyStore((s) => s.currencyCode);
  const open = !!setMenu;

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [radioByGroup, setRadioByGroup] = useState<Record<string, string>>({});
  const [qty, setQty] = useState(1);

  const groups = useMemo(() => {
    if (!setMenu) return [];
    return [...setMenu.groups].sort((a, b) => a.sequence - b.sequence);
  }, [setMenu]);

  useEffect(() => {
    if (!open || !setMenu) return;
    const initialSelected = new Set<string>();
    const initialRadio: Record<string, string> = {};
    for (const group of groups) {
      const isCappedMultiSelect = group.maxSelection > 1;
      if (isCappedMultiSelect) {
        const defaults = group.items.filter((i) => i.isDefault).slice(0, group.maxSelection);
        for (const i of defaults) initialSelected.add(i.id);
      } else {
        const def = group.items.find((i) => i.isDefault) ?? group.items[0];
        if (def) {
          initialRadio[group.id] = def.id;
          initialSelected.add(def.id);
        }
      }
    }
    setSelectedIds(initialSelected);
    setRadioByGroup(initialRadio);
    setQty(1);
  }, [open, setMenu, groups]);

  if (!setMenu) return null;

  function pickRadio(groupId: string, rows: SetMenuGroupItemDto[], id: string) {
    setRadioByGroup((prev) => ({ ...prev, [groupId]: id }));
    setSelectedIds((prev) => {
      const next = new Set(prev);
      for (const r of rows) next.delete(r.id);
      next.add(id);
      return next;
    });
  }

  // Checked rows in this group toggle freely; an unchecked row past the cap
  // is inert (no-op) rather than bumping something else out — same reasoning
  // as select-combo-options-dialog.tsx's toggleCapped.
  function toggleCapped(rows: SetMenuGroupItemDto[], id: string, max: number) {
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

  const allItems = groups.flatMap((g) => g.items);
  const additionalTotal = allItems.filter((i) => selectedIds.has(i.id)).reduce((sum, i) => sum + (i.additionalPrice || 0), 0);
  const lineTotal = setMenu.sellingPrice + additionalTotal;

  // First group still short of its minimum, if any — blocks Add the same
  // way a required field does. Applies to every group (not just capped
  // multi-select ones) since a radio group can still be short if
  // MinSelection is 1 and somehow nothing got selected.
  const unmetGroup = groups.find((g) => g.items.filter((i) => selectedIds.has(i.id)).length < g.minSelection);

  function handleConfirm() {
    if (unmetGroup) return;
    const resolvedComponents: ResolvedSetMenuComponent[] = groups.flatMap((g) =>
      g.items.map((i) => ({
        componentType: "Menu" as const,
        code: i.menuCode,
        name: resolveName ? resolveName(i) : i.menuCode,
        unitCode: i.unitCode ?? null,
        qty: 1,
        additionalPrice: i.additionalPrice,
        selected: selectedIds.has(i.id),
        kitchenCode: resolveKitchenCode ? resolveKitchenCode(i) ?? null : null,
        groupCode: g.groupCode,
        groupName: g.groupName,
        groupSequence: g.sequence,
      })),
    );
    onConfirm(resolvedComponents, qty);
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{setMenu.setMenuName}</DialogTitle>
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
            {groups.map((group) => {
              const isCappedMultiSelect = group.maxSelection > 1;
              const selectedInGroup = group.items.filter((i) => selectedIds.has(i.id)).length;
              return (
                <div key={group.id} className="space-y-1">
                  <div className="flex items-baseline justify-between">
                    <Label className="text-xs text-muted-foreground">{group.groupName}</Label>
                    {isCappedMultiSelect && (
                      <span className="text-xs text-muted-foreground">
                        {group.minSelection === group.maxSelection
                          ? t("pickExactly", { count: group.maxSelection })
                          : t("pickRange", { min: group.minSelection, max: group.maxSelection })}{" "}
                        ({selectedInGroup}/{group.maxSelection})
                      </span>
                    )}
                  </div>
                  {isCappedMultiSelect ? (
                    <div className="space-y-1 rounded-md border p-2">
                      {group.items.map((item) => {
                        const checked = selectedIds.has(item.id);
                        const atCap = !checked && selectedInGroup >= group.maxSelection;
                        return (
                          <label
                            key={item.id}
                            className={cn(
                              "flex items-center justify-between gap-2 rounded-md px-2 py-1 text-sm",
                              atCap && "opacity-50",
                            )}
                          >
                            <span className="flex items-center gap-2">
                              <Checkbox
                                checked={checked}
                                disabled={atCap}
                                onCheckedChange={() => toggleCapped(group.items, item.id, group.maxSelection)}
                              />
                              {resolveName ? resolveName(item) : item.menuCode}
                            </span>
                            {item.additionalPrice > 0 && (
                              <span className="text-xs text-muted-foreground">
                                +{formatMoneyPlain(item.additionalPrice, currency, locale)}
                              </span>
                            )}
                          </label>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="space-y-1 rounded-md border p-2">
                      {group.items.map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => pickRadio(group.id, group.items, item.id)}
                          className={cn(
                            "flex w-full items-center justify-between rounded-md px-2 py-1.5 text-start text-sm hover:bg-muted",
                            radioByGroup[group.id] === item.id && "bg-muted font-medium",
                          )}
                        >
                          <span>{resolveName ? resolveName(item) : item.menuCode}</span>
                          {item.additionalPrice > 0 && (
                            <span className="text-xs text-muted-foreground">
                              +{formatMoneyPlain(item.additionalPrice, currency, locale)}
                            </span>
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="flex items-center justify-between border-t pt-2 text-sm font-semibold">
            <span>{t("lineTotal")}</span>
            <span>{formatMoneyPlain(lineTotal, currency, locale)}</span>
          </div>

          {unmetGroup && (
            <p className="text-xs text-destructive">
              {t("selectMoreToConfirm", { min: unmetGroup.minSelection, group: unmetGroup.groupName })}
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
