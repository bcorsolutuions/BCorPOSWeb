"use client";

import { useEffect, useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import {
  AlertTriangle,
  Banknote,
  CalendarDays,
  Check,
  ChefHat,
  Clock,
  Crown,
  CreditCard,
  Lightbulb,
  PieChart,
  RefreshCw,
  Receipt,
  TrendingDown,
  TrendingUp,
  UserRound,
  Users,
  Utensils,
} from "lucide-react";
import { dashboardRestaurantService, type RestaurantDashboardData } from "@/lib/api/services/dashboard-restaurant-service";
import { useAuthStore } from "@/stores/auth-store";
import { useCurrencyStore } from "@/stores/currency-store";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn, formatMoney } from "@/lib/utils";
import {
  AreaTrend,
  ChartCard,
  Columns,
  Delta,
  Meter,
  RankedBars,
  ShareBar,
  Sparkline,
  VIZ_STYLE,
  compactNumber,
  type RankedRow,
  type SharePart,
} from "./viz/viz";

type PresetKey = "today" | "yesterday" | "7d" | "30d" | "month";
const PRESETS: PresetKey[] = ["today", "yesterday", "7d", "30d", "month"];
const PRESET_KEY = "bcor-restaurant-dashboard-range";
// Order sources the POS stamps on a bill; anything else is shown as it comes.
const CHANNELS = ["POS", "WAITER_MOBILE", "QR", "DELIVERY", "TAKEAWAY", "PHONE_ORDER", "BAR"];

const ymd = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const parseYmd = (s: string) => {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y!, m! - 1, d!);
};
const addDays = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);

function rangeFor(preset: PresetKey): { from: string; to: string } {
  const today = new Date();
  switch (preset) {
    case "today":
      return { from: ymd(today), to: ymd(today) };
    case "yesterday":
      return { from: ymd(addDays(today, -1)), to: ymd(addDays(today, -1)) };
    case "30d":
      return { from: ymd(addDays(today, -29)), to: ymd(today) };
    case "month":
      return { from: ymd(new Date(today.getFullYear(), today.getMonth(), 1)), to: ymd(today) };
    default:
      return { from: ymd(addDays(today, -6)), to: ymd(today) };
  }
}

function formatMinutes(m: number): string {
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  return h >= 24 ? `${Math.floor(h / 24)}d ${h % 24}h` : `${h}h ${m % 60}m`;
}

/**
 * The restaurant owner's dashboard. One date row scopes everything below it; every figure is compared with the period of the
 * same length just before. Shows nothing for companies that aren't licensed for the Restaurant module (or for non-management logins).
 */
export function RestaurantDashboard() {
  const t = useTranslations("restaurantDash");
  const locale = useLocale();
  const compId = useAuthStore((s) => s.user?.compId ?? "");
  const currency = useCurrencyStore((s) => s.currencyCode);

  const [preset, setPreset] = useState<PresetKey>("7d");
  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(PRESET_KEY) as PresetKey | null;
      if (saved && PRESETS.includes(saved)) setPreset(saved);
    } catch {
      /* private mode */
    }
  }, []);
  function choose(p: PresetKey) {
    setPreset(p);
    try {
      window.localStorage.setItem(PRESET_KEY, p);
    } catch {
      /* ignore */
    }
  }

  const range = useMemo(() => rangeFor(preset), [preset]);
  const { data, isLoading, isFetching, refetch, dataUpdatedAt } = useQuery({
    queryKey: ["dashboard-restaurant", compId, range.from, range.to],
    queryFn: () => dashboardRestaurantService.get(compId, range.from, range.to),
    enabled: !!compId,
    refetchInterval: 60_000,
    placeholderData: keepPreviousData, // refetch keeps the frame: previous render stays (dimmed) instead of a skeleton
  });

  if (isLoading) {
    return (
      <div className="grid gap-4 lg:grid-cols-12">
        <Skeleton className="h-44 lg:col-span-5" />
        <Skeleton className="h-44 lg:col-span-7" />
        <Skeleton className="h-64 lg:col-span-8" />
        <Skeleton className="h-64 lg:col-span-4" />
      </div>
    );
  }
  if (!data || !data.isRestaurant) return null;

  return (
    <div className="viz-root space-y-4">
      <style>{VIZ_STYLE}</style>
      <Body d={data} preset={preset} onPreset={choose} fetching={isFetching} onRefresh={() => refetch()} updatedAt={dataUpdatedAt} t={t} locale={locale} currency={currency} />
    </div>
  );
}

type T = ReturnType<typeof useTranslations>;

function Body({
  d,
  preset,
  onPreset,
  fetching,
  onRefresh,
  updatedAt,
  t,
  locale,
  currency,
}: {
  d: RestaurantDashboardData;
  preset: PresetKey;
  onPreset: (p: PresetKey) => void;
  fetching: boolean;
  onRefresh: () => void;
  updatedAt: number;
  t: T;
  locale: string;
  currency: string;
}) {
  const money = (n: number) => formatMoney(n, currency, locale);
  const moneyShort = (n: number) => (Math.abs(n) >= 1000 ? `${currency} ${compactNumber(n)}` : money(n));
  const dateShort = (s: string) => new Intl.DateTimeFormat(locale, { day: "numeric", month: "short" }).format(parseYmd(s));
  const dateLong = (s: string) => new Intl.DateTimeFormat(locale, { weekday: "short", day: "numeric", month: "short" }).format(parseYmd(s));
  const hourLabel = (h: number) => new Intl.DateTimeFormat(locale, { hour: "numeric" }).format(new Date(2000, 0, 1, h));
  const hasSales = d.kpis.bills > 0;
  const vs = d.days === 1 ? t("vsDayBefore") : t("vsPreviousDays", { days: d.days });
  const noPrev = t("noPreviousSales");

  /* ---- chart data ---- */
  const dailyPoints = d.daily.map((p) => ({ label: dateLong(p.date), tickLabel: dateShort(p.date), value: p.sales, bills: p.bills }));
  const hourlyPoints = d.hourly.map((p) => ({ label: hourLabel(p.hour), tickLabel: hourLabel(p.hour), value: p.sales, bills: p.bills }));
  const peakHour = d.hourly.reduce((best, h) => (h.sales > (d.hourly[best]?.sales ?? -1) ? h.hour : best), 0);
  const peakHourSales = d.hourly[peakHour]?.sales ?? 0;
  const bestDay = d.daily.reduce((best, p) => (p.sales > (best?.sales ?? -1) ? p : best), d.daily[0]);

  const itemRows: RankedRow[] = d.items.slice(0, 8).map((i) => ({
    key: i.code,
    label: i.name,
    sublabel: [i.category, t("sold", { qty: +i.qty.toFixed(1) })].filter(Boolean).join(" · "),
    value: i.amount,
    display: money(i.amount),
    detail: [
      { label: t("sales"), value: money(i.amount) },
      { label: t("qtySold"), value: String(+i.qty.toFixed(1)) },
    ],
  }));

  const categoryParts: SharePart[] = d.categories.map((c) => ({ key: c.code || "-", label: c.name ?? t("uncategorised"), value: c.amount, display: money(c.amount) }));
  const paymentParts: SharePart[] = d.paymentMix.map((p) => ({ key: p.mode, label: p.mode, value: p.amount, display: money(p.amount) }));
  const channelName = (c: string) => (CHANNELS.includes(c) ? t(`channel_${c}` as never) : c);
  const channelParts: SharePart[] = d.channels.map((c) => ({ key: c.channel, label: channelName(c.channel), value: c.sales, display: money(c.sales) }));

  const waiterRows: RankedRow[] = d.waiters.map((w) => ({
    key: w.code || "-",
    label: w.name ?? t("unassigned"),
    sublabel: t("waiterSub", { bills: w.bills, guests: w.guests, avg: money(w.averageBill) }),
    value: w.sales,
    display: money(w.sales),
    detail: [
      { label: t("sales"), value: money(w.sales) },
      { label: t("bills"), value: String(w.bills) },
      { label: t("guests"), value: String(w.guests) },
      { label: t("averageBill"), value: money(w.averageBill) },
    ],
  }));

  /* ---- plain-language insights, derived only from the numbers above ---- */
  const insights: { icon: typeof Lightbulb; tone: "good" | "warn" | "info"; text: string }[] = [];
  if (!hasSales) {
    insights.push({ icon: Lightbulb, tone: "info", text: t("insightEmpty") });
  } else {
    if (d.previous.sales > 0) {
      const pct = ((d.kpis.sales - d.previous.sales) / d.previous.sales) * 100;
      const up = pct >= 0;
      insights.push({
        icon: up ? TrendingUp : TrendingDown,
        tone: up ? "good" : "warn",
        text: t(up ? "insightUp" : "insightDown", { pct: Math.abs(pct).toFixed(Math.abs(pct) < 10 ? 1 : 0), prev: money(d.previous.sales), cur: money(d.kpis.sales) }),
      });
    } else {
      insights.push({ icon: Lightbulb, tone: "info", text: t("insightNoPrev") });
    }
    if (peakHourSales > 0) {
      insights.push({
        icon: Clock,
        tone: "info",
        text: t("insightPeakHour", { hour: hourLabel(peakHour), amount: money(peakHourSales), pct: Math.round((peakHourSales / d.kpis.sales) * 100) }),
      });
    }
    if (d.days > 1 && bestDay && bestDay.sales > 0) {
      insights.push({ icon: CalendarDays, tone: "info", text: t("insightBestDay", { day: dateLong(bestDay.date), amount: money(bestDay.sales) }) });
    }
    const top = d.items[0];
    if (top) insights.push({ icon: Crown, tone: "info", text: t("insightTopItem", { name: top.name, qty: +top.qty.toFixed(1), amount: money(top.amount) }) });
    const cat = d.categories[0];
    const catTotal = d.categories.reduce((s, c) => s + c.amount, 0);
    if (cat && catTotal > 0 && d.categories.length > 1) {
      insights.push({ icon: PieChart, tone: "info", text: t("insightCategory", { name: cat.name ?? t("uncategorised"), pct: Math.round((cat.amount / catTotal) * 100) }) });
    }
    const pay = d.paymentMix[0];
    const payTotal = d.paymentMix.reduce((s, p) => s + p.amount, 0);
    if (pay && payTotal > 0 && d.paymentMix.length > 1) {
      insights.push({ icon: CreditCard, tone: "info", text: t("insightPayment", { mode: pay.mode, pct: Math.round((pay.amount / payTotal) * 100) }) });
    }
    const w = d.waiters.find((x) => x.code);
    if (w && d.waiters.filter((x) => x.code).length > 1) {
      insights.push({ icon: UserRound, tone: "info", text: t("insightWaiter", { name: w.name ?? w.code, amount: money(w.sales) }) });
    }
    const lk = d.leakage;
    if (lk.cancelledItems + lk.voidedBills === 0) insights.push({ icon: Check, tone: "good", text: t("insightLeakNone") });
    else insights.push({ icon: AlertTriangle, tone: "warn", text: t("insightLeak", { count: lk.cancelledItems, amount: money(lk.cancelledValue), voids: lk.voidedBills }) });
  }
  if (d.live.itemsInKitchen > 0 && d.live.longestWaitMinutes >= 20) {
    insights.push({ icon: ChefHat, tone: "warn", text: t("insightWait", { count: d.live.itemsInKitchen, min: formatMinutes(d.live.longestWaitMinutes) }) });
  }

  const occupancyPct = d.live.tables > 0 ? Math.round((d.live.occupied / d.live.tables) * 100) : 0;

  return (
    <>
      {/* ───── one filter row, above everything it scopes ───── */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-lg font-semibold">{t("title")}</h2>
          <p className="text-xs text-muted-foreground">
            {d.from === d.to ? dateLong(d.from) : `${dateLong(d.from)} – ${dateLong(d.to)}`}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div role="group" aria-label={t("range")} className="inline-flex rounded-lg border bg-card p-0.5">
            {PRESETS.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => onPreset(p)}
                aria-pressed={preset === p}
                className={cn(
                  "rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
                  preset === p ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                )}
              >
                {t(`preset_${p}` as never)}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={onRefresh}
            title={t("refresh")}
            aria-label={t("refresh")}
            className="inline-flex items-center gap-1.5 rounded-lg border bg-card px-2.5 py-1.5 text-xs text-muted-foreground hover:bg-accent"
          >
            <RefreshCw className={cn("h-3.5 w-3.5", fetching && "animate-spin")} />
            {updatedAt ? new Intl.DateTimeFormat(locale, { hour: "2-digit", minute: "2-digit" }).format(updatedAt) : null}
          </button>
        </div>
      </div>

      <div className={cn("space-y-4 transition-opacity", fetching && "opacity-70")}>
        {/* ───── headline ───── */}
        <div className="grid gap-4 lg:grid-cols-12">
          <Card className="flex flex-col justify-between p-5 lg:col-span-5">
            <div>
              <p className="flex items-center gap-2 text-sm text-muted-foreground">
                <Banknote className="h-4 w-4" />
                {t("sales")}
              </p>
              <p className="mt-1 text-5xl font-semibold tracking-tight">{money(d.kpis.sales)}</p>
              <div className="mt-2">
                <Delta current={d.kpis.sales} previous={d.previous.sales} vsLabel={vs} noPreviousLabel={noPrev} />
              </div>
            </div>
            <div className="mt-4">
              {d.days > 1 ? (
                <Sparkline values={d.daily.map((p) => p.sales)} height={48} />
              ) : (
                <p className="text-xs text-muted-foreground">{t("billsToday", { count: d.kpis.bills })}</p>
              )}
            </div>
          </Card>

          <div className="grid grid-cols-2 gap-4 lg:col-span-7">
            <Tile icon={Receipt} label={t("bills")} value={String(d.kpis.bills)} delta={<Delta current={d.kpis.bills} previous={d.previous.bills} vsLabel={vs} noPreviousLabel={noPrev} />} />
            <Tile icon={Utensils} label={t("averageBill")} value={money(d.kpis.averageBill)} delta={<Delta current={d.kpis.averageBill} previous={d.previous.averageBill} vsLabel={vs} noPreviousLabel={noPrev} />} />
            <Tile icon={Users} label={t("guests")} value={String(d.kpis.guests)} delta={<Delta current={d.kpis.guests} previous={d.previous.guests} vsLabel={vs} noPreviousLabel={noPrev} />} />
            <Tile icon={Banknote} label={t("spendPerGuest")} value={money(d.kpis.spendPerGuest)} delta={<Delta current={d.kpis.spendPerGuest} previous={d.previous.spendPerGuest} vsLabel={vs} noPreviousLabel={noPrev} />} />
          </div>
        </div>

        {/* ───── trend + insights ───── */}
        <div className="grid gap-4 lg:grid-cols-12">
          <ChartCard
            className="lg:col-span-8"
            title={d.days > 1 ? t("trendTitle") : t("hoursTitle")}
            subtitle={d.days > 1 ? t("trendSub", { days: d.days }) : t("hoursSub")}
            tableLabel={t("tableView")}
            table={{
              columns: [t("date"), t("sales"), t("bills")],
              rows: (d.days > 1 ? d.daily.map((p) => [dateLong(p.date), money(p.sales), p.bills]) : d.hourly.filter((h) => h.sales > 0).map((h) => [hourLabel(h.hour), money(h.sales), h.bills])) as (string | number)[][],
            }}
          >
            {!hasSales ? (
              <Empty text={t("noSales")} />
            ) : d.days > 1 ? (
              <AreaTrend data={dailyPoints} format={moneyShort} seriesLabel={t("sales")} billsLabel={t("bills")} />
            ) : (
              <Columns data={hourlyPoints} format={moneyShort} seriesLabel={t("sales")} billsLabel={t("bills")} highlight={peakHourSales > 0 ? peakHour : undefined} />
            )}
          </ChartCard>

          <Card className="p-4 lg:col-span-4">
            <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold">
              <Lightbulb className="h-4 w-4 text-muted-foreground" />
              {t("insightsTitle")}
            </h3>
            <ul className="space-y-3">
              {insights.map((i, idx) => (
                <li key={idx} className="flex gap-2.5 text-sm leading-snug">
                  <i.icon
                    className="mt-0.5 h-4 w-4 shrink-0"
                    style={{ color: i.tone === "good" ? "var(--viz-good)" : i.tone === "warn" ? "var(--viz-warn)" : undefined }}
                    aria-hidden="true"
                  />
                  <span>{i.text}</span>
                </li>
              ))}
            </ul>
          </Card>
        </div>

        {/* ───── hours (when the trend is above) + live floor ───── */}
        <div className="grid gap-4 lg:grid-cols-12">
          {d.days > 1 && (
            <ChartCard
              className="lg:col-span-7"
              title={t("hoursTitle")}
              subtitle={t("hoursSub")}
              tableLabel={t("tableView")}
              table={{
                columns: [t("hour"), t("sales"), t("bills")],
                rows: d.hourly.filter((h) => h.sales > 0).map((h) => [hourLabel(h.hour), money(h.sales), h.bills]),
              }}
            >
              {!hasSales ? <Empty text={t("noSales")} /> : <Columns data={hourlyPoints} format={moneyShort} seriesLabel={t("sales")} billsLabel={t("bills")} highlight={peakHourSales > 0 ? peakHour : undefined} />}
            </ChartCard>
          )}

          <Card className={cn("p-4", d.days > 1 ? "lg:col-span-5" : "lg:col-span-12")}>
            <h3 className="mb-0.5 text-sm font-semibold">{t("liveTitle")}</h3>
            <p className="mb-3 text-xs text-muted-foreground">{t("liveSub")}</p>
            <div className="mb-4">
              <div className="mb-1.5 flex items-baseline justify-between text-sm">
                <span>{t("tablesOccupied")}</span>
                <span className="font-semibold tabular-nums">
                  {d.live.occupied} / {d.live.tables} <span className="ms-1 text-xs font-normal text-muted-foreground">{occupancyPct}%</span>
                </span>
              </div>
              <Meter value={d.live.occupied} max={d.live.tables} label={t("tablesOccupied")} />
            </div>
            <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
              <LiveStat label={t("openOrders")} value={String(d.live.openOrders)} />
              <LiveStat label={t("inKitchen")} value={String(d.live.itemsInKitchen)} />
              <LiveStat
                label={t("readyToServe")}
                value={String(d.live.readyToServe)}
                note={d.live.readyToServe > 0 ? t("carryOut") : undefined}
                tone={d.live.readyToServe > 0 ? "good" : undefined}
              />
              <LiveStat
                label={t("longestWait")}
                value={d.live.itemsInKitchen > 0 ? formatMinutes(d.live.longestWaitMinutes) : "—"}
                tone={d.live.itemsInKitchen > 0 && d.live.longestWaitMinutes >= 30 ? "warn" : undefined}
                note={d.live.itemsInKitchen > 0 && d.live.longestWaitMinutes >= 30 ? t("slow") : undefined}
              />
              <LiveStat label={t("avgPrep")} value={d.live.averagePrepMinutes != null ? `${d.live.averagePrepMinutes}m` : "—"} note={d.live.averagePrepMinutes == null ? t("noPrepData") : undefined} />
            </dl>
          </Card>
        </div>

        {/* ───── best sellers + mix ───── */}
        <div className="grid gap-4 lg:grid-cols-12">
          <ChartCard
            className="lg:col-span-7"
            title={t("itemsTitle")}
            subtitle={t("itemsSub")}
            tableLabel={t("tableView")}
            table={{ columns: [t("item"), t("category"), t("qtySold"), t("sales")], rows: d.items.map((i) => [i.name, i.category ?? "", +i.qty.toFixed(1), money(i.amount)]) }}
          >
            <RankedBars rows={itemRows} emptyLabel={t("noSales")} />
          </ChartCard>

          <ChartCard
            className="lg:col-span-5"
            title={t("mixTitle")}
            subtitle={t("mixSub")}
            tableLabel={t("tableView")}
            table={{
              columns: [t("group"), t("name"), t("sales")],
              rows: [
                ...d.categories.map((c) => [t("byCategory"), c.name ?? t("uncategorised"), money(c.amount)]),
                ...d.paymentMix.map((p) => [t("byPayment"), p.mode, money(p.amount)]),
                ...d.channels.map((c) => [t("byChannel"), channelName(c.channel), money(c.sales)]),
              ],
            }}
          >
            <div className="space-y-5">
              <MixBlock title={t("byCategory")}>
                <ShareBar parts={categoryParts} otherLabel={t("other")} emptyLabel={t("noSales")} />
              </MixBlock>
              <MixBlock title={t("byPayment")}>
                <ShareBar parts={paymentParts} otherLabel={t("other")} emptyLabel={t("noSales")} />
              </MixBlock>
              <MixBlock title={t("byChannel")}>
                <ShareBar parts={channelParts} otherLabel={t("other")} emptyLabel={t("noSales")} />
              </MixBlock>
            </div>
          </ChartCard>
        </div>

        {/* ───── team + leakage ───── */}
        <div className="grid gap-4 lg:grid-cols-12">
          <ChartCard
            className="lg:col-span-7"
            title={t("waitersTitle")}
            subtitle={t("waitersSub")}
            tableLabel={t("tableView")}
            table={{ columns: [t("waiter"), t("bills"), t("guests"), t("averageBill"), t("sales")], rows: d.waiters.map((w) => [w.name ?? t("unassigned"), w.bills, w.guests, money(w.averageBill), money(w.sales)]) }}
          >
            <RankedBars rows={waiterRows} emptyLabel={t("noSales")} />
          </ChartCard>

          <Card className="p-4 lg:col-span-5">
            <h3 className="mb-0.5 text-sm font-semibold">{t("leakageTitle")}</h3>
            <p className="mb-3 text-xs text-muted-foreground">{t("leakageSub")}</p>
            <div className="grid grid-cols-2 gap-3">
              <Leak label={t("cancelledItems")} count={d.leakage.cancelledItems} value={money(d.leakage.cancelledValue)} none={t("none")} />
              <Leak label={t("voidedBills")} count={d.leakage.voidedBills} value={money(d.leakage.voidedValue)} none={t("none")} />
              <Leak label={t("returns")} count={d.leakage.returns} value={money(d.leakage.returnedValue)} none={t("none")} />
              <Leak label={t("discounts")} count={d.leakage.discounts > 0 ? 1 : 0} value={money(d.leakage.discounts)} none={t("none")} hideCount />
            </div>
            {d.leakage.topReasons.length > 0 && (
              <p className="mt-3 text-xs text-muted-foreground">
                {t("topReason", { reason: d.leakage.topReasons[0]!.reason, count: d.leakage.topReasons[0]!.count })}
              </p>
            )}
          </Card>
        </div>
      </div>
    </>
  );
}

/* ───────────────────────────── small local pieces ───────────────────────────── */

function Tile({ icon: Icon, label, value, delta }: { icon: typeof Users; label: string; value: string; delta: React.ReactNode }) {
  return (
    <Card className="flex flex-col justify-between p-4">
      <p className="flex items-center gap-2 text-sm text-muted-foreground">
        <Icon className="h-4 w-4" />
        {label}
      </p>
      <p className="mt-1 truncate text-2xl font-semibold">{value}</p>
      <div className="mt-1 min-h-4">{delta}</div>
    </Card>
  );
}

function Empty({ text }: { text: string }) {
  return <p className="flex h-40 items-center justify-center text-sm text-muted-foreground">{text}</p>;
}

function MixBlock({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-2 text-xs font-medium text-muted-foreground">{title}</p>
      {children}
    </div>
  );
}

function LiveStat({ label, value, note, tone }: { label: string; value: string; note?: string; tone?: "good" | "warn" }) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="flex items-baseline gap-2">
        <span className="text-xl font-semibold tabular-nums">{value}</span>
        {note && (
          <span className="inline-flex items-center gap-1 text-xs font-medium" style={{ color: tone === "good" ? "var(--viz-good)" : tone === "warn" ? "var(--viz-warn)" : undefined }}>
            {tone === "good" && <Check className="h-3 w-3" />}
            {tone === "warn" && <AlertTriangle className="h-3 w-3" />}
            {note}
          </span>
        )}
      </dd>
    </div>
  );
}

function Leak({ label, count, value, none, hideCount }: { label: string; count: number; value: string; none: string; hideCount?: boolean }) {
  const clean = count === 0;
  return (
    <div className="rounded-lg border p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      {clean ? (
        <p className="mt-1 flex items-center gap-1.5 text-sm font-medium" style={{ color: "var(--viz-good)" }}>
          <Check className="h-4 w-4" />
          {none}
        </p>
      ) : (
        <>
          {!hideCount && <p className="mt-1 text-xl font-semibold tabular-nums">{count}</p>}
          <p className={cn("flex items-center gap-1.5 text-sm font-semibold tabular-nums", hideCount && "mt-1 text-xl")}>
            <AlertTriangle className="h-3.5 w-3.5 shrink-0" style={{ color: "var(--viz-warn)" }} aria-hidden="true" />
            {value}
          </p>
        </>
      )}
    </div>
  );
}
