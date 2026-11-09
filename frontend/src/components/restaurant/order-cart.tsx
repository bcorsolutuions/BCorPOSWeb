"use client";

import { useLocale, useTranslations } from "next-intl";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCurrencyStore } from "@/stores/currency-store";
import { formatMoney, formatMoneyPlain } from "@/lib/utils";
import { draftLineTotals, groupDraftLines, type DraftOrderLine } from "@/lib/restaurant/kot-mappers";

export function OrderCart({ lines, onRemove }: { lines: DraftOrderLine[]; onRemove: (draftId: string) => void }) {
  const t = useTranslations("order");
  const locale = useLocale();
  const currency = useCurrencyStore((s) => s.currencyCode);

  const total = lines.reduce((sum, l) => sum + draftLineTotals(l).netAmount, 0);

  if (lines.length === 0) {
    return <p className="py-10 text-center text-sm text-muted-foreground">{t("noItemsInOrder")}</p>;
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 space-y-2 overflow-y-auto">
        {groupDraftLines(lines).map((group) => {
          // groupLines only ever produces non-empty arrays (each group
          // starts from at least the line that seeded it), so group[0] is
          // always defined here — the `!` just tells TS what's structurally
          // guaranteed.
          const priced = group.find((l) => l.comboCode || l.setMenuCode) ?? group[0]!;
          const totals = draftLineTotals(priced);
          const children = (priced.comboComponents ?? priced.setMenuComponents ?? []).filter((c) => c.selected);
          return (
            <div key={priced.draftId} className="rounded-md border p-2 text-sm">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-medium">
                    {priced.qty}× {priced.menuName}
                  </p>
                  {priced.courseName && <p className="text-xs text-muted-foreground">{priced.courseName}</p>}
                  {priced.modifiers.length > 0 && (
                    <p className="text-xs text-muted-foreground">{priced.modifiers.map((m) => m.name).join(", ")}</p>
                  )}
                  {priced.preparationNotes && <p className="text-xs italic text-muted-foreground">{priced.preparationNotes}</p>}
                  {children.length > 0 && (
                    <ul className="mt-1 space-y-0.5 ps-3">
                      {children.map((c) => (
                        <li key={c.code} className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span>{c.name}</span>
                          {c.additionalPrice > 0 && <span>+{formatMoneyPlain(c.additionalPrice, currency, locale)}</span>}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <span className="tabular-nums">{formatMoneyPlain(totals.netAmount, currency, locale)}</span>
                  <button onClick={() => group.forEach((l) => onRemove(l.draftId))} aria-label={t("removeItem")}>
                    <Trash2 className="h-3.5 w-3.5 text-destructive" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex items-center justify-between border-t pt-2 text-sm font-semibold">
        <span>{t("currentOrder")}</span>
        <span className="tabular-nums">{formatMoney(total, currency, locale)}</span>
      </div>
    </div>
  );
}
