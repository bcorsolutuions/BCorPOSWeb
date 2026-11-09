"use client";

import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useForm, useFieldArray, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { purchaseOrderService } from "@/lib/api/services/purchase-service";
import { vendorMasterService } from "@/lib/api/services/vendor-master-service";
import { itemMasterService } from "@/lib/api/services/item-master-service";
import { posLookupService } from "@/lib/api/services/pos-lookup-service";
import { purchaseOrderSchema, type PurchaseOrderFormValues } from "@/schemas/purchase.schema";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { usePermission } from "@/hooks/use-permission";
import { useAuthStore } from "@/stores/auth-store";
import { PageHeader } from "@/components/shared/page-header";
import { DataGridWrapper } from "@/components/shared/data-grid-wrapper";
import { ItemSearchCell, numberCellClass } from "@/components/shared/item-search-cell";
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
import { Badge } from "@/components/ui/badge";
import { Trash2, Plus, Printer } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { apiErrorMessage } from "@/lib/api-error";
import { useCurrencyStore } from "@/stores/currency-store";
import { formatMoney, formatMoneyPlain, cn } from "@/lib/utils";
import { PurchaseOrderPrint } from "@/components/purchase/purchase-order-print";
import type { PurchaseOrder, CreatePurchaseOrderInput } from "@/types/purchase";
import type { ItemMaster } from "@/types/item-master";
import { enterMovesToNextField } from "@/lib/prevent-enter-submit";
import { useItemBarcodes } from "@/hooks/use-item-barcodes";

const emptyLine = { itemCode: "", itemName: "", unitCode: "", qty: 1, rate: 0, discountPercentage: 0, taxPercentage: 0 };

function defaultFormValues(currency: string): PurchaseOrderFormValues {
  return {
    vendorCode: "",
    docDt: new Date().toISOString().slice(0, 10),
    currencyCode: currency,
    remarks: "",
    lines: [emptyLine],
  };
}

export default function PurchaseOrderPage() {
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
  // null = creating a new order; a number = viewing that DocNo. Read-only
  // for now (a PUT route exists on the backend, but purchaseOrderService has
  // no update() yet) — this just fixes "clicking a row does nothing", the
  // actual reported issue.
  const [editingDocNo, setEditingDocNo] = useState<number | null>(null);

  // Restaurant Tables/KDS solve "which branch" via a device-scoped
  // usePosSessionStore, but that store is only gated in the (pos) layout —
  // this dashboard page has no equivalent, so it resolves its own site
  // locally (reset on every mount, same pattern masters/suppliers/page.tsx
  // uses for its per-record site field, just applied at page scope here).
  const [siteId, setSiteId] = useState("");
  const { data: sites = [] } = useQuery({
    queryKey: ["sites-lookup", compId],
    queryFn: () => posLookupService.getSites(compId),
    enabled: !!compId,
  });
  useEffect(() => {
    if (!siteId && sites[0]) setSiteId(sites[0].siteID);
  }, [sites, siteId]);

  const { data: orders = [] } = useQuery({
    queryKey: ["purchase-orders", compId, siteId],
    queryFn: () => purchaseOrderService.getAll(compId, siteId),
    enabled: !!compId && !!siteId,
  });
  const { data: vendors } = useQuery({ queryKey: ["vendors-lookup", compId], queryFn: () => vendorMasterService.list() });
  const { data: items } = useQuery({ queryKey: ["items-lookup", compId], queryFn: () => itemMasterService.list() });

  const vendorOptions = vendors?.items ?? [];
  const itemOptions = items?.items ?? [];
  const vendorNameByCode = Object.fromEntries(vendorOptions.map((v) => [v.code, v.vendorName]));
  const branchName = sites.find((s) => s.siteID === siteId)?.siteName ?? "";

  const { data: editingOrder } = useQuery({
    queryKey: ["purchase-order-detail", compId, siteId, editingDocNo],
    queryFn: () => purchaseOrderService.get(compId, siteId, editingDocNo!),
    enabled: dialogOpen && editingDocNo != null && !!compId && !!siteId,
  });

  // vendorOptions (from vendorMasterService.list()) only ever contains
  // Active vendors — an older order can point at one deactivated since, in
  // which case the print header would otherwise fall back to a bare code
  // ("just vencode" — not what a document going out to the supplier should
  // show). Only fetched when the cached active list doesn't already have it.
  const printVendorCode = editingOrder?.vendorCode;
  const printVendorInList = vendorOptions.find((v) => v.code === printVendorCode);
  const { data: fetchedPrintVendor } = useQuery({
    queryKey: ["vendor-detail", compId, printVendorCode],
    queryFn: () => vendorMasterService.get(compId, printVendorCode!),
    enabled: !!compId && !!printVendorCode && !printVendorInList,
  });
  const printVendor = printVendorInList ?? fetchedPrintVendor ?? null;

  const form = useForm<PurchaseOrderFormValues>({
    resolver: zodResolver(purchaseOrderSchema),
    defaultValues: defaultFormValues(currency),
  });
  const { fields, append, remove } = useFieldArray({ control: form.control, name: "lines" });
  const watchedLines = useWatch({ control: form.control, name: "lines" }) ?? [];

  function lineAmounts(l: (typeof watchedLines)[number]) {
    const amount = (Number(l?.qty) || 0) * (Number(l?.rate) || 0);
    const discountAmount = (amount * (Number(l?.discountPercentage) || 0)) / 100;
    const taxAmount = ((amount - discountAmount) * (Number(l?.taxPercentage) || 0)) / 100;
    const netTotal = amount - discountAmount + taxAmount;
    return { amount, discountAmount, taxAmount, netTotal };
  }

  const subtotal = watchedLines.reduce((sum, l) => sum + lineAmounts(l).amount, 0);
  const totalDiscount = watchedLines.reduce((sum, l) => sum + lineAmounts(l).discountAmount, 0);
  const totalTax = watchedLines.reduce((sum, l) => sum + lineAmounts(l).taxAmount, 0);
  const grandTotal = subtotal - totalDiscount + totalTax;

  useEffect(() => {
    if (editingOrder) {
      form.reset({
        vendorCode: editingOrder.vendorCode,
        docDt: editingOrder.docDt.slice(0, 10),
        currencyCode: editingOrder.currencyCode,
        remarks: editingOrder.remarks ?? "",
        lines: editingOrder.details.length
          ? editingOrder.details.map((d) => ({
              itemCode: d.itemCode,
              itemName: d.itemName ?? "",
              unitCode: d.unitCode,
              qty: d.qty,
              rate: d.rate,
              discountPercentage: d.discountPercentage ?? 0,
              taxPercentage: d.taxPercentage ?? 0,
            }))
          : [emptyLine],
      });
    }
  }, [editingOrder, form]);

  const createMutation = useMutation({
    mutationFn: (values: PurchaseOrderFormValues) => {
      const dto: CreatePurchaseOrderInput = {
        docDt: values.docDt,
        vendorCode: values.vendorCode,
        currencyCode: values.currencyCode,
        remarks: values.remarks || undefined,
        itemTotal: grandTotal,
        totalAmount: grandTotal,
        totalDiscAmount: totalDiscount,
        details: values.lines.map((l) => {
          const { amount, discountAmount, taxAmount } = lineAmounts(l);
          return {
            itemCode: l.itemCode,
            itemName: l.itemName || undefined,
            unitCode: l.unitCode,
            qty: l.qty,
            rate: l.rate,
            amount,
            discountPercentage: l.discountPercentage || undefined,
            discountAmount: discountAmount || undefined,
            taxPercentage: l.taxPercentage || undefined,
            taxAmount: taxAmount || undefined,
          };
        }),
        consignmentCharges: [],
      };
      return purchaseOrderService.create(compId, siteId, userName, dto);
    },
    onSuccess: () => {
      toast({ title: t("common.saveSuccess") });
      queryClient.invalidateQueries({ queryKey: ["purchase-orders", compId, siteId] });
      closeDialog();
    },
    onError: (err) => toast({ title: apiErrorMessage(err, t("common.errorGeneric")), variant: "destructive" }),
  });

  function handleItemSelect(index: number, item: ItemMaster) {
    form.setValue(`lines.${index}.itemCode`, item.code);
    form.setValue(`lines.${index}.itemName`, item.name ?? "");
    form.setValue(`lines.${index}.unitCode`, item.unitCode ?? "");
    if (item.price != null) form.setValue(`lines.${index}.rate`, item.price);
    if (item.taxRate != null) form.setValue(`lines.${index}.taxPercentage`, item.taxRate);
  }

  function openNewDialog() {
    setEditingDocNo(null);
    form.reset(defaultFormValues(currency));
    setDialogOpen(true);
  }

  function openViewDialog(docNo: number) {
    setEditingDocNo(docNo);
    setDialogOpen(true);
  }

  function closeDialog() {
    setDialogOpen(false);
    setEditingDocNo(null);
    form.reset(defaultFormValues(currency));
  }

  return (
    <div className="flex h-full flex-col gap-4">
      <PageHeader
        title={t("purchaseOrder.title")}
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
            {can(PERMISSIONS.PURCHASE_CREATE_PO) && (
              <Button onClick={openNewDialog}>{t("common.add")}</Button>
            )}
          </div>
        }
      />

      <div className="min-h-0 flex-1">
        <DataGridWrapper<PurchaseOrder>
          keyExpr="docNo"
          dataSource={orders}
          onRowClick={(row) => openViewDialog(row.docNo as number)}
          columns={[
            { dataField: "docNo", captionKey: "purchaseOrder.poNumber", width: 100 },
            { dataField: "refNo", captionKey: "purchaseInvoice.refNo", width: 130 },
            {
              dataField: "vendorCode",
              captionKey: "purchaseOrder.supplier",
              cellRender: (cell) => {
                const code = cell.data.vendorCode as string;
                return <span>{vendorNameByCode[code] ?? code}</span>;
              },
            },
            { dataField: "docDt", captionKey: "common.date", dataType: "date", width: 120 },
            { dataField: "totalAmount", captionKey: "common.grandTotal", dataType: "number", width: 130 },
            {
              dataField: "poStatus",
              captionKey: "common.status",
              width: 100,
              cellRender: (cell) => <Badge variant="outline">{String(cell.data.poStatus)}</Badge>,
            },
          ]}
        />
      </div>

      <Dialog open={dialogOpen} onOpenChange={(open) => (open ? setDialogOpen(true) : closeDialog())}>
        <DialogContent className="max-w-5xl">
          <DialogHeader>
            <DialogTitle>{t("purchaseOrder.title")}</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form className="space-y-4" onKeyDown={enterMovesToNextField} onSubmit={form.handleSubmit((v) => createMutation.mutate(v))}>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div className="space-y-1">
                  <FormLabel className="text-xs">{t("purchaseOrder.poNumber")}</FormLabel>
                  <Input readOnly value={editingDocNo ?? t("purchaseInvoice.auto")} className="bg-muted" />
                </div>
                <div className="space-y-1">
                  <FormLabel className="text-xs">{t("purchaseInvoice.refNo")}</FormLabel>
                  <Input readOnly value={editingOrder?.refNo ?? t("purchaseInvoice.auto")} className="bg-muted" />
                </div>
                <FormField
                  control={form.control}
                  name="docDt"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("common.date")}</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} readOnly={!!editingDocNo} className={editingDocNo ? "bg-muted" : undefined} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="vendorCode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("purchaseOrder.supplier")}</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange} disabled={!!editingDocNo}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {vendorOptions.map((v) => (
                          <SelectItem key={v.code} value={v.code}>
                            {v.code} — {v.vendorName}
                            {v.mobile1 ? ` — ${v.mobile1}` : ""}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="remarks"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("purchaseOrder.remarks")}</FormLabel>
                    <FormControl>
                      <Input {...field} readOnly={!!editingDocNo} className={editingDocNo ? "bg-muted" : undefined} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <FormLabel>{t("common.item")}</FormLabel>
                  {!editingDocNo && (
                    <Button type="button" variant="outline" size="sm" onClick={() => append(emptyLine)}>
                      <Plus className="me-1 h-3.5 w-3.5" />
                      {t("common.add")}
                    </Button>
                  )}
                </div>

                <div className="overflow-x-auto rounded-md border">
                  <table className="w-full min-w-[860px] text-sm">
                    <thead>
                      <tr className="border-b bg-muted/50 text-xs text-muted-foreground">
                        <th className="w-64 px-2 py-2 text-start font-medium">{t("common.item")}</th>
                        <th className="w-20 px-2 py-2 text-start font-medium">{t("common.code")}</th>
<th className="w-32 px-2 py-2 text-start font-medium">{t("item.barcode")}</th>
                        <th className="w-16 px-2 py-2 text-start font-medium">{t("item.unit")}</th>
                        <th className="w-20 px-2 py-2 text-start font-medium">{t("pos.qty")}</th>
                        <th className="w-24 px-2 py-2 text-start font-medium">{t("item.costPrice")}</th>
                        <th className="w-24 px-2 py-2 text-start font-medium">{t("common.discount")} %</th>
                        <th className="w-24 px-2 py-2 text-start font-medium">{t("common.tax")} %</th>
                        <th className="w-20 px-2 py-2 text-end font-medium">{t("purchaseInvoice.taxAmt")}</th>
                        <th className="w-24 px-2 py-2 text-end font-medium">{t("common.grandTotal")}</th>
                        {!editingDocNo && <th className="w-8 px-2 py-2"></th>}
                      </tr>
                    </thead>
                    <tbody>
                      {fields.map((field, index) => {
                        const line = watchedLines[index] ?? emptyLine;
                        const { taxAmount, netTotal } = lineAmounts(line);
                        return (
                          <tr key={field.id} className={cn("border-b last:border-0", index % 2 === 1 && "bg-muted/20")}>
                            <td className="px-2 py-1.5 align-top">
                              {editingDocNo ? (
                                <Input readOnly value={line?.itemName || line?.itemCode || ""} className="bg-muted" />
                              ) : (
                                <ItemSearchCell
                                  items={itemOptions}
                                  value={line?.itemCode ?? ""}
                                  onSelect={(item) => handleItemSelect(index, item)}
                                  placeholder={t("common.item")}
                                />
                              )}
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
                              <Input
                                type="number"
                                step="any"
                                readOnly={!!editingDocNo}
                                className={cn(numberCellClass, editingDocNo && "bg-muted")}
                                {...form.register(`lines.${index}.qty`, { valueAsNumber: true })}
                              />
                            </td>
                            <td className="px-2 py-1.5 align-top">
                              <Input
                                type="number"
                                step="any"
                                readOnly={!!editingDocNo}
                                className={cn(numberCellClass, editingDocNo && "bg-muted")}
                                {...form.register(`lines.${index}.rate`, { valueAsNumber: true })}
                              />
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
                            <td className="px-2 py-1.5 align-top">
                              <Input
                                type="number"
                                step="any"
                                readOnly={!!editingDocNo}
                                className={cn(numberCellClass, editingDocNo && "bg-muted")}
                                {...form.register(`lines.${index}.taxPercentage`, { valueAsNumber: true })}
                              />
                            </td>
                            <td className="px-2 py-1.5 text-end align-middle tabular-nums">{formatMoneyPlain(taxAmount, currency, locale)}</td>
                            <td className="px-2 py-1.5 text-end align-middle font-medium tabular-nums">
                              {formatMoneyPlain(netTotal, currency, locale)}
                            </td>
                            {!editingDocNo && (
                              <td className="px-1 py-1.5 text-end align-middle">
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  disabled={fields.length === 1}
                                  onClick={() => remove(index)}
                                >
                                  <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                              </td>
                            )}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
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
                {totalTax > 0 && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{t("common.tax")}</span>
                    <span className="tabular-nums">{formatMoney(totalTax, currency, locale)}</span>
                  </div>
                )}
                <div className="flex justify-between border-t pt-1 text-base font-semibold">
                  <span>{t("common.grandTotal")}</span>
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
                  <Button type="submit" disabled={createMutation.isPending || !siteId}>
                    {t("common.save")}
                  </Button>
                )}
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Print-only twin — a full A4 purchase order document to send to the
          supplier, distinct from the on-screen view dialog above (which is
          optimized for quick review, not for printing/emailing out). Only
          rendered once a saved order is actually loaded; globals.css's
          .doc-print-area hides it on screen and reveals only it on print,
          same mechanism as the POS receipt's .receipt-print-area. */}
      {editingOrder && (
        <div className="doc-print-area">
          <PurchaseOrderPrint
            order={editingOrder}
            vendor={printVendor}
            branchName={branchName}
          />
        </div>
      )}
    </div>
  );
}
