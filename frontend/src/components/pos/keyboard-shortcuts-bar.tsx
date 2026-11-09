"use client";

import { useTranslations } from "next-intl";

const SHORTCUTS: { key: string; labelKey: "searchProduct" | "holdBill" | "heldBills" | "pay" | "cashDrawerOpen" | "returnBill" | "newSaleAction" }[] = [
  { key: "F1", labelKey: "searchProduct" },
  { key: "F2", labelKey: "holdBill" },
  { key: "F3", labelKey: "heldBills" },
  { key: "F4", labelKey: "pay" },
  { key: "F6", labelKey: "cashDrawerOpen" },
  { key: "F8", labelKey: "returnBill" },
  { key: "F9", labelKey: "newSaleAction" },
];

/** Always-visible reference strip, not a modal — cashiers glance at it, they don't open a dialog to remember a shortcut mid-sale. */
export function KeyboardShortcutsBar() {
  const t = useTranslations("pos");

  return (
    <div className="flex flex-wrap items-center gap-3 border-t bg-muted/30 px-3 py-1.5 text-xs text-muted-foreground">
      {SHORTCUTS.map((s) => (
        <span key={s.key} className="flex items-center gap-1">
          <kbd className="rounded border bg-background px-1.5 py-0.5 font-mono text-[10px]">{s.key}</kbd>
          {t(s.labelKey)}
        </span>
      ))}
    </div>
  );
}
