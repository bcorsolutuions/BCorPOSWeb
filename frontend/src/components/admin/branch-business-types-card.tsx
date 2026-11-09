"use client";

import { useTranslations } from "next-intl";
import { useQueries, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "@/stores/auth-store";
import { posLookupService } from "@/lib/api/services/pos-lookup-service";
import { licenseService } from "@/lib/api/services/license-service";
import { siteBusinessTypeService, type SiteBusinessTypeDto } from "@/lib/api/services/site-business-type-service";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/components/ui/use-toast";

// Closes a gap discovered live: a license permitting a business type (e.g.
// SUP for a supermarket) does NOT tag any branch/site with it — that's a
// separate table (SiteBusinessType) with previously no admin UI at all,
// meaning a superadmin/reseller had to be asked to fix it via a direct API
// call every time (this happened for both SAL and SUP in the same tenant).
// This card lets a tenant admin do it themselves: one checkbox per
// (branch, licensed business type) pair.
export function BranchBusinessTypesCard() {
  const t = useTranslations("settings");
  const tc = useTranslations("common");
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const compId = user?.compId ?? "";

  const { data: sites = [] } = useQuery({
    queryKey: ["sites", compId],
    queryFn: () => posLookupService.getSites(compId),
    enabled: !!compId,
  });

  const { data: licenses } = useQuery({
    queryKey: ["license", "list", compId],
    queryFn: () => licenseService.list({ compId }),
    enabled: !!compId,
  });
  const license = licenses?.[0];

  const { data: licenseDetail } = useQuery({
    queryKey: ["license", "detail", compId, license?.code],
    queryFn: () => licenseService.get(compId, license!.code),
    enabled: !!compId && !!license?.code,
  });
  const licensedCodes = (licenseDetail?.businessTypes ?? [])
    .filter((b) => b.active)
    .map((b) => b.businessTypeCode);

  const siteBusinessTypeQueries = useQueries({
    queries: sites.map((site) => ({
      queryKey: ["site-business-types", compId, site.siteID],
      queryFn: () => siteBusinessTypeService.getForSite(compId, site.siteID),
      enabled: !!compId,
    })),
  });

  function invalidateSite(siteId: string) {
    queryClient.invalidateQueries({ queryKey: ["site-business-types", compId, siteId] });
  }

  async function toggle(siteId: string, businessTypeCode: string, rows: SiteBusinessTypeDto[], checked: boolean) {
    const existing = rows.find((r) => r.businessTypeCode === businessTypeCode);
    try {
      if (checked) {
        if (existing) {
          await siteBusinessTypeService.update(existing.id, {
            isPrimary: existing.isPrimary,
            active: true,
            lastModifiedBy: user!.userName,
          });
        } else {
          await siteBusinessTypeService.create({
            compID: compId,
            siteID: siteId,
            businessTypeCode,
            isPrimary: false,
            lastModifiedBy: user!.userName,
          });
        }
      } else if (existing) {
        await siteBusinessTypeService.remove(existing.id, user!.userName);
      }
      invalidateSite(siteId);
    } catch (err) {
      const message = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast({ title: message || tc("errorGeneric"), variant: "destructive" });
    }
  }

  if (!compId) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{t("branchBusinessTypes")}</CardTitle>
        <p className="text-sm text-muted-foreground">{t("branchBusinessTypesHint")}</p>
      </CardHeader>
      <CardContent>
        {!license ? (
          <p className="text-sm text-muted-foreground">{t("noLicenseForBusinessTypes")}</p>
        ) : licensedCodes.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("noBusinessTypesLicensed")}</p>
        ) : sites.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("noSites")}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="p-2 text-start font-medium">{tc("branch")}</th>
                  {licensedCodes.map((code) => (
                    <th key={code} className="p-2 text-center font-medium">
                      {code}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sites.map((site, idx) => {
                  const rows = siteBusinessTypeQueries[idx]?.data ?? [];
                  const activeCodes = new Set(rows.filter((r) => r.active).map((r) => r.businessTypeCode));
                  return (
                    <tr key={site.siteID} className="border-b last:border-0">
                      <td className="p-2 font-medium">{site.siteName}</td>
                      {licensedCodes.map((code) => (
                        <td key={code} className="p-2 text-center">
                          <Checkbox
                            checked={activeCodes.has(code)}
                            onCheckedChange={(checked) => toggle(site.siteID, code, rows, !!checked)}
                          />
                        </td>
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
