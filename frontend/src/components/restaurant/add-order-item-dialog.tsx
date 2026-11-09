"use client";

import { useEffect, useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { useCurrencyStore } from "@/stores/currency-store";
import { cn, formatMoney } from "@/lib/utils";
import type { DraftOrderLine } from "@/lib/restaurant/kot-mappers";
import type { MenuItemDto, ModifierDto, ModifierGroupDto, SelectedModifier } from "@/types/restaurant";

// The Menu/Modifier schema has no MenuItem<->ModifierGroup link table (see
// D:\Works\BCorApi\PowerDFWebApi\Models\Masters\ModifierMaster.cs — modifiers
// only reference their own ModifierGroupMaster, not any specific menu item),
// so every modifier is offered as an optional add-on regardless of which
// item was tapped, grouped by ModifierGroupMaster for readability.
const COURSES = [
  { no: 1, key: "starters" as const },
  { no: 2, key: "mains" as const },
  { no: 3, key: "desserts" as const },
];

export function AddOrderItemDialog({
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
  onAdd: (line: Omit<DraftOrderLine, "draftId">) => void;
}) {
  const t = useTranslations("order");
  const tc = useTranslations("common");
  const locale = useLocale();
  const currency = useCurrencyStore((s) => s.currencyCode);
  const open = !!item;

  const [qty, setQty] = useState(1);
  const [courseNo, setCourseNo] = useState<number | null>(null);
  const [notes, setNotes] = useState("");
  const [selectedCodes, setSelectedCodes] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (open) {
      setQty(1);
      setCourseNo(null);
      setNotes("");
      setSelectedCodes(new Set());
    }
  }, [open, item?.code]);

  const groupedModifiers = useMemo(() => {
    const map = new Map<string, ModifierDto[]>();
    for (const m of modifiers) {
      const list = map.get(m.modifierGroupCode) ?? [];
      list.push(m);
      map.set(m.modifierGroupCode, list);
    }
    return Array.from(map.entries());
  }, [modifiers]);

  const groupNameByCode = useMemo(() => new Map(modifierGroups.map((g) => [g.code, g.modifierGroupName])), [modifierGroups]);

  function toggleModifier(code: string) {
    setSelectedCodes((prev) => {
      const next = new Set(prev);
      if (next.has(code)) next.delete(code);
      else next.add(code);
      return next;
    });
  }

  function handleAdd() {
    if (!item) return;
    const selected: SelectedModifier[] = modifiers
      .filter((m) => selectedCodes.has(m.code))
      .map((m) => ({ code: m.code, name: m.modifierName, price: m.additionalPrice }));

    const course = COURSES.find((c) => c.no === courseNo);
    onAdd({
      menuCode: item.code,
      menuName: item.menuName,
      unitCode: item.unitCode,
      kitchenCode: item.kitchenCode,
      rate: item.sellingPrice,
      qty,
      modifiers: selected,
      courseNo: course?.no ?? null,
      courseName: course ? t(course.key) : null,
      preparationNotes: notes || null,
    });
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{item?.menuName}</DialogTitle>
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

          <div className="space-y-1">
            <Label>{t("course")}</Label>
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                variant={courseNo === null ? "default" : "outline"}
                onClick={() => setCourseNo(null)}
              >
                {t("noCourse")}
              </Button>
              {COURSES.map((c) => (
                <Button
                  key={c.no}
                  size="sm"
                  variant={courseNo === c.no ? "default" : "outline"}
                  onClick={() => setCourseNo(c.no)}
                >
                  {t(c.key)}
                </Button>
              ))}
            </div>
          </div>

          {groupedModifiers.length > 0 && (
            <div className="space-y-2">
              <Label>{t("selectModifiers")}</Label>
              <div className="max-h-48 space-y-3 overflow-y-auto rounded-md border p-2">
                {groupedModifiers.map(([groupCode, group]) => (
                  <div key={groupCode}>
                    <p className="mb-1 text-xs font-semibold text-muted-foreground">
                      {groupNameByCode.get(groupCode) ?? groupCode}
                    </p>
                    {group.map((m) => (
                      <label key={m.code} className={cn("flex items-center justify-between gap-2 py-1 text-sm")}>
                        <span className="flex items-center gap-2">
                          <Checkbox
                            checked={selectedCodes.has(m.code)}
                            onCheckedChange={() => toggleModifier(m.code)}
                          />
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
            <Label>{t("cookingInstructions")}</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {tc("cancel")}
          </Button>
          <Button onClick={handleAdd}>{t("addToOrder")}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
