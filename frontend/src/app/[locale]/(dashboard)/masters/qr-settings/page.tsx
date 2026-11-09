"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { apiErrorMessage } from "@/lib/api-error";
import { useAuthStore } from "@/stores/auth-store";
import { posLookupService } from "@/lib/api/services/pos-lookup-service";
import { restaurantQrSiteSettingsService } from "@/lib/api/services/restaurant-qr-site-settings-service";
import type { QrMisuseMode, QrOrderMode, UpdateRestaurantQrSiteSettingsDto } from "@/types/qr-order";

const BOOLEAN_FIELDS: { key: keyof UpdateRestaurantQrSiteSettingsDto; labelKey: string }[] = [
  { key: "allowGuestOrdering", labelKey: "allowGuestOrdering" },
  { key: "askCustomerName", labelKey: "askCustomerName" },
  { key: "askMobileNumber", labelKey: "askMobileNumber" },
  { key: "allowCallWaiter", labelKey: "allowCallWaiter" },
  { key: "allowRequestWater", labelKey: "allowRequestWater" },
  { key: "allowRequestBill", labelKey: "allowRequestBill" },
  { key: "allowCoupon", labelKey: "allowCoupon" },
  { key: "allowPromotion", labelKey: "allowPromotion" },
  { key: "allowOrderTracking", labelKey: "allowOrderTracking" },
];

export default function QrSiteSettingsPage() {
  const t = useTranslations("qrTableCodes");
  const tc = useTranslations("common");
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const compId = useAuthStore((s) => s.user?.compId ?? "");
  const userName = useAuthStore((s) => s.user?.userName ?? "");

  const [siteId, setSiteId] = useState("");
  const [form, setForm] = useState<UpdateRestaurantQrSiteSettingsDto | null>(null);

  const { data: sites = [] } = useQuery({
    queryKey: ["qr-settings-sites", compId],
    queryFn: () => posLookupService.getSites(compId),
    enabled: !!compId,
  });
  const effectiveSiteId = siteId || sites[0]?.siteID || "";

  const { data: settings } = useQuery({
    queryKey: ["qr-site-settings", compId, effectiveSiteId],
    queryFn: () => restaurantQrSiteSettingsService.getOrCreateBySite(compId, effectiveSiteId),
    enabled: !!compId && !!effectiveSiteId,
  });

  useEffect(() => {
    if (settings) {
      setForm({
        lastModifiedBy: userName,
        qrOrderMode: settings.qrOrderMode,
        misuseMode: settings.misuseMode,
        allowGuestOrdering: settings.allowGuestOrdering,
        askCustomerName: settings.askCustomerName,
        askMobileNumber: settings.askMobileNumber,
        allowCallWaiter: settings.allowCallWaiter,
        allowRequestWater: settings.allowRequestWater,
        allowRequestBill: settings.allowRequestBill,
        allowCoupon: settings.allowCoupon,
        allowPromotion: settings.allowPromotion,
        allowOrderTracking: settings.allowOrderTracking,
      });
    }
  }, [settings, userName]);

  const saveMutation = useMutation({
    mutationFn: () => restaurantQrSiteSettingsService.update(compId, effectiveSiteId, { ...form!, lastModifiedBy: userName }),
    onSuccess: () => {
      toast({ title: tc("saveSuccess") });
      queryClient.invalidateQueries({ queryKey: ["qr-site-settings", compId, effectiveSiteId] });
    },
    onError: (err) => toast({ title: apiErrorMessage(err, tc("errorGeneric")), variant: "destructive" }),
  });

  return (
    <div className="flex h-full flex-col gap-4">
      <PageHeader
        title={t("settingsTitle")}
        description={t("settingsDescription")}
        actions={
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
        }
      />

      {form && (
        <div className="max-w-lg space-y-6">
          <div className="space-y-2">
            <Label>{t("qrOrderMode")}</Label>
            <Select value={form.qrOrderMode} onValueChange={(v) => setForm({ ...form, qrOrderMode: v as QrOrderMode })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="DIRECT_KOT">{t("directKot")}</SelectItem>
                <SelectItem value="WAITER_APPROVAL">{t("waiterApproval")}</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">{t("qrOrderModeHint")}</p>
          </div>

          <div className="space-y-2">
            <Label>{t("misuseMode")}</Label>
            <Select value={form.misuseMode} onValueChange={(v) => setForm({ ...form, misuseMode: v as QrMisuseMode })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="SIMPLE">{t("misuseSimple")}</SelectItem>
                <SelectItem value="ACTIVE_TABLE">{t("misuseActiveTable")}</SelectItem>
                <SelectItem value="PIN">{t("misusePin")}</SelectItem>
                <SelectItem value="WAITER_APPROVAL_FIRST">{t("misuseWaiterApprovalFirst")}</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">{t("misuseModeHint")}</p>
          </div>

          <div className="space-y-3 border-t pt-4">
            {BOOLEAN_FIELDS.map(({ key, labelKey }) => (
              <div key={key} className="flex items-center justify-between">
                <Label htmlFor={key}>{t(labelKey)}</Label>
                <Switch
                  id={key}
                  checked={form[key] as boolean}
                  onCheckedChange={(checked) => setForm({ ...form, [key]: checked })}
                />
              </div>
            ))}
          </div>

          <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
            {tc("save")}
          </Button>
        </div>
      )}
    </div>
  );
}
