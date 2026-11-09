"use client";

import { Coins } from "lucide-react";
import { SUPPORTED_CURRENCIES, useCurrencyStore } from "@/stores/currency-store";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function CurrencySwitcher() {
  const { currencyCode, setCurrency } = useCurrencyStore();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Switch currency" title={currencyCode}>
          <Coins className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {SUPPORTED_CURRENCIES.map((c) => (
          <DropdownMenuItem key={c} onClick={() => setCurrency(c)} className={c === currencyCode ? "font-semibold" : ""}>
            {c}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
