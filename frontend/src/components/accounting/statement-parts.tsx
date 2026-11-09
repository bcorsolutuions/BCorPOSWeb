"use client";

import { useLocale } from "next-intl";
import { useCurrencyStore } from "@/stores/currency-store";
import { cn, formatMoney } from "@/lib/utils";
import type { StatementSection } from "@/types/financial-statements";

export function Money({ value, className }: { value: number; className?: string }) {
  const locale = useLocale();
  const currency = useCurrencyStore((s) => s.currencyCode);
  return <span className={cn("tabular-nums", className)}>{formatMoney(value, currency, locale)}</span>;
}

/** A computed line of a statement (Gross Profit, Net Profit, Total Assets...). */
export function StatementTotal({
  label,
  value,
  emphasis,
  negativeIsBad,
}: {
  label: string;
  value: number;
  emphasis?: boolean;
  negativeIsBad?: boolean;
}) {
  return (
    <div className={cn("flex items-center justify-between gap-4 px-2 py-2", emphasis ? "border-y-2 text-base font-bold" : "border-t font-semibold")}>
      <span>{label}</span>
      <Money value={value} className={cn(negativeIsBad && value < 0 && "text-destructive")} />
    </div>
  );
}

/** One section (Revenue, Assets...): its groups with their accounts, a subtotal per group, and the section total. */
export function StatementSectionBlock({ section, title, totalLabel }: { section: StatementSection; title: string; totalLabel?: string }) {
  return (
    <section className="space-y-1">
      <h3 className="bg-muted/60 px-2 py-1.5 text-sm font-semibold uppercase tracking-wide">{title}</h3>
      {section.groups.length === 0 && <p className="px-2 py-1 text-sm text-muted-foreground">—</p>}
      {section.groups.map((g) => (
        <div key={g.code} className="space-y-0.5">
          <p className="px-2 pt-1 text-sm font-medium">{g.name}</p>
          {g.rows.map((r) => (
            <div key={`${g.code}-${r.glCode}-${r.glName}`} className="flex items-center justify-between gap-4 ps-6 pe-2 text-sm">
              <span className="min-w-0 truncate">
                {r.glCode && <span className="me-2 font-mono text-xs text-muted-foreground">{r.glCode}</span>}
                {r.glName}
              </span>
              <Money value={r.amount} />
            </div>
          ))}
          {g.rows.length > 1 && (
            <div className="flex items-center justify-between gap-4 ps-6 pe-2 text-sm font-medium text-muted-foreground">
              <span>{g.name}</span>
              <Money value={g.total} />
            </div>
          )}
        </div>
      ))}
      <div className="flex items-center justify-between gap-4 border-t px-2 py-1.5 text-sm font-semibold">
        <span>{totalLabel ?? title}</span>
        <Money value={section.total} />
      </div>
    </section>
  );
}
