"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { restaurantLookupService } from "@/lib/api/services/restaurant-lookup-service";
import { restaurantOperationsService } from "@/lib/api/services/restaurant-operations-service";
import { useAuthStore } from "@/stores/auth-store";
import { usePosSessionStore } from "@/stores/pos-session-store";
import { useRouter } from "@/i18n/navigation";
import { useSignalRHub } from "@/hooks/use-signalr-hub";
import { TableCard } from "@/components/restaurant/table-card";
import { OpenTableDialog } from "@/components/restaurant/open-table-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import type { RestaurantTableDto } from "@/types/restaurant";

const FLOOR_STATUS_KEY = "restaurant-floor-status";
// Reuses KdsHub's per-group broadcast plumbing under a pseudo kitchen-code —
// see RestaurantOperationsController.BroadcastFloorChangedAsync.
const FLOOR_PSEUDO_KITCHEN_CODE = "floor";

export function TableMap() {
  const t = useTranslations("restaurant");
  const router = useRouter();
  const queryClient = useQueryClient();
  const compId = useAuthStore((s) => s.user?.compId ?? "");
  const siteId = usePosSessionStore((s) => s.siteId ?? "");
  const [tableToOpen, setTableToOpen] = useState<RestaurantTableDto | null>(null);

  const { data: entries = [], isLoading } = useQuery({
    queryKey: [FLOOR_STATUS_KEY, compId, siteId],
    queryFn: () => restaurantOperationsService.getFloorStatus(compId, siteId),
    enabled: !!compId && !!siteId,
    refetchInterval: 15_000,
  });

  const { data: floors = [] } = useQuery({
    queryKey: ["restaurant-floors", compId, siteId],
    queryFn: () => restaurantLookupService.getFloors(compId, siteId),
    enabled: !!compId && !!siteId,
  });

  useSignalRHub(
    "/kds",
    {
      TableStatusChanged: () => queryClient.invalidateQueries({ queryKey: [FLOOR_STATUS_KEY, compId, siteId] }),
    },
    (connection) => {
      if (compId && siteId) void connection.invoke("JoinKitchen", compId, siteId, FLOOR_PSEUDO_KITCHEN_CODE);
    },
  );

  const floorNameByCode = useMemo(() => new Map(floors.map((f) => [f.code, f.floorName])), [floors]);

  const sections = useMemo(() => {
    const map = new Map<string, typeof entries>();
    for (const entry of entries) {
      const key = entry.table.floorCode || "";
      const list = map.get(key) ?? [];
      list.push(entry);
      map.set(key, list);
    }
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [entries]);

  function handleTableClick(entry: (typeof entries)[number]) {
    if (entry.table.currentStatus === "AVAILABLE") {
      setTableToOpen(entry.table);
    } else {
      router.push(`/pos/tables/${encodeURIComponent(entry.table.code)}`);
    }
  }

  if (isLoading) {
    return (
      <div className="grid grid-cols-3 gap-3 sm:grid-cols-6 lg:grid-cols-8">
        {Array.from({ length: 16 }).map((_, i) => (
          <Skeleton key={i} className="h-24 w-full" />
        ))}
      </div>
    );
  }

  if (entries.length === 0) {
    return <p className="py-10 text-center text-sm text-muted-foreground">{t("noTablesFound")}</p>;
  }

  return (
    <div className="space-y-6">
      {sections.map(([floorCode, floorEntries]) => (
        <div key={floorCode || "unassigned"}>
          <h3 className="mb-2 text-sm font-semibold text-muted-foreground">
            {t("floor")}: {floorNameByCode.get(floorCode) ?? floorCode}
          </h3>
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-6 lg:grid-cols-8">
            {floorEntries.map((entry) => (
              <TableCard key={entry.table.code} entry={entry} onClick={() => handleTableClick(entry)} />
            ))}
          </div>
        </div>
      ))}

      <OpenTableDialog table={tableToOpen} onOpenChange={(open) => !open && setTableToOpen(null)} />
    </div>
  );
}
