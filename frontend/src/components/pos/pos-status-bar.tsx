"use client";

import { useTranslations } from "next-intl";
import { useQuery } from "@tanstack/react-query";
import { WifiOff } from "lucide-react";
import { posOperationsService } from "@/lib/api/services/pos-operations-service";
import { useAuthStore } from "@/stores/auth-store";
import { usePosSessionStore } from "@/stores/pos-session-store";
import { Badge } from "@/components/ui/badge";
import { CustomerSalesmanBar } from "@/components/pos/customer-salesman-bar";

export function PosStatusBar({
  isOnline,
  pendingSync,
  shiftOnRight = false,
}: {
  isOnline: boolean;
  pendingSync: number;
  /** Supermarket checkout puts the terminal / shift details at the right-hand end of the bar instead of the left. */
  shiftOnRight?: boolean;
}) {
  const t = useTranslations("pos");
  const compId = useAuthStore((s) => s.user?.compId ?? "");
  const { siteId, terminalId, shiftNo } = usePosSessionStore();

  const { data: status } = useQuery({
    queryKey: ["pos-shift-status", compId, siteId, terminalId, shiftNo],
    queryFn: () => posOperationsService.getShiftStatus(compId, siteId ?? "", terminalId ?? "", shiftNo ?? 0),
    enabled: !!compId && !!siteId && !!terminalId && !!shiftNo,
    refetchInterval: 60_000,
  });

  const shiftDetails = (
    <>
      <span className="text-xs text-muted-foreground">
        {terminalId} · {t("setupShift")} {shiftNo}
      </span>

      <Badge variant={status?.isShiftOpen === false ? "destructive" : "success"}>
        {status?.isShiftOpen === false ? t("shiftClosed") : t("shiftOpen")}
      </Badge>
    </>
  );

  return (
    <div className="flex flex-wrap items-center gap-2 border-b bg-background px-3 py-2 short:py-1">
      {!shiftOnRight && shiftDetails}

      {!isOnline && (
        <Badge variant="warning" className="gap-1">
          <WifiOff className="h-3 w-3" />
          {t("offline")}
        </Badge>
      )}

      {pendingSync > 0 && <Badge variant="secondary">{t("syncPending", { count: pendingSync })}</Badge>}

      <div className="ms-auto flex items-center gap-2">
        <CustomerSalesmanBar />
        {shiftOnRight && shiftDetails}
      </div>
    </div>
  );
}
