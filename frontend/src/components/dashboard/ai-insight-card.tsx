"use client";

import { useLocale, useTranslations } from "next-intl";
import { useQuery } from "@tanstack/react-query";
import { Sparkles } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { dashboardInsightsService } from "@/lib/api/services/dashboard-insights-service";
import { useAuthStore } from "@/stores/auth-store";
import { useCurrencyStore } from "@/stores/currency-store";
import { formatMoney } from "@/lib/utils";

export function AiInsightCard() {
  const t = useTranslations("dashboard");
  const locale = useLocale();
  const currency = useCurrencyStore((s) => s.currencyCode);
  const compId = useAuthStore((s) => s.user?.compId ?? "");

  const { data, isLoading, isError } = useQuery({
    queryKey: ["dashboard-ai-insights", compId],
    queryFn: () => dashboardInsightsService.getInsights(compId),
    enabled: !!compId,
  });

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Sparkles className="h-4 w-4 text-primary" />
          {t("aiInsights")}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-4/5" />
          </div>
        ) : isError || !data ? (
          <p className="text-sm text-muted-foreground">{t("aiInsightsUnavailable")}</p>
        ) : (
          <div className="space-y-3">
            <p className="text-sm">{data.insight}</p>
            <div className="flex flex-wrap gap-x-6 gap-y-1 text-xs text-muted-foreground">
              <span>
                {t("todaySales")}: <span className="font-medium text-foreground">{formatMoney(data.stats.totalSales, currency, locale)}</span>
              </span>
              <span>
                {t("todayInvoices")}: <span className="font-medium text-foreground">{data.stats.transactionCount}</span>
              </span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
