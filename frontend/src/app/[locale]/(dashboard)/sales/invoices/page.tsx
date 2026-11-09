"use client";

import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useForm, useFieldArray, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { salesInvoiceService } from "@/lib/api/services/sales-service";
import { customerMasterService } from "@/lib/api/services/customer-master-service";
import { itemMasterService } from "@/lib/api/services/item-master-service";
import { glMasterService } from "@/lib/api/services/gl-master-service";
import { posLookupService } from "@/lib/api/services/pos-lookup-service";
import { salesInvoiceSchema, type SalesInvoiceFormValues } from "@/schemas/sales-invoice.schema";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { usePermission } from "@/hooks/use-permission";
import { useAuthStore } from "@/stores/auth-store";
import { PageHeader } from "@/components/shared/page-header";
import { DataGridWrapper } from "@/components/shared/data-grid-wrapper";
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
import { Trash2, Plus } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { apiErrorMessage } from "@/lib/api-error";
import { useCurrencyStore } from "@/stores/currency-store";
import { formatMoney } from "@/lib/utils";
import type { SalesInvoice, CreateSalesInvoiceInput } from "@/types/sales-invoice";
import { enterMovesToNextField } from "@/lib/prevent-enter-submit";

const emptyLine = { itemCode: "", itemName: "", unitCode: "", quantity: 1, unitCost: 0, discountAmount: 0, glCode: "" };

export default function SalesInvoicePage() {
  const t = useTranslations();
  const locale = useLocale();
  const currency = useCurrencyStore((s) => s.currencyCode);
  const { toast } = useToast();
  const { can } = usePermission();
  const user = useAuthStore((s) => s.user);
  const compId = user?.compId ?? "";
  const userName = user?.userName ?? "";
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);

  // Same page-local site resolution as purchase/orders + accounting/vouchers —
  // no device-scoped session store exists for dashboard document pages.
  const [siteId, setSiteId] = useState("");
  const { data: sites = [] } = useQuery({
    queryKey: ["sites-lookup", compId],
    queryFn: () => posLookupService.getSites(compId),
    enabled: !!compId,
  });
  useEffect(() => {
    if (!siteId && sites[0]) setSiteId(sites[0].siteID);
  }, [sites, siteId]);

  const { data: invoices = [] } = useQuery({
    queryKey: ["sales-invoices", compId, siteId],
    queryFn: () => salesInvoiceService.getAll(compId, siteId),
    enabled: !!compId && !!siteId,
  });
  const { data: customers } = useQuery({ queryKey: ["customers-lookup", compId], queryFn: () => customerMasterService.list() });
  const { data: items } = useQuery({ queryKey: ["items-lookup", compId], queryFn: () => itemMasterService.list() });
  const { data: glAccounts } = useQuery({ queryKey: ["gl-master"], queryFn: () => glMasterService.list() });

  const customerOptions = customers?.items ?? [];
  const itemOptions = items?.items ?? [];
  const glOptions = glAccounts?.items ?? [];
  const customerNameByCode = Object.fromEntries(customerOptions.map((c) => [c.code, c.custName]));

  const defaultValues: SalesInvoiceFormValues = {
    custCode: "",
    docDt: new Date().toISOString().slice(0, 10),
    remarks: "",
    lines: [{ ...emptyLine }],
  };

  const form = useForm<SalesInvoiceFormValues>({
    resolver: zodResolver(salesInvoiceSchema),
    defaultValues,
  });
  const { fields, append, remove } = useFieldArray({ control: form.control, name: "lines" });
  const watchedLines = useWatch({ control: form.control, name: "lines" }) ?? [];
  const grandTotal = watchedLines.reduce(
    (sum, l) => sum + ((Number(l?.quantity) || 0) * (Number(l?.unitCost) || 0) - (Number(l?.discountAmount) || 0)),
    0,
  );

  const createMutation = useMutation({
    mutationFn: (values: SalesInvoiceFormValues) => {
      const dto: CreateSalesInvoiceInput = {
        docDt: values.docDt,
        // Matches the ref-no counter (SysTransactionRefNos) convention
        // already established by this company/site's existing invoices —
        // any other value starts an independent counter that collides with
        // pre-existing RefNos (confirmed live: "INV" produced a duplicate-
        // key error against invoice #1's "ADM26000001").
        type: "TAX",
        custCode: values.custCode,
        remarks: values.remarks || undefined,
        currencyCode: currency,
        currencyRate: 1,
        subTotal: grandTotal,
        netTotal: grandTotal,
        details: values.lines.map((l) => {
          const amount = l.quantity * l.unitCost - (l.discountAmount || 0);
          return {
            itemCode: l.itemCode,
            unitCode: l.unitCode || undefined,
            quantity: l.quantity,
            unitCost: l.unitCost,
            discountAmount: l.discountAmount || undefined,
            glCode: l.glCode,
            amount,
            netAmount: amount,
          };
        }),
      };
      return salesInvoiceService.create(compId, siteId, userName, dto);
    },
    onSuccess: () => {
      toast({ title: t("common.saveSuccess") });
      queryClient.invalidateQueries({ queryKey: ["sales-invoices", compId, siteId] });
      setDialogOpen(false);
      form.reset(defaultValues);
    },
    onError: (err) => toast({ title: apiErrorMessage(err, t("common.errorGeneric")), variant: "destructive" }),
  });

  function handleItemSelect(index: number, itemCode: string) {
    const item = itemOptions.find((i) => i.code === itemCode);
    form.setValue(`lines.${index}.itemCode`, itemCode);
    form.setValue(`lines.${index}.unitCode`, item?.unitCode ?? "");
    if (item?.price != null) form.setValue(`lines.${index}.unitCost`, item.price);
  }

  return (
    <div className="flex h-full flex-col gap-4">
      <PageHeader
        title={t("salesInvoice.title")}
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
            {can(PERMISSIONS.SALES_MANAGE_INVOICES) && (
              <Button
                onClick={() => {
                  form.reset(defaultValues);
                  setDialogOpen(true);
                }}
              >
                {t("common.add")}
              </Button>
            )}
          </div>
        }
      />

      <div className="min-h-0 flex-1">
        <DataGridWrapper<SalesInvoice>
          keyExpr="docNo"
          dataSource={invoices}
          columns={[
            { dataField: "docNo", captionKey: "salesInvoice.invoiceNumber", width: 100 },
            {
              dataField: "custCode",
              captionKey: "salesInvoice.customer",
              cellRender: (cell) => {
                const code = cell.data.custCode as string;
                return <span>{customerNameByCode[code] ?? code}</span>;
              },
            },
            { dataField: "docDt", captionKey: "common.date", dataType: "date", width: 120 },
            { dataField: "netTotal", captionKey: "common.grandTotal", dataType: "number", width: 130 },
          ]}
        />
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>{t("salesInvoice.title")}</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form className="space-y-4" onKeyDown={enterMovesToNextField} onSubmit={form.handleSubmit((v) => createMutation.mutate(v))}>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="custCode"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("salesInvoice.customer")}</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {customerOptions.map((c) => (
                            <SelectItem key={c.code} value={c.code}>
                              {c.custName}
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

              <FormField
                control={form.control}
                name="remarks"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("gl.remarks")}</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <FormLabel>{t("pos.cart")}</FormLabel>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => append({ ...emptyLine })}
                  >
                    <Plus className="me-1 h-3.5 w-3.5" />
                    {t("common.add")}
                  </Button>
                </div>

                <div className="space-y-2">
                  {fields.map((field, index) => {
                    const line = watchedLines[index];
                    const amount = (Number(line?.quantity) || 0) * (Number(line?.unitCost) || 0) - (Number(line?.discountAmount) || 0);
                    return (
                      <div key={field.id} className="grid grid-cols-12 items-end gap-2 rounded-md border p-2">
                        <div className="col-span-3">
                          <FormLabel className="text-xs">{t("pos.searchProduct")}</FormLabel>
                          <Select value={line?.itemCode ?? ""} onValueChange={(v) => handleItemSelect(index, v)}>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {itemOptions.map((i) => (
                                <SelectItem key={i.code} value={i.code}>
                                  {i.name}
                                  {i.barCode ? ` · ${i.barCode}` : ""}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="col-span-2">
                          <FormLabel className="text-xs">{t("gl.code")}</FormLabel>
                          <Select
                            value={line?.glCode ?? ""}
                            onValueChange={(v) => form.setValue(`lines.${index}.glCode`, v)}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {glOptions.map((g) => (
                                <SelectItem key={g.code} value={g.code}>
                                  {g.code} - {g.glName}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="col-span-1">
                          <FormLabel className="text-xs">{t("pos.qty")}</FormLabel>
                          <Input type="number" step="any" {...form.register(`lines.${index}.quantity`, { valueAsNumber: true })} />
                        </div>
                        <div className="col-span-2">
                          <FormLabel className="text-xs">{t("item.costPrice")}</FormLabel>
                          <Input type="number" step="any" {...form.register(`lines.${index}.unitCost`, { valueAsNumber: true })} />
                        </div>
                        <div className="col-span-1">
                          <FormLabel className="text-xs">{t("item.unit")}</FormLabel>
                          <Input readOnly value={line?.unitCode ?? ""} className="bg-muted" />
                        </div>
                        <div className="col-span-2 text-end text-sm font-medium tabular-nums">
                          {formatMoney(amount, currency, locale)}
                        </div>
                        <div className="col-span-1 flex justify-end">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            disabled={fields.length === 1}
                            onClick={() => remove(index)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="flex justify-end text-lg font-semibold">
                {t("common.grandTotal")}: {formatMoney(grandTotal, currency, locale)}
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                  {t("common.cancel")}
                </Button>
                <Button type="submit" disabled={createMutation.isPending || !siteId}>
                  {t("common.save")}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
