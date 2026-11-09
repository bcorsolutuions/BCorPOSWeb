"use client";

import { useLocale, useTranslations } from "next-intl";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatMoney } from "@/lib/utils";
import { useCurrencyStore } from "@/stores/currency-store";
import type { DashboardSummary } from "@/lib/api/services/dashboard-service";

export function BranchStatusWidget({ branches }: { branches: DashboardSummary["branchStatus"] }) {
  const t = useTranslations("dashboard");
  const locale = useLocale();
  const currency = useCurrencyStore((s) => s.currencyCode);

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="text-base">{t("branchStatus")}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {branches.map((b) => (
          <div key={b.branchName} className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <span className={`h-2 w-2 rounded-full ${b.isOnline ? "bg-success" : "bg-destructive"}`} />
              <span>{b.branchName}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="tabular-nums">{formatMoney(b.salesTotal, currency, locale)}</span>
              <Badge variant={b.isOnline ? "success" : "destructive"}>{b.isOnline ? t("online") : t("offline")}</Badge>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
