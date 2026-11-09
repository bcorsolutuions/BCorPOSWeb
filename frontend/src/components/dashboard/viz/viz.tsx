"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { Minus, Table2, TrendingDown, TrendingUp } from "lucide-react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

/*
 * Small SVG / HTML chart kit for the dashboards (no chart library in the app).
 *
 * Colours: the validated categorical order (blue, orange, aqua, yellow) - never cycled; a fifth+ category folds into "Other".
 * Dark mode has its own selected steps (not an automatic flip). Text always wears the app's text tokens, never a series colour.
 * Marks: bars <= 24px with a 4px rounded data end, 2px lines, >= 8px end dots with a 2px surface ring, 2px surface gaps,
 * hairline recessive grid. Every chart has a hover/focus tooltip and a "table" view carrying the same numbers.
 */

export const VIZ_STYLE = `
.viz-root{--viz-1:#2a78d6;--viz-2:#eb6834;--viz-3:#1baf7a;--viz-4:#eda100;--viz-other:#8f8e89;--viz-muted:#c9c8c2;--viz-good:#0ca30c;--viz-bad:#d03b3b;--viz-warn:#c98500}
.dark .viz-root{--viz-1:#3987e5;--viz-2:#d95926;--viz-3:#199e70;--viz-4:#c98500;--viz-other:#8f8e89;--viz-muted:#3c3c39;--viz-good:#2fbf4f;--viz-bad:#e66767;--viz-warn:#fab219}
.viz-root .viz-grid{stroke:hsl(var(--border));stroke-width:1}
.viz-root .viz-surface{stroke:hsl(var(--card))}
.viz-root .viz-axis-text{fill:hsl(var(--muted-foreground));font-size:11px}
@media (forced-colors:active){.viz-root .viz-seg{forced-color-adjust:none}}
`;

export const SERIES = ["var(--viz-1)", "var(--viz-2)", "var(--viz-3)", "var(--viz-4)"] as const;
export const OTHER = "var(--viz-other)";

/* ───────────────────────────── helpers ───────────────────────────── */

export function niceMax(v: number): number {
  if (!(v > 0)) return 1;
  const exp = Math.pow(10, Math.floor(Math.log10(v)));
  const f = v / exp;
  const step = f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10;
  return step * exp;
}

export function compactNumber(n: number): string {
  const abs = Math.abs(n);
  if (abs >= 1_000_000) return `${+(n / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `${+(n / 1_000).toFixed(1)}K`;
  return `${+n.toFixed(abs < 10 ? 1 : 0)}`;
}

export function useElementWidth<T extends HTMLElement>() {
  const ref = useRef<T | null>(null);
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => setWidth(Math.round(entries[0]?.contentRect.width ?? 0)));
    ro.observe(el);
    setWidth(Math.round(el.getBoundingClientRect().width));
    return () => ro.disconnect();
  }, []);
  return [ref, width] as const;
}

/* ───────────────────────────── tooltip ───────────────────────────── */

export interface TipContent {
  title?: string;
  rows: { label: string; value: string; color?: string }[];
}
interface TipState extends TipContent {
  x: number;
  y: number;
}

/** One tooltip per chart. Positioned inside the chart's relative wrapper; flips to the left near the right edge. */
export function useTooltip() {
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const [tip, setTip] = useState<TipState | null>(null);

  const show = useCallback((clientX: number, clientY: number, content: TipContent) => {
    const r = wrapRef.current?.getBoundingClientRect();
    if (!r) return;
    setTip({ ...content, x: clientX - r.left, y: clientY - r.top });
  }, []);
  const showAt = useCallback((x: number, y: number, content: TipContent) => setTip({ ...content, x, y }), []);
  const hide = useCallback(() => setTip(null), []);

  const node = tip ? (
    <div
      role="status"
      className="pointer-events-none absolute z-20 min-w-[7rem] max-w-[14rem] rounded-md border bg-popover px-2.5 py-1.5 text-xs shadow-md"
      style={{
        left: tip.x,
        top: Math.max(0, tip.y - 8),
        transform: `translate(${wrapRef.current && tip.x > wrapRef.current.clientWidth * 0.6 ? "calc(-100% - 12px)" : "12px"}, -100%)`,
      }}
    >
      {tip.title && <p className="mb-1 font-medium text-muted-foreground">{tip.title}</p>}
      {tip.rows.map((r, i) => (
        <p key={i} className="flex items-center justify-between gap-3">
          <span className="flex items-center gap-1.5 text-muted-foreground">
            {r.color && <span className="inline-block h-0.5 w-3 rounded" style={{ background: r.color }} />}
            {r.label}
          </span>
          <span className="font-semibold tabular-nums text-foreground">{r.value}</span>
        </p>
      ))}
    </div>
  ) : null;

  return { wrapRef, show, showAt, hide, node };
}

/* ───────────────────────────── card + table view ───────────────────────────── */

export interface TableView {
  columns: string[];
  rows: (string | number)[][];
}

export function ChartCard({
  title,
  subtitle,
  table,
  tableLabel,
  className,
  children,
}: {
  title: string;
  subtitle?: string;
  table?: TableView;
  tableLabel?: string;
  className?: string;
  children: ReactNode;
}) {
  const [asTable, setAsTable] = useState(false);
  return (
    <Card className={cn("flex min-w-0 flex-col p-4", className)}>
      <div className="mb-3 flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="truncate text-sm font-semibold">{title}</h3>
          {subtitle && <p className="truncate text-xs text-muted-foreground">{subtitle}</p>}
        </div>
        {table && (
          <button
            type="button"
            onClick={() => setAsTable((v) => !v)}
            aria-pressed={asTable}
            aria-label={tableLabel}
            title={tableLabel}
            className={cn(
              "shrink-0 rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground",
              asTable && "bg-accent text-accent-foreground",
            )}
          >
            <Table2 className="h-4 w-4" />
          </button>
        )}
      </div>
      {asTable && table ? (
        <div className="max-h-72 overflow-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b text-muted-foreground">
                {table.columns.map((c, i) => (
                  <th key={i} className={cn("py-1.5 font-medium", i === 0 ? "text-start" : "text-end")}>
                    {c}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {table.rows.map((r, ri) => (
                <tr key={ri} className="border-b last:border-0">
                  {r.map((cell, ci) => (
                    <td key={ci} className={cn("py-1.5", ci === 0 ? "text-start" : "text-end tabular-nums")}>
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        children
      )}
    </Card>
  );
}

/* ───────────────────────────── delta + sparkline ───────────────────────────── */

/** Signed change vs the previous period. Colour = direction x whether up is good; always icon + words, never colour alone. */
export function Delta({
  current,
  previous,
  vsLabel,
  noPreviousLabel,
  upIsGood = true,
  neutral = false,
}: {
  current: number;
  previous: number;
  vsLabel: string;
  noPreviousLabel: string;
  upIsGood?: boolean;
  /** Direction is shown but not coloured good/bad (e.g. purchases: more is neither). */
  neutral?: boolean;
}) {
  if (!(previous > 0)) {
    return <span className="text-xs text-muted-foreground">{current > 0 ? noPreviousLabel : ""}</span>;
  }
  const pct = ((current - previous) / previous) * 100;
  const flat = Math.abs(pct) < 0.5;
  const up = pct > 0;
  const good = flat || neutral ? null : up === upIsGood;
  const Icon = flat ? Minus : up ? TrendingUp : TrendingDown;
  return (
    <span className="inline-flex items-center gap-1 text-xs">
      <span
        className="inline-flex items-center gap-1 font-semibold tabular-nums"
        style={{ color: good == null ? undefined : good ? "var(--viz-good)" : "var(--viz-bad)" }}
      >
        <Icon className="h-3.5 w-3.5" />
        {flat ? "0%" : `${up ? "+" : ""}${pct.toFixed(Math.abs(pct) < 10 ? 1 : 0)}%`}
      </span>
      <span className="text-muted-foreground">{vsLabel}</span>
    </span>
  );
}

export function Sparkline({ values, height = 40, className }: { values: number[]; height?: number; className?: string }) {
  const [ref, width] = useElementWidth<HTMLDivElement>();
  const w = Math.max(width, 10);
  const pad = 6;
  const max = Math.max(...values, 0);
  const n = values.length;
  const x = (i: number) => pad + (n <= 1 ? (w - 2 * pad) / 2 : (i * (w - 2 * pad)) / (n - 1));
  const y = (v: number) => height - pad - (max > 0 ? (v / max) * (height - 2 * pad) : 0);
  const path = values.map((v, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(" ");
  return (
    <div ref={ref} className={cn("w-full", className)} aria-hidden="true">
      <svg width={w} height={height}>
        {n > 1 && <path d={path} fill="none" stroke="var(--viz-1)" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />}
        {n > 0 && <circle cx={x(n - 1)} cy={y(values[n - 1] ?? 0)} r={4} fill="var(--viz-1)" className="viz-surface" strokeWidth={2} />}
      </svg>
    </div>
  );
}

/* ───────────────────────────── area trend (crosshair) ───────────────────────────── */

export interface TrendPoint {
  label: string;
  tickLabel: string;
  value: number;
  bills?: number;
}

export function AreaTrend({
  data,
  height = 230,
  format,
  seriesLabel,
  billsLabel,
}: {
  data: TrendPoint[];
  height?: number;
  format: (n: number) => string;
  seriesLabel: string;
  billsLabel: string;
}) {
  const [ref, width] = useElementWidth<HTMLDivElement>();
  const { wrapRef, showAt, hide, node } = useTooltip();
  const [hover, setHover] = useState<number | null>(null);
  const w = Math.max(width, 200);
  const m = { l: 44, r: 16, t: 14, b: 26 };
  const iw = w - m.l - m.r;
  const ih = height - m.t - m.b;
  const n = data.length;
  const yMax = niceMax(Math.max(...data.map((d) => d.value), 0));
  const x = (i: number) => m.l + (n <= 1 ? iw / 2 : (i * iw) / (n - 1));
  const y = (v: number) => m.t + ih - (v / yMax) * ih;
  const line = data.map((d, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(d.value).toFixed(1)}`).join(" ");
  const area = n > 1 ? `${line} L${x(n - 1).toFixed(1)},${m.t + ih} L${x(0).toFixed(1)},${m.t + ih} Z` : "";
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((f) => f * yMax);
  const labelEvery = Math.max(1, Math.ceil(n / Math.max(2, Math.floor(iw / 70))));
  const peakIdx = data.reduce((best, d, i) => (d.value > (data[best]?.value ?? -1) ? i : best), 0);

  function onMove(e: React.PointerEvent<SVGRectElement>) {
    const r = (e.currentTarget as SVGRectElement).getBoundingClientRect();
    const px = e.clientX - r.left;
    const i = n <= 1 ? 0 : Math.min(n - 1, Math.max(0, Math.round((px / r.width) * (n - 1))));
    setHover(i);
    const d = data[i]!;
    showAt(x(i), y(d.value), {
      title: d.label,
      rows: [
        { label: seriesLabel, value: format(d.value), color: "var(--viz-1)" },
        ...(d.bills != null ? [{ label: billsLabel, value: String(d.bills) }] : []),
      ],
    });
  }

  return (
    <div ref={ref} className="w-full">
      <div ref={wrapRef} className="relative" style={{ height }}>
        <svg width={w} height={height} role="img" aria-label={seriesLabel}>
          {ticks.map((t, i) => (
            <g key={i}>
              <line className="viz-grid" x1={m.l} x2={w - m.r} y1={y(t)} y2={y(t)} />
              <text className="viz-axis-text" x={m.l - 8} y={y(t) + 4} textAnchor="end">
                {compactNumber(t)}
              </text>
            </g>
          ))}
          {data.map((d, i) =>
            i % labelEvery === 0 || i === n - 1 ? (
              <text key={i} className="viz-axis-text" x={x(i)} y={height - 6} textAnchor={i === 0 ? "start" : i === n - 1 ? "end" : "middle"}>
                {d.tickLabel}
              </text>
            ) : null,
          )}
          {area && <path d={area} fill="var(--viz-1)" opacity={0.1} />}
          {n > 1 && <path d={line} fill="none" stroke="var(--viz-1)" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />}
          {/* the one label: the peak */}
          {data[peakIdx] && data[peakIdx]!.value > 0 && (
            <text className="fill-foreground" x={x(peakIdx)} y={y(data[peakIdx]!.value) - 10} textAnchor={peakIdx > n * 0.8 ? "end" : peakIdx < n * 0.2 ? "start" : "middle"} fontSize={11} fontWeight={600}>
              {format(data[peakIdx]!.value)}
            </text>
          )}
          {hover != null && (
            <>
              <line x1={x(hover)} x2={x(hover)} y1={m.t} y2={m.t + ih} className="viz-grid" />
              <circle cx={x(hover)} cy={y(data[hover]!.value)} r={5} fill="var(--viz-1)" className="viz-surface" strokeWidth={2} />
            </>
          )}
          {hover == null && n > 0 && <circle cx={x(n - 1)} cy={y(data[n - 1]!.value)} r={4} fill="var(--viz-1)" className="viz-surface" strokeWidth={2} />}
          <rect
            x={m.l}
            y={m.t}
            width={iw}
            height={ih}
            fill="transparent"
            onPointerMove={onMove}
            onPointerLeave={() => {
              setHover(null);
              hide();
            }}
          />
        </svg>
        {node}
      </div>
    </div>
  );
}

/* ───────────────────────────── columns (emphasis) ───────────────────────────── */

export interface ColumnPoint {
  label: string;
  tickLabel: string;
  value: number;
  bills?: number;
}

export function Columns({
  data,
  height = 210,
  format,
  seriesLabel,
  billsLabel,
  highlight,
  tickEvery = 3,
}: {
  data: ColumnPoint[];
  height?: number;
  format: (n: number) => string;
  seriesLabel: string;
  billsLabel: string;
  /** Index drawn in the accent hue; every other column is the de-emphasis grey. */
  highlight?: number;
  tickEvery?: number;
}) {
  const [ref, width] = useElementWidth<HTMLDivElement>();
  const { wrapRef, showAt, hide, node } = useTooltip();
  const [hover, setHover] = useState<number | null>(null);
  const w = Math.max(width, 200);
  const m = { l: 44, r: 8, t: 16, b: 26 };
  const iw = w - m.l - m.r;
  const ih = height - m.t - m.b;
  const n = data.length;
  const slot = iw / Math.max(n, 1);
  const bw = Math.min(20, Math.max(3, slot - 4));
  const yMax = niceMax(Math.max(...data.map((d) => d.value), 0));
  const y = (v: number) => m.t + ih - (v / yMax) * ih;
  const ticks = [0, 0.5, 1].map((f) => f * yMax);

  // 4px rounded data end, square at the baseline.
  const barPath = (x0: number, top: number, bottom: number, width2: number) => {
    const h = bottom - top;
    const r = Math.min(4, h, width2 / 2);
    return `M${x0},${bottom} L${x0},${top + r} Q${x0},${top} ${x0 + r},${top} L${x0 + width2 - r},${top} Q${x0 + width2},${top} ${x0 + width2},${top + r} L${x0 + width2},${bottom} Z`;
  };

  return (
    <div ref={ref} className="w-full">
      <div ref={wrapRef} className="relative" style={{ height }}>
        <svg width={w} height={height} role="img" aria-label={seriesLabel}>
          {ticks.map((t, i) => (
            <g key={i}>
              <line className="viz-grid" x1={m.l} x2={w - m.r} y1={y(t)} y2={y(t)} />
              <text className="viz-axis-text" x={m.l - 8} y={y(t) + 4} textAnchor="end">
                {compactNumber(t)}
              </text>
            </g>
          ))}
          {data.map((d, i) => {
            const cx = m.l + slot * i + slot / 2;
            const top = y(d.value);
            const isHi = highlight === i;
            const isHover = hover === i;
            return (
              <g key={i}>
                {d.value > 0 && (
                  <path
                    className="viz-seg"
                    d={barPath(cx - bw / 2, top, m.t + ih, bw)}
                    fill={isHi || isHover ? "var(--viz-1)" : "var(--viz-muted)"}
                    opacity={isHover && !isHi ? 0.85 : 1}
                  />
                )}
                {i % tickEvery === 0 && (
                  <text className="viz-axis-text" x={cx} y={height - 6} textAnchor="middle">
                    {d.tickLabel}
                  </text>
                )}
                {isHi && d.value > 0 && (
                  <text className="fill-foreground" x={cx} y={top - 6} textAnchor="middle" fontSize={11} fontWeight={600}>
                    {format(d.value)}
                  </text>
                )}
                <rect
                  x={m.l + slot * i}
                  y={m.t}
                  width={slot}
                  height={ih}
                  fill="transparent"
                  tabIndex={0}
                  role="img"
                  aria-label={`${d.label}: ${format(d.value)}`}
                  onPointerMove={() => {
                    setHover(i);
                    showAt(cx, top, {
                      title: d.label,
                      rows: [
                        { label: seriesLabel, value: format(d.value), color: "var(--viz-1)" },
                        ...(d.bills != null ? [{ label: billsLabel, value: String(d.bills) }] : []),
                      ],
                    });
                  }}
                  onPointerLeave={() => {
                    setHover(null);
                    hide();
                  }}
                  onFocus={() => {
                    setHover(i);
                    showAt(cx, top, { title: d.label, rows: [{ label: seriesLabel, value: format(d.value), color: "var(--viz-1)" }] });
                  }}
                  onBlur={() => {
                    setHover(null);
                    hide();
                  }}
                />
              </g>
            );
          })}
        </svg>
        {node}
      </div>
    </div>
  );
}

/* ───────────────────────────── ranked horizontal bars ───────────────────────────── */

export interface RankedRow {
  key: string;
  label: string;
  sublabel?: string;
  value: number;
  display: string;
  detail?: TipContent["rows"];
}

export function RankedBars({ rows, emptyLabel, hint }: { rows: RankedRow[]; emptyLabel: string; hint?: (r: RankedRow) => string }) {
  const { wrapRef, show, hide, node } = useTooltip();
  const max = Math.max(...rows.map((r) => r.value), 0);
  if (rows.length === 0) return <p className="py-8 text-center text-sm text-muted-foreground">{emptyLabel}</p>;
  return (
    <div ref={wrapRef} className="relative space-y-2.5">
      {rows.map((r) => (
        <div
          key={r.key}
          tabIndex={0}
          className="group grid grid-cols-[minmax(0,12rem)_minmax(0,1fr)_auto] items-center gap-3 rounded-sm outline-none focus-visible:ring-1 focus-visible:ring-ring"
          onPointerMove={(e) => show(e.clientX, e.clientY, { title: r.label, rows: r.detail ?? [{ label: r.sublabel ?? "", value: r.display }] })}
          onPointerLeave={hide}
        >
          <div className="min-w-0">
            {/* Two lines, not cut off: "... - Single" and "... - Double" are different items. */}
            <p className="line-clamp-2 break-words text-sm leading-tight" title={r.label}>
              {r.label}
            </p>
            {r.sublabel && <p className="truncate text-[11px] text-muted-foreground">{r.sublabel}</p>}
          </div>
          <div className="h-3 min-w-0" aria-hidden="true">
            <div
              className="viz-seg h-full rounded-e-[4px] transition-opacity group-hover:opacity-80"
              style={{ width: `${max > 0 ? Math.max(2, (r.value / max) * 100) : 0}%`, background: "var(--viz-1)" }}
            />
          </div>
          <p className="text-end text-sm font-semibold tabular-nums">{r.display}</p>
        </div>
      ))}
      {node}
    </div>
  );
}

/* ───────────────────────────── share bar (part-to-whole) ───────────────────────────── */

export interface SharePart {
  key: string;
  label: string;
  value: number;
  display: string;
}

/** One 100% bar split into at most 4 coloured parts (+ "Other"), 2px surface gaps, legend rows with value and share. */
export function ShareBar({ parts, otherLabel, emptyLabel }: { parts: SharePart[]; otherLabel: string; emptyLabel: string }) {
  const { wrapRef, show, hide, node } = useTooltip();
  const positive = parts.filter((p) => p.value > 0);
  const total = positive.reduce((s, p) => s + p.value, 0);
  if (total <= 0) return <p className="py-3 text-sm text-muted-foreground">{emptyLabel}</p>;

  const head = positive.slice(0, 4);
  const tail = positive.slice(4);
  const shown: (SharePart & { color: string })[] = head.map((p, i) => ({ ...p, color: SERIES[i]! }));
  if (tail.length > 0) {
    const v = tail.reduce((s, p) => s + p.value, 0);
    shown.push({ key: "__other", label: otherLabel, value: v, display: tail.length === 1 ? tail[0]!.display : "", color: OTHER });
  }

  return (
    <div ref={wrapRef} className="relative">
      <div className="flex h-3.5 w-full gap-[2px]" role="img" aria-label={shown.map((s) => `${s.label} ${Math.round((s.value / total) * 100)}%`).join(", ")}>
        {shown.map((s, i) => (
          <div
            key={s.key}
            tabIndex={0}
            className={cn("viz-seg h-full outline-none transition-opacity hover:opacity-80 focus-visible:ring-1 focus-visible:ring-ring", i === 0 && "rounded-s-[4px]", i === shown.length - 1 && "rounded-e-[4px]")}
            style={{ width: `${(s.value / total) * 100}%`, background: s.color }}
            onPointerMove={(e) => show(e.clientX, e.clientY, { title: s.label, rows: [{ label: `${Math.round((s.value / total) * 100)}%`, value: s.display || String(s.value), color: s.color }] })}
            onPointerLeave={hide}
          />
        ))}
      </div>
      <ul className="mt-2.5 space-y-1">
        {shown.map((s) => (
          <li key={s.key} className="flex items-center justify-between gap-2 text-sm">
            <span className="flex min-w-0 items-center gap-2">
              <span className="inline-block h-2.5 w-2.5 shrink-0 rounded-[3px]" style={{ background: s.color }} />
              <span className="truncate">{s.label}</span>
            </span>
            <span className="shrink-0 tabular-nums">
              <span className="font-semibold">{s.display}</span>
              <span className="ms-2 text-xs text-muted-foreground">{Math.round((s.value / total) * 100)}%</span>
            </span>
          </li>
        ))}
      </ul>
      {node}
    </div>
  );
}

/* ───────────────────────────── heatmap (weekday x hour) ───────────────────────────── */

export interface HeatCell {
  dow: number;
  hour: number;
  value: number;
  bills?: number;
}

/**
 * Seven weekday rows x the trading hours. One hue, with the amount carried by how strong it is (a sequential scale, so the
 * busiest slots read first); empty slots stay a faint outline. Only the hours that ever had a sale are drawn.
 */
export function Heatmap({
  cells,
  dayOrder,
  dayLabel,
  hourLabel,
  format,
  valueLabel,
  billsLabel,
  emptyLabel,
  lessLabel,
  moreLabel,
}: {
  cells: HeatCell[];
  /** Weekday numbers (0 = Sunday) in display order, top to bottom. */
  dayOrder: number[];
  dayLabel: (dow: number) => string;
  hourLabel: (hour: number) => string;
  format: (n: number) => string;
  valueLabel: string;
  billsLabel: string;
  emptyLabel: string;
  lessLabel: string;
  moreLabel: string;
}) {
  const { wrapRef, show, hide, node } = useTooltip();
  const active = cells.filter((c) => c.value > 0);
  if (active.length === 0) return <p className="py-8 text-center text-sm text-muted-foreground">{emptyLabel}</p>;

  const minHour = Math.min(...active.map((c) => c.hour));
  const maxHour = Math.max(...active.map((c) => c.hour));
  const hours = Array.from({ length: maxHour - minHour + 1 }, (_, i) => minHour + i);
  const max = Math.max(...active.map((c) => c.value));
  const byKey = new Map(cells.map((c) => [`${c.dow}-${c.hour}`, c]));
  const strength = (v: number) => (v <= 0 ? 0 : 0.14 + 0.86 * Math.sqrt(v / max));

  return (
    <div ref={wrapRef} className="relative">
      <div className="overflow-x-auto">
        <div className="grid min-w-[340px] gap-[3px]" style={{ gridTemplateColumns: `2.25rem repeat(${hours.length}, minmax(0, 1fr))` }}>
          <span />
          {hours.map((h, i) => (
            <span key={h} className="whitespace-nowrap text-center text-[11px] text-muted-foreground">
              {i % 2 === 0 ? hourLabel(h) : ""}
            </span>
          ))}
          {dayOrder.map((dow) => (
            <HeatRow key={dow} dow={dow} label={dayLabel(dow)} hours={hours} byKey={byKey} strength={strength} show={show} hide={hide} format={format} valueLabel={valueLabel} billsLabel={billsLabel} hourLabel={hourLabel} />
          ))}
        </div>
      </div>
      <div className="mt-3 flex items-center justify-end gap-2 text-[11px] text-muted-foreground">
        <span>{lessLabel}</span>
        {[0.14, 0.4, 0.65, 0.85, 1].map((s) => (
          <span key={s} className="inline-block h-3 w-5 rounded-[3px]" style={{ background: `color-mix(in srgb, var(--viz-1) ${Math.round(s * 100)}%, transparent)` }} />
        ))}
        <span>{moreLabel}</span>
      </div>
      {node}
    </div>
  );
}

function HeatRow({
  dow,
  label,
  hours,
  byKey,
  strength,
  show,
  hide,
  format,
  valueLabel,
  billsLabel,
  hourLabel,
}: {
  dow: number;
  label: string;
  hours: number[];
  byKey: Map<string, HeatCell>;
  strength: (v: number) => number;
  show: (x: number, y: number, c: TipContent) => void;
  hide: () => void;
  format: (n: number) => string;
  valueLabel: string;
  billsLabel: string;
  hourLabel: (h: number) => string;
}) {
  return (
    <>
      <span className="flex items-center text-xs text-muted-foreground">{label}</span>
      {hours.map((h) => {
        const c = byKey.get(`${dow}-${h}`);
        const v = c?.value ?? 0;
        return (
          <span
            key={h}
            tabIndex={v > 0 ? 0 : -1}
            role="img"
            aria-label={`${label} ${hourLabel(h)}: ${format(v)}`}
            className={cn("viz-seg h-6 rounded-[4px] outline-none focus-visible:ring-1 focus-visible:ring-ring", v <= 0 && "border border-dashed border-border/60")}
            style={v > 0 ? { background: `color-mix(in srgb, var(--viz-1) ${Math.round(strength(v) * 100)}%, transparent)` } : undefined}
            onPointerMove={(e) =>
              v > 0 &&
              show(e.clientX, e.clientY, {
                title: `${label} · ${hourLabel(h)}`,
                rows: [
                  { label: valueLabel, value: format(v), color: "var(--viz-1)" },
                  ...(c?.bills != null ? [{ label: billsLabel, value: String(c.bills) }] : []),
                ],
              })
            }
            onPointerLeave={hide}
          />
        );
      })}
    </>
  );
}

/* ───────────────────────────── meter ───────────────────────────── */

/**
 * A single ratio against a limit. The unfilled track is a lighter step of the same hue. The fill stays in the accent hue:
 * for a restaurant a full house is good news, so "nearly full" is deliberately not painted as a warning.
 */
export function Meter({ value, max, label }: { value: number; max: number; label: string }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div role="meter" aria-valuemin={0} aria-valuemax={max} aria-valuenow={value} aria-label={label}>
      <div className="h-2.5 w-full overflow-hidden rounded-full" style={{ background: "color-mix(in srgb, var(--viz-1) 18%, transparent)" }}>
        <div className="viz-seg h-full rounded-full transition-[width]" style={{ width: `${pct}%`, background: "var(--viz-1)" }} />
      </div>
    </div>
  );
}
