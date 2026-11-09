"use client";

import { useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Clock, Plus } from "lucide-react";
import { useRouter } from "@/i18n/navigation";
import { useAuthStore } from "@/stores/auth-store";
import { usePosSessionStore } from "@/stores/pos-session-store";
import { useCurrencyStore } from "@/stores/currency-store";
import { useSignalRHub } from "@/hooks/use-signalr-hub";
import { orderManagementService } from "@/lib/api/services/order-management-service";
import { restaurantLookupService } from "@/lib/api/services/restaurant-lookup-service";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatMoney } from "@/lib/utils";
import type { OrderStatus, OrderSummaryDto } from "@/types/order-management";

const STATUS_TABS: (OrderStatus | "ALL")[] = [
  "ALL", "NEW", "CONFIRMED", "IN_PREPARATION", "READY", "SERVED", "BILL_REQUESTED", "COMPLETED", "CANCELLED",
];

/** Restaurant Order Management §4/§5 — one central view of every restaurant order regardless of channel. */
export default function OrderManagementPage() {
  const t = useTranslations("orderManagement");
  const locale = useLocale();
  const router = useRouter();
  const queryClient = useQueryClient();
  const currency = useCurrencyStore((s) => s.currencyCode);
  const compId = useAuthStore((s) => s.user?.compId ?? "");
  const siteId = usePosSessionStore((s) => s.siteId ?? "");

  const [statusTab, setStatusTab] = useState<OrderStatus | "ALL">("ALL");
  const [search, setSearch] = useState("");
  const [sourceFilter, setSourceFilter] = useState<string | null>(null);

  const ordersKey = ["order-management-orders", compId, siteId, statusTab, sourceFilter, search];
  const { data: page, isLoading } = useQuery({
    queryKey: ordersKey,
    queryFn: () =>
      orderManagementService.getOrders(compId, siteId, {
        status: statusTab === "ALL" ? null : statusTab,
        source: sourceFilter,
        search: search || null,
        take: 100,
      }),
    enabled: !!compId && !!siteId,
    refetchInterval: 15_000,
  });
  const { data: dashboard } = useQuery({
    queryKey: ["order-management-dashboard", compId, siteId],
    queryFn: () => orderManagementService.getDashboard(compId, siteId),
    enabled: !!compId && !!siteId,
    refetchInterval: 15_000,
  });
  const { data: kitchens = [] } = useQuery({
    queryKey: ["kitchens", compId, siteId],
    queryFn: () => restaurantLookupService.getKitchens(compId, siteId),
    enabled: !!compId && !!siteId,
  });

  const orders = page?.items ?? [];
  const stationCodes = useMemo(() => kitchens.map((k) => k.code), [kitchens]);
  useSignalRHub(
    "/kds",
    {
      TableStatusChanged: () => queryClient.invalidateQueries({ queryKey: ["order-management-orders"] }),
      KotStatusChanged: () => {
        queryClient.invalidateQueries({ queryKey: ["order-management-orders"] });
        queryClient.invalidateQueries({ queryKey: ["order-management-dashboard"] });
      },
      KotCreated: () => queryClient.invalidateQueries({ queryKey: ["order-management-orders"] }),
    },
    (connection) => {
      if (!compId || !siteId) return;
      void connection.invoke("JoinKitchen", compId, siteId, "floor").catch(() => {});
      for (const code of stationCodes) void connection.invoke("JoinKitchen", compId, siteId, code).catch(() => {});
    },
  );

  return (
    <div className="flex h-full flex-col gap-3 overflow-hidden p-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">{t("title")}</h1>
        <Button onClick={() => router.push("/pos/orders/new" as never)}>
          <Plus className="me-2 h-4 w-4" />
          {t("newOrder")}
        </Button>
      </div>

      {dashboard && (
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
          {[
            { label: t("activeOrders"), value: dashboard.activeOrders },
            { label: t("status_NEW"), value: dashboard.new },
            { label: t("status_IN_PREPARATION"), value: dashboard.preparing },
            { label: t("status_READY"), value: dashboard.ready },
            { label: t("status_BILL_REQUESTED"), value: dashboard.billRequested },
            { label: t("delayed"), value: dashboard.delayed },
          ].map((tile) => (
            <Card key={tile.label} className="p-2 text-center">
              <p className="text-lg font-bold">{tile.value}</p>
              <p className="text-xs text-muted-foreground">{tile.label}</p>
            </Card>
          ))}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        {STATUS_TABS.map((s) => (
          <Button key={s} size="sm" variant={statusTab === s ? "default" : "outline"} onClick={() => setStatusTab(s)}>
            {s === "ALL" ? t("all") : t(`status_${s}` as never)}
          </Button>
        ))}
        <Input className="ms-auto max-w-xs" placeholder={t("searchPlaceholder")} value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      <div className="grid flex-1 auto-rows-min grid-cols-1 gap-3 overflow-y-auto sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {isLoading && <p className="col-span-full text-center text-sm text-muted-foreground">{t("loading")}</p>}
        {!isLoading && orders.length === 0 && <p className="col-span-full py-10 text-center text-sm text-muted-foreground">{t("noOrders")}</p>}
        {orders.map((o) => (
          <OrderCard key={o.docNo} order={o} currency={currency} locale={locale} t={t} onView={() => router.push(`/pos/orders/${o.docNo}` as never)} />
        ))}
      </div>
    </div>
  );
}

function OrderCard({
  order, currency, locale, t, onView,
}: {
  order: OrderSummaryDto;
  currency: string;
  locale: string;
  t: ReturnType<typeof useTranslations>;
  onView: () => void;
}) {
  return (
    <Card className="flex flex-col gap-2 p-3">
      <div className="flex items-start justify-between">
        <div>
          <p className="font-semibold">
            {t("order")} #{order.docNo}
          </p>
          <p className="text-xs text-muted-foreground">
            {order.tableCode ? `${t("table")} ${order.tableName ?? order.tableCode}` : order.tabCode ? `${t("tab")} ${order.tabCode}` : t("counter")}
          </p>
        </div>
        {order.delayed && (
          <Badge variant="destructive" className="text-xs">
            {t("delayedMinutes", { minutes: order.delayedMinutes ?? 0 })}
          </Badge>
        )}
      </div>

      <div className="space-y-0.5 text-xs text-muted-foreground">
        {order.waiterName && <p>{t("waiter", { name: order.waiterName })}</p>}
        <p>{t("source", { source: order.orderSource })}</p>
        {order.orderTime && (
          <p className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {new Date(order.orderTime).toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" })}
          </p>
        )}
      </div>

      <div className="flex items-center justify-between text-sm">
        <span>{t("items", { count: order.itemCount })}</span>
        <span className="font-semibold tabular-nums">{formatMoney(order.amount, currency, locale)}</span>
      </div>

      <Badge className="w-fit">{t(`status_${order.status}` as never)}</Badge>

      {Object.keys(order.stationBreakdown).length > 0 && (
        <div className="space-y-0.5 border-t pt-1 text-xs">
          {Object.entries(order.stationBreakdown).map(([station, byStatus]) => (
            <div key={station} className="flex justify-between text-muted-foreground">
              <span>{station}</span>
              <span>{Object.entries(byStatus).map(([st, count]) => `${count} ${st}`).join(", ")}</span>
            </div>
          ))}
        </div>
      )}

      <Button size="sm" variant="outline" className="mt-1 w-full" onClick={onView}>
        {t("view")}
      </Button>
    </Card>
  );
}
