"use client";

import { useEffect, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useMutation } from "@tanstack/react-query";
import { ScanBarcode } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuthStore } from "@/stores/auth-store";
import { usePosSessionStore } from "@/stores/pos-session-store";
import { priceCheckerService } from "@/lib/api/services/price-checker-service";
import { BarcodeScannerInput } from "@/components/pos/barcode-scanner-input";
import { formatMoney } from "@/lib/utils";
import type { PriceCheckerResultDto } from "@/types/price-checker";

/**
 * Retail Price Checker §18/§19 — the staff popup. Scanning here NEVER adds
 * to the POS cart (TEST 4/14) — it calls the same read-only endpoint the
 * public kiosk uses, nothing else. While this dialog is open, the barcode
 * input below owns the scanner's keystrokes; closing it (TEST 15) returns
 * scanner input to whatever normal POS scan box already had focus.
 */
export function PriceCheckButton() {
  const t = useTranslations("priceChecker");
  const tc = useTranslations("common");
  const locale = useLocale();
  const compId = useAuthStore((s) => s.user?.compId ?? "");
  const siteId = usePosSessionStore((s) => s.siteId ?? "");

  const [open, setOpen] = useState(false);
  const [barcode, setBarcode] = useState("");
  const [result, setResult] = useState<PriceCheckerResultDto | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const checkMutation = useMutation({
    mutationFn: (code: string) => priceCheckerService.check(compId, siteId, code),
    onSuccess: (res) => setResult(res),
    onError: () => setResult({ status: "NOT_FOUND", barcode, hasPromotion: false, taxIncluded: true }),
  });

  useEffect(() => {
    if (open) {
      setBarcode("");
      setResult(null);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  function handleScan(code: string) {
    setBarcode(code);
    checkMutation.mutate(code);
  }

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        <ScanBarcode className="me-1 h-4 w-4" />
        {t("priceCheck")}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{t("priceCheck")}</DialogTitle>
          </DialogHeader>

          <BarcodeScannerInput ref={inputRef} value={barcode} onValueChange={setBarcode} onScan={handleScan} />

          {checkMutation.isPending && <p className="py-6 text-center text-sm text-muted-foreground">{tc("loading")}</p>}

          {!checkMutation.isPending && result && (
            <div className="space-y-2 rounded-md border p-3">
              {result.status === "NOT_FOUND" && <p className="text-center font-medium text-destructive">{t("itemNotFound")}</p>}
              {result.status === "INACTIVE" && <p className="text-center font-medium text-destructive">{t("itemNotAvailable")}</p>}
              {result.status === "NO_PRICE" && (
                <p className="text-center font-medium text-destructive">{result.staffMessage || t("priceNotAvailable")}</p>
              )}
              {result.status === "OK" && (
                <>
                  <p className="text-center text-base font-semibold">{result.itemName}</p>
                  <p className="text-center text-xs text-muted-foreground">
                    {t("unit")}: {result.unitName ?? result.unitCode}
                  </p>
                  <div className="flex items-center justify-center gap-2">
                    {result.hasPromotion && result.regularPrice != null && (
                      <span className="text-sm text-muted-foreground line-through">{formatMoney(result.regularPrice, undefined, locale)}</span>
                    )}
                    <span className="text-2xl font-bold text-primary">{formatMoney(result.currentPrice ?? 0, undefined, locale)}</span>
                  </div>
                  {result.hasPromotion && result.promotionText && (
                    <div className="text-center">
                      <Badge>{result.promotionText}</Badge>
                    </div>
                  )}
                  {result.stockStatus && (
                    <p className="text-center text-xs text-muted-foreground">
                      {t(`stock_${result.stockStatus}` as never)}
                      {result.exactStockQty != null ? ` (${result.exactStockQty})` : ""}
                    </p>
                  )}
                </>
              )}
            </div>
          )}

          <Button variant="outline" onClick={() => setOpen(false)}>
            {tc("close")}
          </Button>
        </DialogContent>
      </Dialog>
    </>
  );
}
