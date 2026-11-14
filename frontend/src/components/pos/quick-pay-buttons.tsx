"use client";

import { useTranslations } from "next-intl";
import { Banknote, CreditCard, Landmark, Loader2, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** The payment methods that pay the whole bill in one tap (anything else goes through the Payment dialog). */
export type QuickPayType = "Cash" | "Card" | "BenefitPay";

/**
 * The payment buttons of the bill screen. Cash, Card and BenefitPay each take the full bill amount, complete the sale and print the
 * receipt at once; Payment opens the payment dialog for split payments, credit, gift vouchers and loyalty points.
 * Cash is the big top button (most sales), the other three sit under it.
 */
export function QuickPayButtons({
  onQuickPay,
  onPayment,
  disabled,
  loading,
  className,
}: {
  onQuickPay: (type: QuickPayType) => void;
  onPayment: () => void;
  disabled?: boolean;
  loading?: boolean;
  className?: string;
}) {
  const t = useTranslations("pos");
  const off = disabled || loading;

  return (
    <div className={cn("grid grid-cols-3 gap-2", className)}>
      <Button
        type="button"
        size="lg"
        disabled={off}
        onClick={() => onQuickPay("Cash")}
        className="col-span-3 h-14 gap-2 text-lg font-bold short:h-11"
      >
        {loading ? <Loader2 className="h-6 w-6 animate-spin" /> : <Banknote className="h-6 w-6" />}
        {t("cash")}
      </Button>
      <Button
        type="button"
        variant="secondary"
        disabled={off}
        onClick={() => onQuickPay("Card")}
        className="h-12 flex-col gap-0.5 px-1 text-sm font-semibold short:h-10"
      >
        <CreditCard className="h-5 w-5" />
        {t("card")}
      </Button>
      <Button
        type="button"
        variant="secondary"
        disabled={off}
        onClick={() => onQuickPay("BenefitPay")}
        className="h-12 flex-col gap-0.5 px-1 text-sm font-semibold short:h-10"
      >
        <Wallet className="h-5 w-5" />
        {t("benefitPay")}
      </Button>
      <Button
        type="button"
        variant="outline"
        disabled={off}
        onClick={onPayment}
        className="h-12 flex-col gap-0.5 px-1 text-sm font-semibold short:h-10"
      >
        <Landmark className="h-5 w-5" />
        {t("payment")}
      </Button>
    </div>
  );
}
