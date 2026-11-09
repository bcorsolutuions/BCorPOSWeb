"use client";

import { useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useQuery } from "@tanstack/react-query";
import { inventoryLedgerService } from "@/lib/api/services/inventory-ledger-service";
import { posLookupService } from "@/lib/api/services/pos-lookup-service";
import { useAuthStore } from "@/stores/auth-store";
import { PageHeader } from "@/components/shared/page-header";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDate } from "@/lib/utils";

// DocCd constants mirrored from InventoryLedgerService.cs — no shared
// DocCd master exists anywhere in this codebase (same ad-hoc-DocCd
// convention every other document type already uses), so the two known
// values are just hardcoded here for the report's "Movement Type" column.
const DOC_CD_RECIPE_CONSUMPTION = 40011;
const DOC_CD_COMBO_COMPONENT_CONSUMPTION = 40012;

// Read-only report over the pre-existing dbo.InventoryLedger table — no
// CRUD, so this intentionally doesn't use CrudDataGridPage (which assumes
// create/update/remove). This page is reached directly from the dashboard
// Masters/Inventory nav, not through POS Till Setup, so — same reasoning as
// useRecipeFields — siteId is derived from posLookupService.getSites
// rather than usePosSessionStore, which is only ever populated by the POS
// Till Setup flow.
export default function IngredientConsumptionPage() {
  const t = useTranslations("ingredientConsumption");
  const tc = useTranslations("common");
  const locale = useLocale();
  const compId = useAuthStore((s) => s.user?.compId ?? "");
  const [itemCodeFilter, setItemCodeFilter] = useState("");

  const { data: sites = [] } = useQuery({
    queryKey: ["ingredient-consumption-sites", compId],
    queryFn: () => posLookupService.getSites(compId),
    enabled: !!compId,
  });
  const siteId = sites[0]?.siteID ?? "";

  const { data: entries = [] } = useQuery({
    queryKey: ["ingredient-consumption-ledger", compId, siteId, itemCodeFilter],
    queryFn: () => inventoryLedgerService.getLedger(compId, siteId, { itemCode: itemCodeFilter.trim(), take: 200 }),
    enabled: !!compId && !!siteId,
  });

  const movementLabel = useMemo(
    () => (docCd?: number | null) => {
      if (docCd === DOC_CD_RECIPE_CONSUMPTION) return t("recipeConsumption");
      if (docCd === DOC_CD_COMBO_COMPONENT_CONSUMPTION) return t("comboComponent");
      return t("other");
    },
    [t],
  );

  return (
    <div className="space-y-4 p-4">
      <PageHeader title={t("title")} description={t("description")} />

      <Input
        placeholder={t("itemCodeFilter")}
        value={itemCodeFilter}
        onChange={(e) => setItemCodeFilter(e.target.value)}
        className="max-w-xs"
      />

      <div className="overflow-x-auto rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("date")}</TableHead>
              <TableHead>{t("itemCode")}</TableHead>
              <TableHead>{t("movementType")}</TableHead>
              <TableHead className="text-end">{t("qtyConsumed")}</TableHead>
              <TableHead className="text-end">{t("balanceAfter")}</TableHead>
              <TableHead>{t("reference")}</TableHead>
              <TableHead>{t("modifiedBy")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {entries.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="py-6 text-center text-sm text-muted-foreground">
                  {tc("noData")}
                </TableCell>
              </TableRow>
            )}
            {entries.map((e) => (
              <TableRow key={e.id}>
                <TableCell>{e.docDt ? formatDate(e.docDt, locale) : "-"}</TableCell>
                <TableCell className="font-medium">{e.inventoryCode}</TableCell>
                <TableCell>
                  <Badge variant="outline">{movementLabel(e.docCd)}</Badge>
                </TableCell>
                <TableCell className="text-end tabular-nums text-destructive">
                  {(e.qty ?? 0).toFixed(3)} {e.unitCode ?? ""}
                </TableCell>
                <TableCell className="text-end tabular-nums">{(e.balQty ?? 0).toFixed(3)}</TableCell>
                <TableCell>{e.refNo || String(e.docNo)}</TableCell>
                <TableCell>{e.lastModifiedBy ?? "-"}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
