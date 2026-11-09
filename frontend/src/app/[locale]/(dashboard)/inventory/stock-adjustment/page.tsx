"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { stockAdjustmentService } from "@/lib/api/services/inventory-service";
import { itemService } from "@/lib/api/services/masters-service";
import { stockAdjustmentSchema, type StockAdjustmentFormValues } from "@/schemas/inventory.schema";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { usePermission } from "@/hooks/use-permission";
import { PageHeader } from "@/components/shared/page-header";
import { DataGridWrapper } from "@/components/shared/data-grid-wrapper";
import { DocumentLineItemsEditor } from "@/components/shared/document-line-items-editor";
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
import { useToast } from "@/components/ui/use-toast";
import { apiErrorMessage } from "@/lib/api-error";
import type { StockAdjustment } from "@/types/inventory";
import { enterMovesToNextField } from "@/lib/prevent-enter-submit";

const REASON_OPTIONS = ["PhysicalCount", "Damage", "Expiry", "Theft", "Correction"] as const;

export default function StockAdjustmentPage() {
  const t = useTranslations();
  const { toast } = useToast();
  const { can } = usePermission();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);

  const { data } = useQuery({ queryKey: ["stock-adjustments"], queryFn: () => stockAdjustmentService.list() });
  const { data: items } = useQuery({ queryKey: ["items-lookup"], queryFn: () => itemService.list({ pageSize: 500 }) });

  const form = useForm<StockAdjustmentFormValues>({
    resolver: zodResolver(stockAdjustmentSchema),
    defaultValues: {
      warehouseId: "",
      adjustmentDate: new Date().toISOString().slice(0, 10),
      reason: "PhysicalCount",
      lines: [{ itemId: "", systemQty: 0, actualQty: 0 }],
    },
  });

  const createMutation = useMutation({
    mutationFn: (values: StockAdjustmentFormValues) => stockAdjustmentService.create(values),
    onSuccess: () => {
      toast({ title: t("common.saveSuccess") });
      queryClient.invalidateQueries({ queryKey: ["stock-adjustments"] });
      setDialogOpen(false);
      form.reset();
    },
    onError: (err) => toast({ title: apiErrorMessage(err, t("common.errorGeneric")), variant: "destructive" }),
  });

  const itemOptions = (items?.items ?? []).map((i) => ({ value: i.id, label: i.nameEn }));

  return (
    <div className="flex h-full flex-col gap-4">
      <PageHeader
        title={t("stockAdjustment.title")}
        actions={
          can(PERMISSIONS.INVENTORY_ADJUST_STOCK) && <Button onClick={() => setDialogOpen(true)}>{t("common.add")}</Button>
        }
      />

      <div className="min-h-0 flex-1">
        <DataGridWrapper<StockAdjustment>
          dataSource={data?.items ?? []}
          columns={[
            { dataField: "adjustmentNumber", captionKey: "stockAdjustment.adjustmentNumber", width: 160 },
            { dataField: "warehouseName", captionKey: "stockAdjustment.warehouse" },
            { dataField: "reason", captionKey: "stockAdjustment.reason", width: 140 },
            { dataField: "adjustmentDate", captionKey: "common.date", dataType: "date", width: 130 },
          ]}
        />
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>{t("stockAdjustment.title")}</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form className="space-y-4" onKeyDown={enterMovesToNextField} onSubmit={form.handleSubmit((v) => createMutation.mutate(v))}>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <FormField
                  control={form.control}
                  name="warehouseId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("stockAdjustment.warehouse")}</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="reason"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("stockAdjustment.reason")}</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {REASON_OPTIONS.map((r) => (
                            <SelectItem key={r} value={r}>
                              {r}
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
                  name="adjustmentDate"
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

              <DocumentLineItemsEditor
                control={form.control}
                name="lines"
                itemOptions={itemOptions}
                columns={[
                  { name: "systemQty", labelKey: "stockAdjustment.systemQty", type: "number", readOnly: true },
                  { name: "actualQty", labelKey: "stockAdjustment.actualQty", type: "number" },
                ]}
                emptyLine={{ itemId: "", systemQty: 0, actualQty: 0 }}
              />

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                  {t("common.cancel")}
                </Button>
                <Button type="submit" disabled={createMutation.isPending}>
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
