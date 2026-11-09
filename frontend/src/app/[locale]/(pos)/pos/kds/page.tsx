"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { kotService } from "@/lib/api/services/kot-service";
import { restaurantLookupService } from "@/lib/api/services/restaurant-lookup-service";
import { useAuthStore } from "@/stores/auth-store";
import { usePosSessionStore } from "@/stores/pos-session-store";
import { useSignalRHub } from "@/hooks/use-signalr-hub";
import { KdsColumn } from "@/components/kds/kds-column";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { kotDtoToUpdateInput } from "@/types/restaurant";
import type { KotStatus } from "@/types/restaurant";

const KOTS_QUERY_KEY = "restaurant-kots";
const ALL_KITCHENS = "__all__";

export default function KitchenDisplayPage() {
  const t = useTranslations("kds");
  const compId = useAuthStore((s) => s.user?.compId ?? "");
  const siteId = usePosSessionStore((s) => s.siteId ?? "");
  const userName = useAuthStore((s) => s.user?.userName ?? "");
  const queryClient = useQueryClient();
  const [selectedKitchen, setSelectedKitchen] = useState<string>(ALL_KITCHENS);

  const { data: kitchens = [] } = useQuery({
    queryKey: ["kitchens", compId, siteId],
    queryFn: () => restaurantLookupService.getKitchens(compId, siteId),
    enabled: !!compId && !!siteId,
  });

  const { data: kots = [] } = useQuery({
    queryKey: [KOTS_QUERY_KEY, compId, siteId],
    queryFn: () => kotService.getAll(compId, siteId),
    enabled: !!compId && !!siteId,
    refetchInterval: 15_000,
  });

  // Live push on top of the polling fallback above — either path keeps the
  // board correct if the other is temporarily unavailable. Joins every
  // kitchen's group so the filter dropdown is purely a client-side display
  // filter, not a resubscription.
  const kitchensRef = useRef(kitchens);
  useEffect(() => {
    kitchensRef.current = kitchens;
  }, [kitchens]);

  useSignalRHub(
    "/kds",
    {
      KotCreated: () => queryClient.invalidateQueries({ queryKey: [KOTS_QUERY_KEY, compId, siteId] }),
      KotStatusChanged: () => queryClient.invalidateQueries({ queryKey: [KOTS_QUERY_KEY, compId, siteId] }),
    },
    (connection) => {
      for (const k of kitchensRef.current) {
        void connection.invoke("JoinKitchen", compId, siteId, k.code).catch(() => {});
      }
    },
  );

  const advanceStatus = useMutation({
    mutationFn: async ({ docNo, status }: { docNo: number; status: KotStatus }) => {
      const kot = await kotService.get(compId, siteId, docNo);
      const dto = kotDtoToUpdateInput(kot);
      dto.kotStatus = status;
      dto.details = dto.details.map((d) => ({ ...d, itemStatus: status === "SERVED" ? "SERVED" : status === "READY" ? "READY" : "PREPARING" }));
      return kotService.update(compId, siteId, userName, docNo, dto);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [KOTS_QUERY_KEY, compId, siteId] }),
  });

  const visibleKots = selectedKitchen === ALL_KITCHENS
    ? kots
    : kots.filter((k) => k.details.some((d) => d.kitchenCode === selectedKitchen));

  const openKots = visibleKots.filter((k) => k.kotStatus === "OPEN");
  const preparingKots = visibleKots.filter((k) => k.kotStatus === "PREPARING");
  const readyKots = visibleKots.filter((k) => k.kotStatus === "READY");

  function handleAdvance(docNo: number, status: KotStatus) {
    advanceStatus.mutate({ docNo, status });
  }

  return (
    <div className="flex h-full flex-col gap-4 bg-slate-950 p-4 text-slate-50">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">{t("title")}</h1>
        {kitchens.length > 1 && (
          <Select value={selectedKitchen} onValueChange={setSelectedKitchen}>
            <SelectTrigger className="w-48 bg-slate-900 text-slate-50">
              <SelectValue placeholder={t("selectKitchen")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_KITCHENS}>{t("allKitchens")}</SelectItem>
              {kitchens.map((k) => (
                <SelectItem key={k.code} value={k.code}>
                  {k.kitchenName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>
      <div className="flex flex-1 gap-4 overflow-x-auto">
        <KdsColumn status="OPEN" kots={openKots} onAdvance={handleAdvance} />
        <KdsColumn status="PREPARING" kots={preparingKots} onAdvance={handleAdvance} />
        <KdsColumn status="READY" kots={readyKots} onAdvance={handleAdvance} />
      </div>
    </div>
  );
}
