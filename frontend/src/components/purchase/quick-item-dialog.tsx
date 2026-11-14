"use client";

import { useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MoneyInput } from "@/components/shared/money-input";
import { useToast } from "@/components/ui/use-toast";
import { useAuthStore } from "@/stores/auth-store";
import { useCurrentBranch } from "@/hooks/use-current-branch";
import { itemMasterService } from "@/lib/api/services/item-master-service";
import { itemCategoryService } from "@/lib/api/services/item-category-service";
import { unitMasterService } from "@/lib/api/services/unit-master-service";
import { taxMasterService } from "@/lib/api/services/tax-master-service";
import { apiErrorMessage } from "@/lib/api-error";
import { enterMovesToNextField } from "@/lib/prevent-enter-submit";
import type { ItemMaster } from "@/types/item-master";

/**
 * Add an item without leaving the purchase screen: only the essentials (code, name, category, unit, cost price, tax). Everything else
 * (barcode, retail price, alternate units, ...) is completed later in the Item Master. Rendered as a sibling of the purchase dialog,
 * never inside its form, so Enter / Save here can never submit the purchase document.
 *
 * The cost price is stored as the item's cost and also as its starting retail price, so the purchase line picks it up as its rate.
 */
export function QuickItemDialog({
  open,
  onOpenChange,
  initialName,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** What was typed in the item search when "New item" was chosen; prefilled as the name. */
  initialName?: string;
  onCreated: (item: ItemMaster) => void;
}) {
  const t = useTranslations();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const compId = useAuthStore((s) => s.user?.compId ?? "");
  const { siteId } = useCurrentBranch();

  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [unit, setUnit] = useState("");
  const [cost, setCost] = useState("");
  const [tax, setTax] = useState("");

  const { data: categories = [] } = useQuery({
    queryKey: ["item-master-categories", compId],
    queryFn: () => itemCategoryService.getCategories(compId),
    enabled: !!compId && open,
  });
  const { data: units = [] } = useQuery({
    queryKey: ["item-master-units", compId],
    queryFn: () => unitMasterService.getUnits(compId),
    enabled: !!compId && open,
  });
  const { data: taxCodes = [] } = useQuery({
    queryKey: ["item-master-tax-codes", compId],
    queryFn: () => taxMasterService.getTaxCodes(compId),
    enabled: !!compId && open,
  });
  const activeUnits = units.filter((u) => u.active);
  const activeTaxes = taxCodes.filter((x) => x.active);

  // Same rule as the Item Master: items file under a sub category whenever a main category has any, so such a main category is
  // listed but not pickable.
  const categoryOptions = useMemo(() => {
    const active = categories.filter((c) => c.active);
    const parentCodes = new Set(active.filter((c) => c.parentCode).map((c) => c.parentCode as string));
    const mains = active.filter((c) => !c.parentCode).sort((a, b) => a.name.localeCompare(b.name));
    return mains.flatMap((main) => {
      const hasSubs = parentCodes.has(main.code);
      const subs = active
        .filter((c) => c.parentCode === main.code)
        .sort((a, b) => a.name.localeCompare(b.name))
        .map((s) => ({ value: s.code, label: `${main.name} › ${s.name}`, disabled: false }));
      return [
        { value: main.code, label: hasSubs ? `${main.name} (${t("item.hasSubCategories")})` : main.name, disabled: hasSubs },
        ...subs,
      ];
    });
  }, [categories, t]);

  // Fresh form each time it opens.
  useEffect(() => {
    if (open) {
      setCode("");
      setName(initialName ?? "");
      setCost("");
      setCategory("");
      setUnit("");
      setTax("");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);
  // The API requires a unit and a tax code, so start on the first of each (the first category that can hold items too).
  useEffect(() => {
    if (!open) return;
    if (!unit && activeUnits[0]) setUnit(activeUnits[0].code);
    if (!tax && activeTaxes[0]) setTax(activeTaxes[0].code);
    if (!category) {
      const first = categoryOptions.find((o) => !o.disabled);
      if (first) setCategory(first.value);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, units, taxCodes, categories, unit, tax, category]);

  const costNumber = Number(cost || 0);
  const canSave =
    code.trim().length > 0 && name.trim().length > 0 && !!unit && !!tax && !!siteId && costNumber >= 0 && Number.isFinite(costNumber);

  const createMutation = useMutation({
    mutationFn: () =>
      itemMasterService.create({
        code: code.trim(),
        name: name.trim(),
        categoryCode: category || undefined,
        unitCode: unit,
        taxCode: tax,
        costPrice: costNumber,
        price: costNumber,
        siteId,
        active: true,
        isWeighted: false,
        uoms: [],
        vendors: [],
      }),
    onSuccess: async (item) => {
      // wait for the lists so the new item is already known to the purchase screen's item search (and barcode lookup) when it is picked
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["items-lookup", compId] }),
        queryClient.invalidateQueries({ queryKey: ["item-master"] }),
      ]);
      toast({ title: t("quickAdd.itemSaved", { name: item.name }) });
      onCreated(item);
      onOpenChange(false);
    },
    onError: (err) => toast({ title: apiErrorMessage(err, t("common.errorGeneric")), variant: "destructive" }),
  });

  function save() {
    if (canSave && !createMutation.isPending) createMutation.mutate();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-md"
        // Enter / Escape in here belong to this pop-up only (Escape closes just it).
        onKeyDown={(e) => {
          e.stopPropagation();
          enterMovesToNextField(e);
        }}
        // Do not hand focus back to the item search the pop-up was opened from (that would reopen its list).
        onCloseAutoFocus={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>{t("quickAdd.newItem")}</DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="qi-code">{t("item.sku")}</Label>
              <Input id="qi-code" autoFocus maxLength={15} value={code} onChange={(e) => setCode(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="qi-cost">{t("item.costPrice")}</Label>
              <MoneyInput id="qi-cost" min={0} value={cost} onChange={(e) => setCost(e.target.value)} />
            </div>
          </div>
          <div className="space-y-1">
            <Label htmlFor="qi-name">{t("common.name")}</Label>
            <Input id="qi-name" maxLength={150} value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label>{t("item.category")}</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger>
                <SelectValue placeholder={t("item.category")} />
              </SelectTrigger>
              <SelectContent>
                {categoryOptions.map((o) => (
                  <SelectItem key={o.value} value={o.value} disabled={o.disabled}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>{t("item.baseUnit")}</Label>
              <Select value={unit} onValueChange={setUnit}>
                <SelectTrigger>
                  <SelectValue placeholder={t("item.baseUnit")} />
                </SelectTrigger>
                <SelectContent>
                  {activeUnits.map((u) => (
                    <SelectItem key={u.code} value={u.code}>
                      {u.unitName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>{t("item.taxCode")}</Label>
              <Select value={tax} onValueChange={setTax}>
                <SelectTrigger>
                  <SelectValue placeholder={t("item.taxCode")} />
                </SelectTrigger>
                <SelectContent>
                  {activeTaxes.map((x) => (
                    <SelectItem key={x.code} value={x.code}>
                      {x.taxName} ({x.taxRate}%)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          {(activeUnits.length === 0 || activeTaxes.length === 0) && (
            <p className="text-xs text-destructive">{t("quickAdd.noUnitOrTax")}</p>
          )}
          <p className="text-xs text-muted-foreground">{t("quickAdd.completeLater")}</p>
        </div>

        <DialogFooter className="gap-2">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            {t("common.cancel")}
          </Button>
          <Button type="submit" disabled={!canSave || createMutation.isPending} onClick={save}>
            {t("common.save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
