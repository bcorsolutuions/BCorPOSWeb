"use client";

import { useLocale, useTranslations } from "next-intl";
import { useQuery } from "@tanstack/react-query";
import { useWatch, type UseFormReturn } from "react-hook-form";
import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { itemMasterService } from "@/lib/api/services/item-master-service";
import { useCurrentBranch } from "@/hooks/use-current-branch";
import { useCurrencyStore } from "@/stores/currency-store";
import { cn, formatMoney } from "@/lib/utils";
import type { ItemMasterFormValues } from "@/schemas/masters.schema";
import type { ItemMaster } from "@/types/item-master";

function Stat({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1" title={hint}>
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <div className="flex h-10 items-center rounded-md border bg-muted/40 px-3 text-sm font-medium tabular-nums">
        {children}
      </div>
    </div>
  );
}

// Margin % on the Item Master form: live from the Retail Price and Cost Price
// fields, so it updates as they are typed. Avg Cost, Last Purchase Cost and
// Stock Qty are read-only — derived by the API from goods receipts and the
// stock ledger, not stored on the item (see item-master-service.getCostStock)
// — so they only exist for a saved item. "Print Barcode" prints the item's
// label (name, price, scannable barcode) using whatever is in the form now.
export function ItemCostingPanel({
  form,
  editingEntity,
  onPrintBarcode,
}: {
  form: UseFormReturn<ItemMasterFormValues>;
  editingEntity: ItemMaster | null;
  onPrintBarcode: (item: ItemMaster) => void;
}) {
  const t = useTranslations("item");
  const locale = useLocale();
  const currency = useCurrencyStore((s) => s.currencyCode);
  const { siteId: branchId, siteName: branchName } = useCurrentBranch();

  const [price, costPrice, barCode] = useWatch({ control: form.control, name: ["price", "costPrice", "barCode"] });

  const { data: summary, isLoading } = useQuery({
    queryKey: ["item-cost-stock", editingEntity?.code, branchId],
    queryFn: () => itemMasterService.getCostStock(editingEntity!.code, branchId || undefined),
    enabled: !!editingEntity && !!branchId,
  });

  const retail = Number(price) || 0;
  const cost = costPrice === undefined || costPrice === null || String(costPrice) === "" ? null : Number(costPrice);
  const margin = retail > 0 && cost !== null && cost > 0 ? ((retail - cost) / retail) * 100 : null;

  const dash = <span className="text-muted-foreground">—</span>;
  const money = (v: number | null | undefined) => (v == null ? dash : formatMoney(v, currency, locale));
  const saved = !!editingEntity;
  const canPrint = saved && !!barCode?.trim();

  return (
    <div className="space-y-2 rounded-md border p-3">
      <div className="flex items-center justify-between gap-2">
        <Label>{t("costingStock")}</Label>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={!canPrint}
          title={!saved ? t("saveFirstHint") : !barCode?.trim() ? t("noBarcodeHint") : undefined}
          onClick={() =>
            editingEntity &&
            onPrintBarcode({
              ...editingEntity,
              name: form.getValues("name") || editingEntity.name,
              barCode: form.getValues("barCode") || null,
              price: Number(form.getValues("price")) || 0,
            })
          }
        >
          <Printer className="me-1 h-3.5 w-3.5" />
          {t("printBarcode")}
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label={t("margin")} hint={t("marginHint")}>
          {margin === null ? (
            dash
          ) : (
            <span className={cn(margin < 0 && "text-destructive")}>{margin.toFixed(1)}%</span>
          )}
        </Stat>
        <Stat label={t("avgCost")}>{!saved || isLoading ? dash : money(summary?.averageCost)}</Stat>
        <Stat label={t("lastPurchaseCost")}>{!saved || isLoading ? dash : money(summary?.lastPurchaseCost)}</Stat>
        <Stat label={branchName ? t("stockQtyBranch", { branch: branchName }) : t("stockQty")}>
          {!saved || isLoading || !summary ? (
            dash
          ) : (
            <span className={cn(summary.stockQty < 0 && "text-destructive")}>
              {summary.stockQty.toLocaleString(locale, { maximumFractionDigits: 3 })}
              {editingEntity?.unitCode ? <span className="ms-1 text-xs text-muted-foreground">{editingEntity.unitCode}</span> : null}
            </span>
          )}
        </Stat>
      </div>

      {saved && summary && summary.stockQtyAllBranches !== summary.stockQty && (
        <p className="text-xs text-muted-foreground">
          {t("allBranchesStock", { qty: summary.stockQtyAllBranches.toLocaleString(locale, { maximumFractionDigits: 3 }) })}
        </p>
      )}
      {!saved && <p className="text-xs text-muted-foreground">{t("saveFirstHint")}</p>}
      {saved && summary && summary.averageCost === null && (
        <p className="text-xs text-muted-foreground">{t("notPurchased")}</p>
      )}
    </div>
  );
}
