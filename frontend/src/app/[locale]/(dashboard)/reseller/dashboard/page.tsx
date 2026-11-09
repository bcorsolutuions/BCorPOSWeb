"use client";

import { useTranslations } from "next-intl";
import { useQuery } from "@tanstack/react-query";
import { KeyRound, CheckCircle2, AlertTriangle, XCircle, Ban } from "lucide-react";
import { licenseService } from "@/lib/api/services/license-service";
import { useAuthStore } from "@/stores/auth-store";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { Skeleton } from "@/components/ui/skeleton";

export default function ResellerDashboardPage() {
  const t = useTranslations("reseller");
  const resellerCode = useAuthStore((s) => s.user?.resellerCode) ?? undefined;

  const { data, isLoading } = useQuery({
    queryKey: ["reseller-dashboard-stats", resellerCode],
    queryFn: () => licenseService.dashboardStats({ resellerCode }),
  });

  return (
    <div className="space-y-6">
      <PageHeader title={t("dashboardTitle")} />

      {isLoading || !data ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-28 w-full" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <StatCard label={t("totalLicenses")} value={String(data.totalLicenses)} icon={KeyRound} />
          <StatCard label={t("activeLicenses")} value={String(data.activeCount)} icon={CheckCircle2} />
          <StatCard
            label={t("expiringSoon")}
            value={String(data.expiringSoonCount)}
            icon={AlertTriangle}
            tone={data.expiringSoonCount > 0 ? "warning" : "default"}
          />
          <StatCard
            label={t("suspendedLicenses")}
            value={String(data.suspendedCount)}
            icon={Ban}
            tone={data.suspendedCount > 0 ? "destructive" : "default"}
          />
          <StatCard
            label={t("expiredLicenses")}
            value={String(data.expiredCount)}
            icon={XCircle}
            tone={data.expiredCount > 0 ? "destructive" : "default"}
          />
        </div>
      )}
    </div>
  );
}
