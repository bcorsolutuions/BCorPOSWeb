"use client";

import { useTranslations, useLocale } from "next-intl";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "@/i18n/navigation";
import { useAuthStore } from "@/stores/auth-store";
import { usePosSessionStore } from "@/stores/pos-session-store";
import { waiterMobileService } from "@/lib/api/services/waiter-mobile-service";
import { MobileHeader } from "@/components/mobile/mobile-header";
import { formatDateTime } from "@/lib/utils";

/** Waiter Mobile Ordering §7 — tables currently assigned to the logged-in waiter, for a quick reopen. */
export default function MyTablesPage() {
  const t = useTranslations("mobileWaiter");
  const locale = useLocale();
  const router = useRouter();
  const compId = useAuthStore((s) => s.user?.compId ?? "");
  const userName = useAuthStore((s) => s.user?.userName ?? "");
  const siteId = usePosSessionStore((s) => s.siteId ?? "");

  const { data: tables = [], isLoading } = useQuery({
    queryKey: ["waiter-mobile-my-tables", compId, siteId, userName],
    queryFn: () => waiterMobileService.getMyTables(compId, siteId, userName),
    enabled: !!compId && !!siteId && !!userName,
    refetchInterval: 20_000,
  });

  return (
    <div className="flex flex-1 flex-col">
      <MobileHeader title={t("myTables")} onBack={() => router.push("/mobile" as never)} />

      <div className="flex-1 space-y-2 overflow-y-auto p-3">
        {isLoading && <p className="text-center text-sm text-muted-foreground">{t("loading")}</p>}
        {!isLoading && tables.length === 0 && <p className="text-center text-sm text-muted-foreground">{t("noMyTables")}</p>}
        {tables.map((tbl) => (
          <button
            key={tbl.tableCode}
            onClick={() => router.push(`/mobile/tables/${encodeURIComponent(tbl.tableCode)}` as never)}
            className="flex w-full items-center justify-between rounded-lg border p-3 text-start"
          >
            <div>
              <p className="font-semibold">{tbl.tableName ?? tbl.tableCode}</p>
              <p className="text-xs text-muted-foreground">
                {t("guests")}: {tbl.guestCount ?? "-"} · {tbl.openedOn ? formatDateTime(tbl.openedOn, locale) : ""}
              </p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
