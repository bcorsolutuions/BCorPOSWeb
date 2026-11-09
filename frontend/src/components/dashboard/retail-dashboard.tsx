"use client";

import { useEffect, useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import {
  AlertTriangle,
  Banknote,
  Boxes,
  CalendarDays,
  Check,
  Clock,
  Crown,
  CreditCard,
  Lightbulb,
  Percent,
  PieChart,
  RefreshCw,
  Receipt,
  ShoppingBasket,
  ShoppingCart,
  TrendingDown,
  TrendingUp,
  Truck,
  Wallet,
} from "lucide-react";
import { dashboardRetailService, type RetailDashboardData } from "@/lib/api/services/dashboard-retail-service";
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
  Heatmap,
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
const PRESET_KEY = "bcor-retail-dashboard-range";
const DAY_ORDER = [1, 2, 3, 4, 5, 6, 0]; // Monday first

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

type T = ReturnType<typeof useTranslations>;

/**
 * The owner's dashboard for supermarkets and trading companies. One date row scopes the sales figures; every figure is compared
 * with the period of the same length just before, and the stock-health section always describes stock as it is right now.
 * Shows nothing for companies without a supermarket / trading branch (or for non-management logins).
 */
export function RetailDashboard() {
  const t = useTranslations("retailDash");
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
    queryKey: ["dashboard-retail", compId, range.from, range.to],
    queryFn: () => dashboardRetailService.get(compId, range.from, range.to),
    enabled: !!compId,
    refetchInterval: 120_000,
    placeholderData: keepPreviousData,
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
  if (!data || !data.isRetail) return null;

  return (
    <div className="viz-root space-y-4">
      <style>{VIZ_STYLE}</style>
      <Body d={data} preset={preset} onPreset={choose} fetching={isFetching} onRefresh={() => refetch()} updatedAt={dataUpdatedAt} t={t} locale={locale} currency={currency} />
    </div>
  );
}

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
  d: RetailDashboardData;
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
  const num = (n: number) => new Intl.NumberFormat(locale, { maximumFractionDigits: 1 }).format(n);
  const dateShort = (s: string) => new Intl.DateTimeFormat(locale, { day: "numeric", month: "short" }).format(parseYmd(s));
  const dateLong = (s: string) => new Intl.DateTimeFormat(locale, { weekday: "short", day: "numeric", month: "short" }).format(parseYmd(s));
  const hourLabel = (h: number) => new Intl.DateTimeFormat(locale, { hour: "numeric" }).format(new Date(2000, 0, 1, h));
  const dayLabel = (dow: number) => new Intl.DateTimeFormat(locale, { weekday: "short" }).format(new Date(2024, 0, 7 + dow)); // 7 Jan 2024 was a Sunday
  const hasSales = d.kpis.bills > 0;
  const vs = d.days === 1 ? t("vsDayBefore") : t("vsPreviousDays", { days: d.days });
  const noPrev = t("noPreviousSales");
  const st = d.stock;
  const marginKnown = d.kpis.marginPct != null;

  /* ---- chart data ---- */
  const dailyPoints = d.daily.map((p) => ({ label: dateLong(p.date), tickLabel: dateShort(p.date), value: p.sales, bills: p.bills }));
  const hourlyPoints = d.hourly.map((p) => ({ label: hourLabel(p.hour), tickLabel: hourLabel(p.hour), value: p.sales, bills: p.bills }));
  const peakHour = d.hourly.reduce((best, h) => (h.sales > (d.hourly[best]?.sales ?? -1) ? h.hour : best), 0);
  const peakHourSales = d.hourly[peakHour]?.sales ?? 0;
  const bestDay = d.daily.reduce((best, p) => (p.sales > (best?.sales ?? -1) ? p : best), d.daily[0]);
  const busiest = d.heat.reduce<(typeof d.heat)[number] | null>((best, c) => (c.sales > (best?.sales ?? 0) ? c : best), null);

  const itemRows: RankedRow[] = d.items.slice(0, 8).map((i) => ({
    key: i.code,
    label: i.name,
    sublabel: [i.category, t("sold", { qty: num(i.qty) })].filter(Boolean).join(" · "),
    value: i.amount,
    display: money(i.amount),
    detail: [
      { label: t("sales"), value: money(i.amount) },
      { label: t("qtySold"), value: num(i.qty) },
      ...(i.profit != null ? [{ label: t("profit"), value: money(i.profit) }] : []),
    ],
  }));
  const profitRows: RankedRow[] = d.profitItems.map((i) => ({
    key: i.code,
    label: i.name,
    sublabel: [i.category, i.amount > 0 && i.profit != null ? t("marginShort", { pct: Math.round((i.profit / i.amount) * 100) }) : null].filter(Boolean).join(" · "),
    value: Math.max(i.profit ?? 0, 0),
    display: money(i.profit ?? 0),
    detail: [
      { label: t("profit"), value: money(i.profit ?? 0) },
      { label: t("sales"), value: money(i.amount) },
      { label: t("qtySold"), value: num(i.qty) },
    ],
  }));
  const categoryParts: SharePart[] = d.categories.map((c) => ({ key: c.code || "-", label: c.name ?? t("uncategorised"), value: c.amount, display: money(c.amount) }));
  const paymentParts: SharePart[] = d.paymentMix.map((p) => ({ key: p.mode, label: p.mode, value: p.amount, display: money(p.amount) }));
  const cashierRows: RankedRow[] = d.cashiers.map((c) => ({
    key: c.code || "-",
    label: c.code || t("unassigned"),
    sublabel: t("cashierSub", { bills: c.bills, avg: money(c.averageBasket) }),
    value: c.sales,
    display: money(c.sales),
    detail: [
      { label: t("sales"), value: money(c.sales) },
      { label: t("bills"), value: String(c.bills) },
      { label: t("averageBasket"), value: money(c.averageBasket) },
      { label: t("discounts"), value: money(c.discounts) },
    ],
  }));

  /* ---- plain-language insights, derived only from the numbers above ---- */
  type Insight = { icon: typeof Lightbulb; tone: "good" | "warn" | "info"; text: string };
  const insights: Insight[] = [];
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
    if (d.days > 1 && busiest && busiest.sales > 0) {
      insights.push({ icon: Clock, tone: "info", text: t("insightBusiest", { day: dayLabel(busiest.dow), hour: hourLabel(busiest.hour), amount: money(busiest.sales) }) });
    } else if (peakHourSales > 0) {
      insights.push({ icon: Clock, tone: "info", text: t("insightPeakHour", { hour: hourLabel(peakHour), pct: Math.round((peakHourSales / d.kpis.sales) * 100) }) });
    }
    if (d.days > 1 && bestDay && bestDay.sales > 0) {
      insights.push({ icon: CalendarDays, tone: "info", text: t("insightBestDay", { day: dateLong(bestDay.date), amount: money(bestDay.sales) }) });
    }
    const top = d.items[0];
    if (top) insights.push({ icon: Crown, tone: "info", text: t("insightTopItem", { name: top.name, qty: num(top.qty), amount: money(top.amount) }) });
    const catTotal = d.categories.reduce((s, c) => s + c.amount, 0);
    const cat = d.categories[0];
    if (cat && catTotal > 0 && d.categories.length > 1) {
      insights.push({ icon: PieChart, tone: "info", text: t("insightCategory", { name: cat.name ?? t("uncategorised"), pct: Math.round((cat.amount / catTotal) * 100) }) });
    }
    if (marginKnown) {
      const low = d.kpis.costCoveragePct < 60;
      insights.push({
        icon: Percent,
        tone: "info",
        text: t(low ? "insightMarginPartial" : "insightMargin", { pct: d.kpis.marginPct!.toFixed(1), cover: d.kpis.costCoveragePct }),
      });
      const worst = d.categories.filter((c) => c.marginPct != null && c.amount > 0).sort((a, b) => a.marginPct! - b.marginPct!)[0];
      if (worst && d.categories.filter((c) => c.marginPct != null).length > 1 && worst.marginPct! < d.kpis.marginPct! - 5) {
        insights.push({ icon: AlertTriangle, tone: "warn", text: t("insightLowMarginCat", { name: worst.name ?? t("uncategorised"), pct: worst.marginPct!.toFixed(1) }) });
      }
    } else {
      insights.push({ icon: AlertTriangle, tone: "warn", text: t("insightNoCost") });
    }
    const pay = d.paymentMix[0];
    const payTotal = d.paymentMix.reduce((s, p) => s + p.amount, 0);
    if (pay && payTotal > 0 && d.paymentMix.length > 1) {
      insights.push({ icon: CreditCard, tone: "info", text: t("insightPayment", { mode: pay.mode, pct: Math.round((pay.amount / payTotal) * 100) }) });
    }
    const lk = d.leakage;
    if (lk.voidedBills + lk.priceOverrides === 0) insights.push({ icon: Check, tone: "good", text: t("insightLeakNone") });
    else insights.push({ icon: AlertTriangle, tone: "warn", text: t("insightLeak", { voids: lk.voidedBills, overrides: lk.priceOverrides }) });
  }
  if (st.negativeStock > 0) insights.push({ icon: AlertTriangle, tone: "warn", text: t("insightNegative", { count: st.negativeStock }) });
  if (st.atRiskTotal > 0) {
    insights.push({
      icon: AlertTriangle,
      tone: "warn",
      text: t("insightRunningOut", { count: st.atRiskTotal, days: st.coverDays, names: st.atRisk.slice(0, 2).map((x) => x.name).join(", ") }),
    });
  }
  if (st.deadItems > 0) {
    insights.push({
      icon: Boxes,
      tone: "info",
      text: st.deadValue > 0 ? t("insightDeadValue", { count: st.deadItems, days: st.deadDays, amount: money(st.deadValue) }) : t("insightDead", { count: st.deadItems, days: st.deadDays }),
    });
  }
  if (d.isTrading && d.trading.current.invoiced > 0) {
    insights.push({ icon: Wallet, tone: "info", text: t("insightCollections", { collected: money(d.trading.current.collected), invoiced: money(d.trading.current.invoiced) }) });
  }

  const tr = d.trading;
  const showTrading = d.isTrading || tr.current.invoices + tr.current.purchaseBills + tr.current.receipts + tr.previous.invoices + tr.previous.purchaseBills > 0;

  return (
    <>
      {/* ───── one filter row, above everything it scopes ───── */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-lg font-semibold">{t("title")}</h2>
          <p className="text-xs text-muted-foreground">{d.from === d.to ? dateLong(d.from) : `${dateLong(d.from)} – ${dateLong(d.to)}`}</p>
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
              <p className="mt-1 truncate text-3xl font-semibold tracking-tight sm:text-4xl xl:text-5xl" title={money(d.kpis.sales)}>{money(d.kpis.sales)}</p>
              <div className="mt-2">
                <Delta current={d.kpis.sales} previous={d.previous.sales} vsLabel={vs} noPreviousLabel={noPrev} />
              </div>
            </div>
            <div className="mt-4">
              {d.days > 1 ? <Sparkline values={d.daily.map((p) => p.sales)} height={48} /> : <p className="text-xs text-muted-foreground">{t("billsToday", { count: d.kpis.bills })}</p>}
            </div>
          </Card>

          <div className="grid grid-cols-2 gap-4 lg:col-span-7">
            <Tile icon={Receipt} label={t("bills")} value={String(d.kpis.bills)} delta={<Delta current={d.kpis.bills} previous={d.previous.bills} vsLabel={vs} noPreviousLabel={noPrev} />} />
            <Tile icon={ShoppingBasket} label={t("averageBasket")} value={money(d.kpis.averageBasket)} delta={<Delta current={d.kpis.averageBasket} previous={d.previous.averageBasket} vsLabel={vs} noPreviousLabel={noPrev} />} />
            <Tile icon={ShoppingCart} label={t("itemsPerBasket")} value={num(d.kpis.itemsPerBasket)} delta={<Delta current={d.kpis.itemsPerBasket} previous={d.previous.itemsPerBasket} vsLabel={vs} noPreviousLabel={noPrev} />} />
            <Tile
              icon={Percent}
              label={t("grossMargin")}
              value={marginKnown ? `${d.kpis.marginPct!.toFixed(1)}%` : "—"}
              delta={
                marginKnown ? (
                  <span className="text-xs text-muted-foreground">{t("marginProfit", { amount: money(d.kpis.grossProfit), cover: d.kpis.costCoveragePct })}</span>
                ) : (
                  <span className="text-xs text-muted-foreground">{t("marginUnknown")}</span>
                )
              }
            />
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
            <ul className="max-h-[22rem] space-y-3 overflow-y-auto pe-1">
              {insights.map((i, idx) => (
                <li key={idx} className="flex gap-2.5 text-sm leading-snug">
                  <i.icon className="mt-0.5 h-4 w-4 shrink-0" style={{ color: i.tone === "good" ? "var(--viz-good)" : i.tone === "warn" ? "var(--viz-warn)" : undefined }} aria-hidden="true" />
                  <span>{i.text}</span>
                </li>
              ))}
            </ul>
          </Card>
        </div>

        {/* ───── when customers shop + mix ───── */}
        <div className="grid gap-4 lg:grid-cols-12">
          <ChartCard
            className="lg:col-span-7"
            title={t("heatTitle")}
            subtitle={t("heatSub")}
            tableLabel={t("tableView")}
            table={{
              columns: [t("day"), t("hour"), t("sales"), t("bills")],
              rows: d.heat.filter((c) => c.sales > 0).map((c) => [dayLabel(c.dow), hourLabel(c.hour), money(c.sales), c.bills]),
            }}
          >
            <Heatmap
              cells={d.heat.map((c) => ({ dow: c.dow, hour: c.hour, value: c.sales, bills: c.bills }))}
              dayOrder={DAY_ORDER}
              dayLabel={dayLabel}
              hourLabel={hourLabel}
              format={moneyShort}
              valueLabel={t("avgSales")}
              billsLabel={t("avgBills")}
              emptyLabel={t("noSales")}
              lessLabel={t("less")}
              moreLabel={t("more")}
            />
          </ChartCard>

          <ChartCard
            className="lg:col-span-5"
            title={t("mixTitle")}
            subtitle={t("mixSub")}
            tableLabel={t("tableView")}
            table={{
              columns: [t("group"), t("name"), t("sales"), t("margin")],
              rows: [
                ...d.categories.map((c) => [t("byCategory"), c.name ?? t("uncategorised"), money(c.amount), c.marginPct != null ? `${c.marginPct}%` : "—"]),
                ...d.paymentMix.map((p) => [t("byPayment"), p.mode, money(p.amount), ""]),
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
            </div>
          </ChartCard>
        </div>

        {/* ───── best sellers + profit ───── */}
        <div className="grid gap-4 lg:grid-cols-12">
          <ChartCard
            className="lg:col-span-7"
            title={t("itemsTitle")}
            subtitle={t("itemsSub")}
            tableLabel={t("tableView")}
            table={{ columns: [t("item"), t("category"), t("qtySold"), t("sales"), t("profit")], rows: d.items.map((i) => [i.name, i.category ?? "", num(i.qty), money(i.amount), i.profit != null ? money(i.profit) : "—"]) }}
          >
            <RankedBars rows={itemRows} emptyLabel={t("noSales")} />
          </ChartCard>

          {marginKnown && profitRows.length > 0 ? (
            <ChartCard
              className="lg:col-span-5"
              title={t("profitTitle")}
              subtitle={t("profitSub")}
              tableLabel={t("tableView")}
              table={{ columns: [t("item"), t("sales"), t("profit")], rows: d.profitItems.map((i) => [i.name, money(i.amount), money(i.profit ?? 0)]) }}
            >
              <RankedBars rows={profitRows} emptyLabel={t("noSales")} />
            </ChartCard>
          ) : (
            <Card className="p-4 lg:col-span-5">
              <h3 className="mb-0.5 text-sm font-semibold">{t("costsTitle")}</h3>
              <p className="mb-3 text-xs text-muted-foreground">{t("costsSub")}</p>
              <p className="text-sm leading-relaxed">{t("costsBody")}</p>
              <p className="mt-3 text-xs text-muted-foreground">{t("costsCoverage", { known: st.costedItems, total: st.trackedItems })}</p>
            </Card>
          )}
        </div>

        {/* ───── stock health ───── */}
        <Card className="p-4">
          <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
            <div>
              <h3 className="text-sm font-semibold">{t("stockTitle")}</h3>
              <p className="text-xs text-muted-foreground">{t("stockSub", { count: st.trackedItems })}</p>
            </div>
            {st.stockValue > 0 && (
              <p className="text-sm">
                <span className="text-muted-foreground">{t("stockValue")} </span>
                <span className="font-semibold tabular-nums">{money(st.stockValue)}</span>
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <StockStat label={t("outOfStock")} count={st.outOfStock} note={st.outOfStockTopSellers > 0 ? t("topSellersAmong", { count: st.outOfStockTopSellers }) : undefined} none={t("none")} />
            <StockStat label={t("lowStock")} count={st.lowStock} note={t("lowStockNote")} none={t("none")} />
            <StockStat label={t("negativeStock")} count={st.negativeStock} note={t("negativeNote")} none={t("none")} />
            <StockStat label={t("deadStock")} count={st.deadItems} note={st.deadValue > 0 ? money(st.deadValue) : t("deadNote", { days: st.deadDays })} none={t("none")} />
          </div>

          <div className="mt-5 grid gap-6 lg:grid-cols-2">
            <div>
              <h4 className="text-sm font-medium">{t("runningOut")}</h4>
              <p className="mb-2 text-xs text-muted-foreground">{t("runningOutSub", { days: st.coverDays })}</p>
              {st.atRisk.length === 0 ? (
                <p className="flex items-center gap-1.5 py-2 text-sm" style={{ color: "var(--viz-good)" }}>
                  <Check className="h-4 w-4" />
                  {t("runningOutNone")}
                </p>
              ) : (
                <ul className="divide-y">
                  {st.atRisk.map((r) => (
                    <li key={r.code} className="flex items-center justify-between gap-3 py-2 text-sm">
                      <div className="min-w-0">
                        <p className="line-clamp-1 break-words" title={r.name}>{r.name}</p>
                        <p className="truncate text-[11px] text-muted-foreground">{[r.category, t("perDay", { qty: num(r.perDay) })].filter(Boolean).join(" · ")}</p>
                      </div>
                      <div className="shrink-0 text-end">
                        <p className="font-semibold tabular-nums" style={{ color: r.coverDays <= 0 ? "var(--viz-bad)" : "var(--viz-warn)" }}>
                          {r.onHand <= 0 ? t("outShort") : t("daysLeft", { days: r.coverDays })}
                        </p>
                        <p className="text-[11px] tabular-nums text-muted-foreground">{t("onHand", { qty: num(r.onHand) })}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="space-y-5">
              {st.negativeStock > 0 && (
                <div>
                  <h4 className="text-sm font-medium">{t("negativeTitle")}</h4>
                  <p className="mb-2 text-xs text-muted-foreground">{t("negativeSub")}</p>
                  <ul className="divide-y">
                    {st.negativeSamples.map((r) => (
                      <li key={r.code} className="flex items-center justify-between gap-3 py-2 text-sm">
                        <p className="line-clamp-1 min-w-0 break-words" title={r.name}>{r.name}</p>
                        <p className="shrink-0 font-semibold tabular-nums" style={{ color: "var(--viz-bad)" }}>{num(r.onHand)}</p>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              <div>
                <h4 className="text-sm font-medium">{t("deadTitle")}</h4>
                <p className="mb-2 text-xs text-muted-foreground">{t("deadSub", { days: st.deadDays })}</p>
                {st.deadSamples.length > 0 ? (
                  <ul className="divide-y">
                    {st.deadSamples.map((r) => (
                      <li key={r.code} className="flex items-center justify-between gap-3 py-2 text-sm">
                        <div className="min-w-0">
                          <p className="line-clamp-1 break-words" title={r.name}>{r.name}</p>
                          <p className="truncate text-[11px] text-muted-foreground">{[r.category, t("onHand", { qty: num(r.onHand) })].filter(Boolean).join(" · ")}</p>
                        </div>
                        {r.value > 0 && <p className="shrink-0 font-semibold tabular-nums">{money(r.value)}</p>}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="flex items-center gap-1.5 py-2 text-sm" style={{ color: "var(--viz-good)" }}>
                    <Check className="h-4 w-4" />
                    {t("deadNone")}
                  </p>
                )}
              </div>
            </div>
          </div>
        </Card>

        {/* ───── team + leakage ───── */}
        <div className="grid gap-4 lg:grid-cols-12">
          <ChartCard
            className="lg:col-span-7"
            title={t("cashiersTitle")}
            subtitle={d.terminals.length > 1 ? t("cashiersSubTerminals", { terminals: d.terminals.map((x) => `${x.code} ${compactNumber(x.sales)}`).join(" · ") }) : t("cashiersSub")}
            tableLabel={t("tableView")}
            table={{ columns: [t("cashier"), t("bills"), t("averageBasket"), t("sales")], rows: d.cashiers.map((c) => [c.code, c.bills, money(c.averageBasket), money(c.sales)]) }}
          >
            <RankedBars rows={cashierRows} emptyLabel={t("noSales")} />
          </ChartCard>

          <Card className="p-4 lg:col-span-5">
            <h3 className="mb-0.5 text-sm font-semibold">{t("leakageTitle")}</h3>
            <p className="mb-3 text-xs text-muted-foreground">{t("leakageSub")}</p>
            <div className="grid grid-cols-2 gap-3">
              <Leak label={t("voidedBills")} count={d.leakage.voidedBills} value={money(d.leakage.voidedValue)} none={t("none")} />
              <Leak label={t("returns")} count={d.leakage.returns} value={money(d.leakage.returnedValue)} none={t("none")} />
              <Leak label={t("priceOverrides")} count={d.leakage.priceOverrides} value={money(d.leakage.priceOverrideValue)} none={t("none")} />
              <Leak label={t("wastage")} count={d.leakage.wastageEntries} value={money(d.leakage.wastageValue)} none={t("none")} />
              <div className="col-span-2">
                <Leak label={t("discounts")} count={d.leakage.discounts > 0 ? 1 : 0} value={money(d.leakage.discounts)} none={t("none")} hideCount />
              </div>
            </div>
            {d.leakage.topWastageReason && <p className="mt-3 text-xs text-muted-foreground">{t("topWastage", { reason: d.leakage.topWastageReason })}</p>}
          </Card>
        </div>

        {/* ───── trading company ───── */}
        {showTrading && (
          <>
            <div>
              <h2 className="flex items-center gap-2 text-lg font-semibold">
                <Truck className="h-5 w-5 text-muted-foreground" />
                {t("tradingTitle")}
              </h2>
              <p className="text-xs text-muted-foreground">{t("tradingSub")}</p>
            </div>
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
              <Tile
                icon={Receipt}
                label={t("invoiced")}
                value={moneyShort(tr.current.invoiced)}
                title={money(tr.current.invoiced)}
                delta={<Delta current={tr.current.invoiced} previous={tr.previous.invoiced} vsLabel={vs} noPreviousLabel={noPrev} />}
                extra={d.days > 1 ? <Sparkline values={tr.flow.map((p) => p.invoiced)} height={28} /> : undefined}
              />
              <Tile
                icon={Truck}
                label={t("purchases")}
                value={moneyShort(tr.current.purchased)}
                title={money(tr.current.purchased)}
                delta={<Delta current={tr.current.purchased} previous={tr.previous.purchased} vsLabel={vs} noPreviousLabel={noPrev} neutral />}
                extra={d.days > 1 ? <Sparkline values={tr.flow.map((p) => p.purchased)} height={28} /> : undefined}
              />
              <Tile
                icon={Wallet}
                label={t("collected")}
                value={moneyShort(tr.current.collected)}
                title={money(tr.current.collected)}
                delta={<Delta current={tr.current.collected} previous={tr.previous.collected} vsLabel={vs} noPreviousLabel={noPrev} />}
              />
              <Tile
                icon={Boxes}
                label={t("openPurchaseOrders")}
                value={String(tr.openPurchaseOrders)}
                delta={tr.openPurchaseOrders > 0 ? <span className="text-xs text-muted-foreground">{money(tr.openPurchaseOrderValue)}</span> : <span className="text-xs text-muted-foreground">{t("none")}</span>}
              />
            </div>
            <div className="grid gap-4 lg:grid-cols-12">
              <ChartCard
                className="lg:col-span-6"
                title={t("topCustomers")}
                subtitle={t("topCustomersSub")}
                tableLabel={t("tableView")}
                table={{ columns: [t("customer"), t("invoices"), t("invoiced")], rows: tr.topCustomers.map((c) => [c.name, c.invoices, money(c.total)]) }}
              >
                <RankedBars
                  rows={tr.topCustomers.map((c) => ({ key: c.code || "-", label: c.name || t("walkIn"), sublabel: t("invoicesCount", { count: c.invoices }), value: c.total, display: money(c.total) }))}
                  emptyLabel={t("noTrading")}
                />
              </ChartCard>
              <ChartCard
                className="lg:col-span-6"
                title={t("topSuppliers")}
                subtitle={t("topSuppliersSub")}
                tableLabel={t("tableView")}
                table={{ columns: [t("supplier"), t("bills"), t("purchases")], rows: tr.topSuppliers.map((s) => [s.name, s.bills, money(s.total)]) }}
              >
                <RankedBars
                  rows={tr.topSuppliers.map((s) => ({ key: s.code || "-", label: s.name || s.code, sublabel: t("billsCount", { count: s.bills }), value: s.total, display: money(s.total) }))}
                  emptyLabel={t("noTrading")}
                />
              </ChartCard>
            </div>
          </>
        )}
      </div>
    </>
  );
}

/* ───────────────────────────── small local pieces ───────────────────────────── */

function Tile({
  icon: Icon,
  label,
  value,
  title,
  delta,
  extra,
}: {
  icon: typeof Receipt;
  label: string;
  value: string;
  /** Full-precision value shown on hover when `value` is abbreviated. */
  title?: string;
  delta: React.ReactNode;
  extra?: React.ReactNode;
}) {
  return (
    <Card className="flex flex-col justify-between p-4">
      <p className="flex items-center gap-2 text-sm text-muted-foreground">
        <Icon className="h-4 w-4" />
        {label}
      </p>
      <p className="mt-1 truncate text-2xl font-semibold" title={title}>{value}</p>
      <div className="mt-1 min-h-4">{delta}</div>
      {extra && <div className="mt-2">{extra}</div>}
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

function StockStat({ label, count, note, none }: { label: string; count: number; note?: string; none: string }) {
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
          <p className="mt-1 text-2xl font-semibold tabular-nums">{count}</p>
          {note && <p className="truncate text-[11px] text-muted-foreground" title={note}>{note}</p>}
        </>
      )}
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
