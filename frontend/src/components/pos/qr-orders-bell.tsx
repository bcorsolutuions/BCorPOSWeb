"use client";

import { useEffect, useRef } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BellRing, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { useToast } from "@/components/ui/use-toast";
import { useSignalRHub } from "@/hooks/use-signalr-hub";
import { usePermission } from "@/hooks/use-permission";
import { useAuthStore } from "@/stores/auth-store";
import { usePosSessionStore } from "@/stores/pos-session-store";
import { useCurrencyStore } from "@/stores/currency-store";
import { qrOrderManagementService } from "@/lib/api/services/qr-order-management-service";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { formatDateTime, formatMoney } from "@/lib/utils";
import type { QROrderHdrDto } from "@/types/qr-order";

const REQUEST_LABEL_KEY = {
  CALL_WAITER: "callWaiter",
  WATER: "water",
  REQUEST_BILL: "requestBill",
  OTHER: "other",
} as const;

// Pseudo kitchen-codes on KdsHub — same reuse-the-hub-with-a-group precedent
// as the floor map's "floor" group (see QrOrderService/QrMenuController).
const QR_GROUPS = ["qr-orders", "service-requests"];

/**
 * POS topbar bell for QR Table Ordering (§13/§18): held self-orders with
 * Accept/Reject, plus waiter/water/bill requests with Acknowledge/Done.
 * Live via SignalR, with a slow poll as the fallback if the socket drops.
 */
export function QrOrdersBell() {
  const t = useTranslations("qrOrders");
  const tc = useTranslations("common");
  const locale = useLocale();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { can } = usePermission();
  const compId = useAuthStore((s) => s.user?.compId ?? "");
  const siteId = usePosSessionStore((s) => s.siteId ?? "");
  const currency = useCurrencyStore((s) => s.currencyCode);
  const enabled = can(PERMISSIONS.QR_TABLE_ORDERING_SERVICE) && !!compId && !!siteId;

  const ordersKey = ["qr-pending-orders", compId, siteId];
  const requestsKey = ["qr-service-requests", compId, siteId];

  const { data: ordersData } = useQuery({
    queryKey: ordersKey,
    queryFn: () => qrOrderManagementService.getPending(compId, siteId),
    enabled,
    refetchInterval: 30_000,
    retry: false,
  });
  const { data: requestsData } = useQuery({
    queryKey: requestsKey,
    queryFn: () => qrOrderManagementService.getServiceRequests(compId, siteId),
    enabled,
    refetchInterval: 30_000,
    retry: false,
  });

  const orders = ordersData ?? [];
  const requests = requestsData ?? [];

  // Toast only when the count goes UP after the first load — never on the
  // initial fetch or when staff clear items themselves.
  const prevOrders = useRef<number | null>(null);
  const prevRequests = useRef<number | null>(null);
  useEffect(() => {
    if (!ordersData) return;
    if (prevOrders.current !== null && ordersData.length > prevOrders.current) toast({ title: t("newOrderToast") });
    prevOrders.current = ordersData.length;
  }, [ordersData, toast, t]);
  useEffect(() => {
    if (!requestsData) return;
    if (prevRequests.current !== null && requestsData.length > prevRequests.current) toast({ title: t("newRequestToast") });
    prevRequests.current = requestsData.length;
  }, [requestsData, toast, t]);

  useSignalRHub(
    "/kds",
    {
      QrOrdersChanged: () => queryClient.invalidateQueries({ queryKey: ordersKey }),
      ServiceRequested: () => queryClient.invalidateQueries({ queryKey: requestsKey }),
    },
    (connection) => {
      if (!enabled) return;
      for (const g of QR_GROUPS) void connection.invoke("JoinKitchen", compId, siteId, g).catch(() => {});
    },
  );

  const onError = (err: unknown) => {
    const message = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
    toast({ title: message || tc("errorGeneric"), variant: "destructive" });
  };

  const acceptMutation = useMutation({
    mutationFn: (docNo: number) => qrOrderManagementService.accept(compId, siteId, docNo),
    onSuccess: (o) => {
      toast({ title: t("accepted", { kot: o.kotDocNo ?? "-" }) });
      queryClient.invalidateQueries({ queryKey: ordersKey });
    },
    onError,
  });
  const rejectMutation = useMutation({
    mutationFn: (docNo: number) => qrOrderManagementService.reject(compId, siteId, docNo),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ordersKey }),
    onError,
  });
  const requestMutation = useMutation({
    mutationFn: (v: { id: string; status: "ACKNOWLEDGED" | "COMPLETED" }) =>
      qrOrderManagementService.updateServiceRequestStatus(compId, siteId, v.id, v.status),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: requestsKey }),
    onError,
  });

  if (!enabled) return null;

  const total = orders.length + requests.length;
  const busy = acceptMutation.isPending || rejectMutation.isPending;
  const orderTotal = (o: QROrderHdrDto) => o.details.reduce((s, d) => s + d.netAmount, 0);

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm" className="relative" aria-label={t("title")}>
          <BellRing className="h-4 w-4" />
          {total > 0 && (
            <Badge variant="destructive" className="absolute -end-2 -top-2 h-5 min-w-5 justify-center px-1">
              {total}
            </Badge>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent side="end" className="w-full overflow-y-auto sm:max-w-md">
        <SheetHeader>
          <SheetTitle>{t("title")}</SheetTitle>
        </SheetHeader>

        <div className="mt-4 space-y-6">
          <section className="space-y-2">
            <h3 className="text-sm font-semibold">{t("ordersHeading", { count: orders.length })}</h3>
            {orders.length === 0 && <p className="text-sm text-muted-foreground">{t("noOrders")}</p>}
            {orders.map((o) => (
              <div key={o.docNo} className="space-y-2 rounded-md border p-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">
                    {t("table")} {o.tableCode}
                  </span>
                  <span className="text-xs text-muted-foreground">{formatDateTime(o.createdOn, locale)}</span>
                </div>
                {o.customerName && <p className="text-xs text-muted-foreground">{o.customerName}</p>}
                <ul className="space-y-0.5 text-sm">
                  {o.details.map((d) => (
                    <li key={d.rowID} className="flex justify-between gap-2">
                      <span className="min-w-0 truncate">
                        {d.qty} × {(locale === "ar" && d.menuNameArb) || d.menuName || d.menuCode}
                        {d.specialInstructions && (
                          <span className="block truncate text-xs italic text-muted-foreground">{d.specialInstructions}</span>
                        )}
                      </span>
                      <span className="tabular-nums">{formatMoney(d.netAmount, currency, locale)}</span>
                    </li>
                  ))}
                </ul>
                <div className="flex items-center justify-between border-t pt-2">
                  <span className="text-sm font-semibold">{formatMoney(orderTotal(o), currency, locale)}</span>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" disabled={busy} onClick={() => rejectMutation.mutate(o.docNo)}>
                      <X className="me-1 h-4 w-4" />
                      {t("reject")}
                    </Button>
                    <Button size="sm" disabled={busy} onClick={() => acceptMutation.mutate(o.docNo)}>
                      <Check className="me-1 h-4 w-4" />
                      {t("accept")}
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </section>

          <section className="space-y-2">
            <h3 className="text-sm font-semibold">{t("requestsHeading", { count: requests.length })}</h3>
            {requests.length === 0 && <p className="text-sm text-muted-foreground">{t("noRequests")}</p>}
            {requests.map((r) => (
              <div key={r.id} className="flex items-center justify-between gap-2 rounded-md border p-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium">
                    {t("table")} {r.tableCode} — {t(REQUEST_LABEL_KEY[r.requestType])}
                  </p>
                  <p className="text-xs text-muted-foreground">{formatDateTime(r.requestedOn, locale)}</p>
                </div>
                <div className="flex shrink-0 gap-2">
                  {r.status === "NEW" && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => requestMutation.mutate({ id: r.id, status: "ACKNOWLEDGED" })}
                    >
                      {t("acknowledge")}
                    </Button>
                  )}
                  <Button size="sm" onClick={() => requestMutation.mutate({ id: r.id, status: "COMPLETED" })}>
                    {t("done")}
                  </Button>
                </div>
              </div>
            ))}
          </section>
        </div>
      </SheetContent>
    </Sheet>
  );
}
