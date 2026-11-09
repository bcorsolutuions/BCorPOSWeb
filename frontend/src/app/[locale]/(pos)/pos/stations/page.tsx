"use client";

import { useTranslations } from "next-intl";
import { useQuery } from "@tanstack/react-query";
import { restaurantLookupService } from "@/lib/api/services/restaurant-lookup-service";
import { useAuthStore } from "@/stores/auth-store";
import { usePosSessionStore } from "@/stores/pos-session-store";
import { useRouter } from "@/i18n/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

/**
 * Bar Counter Management §6/§31 — lets the user pick which non-kitchen
 * Preparation Station to work from (Main Bar, Pool Bar, Coffee Counter, ...)
 * before dropping into that station's own screen at /pos/stations/[code].
 * Kitchen-type stations stay on the existing /pos/kds board.
 */
export default function StationsListPage() {
  const t = useTranslations("barCounter");
  const router = useRouter();
  const compId = useAuthStore((s) => s.user?.compId ?? "");
  const siteId = usePosSessionStore((s) => s.siteId ?? "");

  const { data: kitchens = [] } = useQuery({
    queryKey: ["kitchens", compId, siteId],
    queryFn: () => restaurantLookupService.getKitchens(compId, siteId),
    enabled: !!compId && !!siteId,
  });

  const stations = kitchens.filter((k) => k.stationType !== "KITCHEN");

  return (
    <div className="h-full overflow-y-auto p-4">
      <h1 className="mb-4 text-xl font-semibold">{t("title")}</h1>
      {stations.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t("noOpenTabs")}</p>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {stations.map((station) => (
            <Card
              key={station.code}
              className="cursor-pointer transition hover:border-primary"
              onClick={() => router.push(`/pos/stations/${encodeURIComponent(station.code)}`)}
            >
              <CardHeader>
                <CardTitle className="text-base">{station.kitchenName}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground">{station.stationType}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
