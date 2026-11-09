"use client";

import { useTranslations } from "next-intl";
import { useQueries, useQuery } from "@tanstack/react-query";
import { CheckCircle2, Circle, Flame } from "lucide-react";
import { useRouter } from "@/i18n/navigation";
import { useAuthStore } from "@/stores/auth-store";
import { usePosSessionStore } from "@/stores/pos-session-store";
import { waiterMobileService } from "@/lib/api/services/waiter-mobile-service";
import { kotService } from "@/lib/api/services/kot-service";
import { MobileHeader } from "@/components/mobile/mobile-header";
import { cn } from "@/lib/utils";
import type { KotItemStatus } from "@/types/restaurant";

const STATUS_ICON: Record<KotItemStatus, typeof Circle> = {
  OPEN: Circle,
  PREPARING: Flame,
  READY: CheckCircle2,
  SERVED: CheckCircle2,
  CANCELLED: Circle,
};

/** Waiter Mobile Ordering §24/§26 — item-by-item kitchen status across every table this waiter owns, reusing the same KOTDetails.ItemStatus the desktop KDS renders from. */
export default function KitchenStatusPage() {
  const t = useTranslations("mobileWaiter");
  const router = useRouter();
  const compId = useAuthStore((s) => s.user?.compId ?? "");
  const userName = useAuthStore((s) => s.user?.userName ?? "");
  const siteId = usePosSessionStore((s) => s.siteId ?? "");

  const { data: tables = [] } = useQuery({
    queryKey: ["waiter-mobile-my-tables", compId, siteId, userName],
    queryFn: () => waiterMobileService.getMyTables(compId, siteId, userName),
    enabled: !!compId && !!siteId && !!userName,
    refetchInterval: 15_000,
  });

  const kotQueries = useQueries({
    queries: tables.map((tbl) => ({
      queryKey: ["kot", compId, siteId, tbl.openKotDocNo],
      queryFn: () => kotService.get(compId, siteId, tbl.openKotDocNo),
      enabled: !!compId && !!siteId,
      refetchInterval: 15_000,
    })),
  });

  const hasAny = kotQueries.some((q) => (q.data?.details.filter((d) => !d.cancelled).length ?? 0) > 0);

  return (
    <div className="flex flex-1 flex-col">
      <MobileHeader title={t("kitchenStatus")} onBack={() => router.push("/mobile" as never)} />
      <div className="flex-1 space-y-4 overflow-y-auto p-3">
        {!hasAny && <p className="text-center text-sm text-muted-foreground">{t("noActiveOrders")}</p>}
        {kotQueries.map((q, idx) => {
          const kot = q.data;
          if (!kot) return null;
          const lines = kot.details.filter((d) => !d.cancelled);
          if (lines.length === 0) return null;
          return (
            <div key={kot.docNo} className="rounded-lg border p-3">
              <p className="mb-2 text-sm font-semibold">{tables[idx]?.tableName ?? tables[idx]?.tableCode}</p>
              <div className="space-y-1.5">
                {lines.map((line) => {
                  const Icon = STATUS_ICON[line.itemStatus] ?? Circle;
                  return (
                    <div key={line.id} className="flex items-center justify-between text-sm">
                      <span className="truncate">
                        {line.qty} × {line.menuName ?? line.menuCode}
                      </span>
                      <span
                        className={cn(
                          "flex items-center gap-1 text-xs font-medium",
                          line.itemStatus === "READY" && "text-green-600",
                          line.itemStatus === "PREPARING" && "text-amber-600",
                          line.itemStatus === "SERVED" && "text-muted-foreground",
                        )}
                      >
                        <Icon className="h-3.5 w-3.5" />
                        {t(`itemStatus_${line.itemStatus}` as never)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
