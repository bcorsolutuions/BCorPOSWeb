"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { stockTransferService } from "@/lib/api/services/inventory-service";
import { itemService } from "@/lib/api/services/masters-service";
import { stockTransferSchema, type StockTransferFormValues } from "@/schemas/inventory.schema";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { usePermission } from "@/hooks/use-permission";
import { PageHeader } from "@/components/shared/page-header";
import { DataGridWrapper } from "@/components/shared/data-grid-wrapper";
import { DocumentLineItemsEditor } from "@/components/shared/document-line-items-editor";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";
import { apiErrorMessage } from "@/lib/api-error";
import type { StockTransfer, StockTransferStatus } from "@/types/inventory";
import { enterMovesToNextField } from "@/lib/prevent-enter-submit";

const statusVariant: Record<StockTransferStatus, "secondary" | "success" | "outline" | "destructive"> = {
  Draft: "secondary",
  InTransit: "outline",
  Received: "success",
  Cancelled: "destructive",
};

export default function StockTransferPage() {
  const t = useTranslations();
  const { toast } = useToast();
  const { can } = usePermission();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);

  const { data } = useQuery({ queryKey: ["stock-transfers"], queryFn: () => stockTransferService.list() });
  const { data: items } = useQuery({ queryKey: ["items-lookup"], queryFn: () => itemService.list({ pageSize: 500 }) });

  const form = useForm<StockTransferFormValues>({
    resolver: zodResolver(stockTransferSchema),
    defaultValues: {
      fromBranchId: "",
      toBranchId: "",
      transferDate: new Date().toISOString().slice(0, 10),
      lines: [{ itemId: "", quantity: 1 }],
    },
  });

  const createMutation = useMutation({
    mutationFn: (values: StockTransferFormValues) => stockTransferService.create(values),
    onSuccess: () => {
      toast({ title: t("common.saveSuccess") });
      queryClient.invalidateQueries({ queryKey: ["stock-transfers"] });
      setDialogOpen(false);
      form.reset();
    },
    onError: (err) => toast({ title: apiErrorMessage(err, t("common.errorGeneric")), variant: "destructive" }),
  });

  const itemOptions = (items?.items ?? []).map((i) => ({ value: i.id, label: i.nameEn }));

  return (
    <div className="flex h-full flex-col gap-4">
      <PageHeader
        title={t("stockTransfer.title")}
        actions={
          can(PERMISSIONS.INVENTORY_TRANSFER_BRANCH) && <Button onClick={() => setDialogOpen(true)}>{t("common.add")}</Button>
        }
      />

      <div className="min-h-0 flex-1">
        <DataGridWrapper<StockTransfer>
          dataSource={data?.items ?? []}
          columns={[
            { dataField: "transferNumber", captionKey: "stockTransfer.transferNumber", width: 150 },
            { dataField: "fromBranchName", captionKey: "stockTransfer.fromBranch" },
            { dataField: "toBranchName", captionKey: "stockTransfer.toBranch" },
            { dataField: "transferDate", captionKey: "common.date", dataType: "date", width: 130 },
            {
              dataField: "status",
              captionKey: "common.status",
              width: 120,
              cellRender: (cell) => (
                <Badge variant={statusVariant[cell.data.status as StockTransferStatus]}>
                  {String(cell.data.status)}
                </Badge>
              ),
            },
          ]}
        />
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>{t("stockTransfer.title")}</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form className="space-y-4" onKeyDown={enterMovesToNextField} onSubmit={form.handleSubmit((v) => createMutation.mutate(v))}>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <FormField
                  control={form.control}
                  name="fromBranchId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("stockTransfer.fromBranch")}</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="toBranchId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("stockTransfer.toBranch")}</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="transferDate"
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
                columns={[{ name: "quantity", labelKey: "pos.qty", type: "number" }]}
                emptyLine={{ itemId: "", quantity: 1 }}
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
