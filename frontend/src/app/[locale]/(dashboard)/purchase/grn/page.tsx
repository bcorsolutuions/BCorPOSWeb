"use client";

import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useForm, useFieldArray, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { goodsReceiptService, purchaseOrderService } from "@/lib/api/services/purchase-service";
import { inventoryLedgerService } from "@/lib/api/services/inventory-ledger-service";
import { vendorMasterService } from "@/lib/api/services/vendor-master-service";
import { posLookupService } from "@/lib/api/services/pos-lookup-service";
import { goodsReceiptSchema, type GoodsReceiptFormValues } from "@/schemas/purchase.schema";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { usePermission } from "@/hooks/use-permission";
import { useAuthStore } from "@/stores/auth-store";
import { PageHeader } from "@/components/shared/page-header";
import { DataGridWrapper } from "@/components/shared/data-grid-wrapper";
import { numberCellClass } from "@/components/shared/item-search-cell";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Printer } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { apiErrorMessage } from "@/lib/api-error";
import { useCurrencyStore } from "@/stores/currency-store";
import { formatMoney, formatMoneyPlain, cn } from "@/lib/utils";
import { GrnPrint } from "@/components/purchase/grn-print";
import type { GoodsReceipt, CreateGoodsReceiptInput } from "@/types/grn";
import { enterMovesToNextField } from "@/lib/prevent-enter-submit";
import { useItemBarcodes } from "@/hooks/use-item-barcodes";

export default function GoodsReceiptPage() {
  const t = useTranslations();
  const locale = useLocale();
  const currency = useCurrencyStore((s) => s.currencyCode);
  const { toast } = useToast();
  const { can } = usePermission();
  const user = useAuthStore((s) => s.user);
  const compId = user?.compId ?? "";
  const userName = user?.userName ?? "";
  const queryClient = useQueryClient();
  const barcodeOf = useItemBarcodes();
  const [dialogOpen, setDialogOpen] = useState(false);
  // null = creating a new receipt; a number = viewing that DocNo — same
  // read-only view-on-row-click pattern as purchase/orders/page.tsx.
  const [editingDocNo, setEditingDocNo] = useState<number | null>(null);

  // Same page-local site resolution as purchase/orders + accounting/vouchers.
  const [siteId, setSiteId] = useState("");
  const { data: sites = [] } = useQuery({
    queryKey: ["sites-lookup", compId],
    queryFn: () => posLookupService.getSites(compId),
    enabled: !!compId,
  });
  useEffect(() => {
    if (!siteId && sites[0]) setSiteId(sites[0].siteID);
  }, [sites, siteId]);

  const { data: receipts = [], isSuccess: receiptsLoaded } = useQuery({
    queryKey: ["goods-receipts", compId, siteId],
    queryFn: () => goodsReceiptService.getAll(compId, siteId),
    enabled: !!compId && !!siteId,
  });
  const { data: orders = [] } = useQuery({
    queryKey: ["purchase-orders", compId, siteId],
    queryFn: () => purchaseOrderService.getAll(compId, siteId),
    enabled: !!compId && !!siteId,
  });
  const { data: vendors } = useQuery({ queryKey: ["vendors-lookup", compId], queryFn: () => vendorMasterService.list() });
  const vendorOptions = vendors?.items ?? [];
  const vendorNameByCode = Object.fromEntries(vendorOptions.map((v) => [v.code, v.vendorName]));
  const branchName = sites.find((s) => s.siteID === siteId)?.siteName ?? "";

  const { data: editingReceipt } = useQuery({
    queryKey: ["goods-receipt-detail", compId, siteId, editingDocNo],
    queryFn: () => goodsReceiptService.get(compId, siteId, editingDocNo!),
    enabled: dialogOpen && editingDocNo != null && !!compId && !!siteId,
  });

  // vendorOptions (from vendorMasterService.list()) only ever contains
  // Active vendors — an older receipt can point at one deactivated since, in
  // which case the print header would otherwise fall back to a bare code.
  // Only fetched when the cached active list doesn't already have it — same
  // fallback chain as purchase/orders/page.tsx's printVendor.
  const printVendorCode = editingReceipt?.vendorCode;
  const printVendorInList = vendorOptions.find((v) => v.code === printVendorCode);
  const { data: fetchedPrintVendor } = useQuery({
    queryKey: ["vendor-detail", compId, printVendorCode],
    queryFn: () => vendorMasterService.get(compId, printVendorCode!),
    enabled: !!compId && !!printVendorCode && !printVendorInList,
  });
  const printVendor = printVendorInList ?? fetchedPrintVendor ?? null;

  const defaultValues: GoodsReceiptFormValues = {
    poDocNo: 0,
    vendorCode: "",
    docDt: new Date().toISOString().slice(0, 10),
    vendorDNRefNo: "",
    remarks: "",
    lines: [],
  };

  const form = useForm<GoodsReceiptFormValues>({
    resolver: zodResolver(goodsReceiptSchema),
    defaultValues,
  });
  const { fields, replace } = useFieldArray({ control: form.control, name: "lines" });
  const watchedLines = useWatch({ control: form.control, name: "lines" }) ?? [];

  function lineAmounts(l: (typeof watchedLines)[number]) {
    const amount = (Number(l?.qty) || 0) * (Number(l?.rate) || 0);
    const discountAmount = (amount * (Number(l?.discountPercentage) || 0)) / 100;
    const netTotal = amount - discountAmount;
    return { amount, discountAmount, netTotal };
  }

  const subtotal = watchedLines.reduce((sum, l) => sum + lineAmounts(l).amount, 0);
  const totalDiscount = watchedLines.reduce((sum, l) => sum + lineAmounts(l).discountAmount, 0);
  const grandTotal = subtotal - totalDiscount;

  useEffect(() => {
    if (editingReceipt) {
      form.reset({
        poDocNo: 0,
        vendorCode: editingReceipt.vendorCode,
        docDt: editingReceipt.docDt.slice(0, 10),
        vendorDNRefNo: editingReceipt.vendorDNRefNo ?? "",
        remarks: editingReceipt.remarks ?? "",
        lines: editingReceipt.details.map((d) => ({
          itemCode: d.itemCode,
          itemName: d.itemName ?? "",
          unitCode: d.unitCode,
          orderedQty: d.orderedQty,
          qty: d.qty,
          rate: d.rate,
          discountPercentage: d.discountPercentage ?? 0,
          poRefCode: d.poRefCode,
          refRowID: d.refRowID,
        })),
      });
    }
  }, [editingReceipt, form]);

  async function handlePoSelect(docNoStr: string) {
    const docNo = Number(docNoStr);
    form.setValue("poDocNo", docNo);
    const po = await purchaseOrderService.get(compId, siteId, docNo);
    form.setValue("vendorCode", po.vendorCode);
    replace(
      // an expense / service line of the PO has no stock item, so there is nothing to receive for it
      po.details.filter((d) => d.itemType !== "E" && !!d.itemCode).map((d) => ({
        itemCode: d.itemCode ?? "",
        itemName: d.itemName ?? "",
        unitCode: d.unitCode ?? "",
        orderedQty: d.qty,
        qty: d.qty,
        rate: d.rate,
        discountPercentage: 0,
        poRefCode: po.refNo ?? "",
        refRowID: d.rowID ?? 0,
      })),
    );
  }

  const createMutation = useMutation({
    mutationFn: (values: GoodsReceiptFormValues) => {
      const selectedPo = orders.find((o) => o.docNo === values.poDocNo);
      const dto: CreateGoodsReceiptInput = {
        docDt: values.docDt,
        vendorCode: values.vendorCode,
        inventorySiteID: siteId,
        vendorDNRefNo: values.vendorDNRefNo || undefined,
        lpoReference: selectedPo?.refNo ?? "",
        remarks: values.remarks || undefined,
        currencyCode: currency,
        currencyRate: 1,
        totalAmount: grandTotal,
        details: values.lines.map((l) => {
          const { amount, discountAmount } = lineAmounts(l);
          return {
            itemCode: l.itemCode,
            itemName: l.itemName || undefined,
            unitCode: l.unitCode,
            qty: l.qty,
            rate: l.rate,
            amount,
            discountAmount,
            additionalAddOnCost: 0,
            refType: "P",
            poRefCode: l.poRefCode,
            poRef: l.poRefCode,
            refRowID: l.refRowID,
            poQty: l.orderedQty,
            poPendingQty: l.orderedQty,
          };
        }),
      };
      return goodsReceiptService.create(compId, siteId, userName, dto);
    },
    onSuccess: () => {
      toast({ title: t("common.saveSuccess") });
      queryClient.invalidateQueries({ queryKey: ["goods-receipts", compId, siteId] });
      queryClient.invalidateQueries({ queryKey: ["item-branch-stock"] }); // the GRN just added stock
      closeDialog();
    },
    onError: (err) => toast({ title: apiErrorMessage(err, t("common.errorGeneric")), variant: "destructive" }),
  });

  // A purchase order that already has a goods receipt is not offered again: a
  // receipt stores the PO's reference number in its LPO Reference, so any PO
  // whose reference is on an existing receipt is left out. Nothing is listed
  // until the receipts have loaded, so a received PO never flashes into the list.
  const referencedPoRefs = new Set(
    receipts.map((r) => r.lpoReference?.trim().toLowerCase()).filter((ref): ref is string => !!ref),
  );
  const poOptions = receiptsLoaded
    ? orders
        .filter((o) => !o.refNo || !referencedPoRefs.has(o.refNo.trim().toLowerCase()))
        .map((o) => ({
          value: String(o.docNo),
          label: `${o.refNo ?? o.docNo} — ${vendorNameByCode[o.vendorCode] ?? o.vendorCode}`,
        }))
    : [];

  function openNewDialog() {
    setEditingDocNo(null);
    form.reset(defaultValues);
    setDialogOpen(true);
  }

  function openViewDialog(docNo: number) {
    setEditingDocNo(docNo);
    setDialogOpen(true);
  }

  function closeDialog() {
    setDialogOpen(false);
    setEditingDocNo(null);
    form.reset(defaultValues);
  }

  // GRNs saved before purchases posted stock are not in the Stock Ledger yet: this posts them (safe to repeat).
  const stockMutation = useMutation({
    mutationFn: () => inventoryLedgerService.backfillGrns(user?.compId ?? ""),
    onSuccess: (r) => {
      toast({ title: t("grn.postStockDone", { grns: r.grnsPosted, rows: r.movementsPosted }) });
      queryClient.invalidateQueries({ queryKey: ["item-branch-stock"] });
    },
    onError: (err) => toast({ title: apiErrorMessage(err, t("common.errorGeneric")), variant: "destructive" }),
  });

  const selectedVendor = vendorOptions.find((v) => v.code === form.watch("vendorCode"));

  return (
    <div className="flex h-full flex-col gap-4">
      <PageHeader
        title={t("grn.title")}
        actions={
          <div className="flex items-center gap-2">
            <Select value={siteId} onValueChange={setSiteId}>
              <SelectTrigger className="w-44">
                <SelectValue placeholder={t("pos.setupSite")} />
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
              <Button variant="outline" onClick={() => stockMutation.mutate()} disabled={stockMutation.isPending} title={t("grn.postStockHint")}>
                {t("grn.postStock")}
              </Button>
            )}
            {can(PERMISSIONS.PURCHASE_RECEIVE_GOODS) && (
              <Button onClick={openNewDialog}>{t("common.add")}</Button>
            )}
          </div>
        }
      />

      <div className="min-h-0 flex-1">
        <DataGridWrapper<GoodsReceipt>
          keyExpr="docNo"
          dataSource={receipts}
          onRowClick={(row) => openViewDialog(row.docNo as number)}
          columns={[
            { dataField: "docNo", captionKey: "grn.grnNumber", width: 100 },
            { dataField: "refNo", captionKey: "purchaseInvoice.refNo", width: 130 },
            { dataField: "lpoReference", captionKey: "grn.poReference", width: 140 },
            {
              dataField: "vendorCode",
              captionKey: "purchaseOrder.supplier",
              cellRender: (cell) => {
                const code = cell.data.vendorCode as string;
                return <span>{vendorNameByCode[code] ?? code}</span>;
              },
            },
            { dataField: "docDt", captionKey: "grn.receivedDate", dataType: "date", width: 130 },
            { dataField: "totalAmount", captionKey: "common.grandTotal", dataType: "number", width: 130 },
          ]}
        />
      </div>

      <Dialog open={dialogOpen} onOpenChange={(open) => (open ? setDialogOpen(true) : closeDialog())}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>{t("grn.title")}</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form className="space-y-4" onKeyDown={enterMovesToNextField} onSubmit={form.handleSubmit((v) => createMutation.mutate(v))}>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div className="space-y-1">
                  <FormLabel className="text-xs">{t("grn.grnNumber")}</FormLabel>
                  <Input readOnly value={editingDocNo ?? t("purchaseInvoice.auto")} className="bg-muted" />
                </div>
                <div className="space-y-1">
                  <FormLabel className="text-xs">{t("purchaseInvoice.refNo")}</FormLabel>
                  <Input readOnly value={editingReceipt?.refNo ?? t("purchaseInvoice.auto")} className="bg-muted" />
                </div>
                <FormField
                  control={form.control}
                  name="docDt"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("grn.receivedDate")}</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} readOnly={!!editingDocNo} className={editingDocNo ? "bg-muted" : undefined} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <FormItem>
                  <FormLabel>{t("grn.poReference")}</FormLabel>
                  <Select value={form.watch("poDocNo") ? String(form.watch("poDocNo")) : ""} onValueChange={handlePoSelect} disabled={!!editingDocNo}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {poOptions.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {form.formState.errors.poDocNo && (
                    <p className="text-sm font-medium text-destructive">{t("validation.required")}</p>
                  )}
                </FormItem>
                <FormField
                  control={form.control}
                  name="vendorDNRefNo"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("grn.vendorDnRef")}</FormLabel>
                      <FormControl>
                        <Input {...field} readOnly={!!editingDocNo} className={editingDocNo ? "bg-muted" : undefined} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormItem>
                <FormLabel>{t("purchaseOrder.supplier")}</FormLabel>
                <Input
                  readOnly
                  value={
                    selectedVendor
                      ? `${selectedVendor.code} — ${selectedVendor.vendorName}${selectedVendor.mobile1 ? ` — ${selectedVendor.mobile1}` : ""}`
                      : form.watch("vendorCode")
                  }
                  className="bg-muted"
                />
              </FormItem>

              <FormField
                control={form.control}
                name="remarks"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("gl.remarks")}</FormLabel>
                    <FormControl>
                      <Input {...field} readOnly={!!editingDocNo} className={editingDocNo ? "bg-muted" : undefined} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="space-y-2">
                <FormLabel>{t("grn.receivedItems")}</FormLabel>
                {fields.length === 0 && (
                  <p className="text-sm text-muted-foreground">{t("grn.selectPoFirst")}</p>
                )}
                {fields.length > 0 && (
                  <div className="overflow-x-auto rounded-md border">
                    <table className="w-full min-w-[820px] text-sm">
                      <thead>
                        <tr className="border-b bg-muted/50 text-xs text-muted-foreground">
                          <th className="w-56 px-2 py-2 text-start font-medium">{t("common.item")}</th>
                          <th className="w-20 px-2 py-2 text-start font-medium">{t("common.code")}</th>
<th className="w-32 px-2 py-2 text-start font-medium">{t("item.barcode")}</th>
                          <th className="w-16 px-2 py-2 text-start font-medium">{t("item.unit")}</th>
                          <th className="w-20 px-2 py-2 text-start font-medium">{t("grn.orderedQty")}</th>
                          <th className="w-20 px-2 py-2 text-start font-medium">{t("grn.receivedQty")}</th>
                          <th className="w-24 px-2 py-2 text-start font-medium">{t("item.costPrice")}</th>
                          <th className="w-24 px-2 py-2 text-start font-medium">{t("common.discount")} %</th>
                          <th className="w-24 px-2 py-2 text-end font-medium">{t("grn.netTotal")}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {fields.map((field, index) => {
                          const line = watchedLines[index] ?? {
                            itemCode: "",
                            unitCode: "",
                            orderedQty: 0,
                            qty: 0,
                            rate: 0,
                            discountPercentage: 0,
                            poRefCode: "",
                            refRowID: 0,
                          };
                          const { netTotal } = lineAmounts(line);
                          return (
                            <tr key={field.id} className={cn("border-b last:border-0", index % 2 === 1 && "bg-muted/20")}>
                              <td className="px-2 py-1.5 align-top">
                                <Input readOnly value={line?.itemName || line?.itemCode || ""} className="bg-muted" />
                              </td>
                              <td className="px-2 py-1.5 align-top">
                                <Input readOnly value={line?.itemCode ?? ""} className="bg-muted" />
                              </td>
                              <td className="px-2 py-1.5 align-top">
                                <Input readOnly value={barcodeOf(line?.itemCode)} className="bg-muted font-mono text-xs" />
                              </td>
                              <td className="px-2 py-1.5 align-top">
                                <Input readOnly value={line?.unitCode ?? ""} className="bg-muted" />
                              </td>
                              <td className="px-2 py-1.5 align-top">
                                <Input readOnly value={line?.orderedQty ?? 0} className={cn(numberCellClass, "bg-muted")} />
                              </td>
                              <td className="px-2 py-1.5 align-top">
                                <Input
                                  type="number"
                                  step="any"
                                  readOnly={!!editingDocNo}
                                  className={cn(numberCellClass, editingDocNo && "bg-muted")}
                                  {...form.register(`lines.${index}.qty`, { valueAsNumber: true })}
                                />
                              </td>
                              <td className="px-2 py-1.5 align-top">
                                <Input readOnly value={line?.rate ?? 0} className={cn(numberCellClass, "bg-muted")} />
                              </td>
                              <td className="px-2 py-1.5 align-top">
                                <Input
                                  type="number"
                                  step="any"
                                  readOnly={!!editingDocNo}
                                  className={cn(numberCellClass, editingDocNo && "bg-muted")}
                                  {...form.register(`lines.${index}.discountPercentage`, { valueAsNumber: true })}
                                />
                              </td>
                              <td className="px-2 py-1.5 text-end align-middle font-medium tabular-nums">
                                {formatMoneyPlain(netTotal, currency, locale)}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              <div className="ms-auto flex w-full max-w-xs flex-col gap-1 text-sm sm:ms-auto">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t("common.subtotal")}</span>
                  <span className="tabular-nums">{formatMoney(subtotal, currency, locale)}</span>
                </div>
                {totalDiscount > 0 && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{t("common.discount")}</span>
                    <span className="tabular-nums">-{formatMoney(totalDiscount, currency, locale)}</span>
                  </div>
                )}
                <div className="flex justify-between border-t pt-1 text-base font-semibold">
                  <span>{t("grn.netTotal")}</span>
                  <span className="tabular-nums">{formatMoney(grandTotal, currency, locale)}</span>
                </div>
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={closeDialog}>
                  {editingDocNo ? t("common.close") : t("common.cancel")}
                </Button>
                {editingDocNo && (
                  <Button type="button" variant="outline" onClick={() => window.print()}>
                    <Printer className="me-1 h-4 w-4" />
                    {t("common.print")}
                  </Button>
                )}
                {!editingDocNo && (
                  <Button type="submit" disabled={createMutation.isPending || !siteId || fields.length === 0}>
                    {t("common.save")}
                  </Button>
                )}
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Print-only twin — a full A4 goods receipt document, distinct from
          the on-screen view dialog above. Only rendered once a saved receipt
          is actually loaded; globals.css's .doc-print-area hides it on
          screen and reveals only it on print, same mechanism
          purchase/orders/page.tsx uses for PurchaseOrderPrint. */}
      {editingReceipt && (
        <div className="doc-print-area">
          <GrnPrint receipt={editingReceipt} vendor={printVendor} branchName={branchName} />
        </div>
      )}
    </div>
  );
}
