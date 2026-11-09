"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useQuery } from "@tanstack/react-query";
import { Award, History } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useAuthStore } from "@/stores/auth-store";
import { loyaltyService } from "@/lib/api/services/loyalty-service";
import { formatMoney } from "@/lib/utils";
import { useCurrencyStore } from "@/stores/currency-store";

/**
 * Compact loyalty panel (spec §18/§49) shown once a customer is attached to
 * the bill — balance + redemption value + [History]. Redemption itself
 * happens in the Payment dialog's own "Loyalty Points" tender tile (see
 * use-loyalty-redeem-check.ts), not here — this is read-only display.
 */
export function LoyaltyBalanceBadge({ customerCode }: { customerCode: string }) {
  const t = useTranslations("pos");
  const tl = useTranslations("loyalty");
  const currency = useCurrencyStore((s) => s.currencyCode);
  const compId = useAuthStore((s) => s.user?.compId ?? "");
  const [historyOpen, setHistoryOpen] = useState(false);

  const { data } = useQuery({
    queryKey: ["loyalty-lookup", compId, customerCode],
    queryFn: () => loyaltyService.lookup(compId, { customerCode }),
    enabled: !!compId && !!customerCode,
  });

  const { data: history } = useQuery({
    queryKey: ["loyalty-history", compId, data?.loyaltyNo],
    queryFn: () => loyaltyService.getHistory(compId, data!.loyaltyNo!),
    enabled: historyOpen && !!compId && !!data?.loyaltyNo,
  });

  if (!data?.found || !data.loyaltyNo) return null;

  return (
    <>
      <Badge variant="secondary" className="gap-1">
        <Award className="h-3 w-3" />
        {data.currentPoints} {t("loyaltyPoints")} · {formatMoney(data.redemptionValue, currency)}
      </Badge>
      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setHistoryOpen(true)} aria-label={tl("history")}>
        <History className="h-4 w-4" />
      </Button>

      <Dialog open={historyOpen} onOpenChange={setHistoryOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{tl("history")}</DialogTitle>
          </DialogHeader>
          <div className="max-h-80 space-y-2 overflow-y-auto">
            {(history ?? []).map((h) => (
              <div key={h.id} className="flex items-center justify-between border-b pb-1 text-sm">
                <div>
                  <p className="font-medium">{tl(`type_${h.transType}` as never)}</p>
                  <p className="text-xs text-muted-foreground">{new Date(h.transactionDate).toLocaleDateString()}</p>
                </div>
                <div className="text-end">
                  <p className="tabular-nums">
                    {h.earnedPoints > 0 && `+${h.earnedPoints}`}
                    {h.redeemedPoints > 0 && `-${h.redeemedPoints}`}
                    {h.expiredPoints > 0 && `-${h.expiredPoints}`}
                    {h.adjustmentPoints !== 0 && (h.adjustmentPoints > 0 ? `+${h.adjustmentPoints}` : h.adjustmentPoints)}
                  </p>
                  <p className="text-xs text-muted-foreground">{tl("balance")}: {h.balancePoints}</p>
                </div>
              </div>
            ))}
            {history && history.length === 0 && <p className="text-sm text-muted-foreground">{tl("noHistory")}</p>}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
