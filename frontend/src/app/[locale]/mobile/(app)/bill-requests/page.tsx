"use client";

import { useTranslations, useLocale } from "next-intl";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "@/i18n/navigation";
import { useAuthStore } from "@/stores/auth-store";
import { usePosSessionStore } from "@/stores/pos-session-store";
import { qrOrderManagementService } from "@/lib/api/services/qr-order-management-service";
import { MobileHeader } from "@/components/mobile/mobile-header";
import { formatDateTime } from "@/lib/utils";

/** Waiter Mobile Ordering §28 — this waiter's own still-open bill requests, reusing RestaurantServiceRequest/the QrOrderManagement read endpoint (same rows the desktop QrOrdersBell shows), filtered to RequestedBy=me. */
export default function BillRequestsPage() {
  const t = useTranslations("mobileWaiter");
  const locale = useLocale();
  const router = useRouter();
  const compId = useAuthStore((s) => s.user?.compId ?? "");
  const userName = useAuthStore((s) => s.user?.userName ?? "");
  const siteId = usePosSessionStore((s) => s.siteId ?? "");

  const { data: requests = [], isLoading } = useQuery({
    queryKey: ["qr-service-requests", compId, siteId],
    queryFn: () => qrOrderManagementService.getServiceRequests(compId, siteId),
    enabled: !!compId && !!siteId,
    refetchInterval: 15_000,
  });

  const mine = requests.filter((r) => r.requestType === "REQUEST_BILL" && r.requestedBy === userName);

  return (
    <div className="flex flex-1 flex-col">
      <MobileHeader title={t("billRequests")} onBack={() => router.push("/mobile" as never)} />
      <div className="flex-1 space-y-2 overflow-y-auto p-3">
        {isLoading && <p className="text-center text-sm text-muted-foreground">{t("loading")}</p>}
        {!isLoading && mine.length === 0 && <p className="text-center text-sm text-muted-foreground">{t("noBillRequests")}</p>}
        {mine.map((r) => (
          <div key={r.id} className="flex items-center justify-between rounded-lg border p-3">
            <div>
              <p className="font-semibold">
                {t("table")} {r.tableCode}
              </p>
              <p className="text-xs text-muted-foreground">{formatDateTime(r.requestedOn, locale)}</p>
            </div>
            <span className="text-xs font-medium text-muted-foreground">{r.status}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
