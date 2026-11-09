"use client";

import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useForm, useFieldArray, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { jvService } from "@/lib/api/services/jv-service";
import { glMasterService } from "@/lib/api/services/gl-master-service";
import { posLookupService } from "@/lib/api/services/pos-lookup-service";
import { jvSchema, type JVFormValues } from "@/schemas/jv.schema";
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
import type { JournalVoucher, CreateJournalVoucherInput, UpdateJournalVoucherInput } from "@/types/jv";
import { enterMovesToNextField } from "@/lib/prevent-enter-submit";
import { VoucherBillFields } from "@/components/accounting/voucher-bill-fields";

const emptyLine = { glCode: "", debitAmt: 0, creditAmt: 0, referenceNo: "", remarks: "", billType: "", billRef: "", detailId: "", rowId: undefined as number | undefined };

// A voucher the POS shift close generated (POSDC-<n>) is not edited by hand: its figures come from the shift.
const isPosVoucher = (jvRef?: string) => (jvRef ?? "").toUpperCase().startsWith("POSDC-");

// Entries on a customer (debtor, control type DRS) or supplier (creditor, CRS) account are bill-wise: they carry a bill type and reference.
const isPartyCtrl = (ctrl?: string | null) => ["DRS", "CRS"].includes((ctrl ?? "").toUpperCase());

export default function JournalVoucherPage() {
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
  const [editing, setEditing] = useState<JournalVoucher | null>(null);

  // Same page-local site resolution as purchase/orders/page.tsx — no
  // device-scoped session store exists for dashboard document pages.
  const [siteId, setSiteId] = useState("");
  const { data: sites = [] } = useQuery({
    queryKey: ["sites-lookup", compId],
    queryFn: () => posLookupService.getSites(compId),
    enabled: !!compId,
  });
  useEffect(() => {
    if (!siteId && sites[0]) setSiteId(sites[0].siteID);
  }, [sites, siteId]);

  const { data: vouchers = [] } = useQuery({
    queryKey: ["journal-vouchers", compId, siteId],
    queryFn: () => jvService.getAll(compId, siteId),
    enabled: !!compId && !!siteId,
  });
  const { data: glAccounts } = useQuery({ queryKey: ["gl-master"], queryFn: () => glMasterService.list() });
  const glOptions = glAccounts?.items ?? [];
  const isPartyAccount = (code: string) => isPartyCtrl(glOptions.find((g) => g.code === code)?.glCtrlTypeCode);

  const defaultValues: JVFormValues = {
    docDt: new Date().toISOString().slice(0, 10),
    jvRef: "",
    narration: "",
    remarks: "",
    lines: [{ ...emptyLine }, { ...emptyLine }],
  };

  const form = useForm<JVFormValues>({
    resolver: zodResolver(jvSchema),
    defaultValues,
  });
  const { fields, append, remove } = useFieldArray({ control: form.control, name: "lines" });
  const watchedLines = useWatch({ control: form.control, name: "lines" }) ?? [];
  const totalDebit = watchedLines.reduce((sum, l) => sum + (Number(l?.debitAmt) || 0), 0);
  const totalCredit = watchedLines.reduce((sum, l) => sum + (Number(l?.creditAmt) || 0), 0);
  const isBalanced = totalDebit > 0 && Math.abs(totalDebit - totalCredit) < 0.001;

  const createMutation = useMutation({
    mutationFn: (values: JVFormValues) => {
      const dto: UpdateJournalVoucherInput = {
        docDt: values.docDt,
        jvRef: values.jvRef,
        company: compId,
        currency,
        currencyRate: 1,
        narration: values.narration || undefined,
        totalAmt: totalDebit,
        remarks: values.remarks || undefined,
        active: true,
        details: values.lines
          .filter((l) => l.glCode)
          .map((l) => {
            const party = isPartyAccount(l.glCode);
            return {
              id: l.detailId || null,
              rowID: l.rowId ?? null,
              glCode: l.glCode,
              debitAmt: l.debitAmt,
              creditAmt: l.creditAmt,
              referenceNo: l.referenceNo || null,
              remarks: l.remarks || null,
              billType: party && l.billType ? Number(l.billType) : null,
              billRef: party ? l.billRef?.trim() || null : null,
            };
          }),
      };
      // a new voucher is created; an opened one is updated (its lines keep their ids, so edits change them and removals delete them)
      return editing
        ? jvService.update(compId, siteId, userName, editing.docNo, dto)
        : jvService.create(compId, siteId, userName, dto as CreateJournalVoucherInput);
    },
    onSuccess: () => {
      toast({ title: t("common.saveSuccess") });
      queryClient.invalidateQueries({ queryKey: ["journal-vouchers", compId, siteId] });
      for (const key of ["gl-bills", "general-ledger", "trial-balance", "profit-loss", "balance-sheet"]) queryClient.invalidateQueries({ queryKey: [key] });
      closeDialog();
    },
    onError: (err) => toast({ title: apiErrorMessage(err, t("common.errorGeneric")), variant: "destructive" }),
  });

  function closeDialog() {
    setDialogOpen(false);
    setEditing(null);
    form.reset(defaultValues);
  }

  // Open a saved voucher for editing: the form is filled from it, each line remembers which saved line it is.
  function openEdit(v: JournalVoucher) {
    setEditing(v);
    form.reset({
      docDt: (v.docDt ?? "").slice(0, 10),
      jvRef: v.jvRef,
      narration: v.narration ?? "",
      remarks: v.remarks ?? "",
      lines: [...v.details]
        .sort((a, b) => (a.rowID ?? 0) - (b.rowID ?? 0))
        .map((d) => ({
          glCode: d.glCode,
          debitAmt: d.debitAmt,
          creditAmt: d.creditAmt,
          referenceNo: d.referenceNo ?? "",
          remarks: d.remarks ?? "",
          billType: d.billType ? String(d.billType) : "",
          billRef: d.billRef ?? "",
          detailId: d.id ?? "",
          rowId: d.rowID ?? undefined,
        })),
    });
    setDialogOpen(true);
  }

  const readOnly = !can(PERMISSIONS.ACCOUNTING_MANAGE_GL) || (editing != null && isPosVoucher(editing.jvRef));

  return (
    <div className="flex h-full flex-col gap-4">
      <PageHeader
        title={t("jv.title")}
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
            {can(PERMISSIONS.ACCOUNTING_MANAGE_GL) && (
              <Button
                onClick={() => {
                  setEditing(null);
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
        <DataGridWrapper<JournalVoucher>
          keyExpr="docNo"
          dataSource={vouchers}
          onRowClick={openEdit}
          columns={[
            { dataField: "docNo", captionKey: "jv.voucherNumber", width: 100 },
            { dataField: "jvRef", captionKey: "jv.reference", width: 140 },
            { dataField: "docDt", captionKey: "common.date", dataType: "date", width: 120 },
            { dataField: "narration", captionKey: "jv.narration" },
            { dataField: "totalAmt", captionKey: "common.grandTotal", dataType: "number", width: 130 },
          ]}
        />
      </div>

      <Dialog open={dialogOpen} onOpenChange={(open) => (open ? setDialogOpen(true) : closeDialog())}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>
              {t("jv.title")}
              {editing ? ` — ${t("jv.voucherNumber")} ${editing.docNo}` : ""}
            </DialogTitle>
          </DialogHeader>
          {editing && isPosVoucher(editing.jvRef) && <p className="rounded-md bg-muted px-3 py-2 text-sm">{t("jv.posVoucherNote")}</p>}
          <Form {...form}>
            <form className="space-y-4" onKeyDown={enterMovesToNextField} onSubmit={form.handleSubmit((v) => {
              // a line on a customer / supplier account needs its bill type and bill reference
              const missing = v.lines.findIndex((l) => l.glCode && isPartyAccount(l.glCode) && (!l.billType || !l.billRef?.trim()));
              if (missing >= 0) {
                toast({ title: t("jv.billRequired", { line: missing + 1 }), variant: "destructive" });
                return;
              }
              createMutation.mutate(v);
            })}>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="jvRef"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("jv.reference")}</FormLabel>
                      <FormControl>
                        <Input {...field} disabled={editing != null} />
                      </FormControl>
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

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="narration"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("jv.narration")}</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
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
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <FormLabel>{t("jv.lines")}</FormLabel>
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
                    return (
                      <div key={field.id} className="grid grid-cols-12 items-end gap-2 rounded-md border p-2">
                        <div className="col-span-4">
                          <FormLabel className="text-xs">{t("gl.code")}</FormLabel>
                          <Select
                            value={line?.glCode ?? ""}
                            onValueChange={(v) => {
                              form.setValue(`lines.${index}.glCode`, v);
                              // bill details belong to one account: choosing another starts them again
                              form.setValue(`lines.${index}.billType`, "");
                              form.setValue(`lines.${index}.billRef`, "");
                            }}
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
                        <div className="col-span-2">
                          <FormLabel className="text-xs">{t("jv.debit")}</FormLabel>
                          <Input
                            type="number"
                            step="any"
                            {...form.register(`lines.${index}.debitAmt`, { valueAsNumber: true })}
                          />
                        </div>
                        <div className="col-span-2">
                          <FormLabel className="text-xs">{t("jv.credit")}</FormLabel>
                          <Input
                            type="number"
                            step="any"
                            {...form.register(`lines.${index}.creditAmt`, { valueAsNumber: true })}
                          />
                        </div>
                        <div className="col-span-3">
                          <FormLabel className="text-xs">{t("gl.remarks")}</FormLabel>
                          <Input {...form.register(`lines.${index}.remarks`)} />
                        </div>
                        <div className="col-span-1 flex justify-end">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            disabled={fields.length === 2}
                            onClick={() => remove(index)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                        {line?.glCode && isPartyAccount(line.glCode) && (
                          <VoucherBillFields
                            glCode={line.glCode}
                            billType={line.billType ?? ""}
                            billRef={line.billRef ?? ""}
                            onTypeChange={(type) => {
                              form.setValue(`lines.${index}.billType`, type, { shouldDirty: true });
                              form.setValue(`lines.${index}.billRef`, ""); // a different type means a different kind of reference
                            }}
                            onRefChange={(ref) => form.setValue(`lines.${index}.billRef`, ref, { shouldDirty: true })}
                            onPickBill={(bill) => {
                              // offer the outstanding amount on the side that settles the bill (a customer's bill is settled by a credit)
                              if (!(Number(line.debitAmt) > 0) && !(Number(line.creditAmt) > 0)) {
                                form.setValue(bill.side === "Dr" ? `lines.${index}.creditAmt` : `lines.${index}.debitAmt`, bill.outstanding);
                              }
                            }}
                          />
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="flex items-center justify-end gap-6 text-sm font-medium">
                <span>
                  {t("jv.totalDebit")}: {formatMoney(totalDebit, currency, locale)}
                </span>
                <span>
                  {t("jv.totalCredit")}: {formatMoney(totalCredit, currency, locale)}
                </span>
                <span className={isBalanced ? "text-green-600" : "text-destructive"}>
                  {isBalanced ? t("jv.balanced") : t("jv.unbalanced")}
                </span>
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={closeDialog}>
                  {t("common.cancel")}
                </Button>
                <Button type="submit" disabled={createMutation.isPending || !siteId || !isBalanced || readOnly}>
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
