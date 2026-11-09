"use client";

import { useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { useQuery } from "@tanstack/react-query";
import { Lock } from "lucide-react";
import { cn } from "@/lib/utils";
import { useRouter } from "@/i18n/navigation";
import { useAuthStore } from "@/stores/auth-store";
import { usePosSessionStore } from "@/stores/pos-session-store";
import { usePermission } from "@/hooks/use-permission";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { useToast } from "@/components/ui/use-toast";
import { restaurantOperationsService } from "@/lib/api/services/restaurant-operations-service";
import { waiterMobileService } from "@/lib/api/services/waiter-mobile-service";
import { MobileHeader } from "@/components/mobile/mobile-header";
import { Button } from "@/components/ui/button";
import { OpenTableDialog } from "@/components/restaurant/open-table-dialog";
import type { RestaurantTableDto } from "@/types/restaurant";

type Filter = "all" | "free" | "mine";

/** Waiter Mobile Ordering §6 — floor selector + table grid, reusing the exact floor-status query the desktop table map uses. */
export default function MobileTablesPage() {
  const t = useTranslations("mobileWaiter");
  const router = useRouter();
  const { toast } = useToast();
  const { can } = usePermission();
  const compId = useAuthStore((s) => s.user?.compId ?? "");
  const userName = useAuthStore((s) => s.user?.userName ?? "");
  const siteId = usePosSessionStore((s) => s.siteId ?? "");
  const [activeFloor, setActiveFloor] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>("all");
  const [openingTable, setOpeningTable] = useState<RestaurantTableDto | null>(null);

  // The dashboard's "Open a table" button arrives here as ?filter=free.
  useEffect(() => {
    const f = new URLSearchParams(window.location.search).get("filter");
    if (f === "free" || f === "mine" || f === "all") setFilter(f);
  }, []);

  const { data: floorStatus = [], isLoading } = useQuery({
    queryKey: ["restaurant-floor-status", compId, siteId],
    queryFn: () => restaurantOperationsService.getFloorStatus(compId, siteId),
    enabled: !!compId && !!siteId,
    refetchInterval: 15_000,
  });
  const { data: profile } = useQuery({
    queryKey: ["waiter-mobile-profile", compId, siteId, userName],
    queryFn: () => waiterMobileService.getMyProfile(compId, siteId, userName),
    enabled: !!compId && !!siteId && !!userName,
    retry: false,
  });
  // "Mine" = this waiter's own open order is on the table.
  const { data: myTables = [] } = useQuery({
    queryKey: ["waiter-mobile-my-tables", compId, siteId, userName],
    queryFn: () => waiterMobileService.getMyTables(compId, siteId, userName),
    enabled: !!compId && !!siteId && !!userName,
    refetchInterval: 15_000,
  });
  const myTableCodes = useMemo(() => new Set(myTables.map((m) => m.tableCode)), [myTables]);

  const floors = useMemo(() => {
    const codes = Array.from(new Set(floorStatus.map((e) => e.table.floorCode)));
    return codes.sort();
  }, [floorStatus]);

  function statusOf(entry: (typeof floorStatus)[number]) {
    if (entry.heldBillDocNo != null) return "bill" as const;
    if (entry.table.currentStatus === "OCCUPIED" || entry.openKotDocNo != null) return "occupied" as const;
    return entry.table.currentStatus.toLowerCase() as "available" | "reserved" | "dirty";
  }

  const visible = floorStatus
    .filter((e) => !activeFloor || e.table.floorCode === activeFloor)
    .filter((e) => {
      if (filter === "free") return statusOf(e) === "available";
      if (filter === "mine") return myTableCodes.has(e.table.code);
      return true;
    });

  function handleTap(entry: (typeof floorStatus)[number]) {
    const status = statusOf(entry);
    if (status === "available") {
      if (!can(PERMISSIONS.WAITER_MOBILE_OPEN_TABLE) || profile?.allowWaiterOpenTable === false) return;
      setOpeningTable(entry.table);
      return;
    }
    if (
      status === "occupied" &&
      profile?.allowWaiterViewOtherTables === false &&
      !myTableCodes.has(entry.table.code)
    ) {
      toast({ title: t("notYourTable") });
      return;
    }
    router.push(`/mobile/tables/${encodeURIComponent(entry.table.code)}` as never);
  }

  const filters: { key: Filter; label: string }[] = [
    { key: "all", label: t("filterAll") },
    { key: "free", label: t("filterFree") },
    { key: "mine", label: t("filterMine") },
  ];

  return (
    <div className="flex flex-1 flex-col">
      <MobileHeader title={t("tables")} onBack={() => router.push("/mobile" as never)} />

      <div className="flex gap-2 border-b p-2">
        {filters.map((f) => (
          <Button
            key={f.key}
            size="sm"
            className="h-9 flex-1"
            variant={filter === f.key ? "default" : "outline"}
            onClick={() => setFilter(f.key)}
          >
            {f.label}
          </Button>
        ))}
      </div>

      {floors.length > 1 && (
        <div className="flex gap-2 overflow-x-auto border-b p-2">
          <Button size="sm" className="shrink-0" variant={activeFloor === null ? "secondary" : "ghost"} onClick={() => setActiveFloor(null)}>
            {t("allFloors")}
          </Button>
          {floors.map((f) => (
            <Button
              key={f}
              size="sm"
              className="shrink-0"
              variant={activeFloor === f ? "secondary" : "ghost"}
              onClick={() => setActiveFloor(f)}
            >
              {f}
            </Button>
          ))}
        </div>
      )}

      <div className="grid flex-1 auto-rows-min grid-cols-3 gap-2 overflow-y-auto p-3">
        {isLoading && <p className="col-span-full text-center text-sm text-muted-foreground">{t("loading")}</p>}
        {visible.map((entry) => {
          const status = statusOf(entry);
          const mine = myTableCodes.has(entry.table.code);
          const others = status === "occupied" && !mine;
          return (
            <button
              key={entry.table.code}
              onClick={() => handleTap(entry)}
              className={cn(
                "relative flex h-20 flex-col items-center justify-center gap-1 rounded-lg border text-xs font-medium transition-transform active:scale-95",
                status === "available" && "border-green-300 bg-green-50 text-green-800",
                status === "occupied" && mine && "border-primary bg-primary/10 text-primary ring-1 ring-primary",
                others && "border-muted bg-muted/40 text-muted-foreground",
                status === "bill" && "border-amber-300 bg-amber-50 text-amber-800",
                (status === "reserved" || status === "dirty") && "border-muted bg-muted/40 text-muted-foreground",
              )}
            >
              {others && profile?.allowWaiterViewOtherTables === false && <Lock className="absolute end-1.5 top-1.5 h-3 w-3 opacity-60" />}
              <span className="text-sm font-semibold">{entry.table.tableName}</span>
              <span>{mine ? t("statusMine") : t(`status_${status}` as never)}</span>
            </button>
          );
        })}
        {!isLoading && visible.length === 0 && (
          <p className="col-span-full py-10 text-center text-sm text-muted-foreground">
            {filter === "mine" ? t("noMyTables") : filter === "free" ? t("noFreeTables") : t("noTables")}
          </p>
        )}
      </div>

      <OpenTableDialog
        table={openingTable}
        onOpenChange={(open) => !open && setOpeningTable(null)}
        redirectBasePath="/mobile/tables"
        defaultWaiterCode={profile?.waiterCode}
        defaultCaptainCode={profile?.captainCode}
        orderSource="WAITER_MOBILE"
        compact
      />
    </div>
  );
}
