"use client";

import { useEffect, useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useForm, useFieldArray, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { purchaseInvoiceService, goodsReceiptService } from "@/lib/api/services/purchase-service";
import { vendorMasterService } from "@/lib/api/services/vendor-master-service";
import { itemMasterService } from "@/lib/api/services/item-master-service";
import type { ItemMaster } from "@/types/item-master";
import { posLookupService } from "@/lib/api/services/pos-lookup-service";
import { purchaseInvoiceSchema, type PurchaseInvoiceFormValues } from "@/schemas/purchase.schema";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { usePermission } from "@/hooks/use-permission";
import { useAuthStore } from "@/stores/auth-store";
import { PageHeader } from "@/components/shared/page-header";
import { DataGridWrapper } from "@/components/shared/data-grid-wrapper";
import { ItemSearchCell, numberCellClass } from "@/components/shared/item-search-cell";
import { QuickSupplierDialog } from "@/components/purchase/quick-supplier-dialog";
import { QuickItemDialog } from "@/components/purchase/quick-item-dialog";
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
import { glMasterService } from "@/lib/api/services/gl-master-service";
import { Trash2, Plus, Printer } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { apiErrorMessage } from "@/lib/api-error";
import { useCurrencyStore } from "@/stores/currency-store";
import { formatMoney, formatMoneyPlain, cn } from "@/lib/utils";
import { PurchaseInvoicePrint } from "@/components/purchase/purchase-invoice-print";
import type { PurchaseInvoice, CreatePurchaseInvoiceInput } from "@/types/purchase";
import { enterMovesToNextField } from "@/lib/prevent-enter-submit";
import { useItemBarcodes } from "@/hooks/use-item-barcodes";

// GRN's own DocCd (see D:/Works/BCorApi/PowerDFWebApi/Service/Documents/
// GRNService.cs) — recorded on a GRN-linked line's RefDocCd for traceability,
// same idea as purchase/grn/page.tsx recording a PO's RefType "P" on its own
// lines (this screen uses "G" since the parent doc here is a GRN).
const GRN_DOC_CD = 30030;

const emptyLine = {
  lineType: "item" as "item" | "expense",
  itemCode: "",
  itemName: "",
  unitCode: "",
  glCode: "",
  qty: 1,
  rate: 0,
  discountPercentage: 0,
  taxPercentage: 0,
};

function defaultFormValues(): PurchaseInvoiceFormValues {
  return {
    vendorCode: "",
    docDt: new Date().toISOString().slice(0, 10),
    vendorBillNo: "",
    vendorBillDate: "",
    remarks: "",
    lines: [emptyLine],
  };
}

export default function PurchaseInvoicePage() {
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
  // Quick-add pop-ups (new supplier / new item typed from this screen). They are siblings of the document dialog, not inside its form.
  const [supplierDialogOpen, setSupplierDialogOpen] = useState(false);
  const [newItemLine, setNewItemLine] = useState<{ index: number; name: string } | null>(null);
  const canAddSupplier = can(PERMISSIONS.SUPPLIER_MANAGE);
  const canAddItem = can(PERMISSIONS.INVENTORY_MANAGE_ITEMS);
  // null = creating a new invoice; a number = viewing/editing that DocNo.
  const [editingDocNo, setEditingDocNo] = useState<number | null>(null);
  // "Create against GRN" is a one-shot quick-fill, same UX as purchase/grn's
  // own PO-reference select — not part of the submitted DTO, so it's local
  // state, not a form field.
  const [grnDocNo, setGrnDocNo] = useState<string>("");

  // Same per-page site resolution as purchase/orders/page.tsx — this
  // dashboard page has no device-scoped POS session store to read from.
  const [siteId, setSiteId] = useState("");
  const { data: sites = [] } = useQuery({
    queryKey: ["sites-lookup", compId],
    queryFn: () => posLookupService.getSites(compId),
    enabled: !!compId,
  });
  useEffect(() => {
    if (!siteId && sites[0]) setSiteId(sites[0].siteID);
  }, [sites, siteId]);

  const { data: invoices = [], isSuccess: invoicesLoaded } = useQuery({
    queryKey: ["purchase-invoices", compId, siteId],
    queryFn: () => purchaseInvoiceService.getAll(compId, siteId),
    enabled: !!compId && !!siteId,
  });
  const { data: vendors } = useQuery({ queryKey: ["vendors-lookup", compId], queryFn: () => vendorMasterService.list() });
  const { data: items } = useQuery({ queryKey: ["items-lookup", compId], queryFn: () => itemMasterService.list() });
  const { data: goodsReceipts = [] } = useQuery({
    queryKey: ["goods-receipts", compId, siteId],
    queryFn: () => goodsReceiptService.getAll(compId, siteId),
    enabled: !!compId && !!siteId,
  });

  const vendorOptions = vendors?.items ?? [];
  // Expense accounts for the expense / service lines (a line with no stock item). Empty when the company has no chart of accounts.
  const { data: expenseAccounts = [] } = useQuery({
    queryKey: ["gl-master", "purchase-expense", compId],
    queryFn: async () => (await glMasterService.list()).items,
    enabled: !!compId,
    select: (all) => all.filter((a) => a.active && a.accountType === 4),
  });

  const itemOptions = items?.items ?? [];
  const itemByCode = useMemo(() => Object.fromEntries(itemOptions.map((i) => [i.code, i])), [itemOptions]);
  const vendorNameByCode = Object.fromEntries(vendorOptions.map((v) => [v.code, v.vendorName]));
  const branchName = sites.find((s) => s.siteID === siteId)?.siteName ?? "";

  const { data: editingInvoice } = useQuery({
    queryKey: ["purchase-invoice-detail", compId, siteId, editingDocNo],
    queryFn: () => purchaseInvoiceService.get(compId, siteId, editingDocNo!),
    enabled: dialogOpen && editingDocNo != null && !!compId && !!siteId,
  });

  // vendorOptions (from vendorMasterService.list()) only ever contains
  // Active vendors — an older invoice can point at one deactivated since, in
  // which case the print header would otherwise fall back to a bare code.
  // Only fetched when the cached active list doesn't already have it — same
  // fallback chain as purchase/orders/page.tsx's printVendor.
  const printVendorCode = editingInvoice?.vendorCode;
  const printVendorInList = vendorOptions.find((v) => v.code === printVendorCode);
  const { data: fetchedPrintVendor } = useQuery({
    queryKey: ["vendor-detail", compId, printVendorCode],
    queryFn: () => vendorMasterService.get(compId, printVendorCode!),
    enabled: !!compId && !!printVendorCode && !printVendorInList,
  });
  const printVendor = printVendorInList ?? fetchedPrintVendor ?? null;

  const form = useForm<PurchaseInvoiceFormValues>({
    resolver: zodResolver(purchaseInvoiceSchema),
    defaultValues: defaultFormValues(),
  });
  const { fields, append, remove, replace } = useFieldArray({ control: form.control, name: "lines" });
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
  const netAmount = subtotal - totalDiscount + totalTax;

  useEffect(() => {
    if (editingInvoice) {
      form.reset({
        vendorCode: editingInvoice.vendorCode,
        docDt: editingInvoice.docDt.slice(0, 10),
        vendorBillNo: editingInvoice.vendorBillNo ?? "",
        vendorBillDate: editingInvoice.vendorBillDate?.slice(0, 10) ?? "",
        remarks: editingInvoice.remarks ?? "",
        lines: editingInvoice.details.length
          ? editingInvoice.details.map((d) => ({
              lineType: (d.itemType === "E" || !d.itemCode ? "expense" : "item") as "item" | "expense",
              itemCode: d.itemCode ?? "",
              itemName: d.itemName ?? "",
              unitCode: d.unitCode ?? "",
              glCode: d.glCode ?? "",
              qty: d.qty,
              rate: d.rate,
              discountPercentage: d.discountPercentage ?? 0,
              taxPercentage: d.taxPercentage ?? 0,
              // Keep what the line was raised against (e.g. its goods receipt)
              // so saving an edit doesn't un-link it from that receipt.
              refType: d.refType ?? undefined,
              poRefCode: d.poRefCode ?? undefined,
              refRowID: d.refRowID ?? undefined,
              refDocNo: d.refDocNo ?? undefined,
              refDocCd: d.refDocCd ?? undefined,
              refCompID: d.refCompID ?? undefined,
              refSiteID: d.refSiteID ?? undefined,
            }))
          : [emptyLine],
      });
    }
  }, [editingInvoice, form]);

  function closeDialog() {
    setDialogOpen(false);
    setEditingDocNo(null);
    setGrnDocNo("");
    form.reset(defaultFormValues());
  }

  function buildDto(values: PurchaseInvoiceFormValues): CreatePurchaseInvoiceInput {
    return {
      docDt: values.docDt,
      vendorCode: values.vendorCode,
      vendorBillNo: values.vendorBillNo || undefined,
      vendorBillDate: values.vendorBillDate || undefined,
      currencyCode: currency,
      remarks: values.remarks || undefined,
      totalAmount: netAmount,
      totalDiscAmount: totalDiscount,
      details: values.lines.map((l) => {
        const { amount, discountAmount, taxAmount } = lineAmounts(l);
        const expense = l.lineType === "expense";
        return {
          // an expense / service line has no stock item: it is marked "E" and carries its description and account
          itemType: expense ? "E" : undefined,
          itemCode: expense ? undefined : l.itemCode,
          itemName: l.itemName || undefined,
          unitCode: expense ? undefined : l.unitCode || undefined,
          glCode: expense ? l.glCode || undefined : undefined,
          qty: l.qty,
          rate: l.rate,
          amount,
          discountPercentage: l.discountPercentage || undefined,
          discountAmount: discountAmount || undefined,
          taxPercentage: l.taxPercentage || undefined,
          taxAmount: taxAmount || undefined,
          refType: l.refType || undefined,
          poRefCode: l.poRefCode,
          refRowID: l.refRowID,
          refDocNo: l.refDocNo,
          refDocCd: l.refDocCd,
          refCompID: l.refCompID,
          refSiteID: l.refSiteID,
        };
      }),
    };
  }

  const createMutation = useMutation({
    mutationFn: (values: PurchaseInvoiceFormValues) => purchaseInvoiceService.create(compId, siteId, userName, buildDto(values)),
    onSuccess: () => {
      toast({ title: t("common.saveSuccess") });
      queryClient.invalidateQueries({ queryKey: ["purchase-invoices", compId, siteId] });
      closeDialog();
    },
    onError: (err) => toast({ title: apiErrorMessage(err, t("common.errorGeneric")), variant: "destructive" }),
  });

  const updateMutation = useMutation({
    mutationFn: (values: PurchaseInvoiceFormValues) =>
      purchaseInvoiceService.update(compId, siteId, editingDocNo!, userName, buildDto(values)),
    onSuccess: () => {
      toast({ title: t("common.saveSuccess") });
      queryClient.invalidateQueries({ queryKey: ["purchase-invoices", compId, siteId] });
      closeDialog();
    },
    onError: (err) => toast({ title: apiErrorMessage(err, t("common.errorGeneric")), variant: "destructive" }),
  });

  const saving = createMutation.isPending || updateMutation.isPending;

  function handleItemSelect(index: number, item: ItemMaster) {
    form.setValue(`lines.${index}.itemCode`, item.code);
    form.setValue(`lines.${index}.itemName`, item.name ?? "");
    form.setValue(`lines.${index}.unitCode`, item.unitCode ?? "");
    if (item.price != null) form.setValue(`lines.${index}.rate`, item.price);
    if (item.taxRate != null) form.setValue(`lines.${index}.taxPercentage`, item.taxRate);
    // A line picked freehand after a GRN-driven fill is no longer traceable
    // to that GRN row — clear any leftover ref fields on just this line.
    form.setValue(`lines.${index}.refType`, undefined);
    form.setValue(`lines.${index}.poRefCode`, undefined);
    form.setValue(`lines.${index}.refRowID`, undefined);
    form.setValue(`lines.${index}.refDocNo`, undefined);
    form.setValue(`lines.${index}.refDocCd`, undefined);
    form.setValue(`lines.${index}.refCompID`, undefined);
    form.setValue(`lines.${index}.refSiteID`, undefined);
  }

  async function handleGrnSelect(docNoStr: string) {
    setGrnDocNo(docNoStr);
    const docNo = Number(docNoStr);
    const grn = await goodsReceiptService.get(compId, siteId, docNo);
    form.setValue("vendorCode", grn.vendorCode);
    replace(
      grn.details.map((d) => ({
        lineType: "item" as const,
        glCode: "",
        itemCode: d.itemCode,
        itemName: d.itemName ?? "",
        unitCode: d.unitCode,
        qty: d.qty,
        rate: d.rate,
        discountPercentage: 0,
        taxPercentage: itemByCode[d.itemCode]?.taxRate ?? 0,
        refType: "G",
        poRefCode: grn.refNo ?? String(grn.docNo),
        refRowID: d.rowID ?? 0,
        refDocNo: grn.docNo,
        refDocCd: GRN_DOC_CD,
        refCompID: compId,
        refSiteID: siteId,
      })),
    );
  }

  function openNewDialog() {
    setEditingDocNo(null);
    setGrnDocNo("");
    form.reset(defaultFormValues());
    setDialogOpen(true);
  }

  function openEditDialog(docNo: number) {
    setEditingDocNo(docNo);
    setGrnDocNo("");
    setDialogOpen(true);
  }

  // A goods receipt that already has an invoice is not offered again: an invoice
  // raised against a receipt records it on its lines (refType "G", the
  // receipt's document number in refDocNo), so any receipt found on an
  // existing invoice line is left out. Nothing is listed until the invoices
  // have loaded, so an invoiced receipt never flashes into the list.
  const invoicedGrnDocNos = new Set(
    invoices.flatMap((inv) =>
      inv.details.filter((d) => d.refType === "G" && d.refDocNo != null).map((d) => Number(d.refDocNo)),
    ),
  );
  const grnOptions = invoicesLoaded
    ? goodsReceipts
        .filter((g) => !invoicedGrnDocNos.has(g.docNo))
        .map((g) => ({
          value: String(g.docNo),
          label: `${g.refNo ?? g.docNo} — ${vendorNameByCode[g.vendorCode] ?? g.vendorCode}`,
        }))
    : [];

  return (
    <div className="flex h-full flex-col gap-4">
      <PageHeader
        title={t("purchaseInvoice.title")}
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
            {can(PERMISSIONS.PURCHASE_MANAGE_INVOICES) && (
              <Button onClick={openNewDialog}>{t("common.add")}</Button>
            )}
          </div>
        }
      />

      <div className="min-h-0 flex-1">
        <DataGridWrapper<PurchaseInvoice>
          keyExpr="docNo"
          dataSource={invoices}
          onRowClick={(row) => openEditDialog(row.docNo as number)}
          columns={[
            { dataField: "docNo", captionKey: "purchaseInvoice.invoiceNumber", width: 100 },
            { dataField: "refNo", captionKey: "purchaseInvoice.refNo", width: 130 },
            { dataField: "docDt", captionKey: "common.date", dataType: "date", width: 120 },
            {
              dataField: "vendorCode",
              captionKey: "purchaseOrder.supplier",
              cellRender: (cell) => {
                const code = cell.data.vendorCode as string;
                return <span>{vendorNameByCode[code] ?? code}</span>;
              },
            },
            { dataField: "vendorBillNo", captionKey: "purchaseInvoice.supplierInvoiceNo", width: 150 },
            { dataField: "totalAmount", captionKey: "purchaseInvoice.netAmount", dataType: "number", width: 130 },
          ]}
        />
      </div>

      <Dialog open={dialogOpen} onOpenChange={(open) => (open ? setDialogOpen(true) : closeDialog())}>
        <DialogContent className="max-w-5xl">
          <DialogHeader>
            <DialogTitle>{t("purchaseInvoice.title")}</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form className="space-y-4" onKeyDown={enterMovesToNextField} onSubmit={form.handleSubmit((v) => {
              // with a chart of accounts, an expense line must say which account it is
              const missing = v.lines.findIndex((l) => l.lineType === "expense" && expenseAccounts.length > 0 && !l.glCode);
              if (missing >= 0) {
                toast({ title: t("purchaseExpense.accountRequired", { line: missing + 1 }), variant: "destructive" });
                return;
              }
              if (editingDocNo != null) updateMutation.mutate(v);
              else createMutation.mutate(v);
            })}>
              {editingDocNo == null && (
                <div className="space-y-1 rounded-md border border-dashed p-3">
                  <FormLabel className="text-xs">{t("purchaseInvoice.grnReference")}</FormLabel>
                  <Select value={grnDocNo} onValueChange={handleGrnSelect}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {grnOptions.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div className="space-y-1">
                  <FormLabel className="text-xs">{t("purchaseInvoice.invoiceNumber")}</FormLabel>
                  <Input readOnly value={editingDocNo ?? t("purchaseInvoice.auto")} className="bg-muted" />
                </div>
                <div className="space-y-1">
                  <FormLabel className="text-xs">{t("purchaseInvoice.refNo")}</FormLabel>
                  <Input readOnly value={editingInvoice?.refNo ?? t("purchaseInvoice.auto")} className="bg-muted" />
                </div>
                <FormField
                  control={form.control}
                  name="docDt"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("common.date")}</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <FormField
                  control={form.control}
                  name="vendorCode"
                  render={({ field }) => (
                    <FormItem>
                      <div className="flex items-center justify-between gap-2">
                      <FormLabel>{t("purchaseOrder.supplier")}</FormLabel>
                      {canAddSupplier && (
                        <Button
                          type="button"
                          variant="link"
                          size="sm"
                          className="h-auto p-0 text-xs"
                          onClick={() => setSupplierDialogOpen(true)}
                        >
                          <Plus className="me-0.5 h-3 w-3" />
                          {t("quickAdd.newSupplier")}
                        </Button>
                      )}
                    </div>
                      <Select value={field.value} onValueChange={field.onChange}>
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
                  name="vendorBillNo"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("purchaseInvoice.supplierInvoiceNo")}</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="vendorBillDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("purchaseInvoice.vendorBillDate")}</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="remarks"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("common.remarks")}</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <FormLabel>{t("common.item")}</FormLabel>
                  <div className="flex items-center gap-2">
                    <Button type="button" variant="outline" size="sm" onClick={() => append(emptyLine)}>
                      <Plus className="me-1 h-3.5 w-3.5" />
                      {t("common.add")}
                    </Button>
                    <Button type="button" variant="outline" size="sm" onClick={() => append({ ...emptyLine, lineType: "expense" })}>
                      <Plus className="me-1 h-3.5 w-3.5" />
                      {t("purchaseExpense.addLine")}
                    </Button>
                  </div>
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
                        <th className="w-24 px-2 py-2 text-end font-medium">{t("purchaseInvoice.netAmount")}</th>
                        <th className="w-8 px-2 py-2"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {fields.map((field, index) => {
                        const line = watchedLines[index] ?? emptyLine;
                        const isExpense = line?.lineType === "expense";
                        const { taxAmount, netTotal } = lineAmounts(line);
                        return (
                          <tr key={field.id} className={cn("border-b last:border-0", index % 2 === 1 && "bg-muted/20")}>
                            {isExpense ? (
                              <>
                                <td className="px-2 py-1.5 align-top">
                                  <div className="flex items-center gap-1">
                                    <Badge variant="secondary" className="shrink-0">
                                      {t("purchaseExpense.badge")}
                                    </Badge>
                                    <Input
                                      placeholder={t("purchaseExpense.description")}
                                      maxLength={150}
                                      {...form.register(`lines.${index}.itemName`)}
                                    />
                                  </div>
                                </td>
                                <td className="px-2 py-1.5 align-top" colSpan={3}>
                                  {expenseAccounts.length > 0 ? (
                                    <Select value={line?.glCode ?? ""} onValueChange={(v) => form.setValue(`lines.${index}.glCode`, v, { shouldDirty: true })}>
                                      <SelectTrigger>
                                        <SelectValue placeholder={t("purchaseExpense.account")} />
                                      </SelectTrigger>
                                      <SelectContent>
                                        {expenseAccounts.map((a) => (
                                          <SelectItem key={a.code} value={a.code}>
                                            {a.code} - {a.glName}
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                  ) : (
                                    <Input readOnly value="-" className="bg-muted" />
                                  )}
                                </td>
                              </>
                            ) : (
                              <>
                                <td className="px-2 py-1.5 align-top">
                                  <ItemSearchCell
                                    items={itemOptions}
                                    value={line?.itemCode ?? ""}
                                    onSelect={(item) => handleItemSelect(index, item)}
                                    onCreateNew={canAddItem ? (typed) => setNewItemLine({ index, name: typed }) : undefined}
                                    createNewLabel={t("quickAdd.newItem")}
                                    placeholder={t("common.item")}
                                  />
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
                              </>
                            )}
                            <td className="px-2 py-1.5 align-top">
                              <Input
                                type="number"
                                step="any"
                                className={numberCellClass}
                                {...form.register(`lines.${index}.qty`, { valueAsNumber: true })}
                              />
                            </td>
                            <td className="px-2 py-1.5 align-top">
                              <Input
                                type="number"
                                step="any"
                                className={numberCellClass}
                                {...form.register(`lines.${index}.rate`, { valueAsNumber: true })}
                              />
                            </td>
                            <td className="px-2 py-1.5 align-top">
                              <Input
                                type="number"
                                step="any"
                                className={numberCellClass}
                                {...form.register(`lines.${index}.discountPercentage`, { valueAsNumber: true })}
                              />
                            </td>
                            <td className="px-2 py-1.5 align-top">
                              <Input
                                type="number"
                                step="any"
                                className={numberCellClass}
                                {...form.register(`lines.${index}.taxPercentage`, { valueAsNumber: true })}
                              />
                            </td>
                            <td className="px-2 py-1.5 text-end align-middle tabular-nums">{formatMoneyPlain(taxAmount, currency, locale)}</td>
                            <td className="px-2 py-1.5 text-end align-middle font-medium tabular-nums">
                              {formatMoneyPlain(netTotal, currency, locale)}
                            </td>
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
                  <span>{t("purchaseInvoice.netAmount")}</span>
                  <span className="tabular-nums">{formatMoney(netAmount, currency, locale)}</span>
                </div>
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={closeDialog}>
                  {t("common.cancel")}
                </Button>
                {editingDocNo != null && (
                  <Button type="button" variant="outline" onClick={() => window.print()}>
                    <Printer className="me-1 h-4 w-4" />
                    {t("common.print")}
                  </Button>
                )}
                <Button type="submit" disabled={saving || !siteId}>
                  {t("common.save")}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <QuickSupplierDialog
        open={supplierDialogOpen}
        onOpenChange={setSupplierDialogOpen}
        onCreated={(vendor) => form.setValue("vendorCode", vendor.code, { shouldDirty: true, shouldValidate: true })}
      />
      <QuickItemDialog
        open={newItemLine != null}
        onOpenChange={(open) => !open && setNewItemLine(null)}
        initialName={newItemLine?.name}
        onCreated={(item) => {
          if (newItemLine) handleItemSelect(newItemLine.index, item);
        }}
      />

      {/* Print-only twin — a full A4 invoice document, distinct from the
          on-screen edit dialog above. Only rendered once a saved invoice is
          actually loaded; globals.css's .doc-print-area hides it on screen
          and reveals only it on print, same mechanism purchase/orders/
          page.tsx uses for PurchaseOrderPrint. */}
      {editingInvoice && (
        <div className="doc-print-area">
          <PurchaseInvoicePrint invoice={editingInvoice} vendor={printVendor} branchName={branchName} />
        </div>
      )}
    </div>
  );
}
