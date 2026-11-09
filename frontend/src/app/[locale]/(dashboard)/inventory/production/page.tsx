"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2 } from "lucide-react";
import { useAuthStore } from "@/stores/auth-store";
import { usePermission } from "@/hooks/use-permission";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { useToast } from "@/components/ui/use-toast";
import { productionService } from "@/lib/api/services/production-service";
import { posLookupService } from "@/lib/api/services/pos-lookup-service";
import { itemMasterService } from "@/lib/api/services/item-master-service";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { CreateProductionConsumptionDetInput, CreateProductionFinishedGoodsDetInput } from "@/types/production";

const EMPTY_FG: CreateProductionFinishedGoodsDetInput = {
  fgInventoryCode: "",
  unitCode: "",
  itemRemarks: "",
  expQty: 0,
  prodQty: 0,
  wasteQty: 0,
  cost: 0,
  amount: 0,
  mouldNo: "",
  vol: 0,
  remarks: "",
};

const EMPTY_CONSUMPTION: CreateProductionConsumptionDetInput = {
  fgInventoryCode: "",
  bomInventoryCode: "",
  unitCode: "",
  itemRemarks: "",
  expQty: 0,
  actualQty: 0,
  cost: 0,
  amount: 0,
  mouldNo: "",
  mixRefNo: "",
  remarks: "",
};

/**
 * Production Entry/Register — the pre-existing precast/concrete-manufacturing
 * ProductionHdr backend, given its first frontend screen. "Plant Code" is
 * shown here as "Kitchen" per the actual usage (a restaurant central-kitchen
 * batch-prep run), but still saved to the same PlantCode column.
 */
export default function ProductionPage() {
  const t = useTranslations("production");
  const tc = useTranslations("common");
  const { toast } = useToast();
  const { can } = usePermission();
  const queryClient = useQueryClient();
  const compId = useAuthStore((s) => s.user?.compId ?? "");
  const userName = useAuthStore((s) => s.user?.userName ?? "");

  const [siteId, setSiteId] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);

  const { data: sites = [] } = useQuery({
    queryKey: ["production-sites", compId],
    queryFn: () => posLookupService.getSites(compId),
    enabled: !!compId,
  });
  const { data: items = [] } = useQuery({
    queryKey: ["production-items", compId],
    queryFn: async () => (await itemMasterService.list()).items,
    enabled: !!compId,
  });

  const listKey = ["production-list", compId, siteId];
  const { data: productions = [], isLoading } = useQuery({
    queryKey: listKey,
    queryFn: () => productionService.getAll(compId, siteId),
    enabled: !!compId && !!siteId,
  });

  const onError = (err: unknown) => {
    const message = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
    toast({ title: message || tc("errorGeneric"), variant: "destructive" });
  };

  const [prodType, setProdType] = useState("");
  const [kitchenCode, setKitchenCode] = useState("");
  const [prodName, setProdName] = useState("");
  const [mixRefNo, setMixRefNo] = useState("");
  const [remarks, setRemarks] = useState("");
  const [finishedGoods, setFinishedGoods] = useState<CreateProductionFinishedGoodsDetInput[]>([{ ...EMPTY_FG }]);
  const [consumption, setConsumption] = useState<CreateProductionConsumptionDetInput[]>([{ ...EMPTY_CONSUMPTION }]);

  function resetForm() {
    setProdType("");
    setKitchenCode("");
    setProdName("");
    setMixRefNo("");
    setRemarks("");
    setFinishedGoods([{ ...EMPTY_FG }]);
    setConsumption([{ ...EMPTY_CONSUMPTION }]);
  }

  const createMutation = useMutation({
    mutationFn: () =>
      productionService.create(compId, siteId, userName, {
        docDt: new Date().toISOString(),
        prodType: prodType || null,
        plantCode: kitchenCode || null,
        prodName: prodName || null,
        mixRefNo: mixRefNo || null,
        remarks: remarks || null,
        finishedGoods: finishedGoods.filter((f) => f.fgInventoryCode),
        consumption: consumption.filter((c) => c.fgInventoryCode && c.bomInventoryCode),
      }),
    onSuccess: () => {
      toast({ title: tc("saveSuccess") });
      queryClient.invalidateQueries({ queryKey: listKey });
      setDialogOpen(false);
      resetForm();
    },
    onError,
  });

  function itemUnit(code: string) {
    return items.find((i) => i.code === code)?.unitCode ?? "";
  }
  function itemName(code: string) {
    const item = items.find((i) => i.code === code);
    return item ? `${item.name}${item.barCode ? ` · ${item.barCode}` : ""}` : undefined;
  }

  function updateFg<K extends keyof CreateProductionFinishedGoodsDetInput>(idx: number, key: K, value: CreateProductionFinishedGoodsDetInput[K]) {
    setFinishedGoods((prev) => prev.map((l, i) => (i === idx ? { ...l, [key]: value } : l)));
  }
  function updateConsumption<K extends keyof CreateProductionConsumptionDetInput>(idx: number, key: K, value: CreateProductionConsumptionDetInput[K]) {
    setConsumption((prev) => prev.map((l, i) => (i === idx ? { ...l, [key]: value } : l)));
  }

  return (
    <div className="flex h-full flex-col gap-4 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-xl font-semibold">{t("title")}</h1>
        <div className="flex items-center gap-2">
          <Select value={siteId} onValueChange={setSiteId}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder={tc("branch")} />
            </SelectTrigger>
            <SelectContent>
              {sites.map((s) => (
                <SelectItem key={s.siteID} value={s.siteID}>
                  {s.siteName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {can(PERMISSIONS.INVENTORY_ADJUST_STOCK) && (
            <Button onClick={() => setDialogOpen(true)} disabled={!siteId}>
              <Plus className="me-2 h-4 w-4" />
              {t("newProduction")}
            </Button>
          )}
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto rounded-md border">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-start">
            <tr>
              <th className="p-2 text-start">{t("docNo")}</th>
              <th className="p-2 text-start">{tc("date")}</th>
              <th className="p-2 text-start">{t("prodName")}</th>
              <th className="p-2 text-start">{t("kitchen")}</th>
              <th className="p-2 text-start">{t("finishedGoods")}</th>
              <th className="p-2 text-end">{t("totalCost")}</th>
              <th className="p-2 text-start">{tc("status")}</th>
            </tr>
          </thead>
          <tbody>
            {!siteId && (
              <tr>
                <td colSpan={7} className="p-6 text-center text-muted-foreground">
                  {t("selectSiteFirst")}
                </td>
              </tr>
            )}
            {siteId && isLoading && (
              <tr>
                <td colSpan={7} className="p-6 text-center text-muted-foreground">
                  {tc("loading")}
                </td>
              </tr>
            )}
            {siteId && !isLoading && productions.length === 0 && (
              <tr>
                <td colSpan={7} className="p-6 text-center text-muted-foreground">
                  {tc("noData")}
                </td>
              </tr>
            )}
            {productions.map((p) => {
              const totalCost = p.finishedGoods.reduce((s, f) => s + (f.amount ?? 0), 0);
              return (
                <tr key={p.docNo} className="border-t">
                  <td className="p-2">{p.refNo ?? p.docNo}</td>
                  <td className="p-2">{new Date(p.docDt).toLocaleDateString()}</td>
                  <td className="p-2">{p.prodName ?? "-"}</td>
                  <td className="p-2">{p.plantCode ?? "-"}</td>
                  <td className="p-2">{p.finishedGoods.map((f) => f.fgInventoryCode).join(", ") || "-"}</td>
                  <td className="p-2 text-end tabular-nums">{totalCost.toFixed(3)}</td>
                  <td className="p-2">
                    <Badge variant={p.posted ? "default" : "secondary"}>{p.posted ? tc("active") : "DRAFT"}</Badge>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t("newProduction")}</DialogTitle>
          </DialogHeader>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
            <div className="space-y-1">
              <Label>{t("prodType")}</Label>
              <Input value={prodType} onChange={(e) => setProdType(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>{t("kitchen")}</Label>
              <Input value={kitchenCode} onChange={(e) => setKitchenCode(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>{t("prodName")}</Label>
              <Input value={prodName} onChange={(e) => setProdName(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>{t("mixRefNo")}</Label>
              <Input value={mixRefNo} onChange={(e) => setMixRefNo(e.target.value)} />
            </div>
          </div>

          {/* ── Finished Goods ─────────────────────────────────────────── */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-base font-semibold">{t("finishedGoods")}</Label>
              <Button type="button" size="sm" variant="outline" onClick={() => setFinishedGoods((p) => [...p, { ...EMPTY_FG }])}>
                <Plus className="me-1 h-3.5 w-3.5" />
                {t("addLine")}
              </Button>
            </div>
            {finishedGoods.map((line, idx) => (
              <Card key={idx} className="space-y-3 p-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-muted-foreground">
                    {t("line")} {idx + 1}
                    {line.fgInventoryCode && itemName(line.fgInventoryCode) ? ` — ${itemName(line.fgInventoryCode)}` : ""}
                  </span>
                  {finishedGoods.length > 1 && (
                    <Button type="button" size="icon" variant="ghost" onClick={() => setFinishedGoods((prev) => prev.filter((_, i) => i !== idx))}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <div className="col-span-2 space-y-1">
                    <Label className="text-xs">{t("item")} *</Label>
                    <Select value={line.fgInventoryCode} onValueChange={(v) => updateFg(idx, "fgInventoryCode", v)}>
                      <SelectTrigger>
                        <SelectValue placeholder={t("item")} />
                      </SelectTrigger>
                      <SelectContent>
                        {items.map((it) => (
                          <SelectItem key={it.code} value={it.code}>
                            {it.name} ({it.code})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">{t("unit")}</Label>
                    <Input value={itemUnit(line.fgInventoryCode) || line.unitCode || ""} disabled />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">{t("expQty")}</Label>
                    <Input type="number" value={line.expQty ?? 0} onChange={(e) => updateFg(idx, "expQty", Number(e.target.value))} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">{t("prodQty")} *</Label>
                    <Input type="number" value={line.prodQty ?? 0} onChange={(e) => updateFg(idx, "prodQty", Number(e.target.value))} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">{t("wasteQty")}</Label>
                    <Input type="number" value={line.wasteQty ?? 0} onChange={(e) => updateFg(idx, "wasteQty", Number(e.target.value))} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">{t("mouldNo")}</Label>
                    <Input value={line.mouldNo ?? ""} onChange={(e) => updateFg(idx, "mouldNo", e.target.value)} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">{t("vol")}</Label>
                    <Input type="number" value={line.vol ?? 0} onChange={(e) => updateFg(idx, "vol", Number(e.target.value))} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">{t("unitCost")}</Label>
                    <Input type="number" value={line.cost} onChange={(e) => updateFg(idx, "cost", Number(e.target.value))} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">{tc("total")}</Label>
                    <Input type="number" value={line.amount ?? 0} onChange={(e) => updateFg(idx, "amount", Number(e.target.value))} />
                  </div>
                  <div className="col-span-2 space-y-1 sm:col-span-4">
                    <Label className="text-xs">{tc("remarks")}</Label>
                    <Input value={line.itemRemarks ?? ""} onChange={(e) => updateFg(idx, "itemRemarks", e.target.value)} />
                  </div>
                </div>
              </Card>
            ))}
          </div>

          {/* ── Raw Material Consumption ───────────────────────────────── */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-base font-semibold">{t("consumption")}</Label>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() =>
                  setConsumption((p) => [...p, { ...EMPTY_CONSUMPTION, fgInventoryCode: finishedGoods[0]?.fgInventoryCode ?? "" }])
                }
              >
                <Plus className="me-1 h-3.5 w-3.5" />
                {t("addLine")}
              </Button>
            </div>
            {consumption.map((line, idx) => (
              <Card key={idx} className="space-y-3 p-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-muted-foreground">
                    {t("line")} {idx + 1}
                    {line.bomInventoryCode && itemName(line.bomInventoryCode) ? ` — ${itemName(line.bomInventoryCode)}` : ""}
                  </span>
                  {consumption.length > 1 && (
                    <Button type="button" size="icon" variant="ghost" onClick={() => setConsumption((prev) => prev.filter((_, i) => i !== idx))}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <div className="space-y-1">
                    <Label className="text-xs">{t("finishedGood")}</Label>
                    <Select value={line.fgInventoryCode} onValueChange={(v) => updateConsumption(idx, "fgInventoryCode", v)}>
                      <SelectTrigger>
                        <SelectValue placeholder={t("finishedGood")} />
                      </SelectTrigger>
                      <SelectContent>
                        {finishedGoods
                          .filter((f) => f.fgInventoryCode)
                          .map((f) => (
                            <SelectItem key={f.fgInventoryCode} value={f.fgInventoryCode}>
                              {itemName(f.fgInventoryCode) ?? f.fgInventoryCode}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="col-span-1 space-y-1 sm:col-span-2">
                    <Label className="text-xs">{t("rawMaterial")} *</Label>
                    <Select value={line.bomInventoryCode} onValueChange={(v) => updateConsumption(idx, "bomInventoryCode", v)}>
                      <SelectTrigger>
                        <SelectValue placeholder={t("rawMaterial")} />
                      </SelectTrigger>
                      <SelectContent>
                        {items.map((it) => (
                          <SelectItem key={it.code} value={it.code}>
                            {it.name} ({it.code})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">{t("unit")}</Label>
                    <Input value={itemUnit(line.bomInventoryCode) || line.unitCode || ""} disabled />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">{t("expQty")}</Label>
                    <Input type="number" value={line.expQty ?? 0} onChange={(e) => updateConsumption(idx, "expQty", Number(e.target.value))} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">{t("actualQty")} *</Label>
                    <Input type="number" value={line.actualQty} onChange={(e) => updateConsumption(idx, "actualQty", Number(e.target.value))} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">{t("mixRefNo")}</Label>
                    <Input value={line.mixRefNo ?? ""} onChange={(e) => updateConsumption(idx, "mixRefNo", e.target.value)} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">{t("mouldNo")}</Label>
                    <Input value={line.mouldNo ?? ""} onChange={(e) => updateConsumption(idx, "mouldNo", e.target.value)} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">{t("unitCost")}</Label>
                    <Input type="number" value={line.cost} onChange={(e) => updateConsumption(idx, "cost", Number(e.target.value))} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">{tc("total")}</Label>
                    <Input type="number" value={line.amount ?? 0} onChange={(e) => updateConsumption(idx, "amount", Number(e.target.value))} />
                  </div>
                  <div className="col-span-2 space-y-1 sm:col-span-4">
                    <Label className="text-xs">{tc("remarks")}</Label>
                    <Input value={line.itemRemarks ?? ""} onChange={(e) => updateConsumption(idx, "itemRemarks", e.target.value)} />
                  </div>
                </div>
              </Card>
            ))}
          </div>

          <div className="space-y-1">
            <Label>{tc("remarks")}</Label>
            <Textarea value={remarks} onChange={(e) => setRemarks(e.target.value)} rows={2} />
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              {tc("cancel")}
            </Button>
            <Button disabled={createMutation.isPending} onClick={() => createMutation.mutate()}>
              {tc("save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
