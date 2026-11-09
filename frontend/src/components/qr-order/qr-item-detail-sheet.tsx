"use client";

import { useEffect, useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { useCurrencyStore } from "@/stores/currency-store";
import { formatMoney } from "@/lib/utils";
import type { MenuItemDto, ModifierDto, ModifierGroupDto, SelectedModifier } from "@/types/restaurant";

export interface QrCartAddPayload {
  qty: number;
  modifiers: SelectedModifier[];
  specialInstructions: string;
}

/**
 * Plain (non-combo) menu item detail sheet — modifiers shown all-for-every-item
 * (see AddOrderItemDialog.tsx's own comment: no MenuItem<->ModifierGroup link
 * table exists, so POS shows every modifier for every item and this matches
 * that exactly, per the approved plan's answer). Combo items instead reuse
 * SelectComboOptionsDialog directly from the page — this sheet is only for
 * plain items.
 */
export function QrItemDetailSheet({
  item,
  modifierGroups,
  modifiers,
  onOpenChange,
  onAdd,
}: {
  item: MenuItemDto | null;
  modifierGroups: ModifierGroupDto[];
  modifiers: ModifierDto[];
  onOpenChange: (open: boolean) => void;
  onAdd: (payload: QrCartAddPayload) => void;
}) {
  const t = useTranslations("qrMenu");
  const locale = useLocale();
  const currency = useCurrencyStore((s) => s.currencyCode);
  const open = !!item;

  const [qty, setQty] = useState(1);
  const [selectedCodes, setSelectedCodes] = useState<Set<string>>(new Set());
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (open) {
      setQty(1);
      setSelectedCodes(new Set());
      setNotes("");
    }
  }, [open, item?.code]);

  const groupedModifiers = useMemo(() => {
    const map = new Map<string, typeof modifiers>();
    for (const m of modifiers) {
      const list = map.get(m.modifierGroupCode) ?? [];
      list.push(m);
      map.set(m.modifierGroupCode, list);
    }
    return Array.from(map.entries());
  }, [modifiers]);
  const groupNameByCode = useMemo(() => new Map(modifierGroups.map((g) => [g.code, g.modifierGroupName])), [modifierGroups]);

  if (!item) return null;

  const modifierTotal = modifiers
    .filter((m) => selectedCodes.has(m.code))
    .reduce((sum, m) => sum + m.additionalPrice, 0);
  const lineTotal = (item.sellingPrice + modifierTotal) * qty;

  function toggle(code: string) {
    setSelectedCodes((prev) => {
      const next = new Set(prev);
      if (next.has(code)) next.delete(code);
      else next.add(code);
      return next;
    });
  }

  function handleAdd() {
    const selected: SelectedModifier[] = modifiers
      .filter((m) => selectedCodes.has(m.code))
      .map((m) => ({ code: m.code, name: m.modifierName, price: m.additionalPrice }));
    onAdd({ qty, modifiers: selected, specialInstructions: notes.trim().slice(0, 500) });
    onOpenChange(false);
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="max-h-[85vh] overflow-y-auto rounded-t-xl">
        <SheetHeader>
          <SheetTitle>{locale === "ar" && item.menuNameArb ? item.menuNameArb : item.menuName}</SheetTitle>
        </SheetHeader>

        <div className="space-y-4 py-2">
          {item.description && <p className="text-sm text-muted-foreground">{item.description}</p>}

          {groupedModifiers.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium">{t("chooseModifiers")}</p>
              <div className="max-h-48 space-y-3 overflow-y-auto rounded-md border p-2">
                {groupedModifiers.map(([groupCode, group]) => (
                  <div key={groupCode}>
                    <p className="mb-1 text-xs font-semibold text-muted-foreground">
                      {groupNameByCode.get(groupCode) ?? groupCode}
                    </p>
                    {group.map((m) => (
                      <label key={m.code} className="flex items-center justify-between gap-2 py-1.5 text-sm">
                        <span className="flex items-center gap-2">
                          <Checkbox checked={selectedCodes.has(m.code)} onCheckedChange={() => toggle(m.code)} />
                          {m.modifierName}
                        </span>
                        {m.additionalPrice > 0 && (
                          <span className="text-xs text-muted-foreground">
                            +{formatMoney(m.additionalPrice, currency, locale)}
                          </span>
                        )}
                      </label>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-1">
            <p className="text-sm font-medium">{t("specialInstructions")}</p>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value.slice(0, 500))}
              placeholder={t("specialInstructionsPlaceholder")}
              rows={2}
            />
          </div>

          <div className="flex items-center justify-between">
            <p className="text-sm font-medium">{t("quantity")}</p>
            <div className="flex items-center gap-3">
              <Button variant="outline" size="icon" className="h-9 w-9" onClick={() => setQty((q) => Math.max(1, q - 1))}>
                −
              </Button>
              <span className="w-6 text-center tabular-nums">{qty}</span>
              <Button variant="outline" size="icon" className="h-9 w-9" onClick={() => setQty((q) => Math.min(50, q + 1))}>
                +
              </Button>
            </div>
          </div>
        </div>

        <Button className="w-full" size="lg" onClick={handleAdd}>
          {t("addToCart")} — {formatMoney(lineTotal, currency, locale)}
        </Button>
      </SheetContent>
    </Sheet>
  );
}
