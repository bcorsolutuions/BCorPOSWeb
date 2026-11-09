"use client";

import { useLocale, useTranslations } from "next-intl";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { formatMoney } from "@/lib/utils";
import { useCurrencyStore } from "@/stores/currency-store";
import type { DashboardSummary } from "@/lib/api/services/dashboard-service";

export function TopProductsWidget({ products }: { products: DashboardSummary["topProducts"] }) {
  const t = useTranslations("dashboard");
  const locale = useLocale();
  const currency = useCurrencyStore((s) => s.currencyCode);

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="text-base">{t("topProducts")}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {products.map((p, idx) => (
          <div key={p.name} className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-3">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-muted text-xs font-medium">
                {idx + 1}
              </span>
              <span>{p.name}</span>
            </div>
            <div className="text-end">
              <p className="font-medium tabular-nums">{formatMoney(p.revenue, currency, locale)}</p>
              <p className="text-xs text-muted-foreground">{t("unitsSold", { count: p.qtySold })}</p>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
