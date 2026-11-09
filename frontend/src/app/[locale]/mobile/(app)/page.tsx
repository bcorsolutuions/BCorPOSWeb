"use client";

import { useLocale, useTranslations } from "next-intl";
import { useQuery } from "@tanstack/react-query";
import { BellRing, ChevronRight, Clock, Plus, Receipt, Users, UtensilsCrossed } from "lucide-react";
import { useRouter } from "@/i18n/navigation";
import { useAuthStore } from "@/stores/auth-store";
import { usePosSessionStore } from "@/stores/pos-session-store";
import { usePermission } from "@/hooks/use-permission";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { waiterMobileService } from "@/lib/api/services/waiter-mobile-service";
import { MobileHeader } from "@/components/mobile/mobile-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useCurrencyStore } from "@/stores/currency-store";
import { cn, formatMoney } from "@/lib/utils";

function minutesSince(iso?: string | null): number | null {
  if (!iso) return null;
  const ms = Date.now() - new Date(iso).getTime();
  return Number.isFinite(ms) && ms >= 0 ? Math.floor(ms / 60000) : null;
}

function formatElapsed(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;
  return `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
}

/**
 * Waiter dashboard — everything the waiter needs at a glance: who they are, the tables they are serving (with what is
 * ready to serve and who has asked for the bill), and one big button to open a new table.
 */
export default function MobileHomePage() {
  const t = useTranslations("mobileWaiter");
  const locale = useLocale();
  const router = useRouter();
  const { can } = usePermission();
  const currency = useCurrencyStore((s) => s.currencyCode);
  const compId = useAuthStore((s) => s.user?.compId ?? "");
  const userName = useAuthStore((s) => s.user?.userName ?? "");
  const siteId = usePosSessionStore((s) => s.siteId ?? "");

  const { data: profile, isLoading } = useQuery({
    queryKey: ["waiter-mobile-profile", compId, siteId, userName],
    queryFn: () => waiterMobileService.getMyProfile(compId, siteId, userName),
    enabled: !!compId && !!siteId && !!userName,
    retry: false,
  });
  const isWaiter = !!profile?.isWaiter && profile.enableWaiterMobileOrdering;

  const { data: tables = [], isLoading: tablesLoading } = useQuery({
    queryKey: ["waiter-mobile-my-tables", compId, siteId, userName],
    queryFn: () => waiterMobileService.getMyTables(compId, siteId, userName),
    enabled: !!compId && !!siteId && !!userName && isWaiter,
    refetchInterval: 15_000,
  });

  if (isLoading || !siteId) {
    return (
      <div className="flex flex-1 flex-col">
        <MobileHeader title={t("appName")} />
        <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">{t("loading")}</div>
      </div>
    );
  }

  if (!isWaiter) {
    return (
      <div className="flex flex-1 flex-col">
        <MobileHeader title={t("appName")} />
        <div className="flex flex-1 flex-col items-center justify-center gap-2 p-6 text-center">
          <UtensilsCrossed className="h-10 w-10 text-muted-foreground" />
          <p className="font-medium">{t("accessDenied")}</p>
          <p className="text-sm text-muted-foreground">{t("accessDeniedHint")}</p>
        </div>
      </div>
    );
  }

  const firstName = (profile?.waiterName ?? userName).split(" ")[0];
  const readyTotal = tables.reduce((n, x) => n + (x.readyCount ?? 0), 0);
  const billTotal = tables.filter((x) => x.billRequested).length;
  const canOpen = can(PERMISSIONS.WAITER_MOBILE_OPEN_TABLE) && profile?.allowWaiterOpenTable !== false;

  // Tables that need the waiter first: bill asked for, then food ready to carry, then the rest by how long they have been open.
  const sorted = [...tables].sort(
    (a, b) =>
      Number(!!b.billRequested) - Number(!!a.billRequested) ||
      (b.readyCount ?? 0) - (a.readyCount ?? 0) ||
      (minutesSince(b.openedOn) ?? 0) - (minutesSince(a.openedOn) ?? 0),
  );

  return (
    <div className="flex flex-1 flex-col">
      <MobileHeader title={t("appName")} />

      <div className="space-y-4 p-4">
        <div>
          <h1 className="text-xl font-semibold">{t("hello", { name: firstName ?? "" })}</h1>
          <p className="text-sm text-muted-foreground">
            {profile?.waiterName}
            {profile?.defaultFloorCode ? ` · ${profile.defaultFloorCode}` : ""}
          </p>
        </div>

        <div className="grid grid-cols-3 gap-2">
          <StatTile icon={UtensilsCrossed} label={t("statTables")} value={tables.length} />
          <StatTile icon={BellRing} label={t("statReady")} value={readyTotal} tone={readyTotal > 0 ? "good" : undefined} />
          <StatTile icon={Receipt} label={t("statBills")} value={billTotal} tone={billTotal > 0 ? "warn" : undefined} />
        </div>

        {canOpen && (
          <Button className="h-14 w-full text-base" onClick={() => router.push("/mobile/tables?filter=free" as never)}>
            <Plus className="me-2 h-5 w-5" />
            {t("openATable")}
          </Button>
        )}

        <div className="space-y-2">
          <h2 className="text-sm font-semibold text-muted-foreground">{t("yourTables")}</h2>

          {tablesLoading && <p className="py-6 text-center text-sm text-muted-foreground">{t("loading")}</p>}
          {!tablesLoading && sorted.length === 0 && (
            <div className="rounded-lg border border-dashed p-6 text-center">
              <p className="text-sm font-medium">{t("noServingTables")}</p>
              <p className="mt-1 text-xs text-muted-foreground">{t("noServingTablesHint")}</p>
            </div>
          )}

          {sorted.map((tbl) => {
            const minutes = minutesSince(tbl.openedOn);
            return (
              <button
                key={tbl.tableCode}
                onClick={() => router.push(`/mobile/tables/${encodeURIComponent(tbl.tableCode)}` as never)}
                className={cn(
                  "flex w-full items-center gap-3 rounded-xl border p-3 text-start transition-colors active:bg-muted/60",
                  tbl.billRequested && "border-amber-300 bg-amber-50/60",
                  !tbl.billRequested && (tbl.readyCount ?? 0) > 0 && "border-green-300 bg-green-50/60",
                )}
              >
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-sm font-bold text-primary">
                  {(tbl.tableName ?? tbl.tableCode).replace(/^table\s*/i, "")}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">{tbl.tableName ?? tbl.tableCode}</p>
                  <p className="flex flex-wrap items-center gap-x-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Users className="h-3 w-3" />
                      {tbl.guestCount ?? "-"}
                    </span>
                    {minutes != null && (
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {formatElapsed(minutes)}
                      </span>
                    )}
                    <span>{t("itemsCount", { count: tbl.itemCount ?? 0 })}</span>
                    {(tbl.totalAmount ?? 0) > 0 && <span className="tabular-nums">{formatMoney(tbl.totalAmount ?? 0, currency, locale)}</span>}
                  </p>
                  {(tbl.billRequested || (tbl.readyCount ?? 0) > 0) && (
                    <div className="mt-1 flex flex-wrap gap-1">
                      {tbl.billRequested && <Badge variant="warning">{t("billRequestedBadge")}</Badge>}
                      {(tbl.readyCount ?? 0) > 0 && <Badge variant="success">{t("readyBadge", { count: tbl.readyCount ?? 0 })}</Badge>}
                    </div>
                  )}
                </div>
                <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground rtl:rotate-180" />
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function StatTile({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: typeof Users;
  label: string;
  value: number;
  tone?: "good" | "warn";
}) {
  return (
    <div
      className={cn(
        "rounded-xl border p-3 text-center",
        tone === "good" && "border-green-300 bg-green-50 text-green-800",
        tone === "warn" && "border-amber-300 bg-amber-50 text-amber-800",
      )}
    >
      <Icon className="mx-auto h-4 w-4 opacity-70" />
      <p className="mt-1 text-2xl font-bold tabular-nums leading-none">{value}</p>
      <p className="mt-1 text-[11px] font-medium opacity-80">{label}</p>
    </div>
  );
}
