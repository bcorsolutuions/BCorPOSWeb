"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Printer, QrCode as QrCodeIcon } from "lucide-react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";
import { restaurantTableQRService } from "@/lib/api/services/restaurant-table-qr-service";
import { QrTableLabelSticker } from "@/components/masters/qr-table-label-print";
import { formatDateTime } from "@/lib/utils";
import type { GenerateQrResultDto, RestaurantTableQRDto, UpdateRestaurantTableQRSettingsDto } from "@/types/qr-order";

export function ManageTableQrDialog({
  compId,
  siteId,
  table,
  onOpenChange,
}: {
  compId: string;
  siteId: string;
  table: RestaurantTableQRDto | null;
  onOpenChange: (open: boolean) => void;
}) {
  const t = useTranslations("qrTableCodes");
  const tc = useTranslations("common");
  const locale = useLocale();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const open = !!table;

  // Only ever populated by this session's own Generate/Regenerate response —
  // the raw token is never retrievable again once this dialog closes (see
  // RestaurantTableQR.cs / GenerateQrResultDto.cs).
  const [freshToken, setFreshToken] = useState<GenerateQrResultDto | null>(null);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["restaurant-table-qr", compId, siteId] });

  const generateMutation = useMutation({
    mutationFn: () => restaurantTableQRService.generate(compId, siteId, table!.tableCode),
    onSuccess: (result) => {
      setFreshToken(result);
      invalidate();
    },
    onError: () => toast({ title: tc("errorGeneric"), variant: "destructive" }),
  });

  const regenerateMutation = useMutation({
    mutationFn: () => restaurantTableQRService.regenerate(compId, siteId, table!.tableCode),
    onSuccess: (result) => {
      setFreshToken(result);
      invalidate();
      toast({ title: t("regenerateSuccess") });
    },
    onError: () => toast({ title: tc("errorGeneric"), variant: "destructive" }),
  });

  const toggleEnabledMutation = useMutation({
    mutationFn: () =>
      table!.enabled
        ? restaurantTableQRService.disable(compId, siteId, table!.tableCode)
        : restaurantTableQRService.enable(compId, siteId, table!.tableCode),
    onSuccess: invalidate,
    onError: () => toast({ title: tc("errorGeneric"), variant: "destructive" }),
  });

  const settingsMutation = useMutation({
    mutationFn: (dto: UpdateRestaurantTableQRSettingsDto) =>
      restaurantTableQRService.updateSettings(compId, siteId, table!.tableCode, dto),
    onSuccess: invalidate,
    onError: () => toast({ title: tc("errorGeneric"), variant: "destructive" }),
  });

  if (!table) return null;

  const orderUrl = freshToken ? `${window.location.origin}/${locale}/q/${freshToken.rawToken}` : null;

  function updateSetting(patch: Partial<UpdateRestaurantTableQRSettingsDto>) {
    settingsMutation.mutate({
      allowSelfOrdering: table!.allowSelfOrdering,
      requireOrderApproval: table!.requireOrderApproval,
      allowCallWaiter: table!.allowCallWaiter,
      allowRequestBill: table!.allowRequestBill,
      ...patch,
    });
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) setFreshToken(null); onOpenChange(o); }}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>
            {t("tableLabel")} {table.tableCode} — {table.tableName}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 text-sm">
          <div className="flex items-center justify-between">
            <Badge variant={table.hasQR ? (table.enabled ? "success" : "secondary") : "secondary"}>
              {!table.hasQR ? t("noQR") : table.enabled ? t("enabled") : t("disabled")}
            </Badge>
            {table.hasQR && (
              <Button size="sm" variant="outline" onClick={() => toggleEnabledMutation.mutate()} disabled={toggleEnabledMutation.isPending}>
                {table.enabled ? t("disable") : t("enable")}
              </Button>
            )}
          </div>

          {table.lastUsedOn && (
            <p className="text-xs text-muted-foreground">
              {t("lastUsed")}: {formatDateTime(table.lastUsedOn, locale)}
            </p>
          )}

          {!freshToken ? (
            <Button
              className="w-full"
              onClick={() => (table.hasQR ? regenerateMutation.mutate() : generateMutation.mutate())}
              disabled={generateMutation.isPending || regenerateMutation.isPending}
            >
              <QrCodeIcon className="me-1 h-4 w-4" />
              {table.hasQR ? t("regenerate") : t("generate")}
            </Button>
          ) : (
            <div className="space-y-2 rounded-md border bg-muted/30 p-3">
              <p className="text-xs font-medium text-destructive">{t("printNowWarning")}</p>
              <div className="flex justify-center">
                <QrTableLabelSticker tableCode={table.tableCode} orderUrl={orderUrl!} />
              </div>
              <Button className="w-full" onClick={() => window.print()}>
                <Printer className="me-1 h-4 w-4" />
                {t("printLabel")}
              </Button>
              {/* Print-only twin — the visible preview above stays a fixed
                  size regardless of the actual 80mm x 100mm label page. */}
              <div className="qr-label-print-area">
                <QrTableLabelSticker tableCode={table.tableCode} orderUrl={orderUrl!} />
              </div>
            </div>
          )}

          {table.hasQR && (
            <div className="space-y-3 border-t pt-3">
              <div className="flex items-center justify-between">
                <Label htmlFor="allow-self-ordering">{t("allowSelfOrdering")}</Label>
                <Switch
                  id="allow-self-ordering"
                  checked={table.allowSelfOrdering}
                  onCheckedChange={(checked) => updateSetting({ allowSelfOrdering: checked })}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="require-approval">{t("requireOrderApproval")}</Label>
                <Switch
                  id="require-approval"
                  checked={table.requireOrderApproval}
                  onCheckedChange={(checked) => updateSetting({ requireOrderApproval: checked })}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="allow-call-waiter">{t("allowCallWaiter")}</Label>
                <Switch
                  id="allow-call-waiter"
                  checked={table.allowCallWaiter}
                  onCheckedChange={(checked) => updateSetting({ allowCallWaiter: checked })}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="allow-request-bill">{t("allowRequestBill")}</Label>
                <Switch
                  id="allow-request-bill"
                  checked={table.allowRequestBill}
                  onCheckedChange={(checked) => updateSetting({ allowRequestBill: checked })}
                />
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {tc("close")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
