"use client";

import { forwardRef } from "react";
import { Input, type InputProps } from "@/components/ui/input";
import { useCurrencyStore } from "@/stores/currency-store";
import { cn } from "@/lib/utils";

// Smallest typeable amount for a currency (BHD/KWD/OMR → 0.001, AED/SAR/USD
// → 0.01, JPY → 1), taken from Intl so it always matches how formatMoney()
// displays that currency. Without this the browser's own validation would
// reject e.g. 25.125 in a 3-decimal currency.
function stepFor(currency: string): string {
  try {
    const digits =
      new Intl.NumberFormat("en", { style: "currency", currency }).resolvedOptions().maximumFractionDigits ?? 2;
    return digits > 0 ? `0.${"0".repeat(digits - 1)}1` : "1";
  } catch {
    return "0.01";
  }
}

// `currency` overrides the suffix/step for the rare box that isn't in the
// system currency; otherwise it follows the app-wide currency setting (the
// same store every formatMoney() call reads from).
export const MoneyInput = forwardRef<HTMLInputElement, InputProps & { currency?: string }>(
  ({ className, currency, ...props }, ref) => {
    const systemCurrency = useCurrencyStore((s) => s.currencyCode);
    const code = currency ?? systemCurrency;
    return (
      <div className="relative">
        <Input
          ref={ref}
          type="number"
          step={stepFor(code)}
          inputMode="decimal"
          className={cn("pe-14 text-end tabular-nums", className)}
          {...props}
        />
        <span className="pointer-events-none absolute end-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
          {code}
        </span>
      </div>
    );
  },
);
MoneyInput.displayName = "MoneyInput";
