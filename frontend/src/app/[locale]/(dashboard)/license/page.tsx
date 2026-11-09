"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Copy, Check, ShieldCheck } from "lucide-react";
import { licenseService } from "@/lib/api/services/license-service";
import { useAuthStore } from "@/stores/auth-store";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/use-toast";
import { apiErrorMessage } from "@/lib/api-error";
import { formatDate, formatDateTime } from "@/lib/utils";
import { getOrCreateDeviceId } from "@/lib/license-device-id";
import type { LicenseStatusCode } from "@/types/license";

const statusVariant: Record<LicenseStatusCode, "success" | "warning" | "destructive" | "secondary"> = {
  ACTIVE: "success",
  INACTIVE: "secondary",
  SUSPENDED: "destructive",
  EXPIRED: "destructive",
};

export default function LicenseManagementPage() {
  const t = useTranslations("license");
  const tc = useTranslations("common");
  const locale = useLocale();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const compId = useAuthStore((s) => s.user?.compId) ?? "";
  const [copied, setCopied] = useState(false);

  const { data: licenses, isLoading } = useQuery({
    queryKey: ["license", "list", compId],
    queryFn: () => licenseService.list({ compId }),
    enabled: !!compId,
  });
  const license = licenses?.[0];

  const { data: detail } = useQuery({
    queryKey: ["license", "detail", compId, license?.code],
    queryFn: () => licenseService.get(compId, license!.code),
    enabled: !!compId && !!license?.code,
  });

  const { data: activations } = useQuery({
    queryKey: ["license", "activations", compId, license?.code],
    queryFn: () => licenseService.activations(compId, license!.code),
    enabled: !!compId && !!license?.code,
  });

  const { data: history } = useQuery({
    queryKey: ["license", "history", compId, license?.code],
    queryFn: () => licenseService.history(compId, license!.code),
    enabled: !!compId && !!license?.code,
  });

  const activateMutation = useMutation({
    mutationFn: () =>
      licenseService.activate(compId, license!.code, {
        deviceID: getOrCreateDeviceId(),
        deviceName: navigator.platform || "Web Browser",
        operatingSystem: navigator.platform || navigator.userAgent.slice(0, 100),
        applicationVersion: "web",
      }),
    onSuccess: () => {
      toast({ title: t("activateSuccess") });
      queryClient.invalidateQueries({ queryKey: ["license", "activations", compId, license?.code] });
      queryClient.invalidateQueries({ queryKey: ["license", "history", compId, license?.code] });
    },
    onError: (err: unknown) => {
      const message = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast({ title: message || tc("errorGeneric"), variant: "destructive" });
    },
  });

  const validateMutation = useMutation({
    mutationFn: () => licenseService.validate(compId, getOrCreateDeviceId()),
    onSuccess: (result) => {
      toast({
        title: result.isValid ? t("validateSuccess") : result.message || t("validateFailed"),
        variant: result.isValid ? "default" : "destructive",
      });
      queryClient.invalidateQueries({ queryKey: ["license", "list", compId] });
    },
    onError: (err) => toast({ title: apiErrorMessage(err, tc("errorGeneric")), variant: "destructive" }),
  });

  const copyKey = async () => {
    if (!license?.licenseKey) return;
    await navigator.clipboard.writeText(license.licenseKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <PageHeader title={t("title")} />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  if (!license) {
    return (
      <div className="space-y-4">
        <PageHeader title={t("title")} />
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("noLicenseTitle")}</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">{t("noLicenseDescription")}</CardContent>
        </Card>
      </div>
    );
  }

  const daysRemaining =
    license.validTo != null
      ? Math.ceil((new Date(license.validTo).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
      : null;

  return (
    <div className="space-y-4">
      <PageHeader
        title={t("title")}
        actions={
          <Button variant="outline" size="sm" onClick={() => validateMutation.mutate()} disabled={validateMutation.isPending}>
            <ShieldCheck className="me-1 h-4 w-4" />
            {t("validateNow")}
          </Button>
        }
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between text-base">
              {t("edition")}
              <Badge variant={statusVariant[license.licenseStatus]}>{license.licenseStatus}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p className="text-2xl font-semibold">{license.editionCode ?? "-"}</p>
            <p className="text-muted-foreground">
              {t("validFrom")}: {formatDate(license.validFrom, locale)}
            </p>
            <p className="text-muted-foreground">
              {t("validTo")}: {license.validTo ? formatDate(license.validTo, locale) : "-"}
            </p>
            {daysRemaining != null && (
              <Badge variant={daysRemaining < 0 ? "destructive" : daysRemaining <= 30 ? "warning" : "secondary"}>
                {daysRemaining < 0 ? t("expired") : t("daysRemaining", { days: daysRemaining })}
              </Badge>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("limits")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            <p>
              {t("maxUsers")}: <span className="font-medium">{license.maximumUsers ?? tc("unlimited")}</span>
            </p>
            <p>
              {t("maxBranches")}: <span className="font-medium">{license.maximumSites ?? tc("unlimited")}</span>
            </p>
            <p>
              {t("maxDevices")}: <span className="font-medium">{license.maximumDevices ?? tc("unlimited")}</span>
            </p>
            <p>
              {t("offlineGraceDays")}: <span className="font-medium">{license.offlineGraceDays ?? 0}</span>
            </p>
            <p>
              {t("autoRenew")}: <span className="font-medium">{license.autoRenew ? t("yes") : t("no")}</span>
            </p>
            <p>
              {t("deviceBindingRequired")}:{" "}
              <span className="font-medium">{license.requireDeviceBinding ? t("yes") : t("no")}</span>
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("modules")}</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-1.5">
            {detail?.modules.length ? (
              detail.modules.map((m) => (
                <Badge key={m.moduleCode} variant="secondary">
                  {m.moduleCode}
                </Badge>
              ))
            ) : (
              <span className="text-sm text-muted-foreground">-</span>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("licenseKeyTitle")}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center gap-2">
          <code className="break-all rounded bg-muted px-2 py-1 text-xs">{license.licenseKey ?? "-"}</code>
          <Button variant="outline" size="sm" onClick={copyKey} disabled={!license.licenseKey}>
            {copied ? <Check className="me-1 h-4 w-4" /> : <Copy className="me-1 h-4 w-4" />}
            {copied ? t("copied") : t("copy")}
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="ms-auto"
            onClick={() => activateMutation.mutate()}
            disabled={activateMutation.isPending}
          >
            {t("activateDevice")}
          </Button>
        </CardContent>
      </Card>

      <Tabs defaultValue="devices">
        <TabsList>
          <TabsTrigger value="devices">{t("devicesTab")}</TabsTrigger>
          <TabsTrigger value="history">{t("historyTab")}</TabsTrigger>
        </TabsList>

        <TabsContent value="devices">
          <Card>
            <CardContent className="pt-4">
              {activations?.length ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t("deviceName")}</TableHead>
                      <TableHead>{t("activatedOn")}</TableHead>
                      <TableHead>{t("lastCheckedOn")}</TableHead>
                      <TableHead>{t("status")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {activations.map((a) => (
                      <TableRow key={a.id}>
                        <TableCell>
                          {a.deviceName || a.deviceID}
                          {a.isPrimaryDevice && (
                            <Badge variant="secondary" className="ms-2">
                              {t("primaryDevice")}
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>{formatDateTime(a.activationDate, locale)}</TableCell>
                        <TableCell>{a.lastValidationOn ? formatDateTime(a.lastValidationOn, locale) : "-"}</TableCell>
                        <TableCell>
                          <Badge variant={a.activationStatus === "ACTIVE" ? "success" : "secondary"}>
                            {a.activationStatus}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <p className="text-sm text-muted-foreground">{t("noDevices")}</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history">
          <Card>
            <CardContent className="pt-4">
              {history?.length ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t("event")}</TableHead>
                      <TableHead>{t("date")}</TableHead>
                      <TableHead>{t("performedBy")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {history.map((h) => (
                      <TableRow key={h.id}>
                        <TableCell>{h.eventType}</TableCell>
                        <TableCell>{formatDateTime(h.eventDate, locale)}</TableCell>
                        <TableCell>{h.performedBy}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <p className="text-sm text-muted-foreground">{t("noHistory")}</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
