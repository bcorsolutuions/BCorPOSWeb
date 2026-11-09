"use client";

import { useTranslations } from "next-intl";
import { AlertTriangle, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { GlPosting } from "@/lib/api/services/pos-operations-service";

/**
 * What happened to the general ledger posting of a shift that was just closed. The shift itself is always closed; this only says
 * whether its sales, collections, VAT and cost of sales were summarised into the books. A company without the Accounts module
 * (status "NotApplicable") sees nothing.
 */
export function GlPostingNote({ posting }: { posting: GlPosting }) {
  const t = useTranslations("shiftReport");
  if (posting.status === "NotApplicable") return null;

  const ok = posting.status === "Posted" || posting.status === "AlreadyPosted";
  const Icon = ok ? CheckCircle2 : AlertTriangle;
  return (
    <div className={cn("space-y-1 rounded-md border p-3 text-sm", ok ? "border-green-600/40 bg-green-50 dark:bg-green-950/20" : "border-amber-500/50 bg-amber-50 dark:bg-amber-950/20")}>
      <p className="flex items-start gap-2 font-medium">
        <Icon className={cn("mt-0.5 h-4 w-4 shrink-0", ok ? "text-green-600" : "text-amber-600")} />
        <span>
          {ok ? t("glPosted") : posting.status === "Failed" ? t("glFailed") : t("glSkipped")}
          {ok && posting.jvDocNo != null && <span className="font-normal text-muted-foreground"> — {t("glVoucher", { no: posting.jvDocNo })}</span>}
        </span>
      </p>
      {!ok && <p className="ps-6 text-muted-foreground">{posting.message}</p>}
      {posting.stockBillsPosted > 0 && <p className="ps-6 text-muted-foreground">{t("glStockPosted", { count: posting.stockBillsPosted })}</p>}
      {posting.warnings.map((w) => (
        <p key={w} className="ps-6 text-amber-700 dark:text-amber-400">
          {w}
        </p>
      ))}
    </div>
  );
}
