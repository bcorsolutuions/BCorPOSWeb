"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { QrCode } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { DataGridWrapper, type DataGridColumnDef } from "@/components/shared/data-grid-wrapper";
import { ManageTableQrDialog } from "@/components/masters/manage-table-qr-dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { apiErrorMessage } from "@/lib/api-error";
import { useAuthStore } from "@/stores/auth-store";
import { posLookupService } from "@/lib/api/services/pos-lookup-service";
import { restaurantTableQRService } from "@/lib/api/services/restaurant-table-qr-service";
import { formatDateTime } from "@/lib/utils";
import type { RestaurantTableQRDto } from "@/types/qr-order";

export default function TableQRCodesPage() {
  const t = useTranslations("qrTableCodes");
  const tc = useTranslations("common");
  const locale = useLocale();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const compId = useAuthStore((s) => s.user?.compId ?? "");

  const [siteId, setSiteId] = useState<string>("");
  const [manageTable, setManageTable] = useState<RestaurantTableQRDto | null>(null);

  const { data: sites = [] } = useQuery({
    queryKey: ["qr-table-codes-sites", compId],
    queryFn: () => posLookupService.getSites(compId),
    enabled: !!compId,
  });

  // Default to the first site once sites load, mirroring how single-site
  // tenants never have to think about this picker at all.
  const effectiveSiteId = siteId || sites[0]?.siteID || "";

  const { data: tables = [], isLoading } = useQuery({
    queryKey: ["restaurant-table-qr", compId, effectiveSiteId],
    queryFn: () => restaurantTableQRService.getAllBySite(compId, effectiveSiteId),
    enabled: !!compId && !!effectiveSiteId,
  });

  const generateAllMissingMutation = useMutation({
    mutationFn: () => restaurantTableQRService.generateAllMissing(compId, effectiveSiteId),
    onSuccess: (results) => {
      queryClient.invalidateQueries({ queryKey: ["restaurant-table-qr", compId, effectiveSiteId] });
      toast({ title: t("generateAllMissingSuccess", { count: results.length }) });
    },
    onError: (err) => toast({ title: apiErrorMessage(err, tc("errorGeneric")), variant: "destructive" }),
  });

  const columns: DataGridColumnDef[] = [
    { dataField: "floorCode", captionKey: "restaurant.floor", width: 100, cellRender: (d) => (d.data.floorName as string) ?? d.data.floorCode },
    { dataField: "tableCode", captionKey: "common.table", width: 100, cellRender: (d) => `${d.data.tableCode} — ${d.data.tableName ?? ""}` },
    { dataField: "capacity", captionKey: "restaurant.capacity", dataType: "number", width: 90 },
    {
      dataField: "hasQR",
      captionKey: "qrTableCodes.qrStatus",
      width: 120,
      cellRender: (d) => {
        const row = d.data as unknown as RestaurantTableQRDto;
        if (!row.hasQR) return <Badge variant="secondary">{t("noQR")}</Badge>;
        return <Badge variant={row.enabled ? "success" : "destructive"}>{row.enabled ? t("enabled") : t("disabled")}</Badge>;
      },
    },
    {
      dataField: "allowSelfOrdering",
      captionKey: "qrTableCodes.selfOrdering",
      width: 110,
      cellRender: (d) => ((d.data as unknown as RestaurantTableQRDto).allowSelfOrdering ? tc("yes") : tc("no")),
    },
    {
      dataField: "generatedOn",
      captionKey: "qrTableCodes.lastGenerated",
      width: 150,
      cellRender: (d) => {
        const row = d.data as unknown as RestaurantTableQRDto;
        const on = row.regeneratedOn ?? row.generatedOn;
        return on ? formatDateTime(on, locale) : "-";
      },
    },
  ];

  return (
    <div className="flex h-full flex-col gap-4">
        <PageHeader
          title={t("title")}
          description={t("description")}
          actions={
            <div className="flex items-center gap-2">
              <Select value={effectiveSiteId} onValueChange={setSiteId}>
                <SelectTrigger className="w-44">
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
              <Button
                variant="outline"
                onClick={() => generateAllMissingMutation.mutate()}
                disabled={!effectiveSiteId || generateAllMissingMutation.isPending}
              >
                <QrCode className="me-1 h-4 w-4" />
                {t("generateAllMissing")}
              </Button>
            </div>
          }
        />

        <div className="min-h-0 flex-1">
          <DataGridWrapper<RestaurantTableQRDto>
            dataSource={tables}
            columns={columns}
            loading={isLoading}
            keyExpr="tableCode"
            onRowClick={(row) => setManageTable(row)}
          />
        </div>

        <ManageTableQrDialog
          compId={compId}
          siteId={effectiveSiteId}
          table={manageTable}
          onOpenChange={(open) => !open && setManageTable(null)}
        />
      </div>
  );
}
