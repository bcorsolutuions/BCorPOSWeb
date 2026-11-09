"use client";

import { useLocale, useTranslations } from "next-intl";
import { useQuery } from "@tanstack/react-query";
import { Banknote, Hourglass, Receipt, Wallet } from "lucide-react";
import { dashboardTodayService, type TodayBillStatus } from "@/lib/api/services/dashboard-today-service";
import { useAuthStore } from "@/stores/auth-store";
import { useCurrencyStore } from "@/stores/currency-store";
import { StatCard } from "@/components/shared/stat-card";
import { Badge, type BadgeProps } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatMoney } from "@/lib/utils";

const STATUS_VARIANT: Record<TodayBillStatus, BadgeProps["variant"]> = {
  Completed: "success",
  InService: "warning",
  ServiceDone: "default",
  Held: "secondary",
  Returned: "outline",
  Voided: "destructive",
};

// Today's order status, bills and collections — refreshed every 30 s so the cashier can leave it open.
export function TodayPanel() {
  const t = useTranslations("dashboard.today");
  const locale = useLocale();
  const compId = useAuthStore((s) => s.user?.compId ?? "");
  const currency = useCurrencyStore((s) => s.currencyCode);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["dashboard-today", compId],
    queryFn: () => dashboardTodayService.get(compId),
    enabled: !!compId,
    refetchInterval: 30_000,
  });

  const money = (n: number) => formatMoney(n, currency, locale);
  const time = (iso: string) =>
    new Intl.DateTimeFormat(locale, { hour: "2-digit", minute: "2-digit" }).format(new Date(iso));

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-28 w-full" />
        ))}
      </div>
    );
  }
  if (isError) {
    return <p className="text-sm text-muted-foreground">{t("unavailable")}</p>;
  }
  // Salon-only panel — a restaurant / retail company has nothing to show here.
  if (!data || !data.isSalon) return null;

  const { summary, orderStatus, collections, bills } = data;

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">{t(data.scope === "mine" ? "scopeMine" : "scopeAll")}</p>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label={t("bills")} value={String(summary.billCount)} icon={Receipt} />
        <StatCard label={t("sales")} value={money(summary.salesTotal)} icon={Banknote} />
        <StatCard label={t("collected")} value={money(collections.net)} icon={Wallet} />
        <StatCard
          label={t("pending", { count: summary.pendingCount })}
          value={money(summary.pendingAmount)}
          icon={Hourglass}
          tone={summary.pendingCount > 0 ? "warning" : "default"}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("orderStatus")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {orderStatus.map((s) => (
              <div key={s.status} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <Badge variant={STATUS_VARIANT[s.status]}>{t(`status.${s.status}`)}</Badge>
                  <span className="tabular-nums text-muted-foreground">{s.count}</span>
                </div>
                <span className="font-medium tabular-nums">{money(s.amount)}</span>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("collections")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {collections.byMode.length === 0 && <p className="text-sm text-muted-foreground">{t("noCollections")}</p>}
            {collections.byMode.map((m) => (
              <div key={m.mode} className="flex items-center justify-between text-sm">
                <span>
                  {m.mode} <span className="text-muted-foreground tabular-nums">× {m.count}</span>
                </span>
                <span className="font-medium tabular-nums">{money(m.amount)}</span>
              </div>
            ))}
            {collections.refunds > 0 && (
              <div className="flex items-center justify-between text-sm text-destructive">
                <span>{t("refunds")}</span>
                <span className="font-medium tabular-nums">− {money(collections.refunds)}</span>
              </div>
            )}
            <div className="flex items-center justify-between border-t pt-2 text-sm font-semibold">
              <span>{t("totalCollected")}</span>
              <span className="tabular-nums">{money(collections.net)}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("todaysBills")}</CardTitle>
        </CardHeader>
        <CardContent>
          {bills.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("noBills")}</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("colBill")}</TableHead>
                  <TableHead>{t("colTime")}</TableHead>
                  <TableHead>{t("colCustomer")}</TableHead>
                  <TableHead>{t("colTerminal")}</TableHead>
                  <TableHead>{t("colStatus")}</TableHead>
                  <TableHead className="text-end">{t("colTotal")}</TableHead>
                  <TableHead className="text-end">{t("colPaid")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {bills.map((b) => (
                  <TableRow key={`${b.siteId}-${b.docNo}`}>
                    <TableCell className="tabular-nums">{b.docNo}</TableCell>
                    <TableCell className="tabular-nums">{time(b.time)}</TableCell>
                    <TableCell>{b.customer || t("walkIn")}</TableCell>
                    <TableCell>{b.terminalId}</TableCell>
                    <TableCell>
                      <Badge variant={STATUS_VARIANT[b.status]}>{t(`status.${b.status}`)}</Badge>
                    </TableCell>
                    <TableCell className="text-end tabular-nums">{money(b.netTotal)}</TableCell>
                    <TableCell className="text-end tabular-nums">{money(b.paidAmount)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
