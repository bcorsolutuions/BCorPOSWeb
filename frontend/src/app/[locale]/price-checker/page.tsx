"use client";

import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useMutation, useQuery } from "@tanstack/react-query";
import { ScanBarcode, Search, XCircle } from "lucide-react";
import { LanguageSwitcher } from "@/components/layout/language-switcher";
import { BarcodeScannerInput } from "@/components/pos/barcode-scanner-input";
import { Badge } from "@/components/ui/badge";
import { priceCheckerService } from "@/lib/api/services/price-checker-service";
import { formatMoney } from "@/lib/utils";
import type { PriceCheckerResultDto } from "@/types/price-checker";

/**
 * Retail Price Checker §4/§20 — the public kiosk screen. compId/siteId are
 * fixed per physical device via URL query params set once at deployment
 * (the device itself is the trust boundary, same idea as a QR table's
 * opaque URL) — the customer scanning here never sees or edits them.
 * This route is listed in middleware.ts's PUBLIC_PATHS, so it renders with
 * no login and no dashboard/POS chrome.
 */
export default function PriceCheckerKioskPage() {
  const t = useTranslations("priceChecker");
  const locale = useLocale();
  const searchParams = useSearchParams();
  const compId = searchParams.get("compId") ?? "";
  const siteId = searchParams.get("siteId") ?? "";

  const [barcode, setBarcode] = useState("");
  const [result, setResult] = useState<PriceCheckerResultDto | null>(null);
  const [failed, setFailed] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const resetTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { data: config } = useQuery({
    queryKey: ["price-checker-kiosk-config", compId, siteId],
    queryFn: () => priceCheckerService.getKioskConfig(compId, siteId),
    enabled: !!compId && !!siteId,
    staleTime: 5 * 60 * 1000,
  });

  const checkMutation = useMutation({
    mutationFn: (code: string) => priceCheckerService.check(compId, siteId, code, true),
    onSuccess: (res) => {
      setResult(res);
      setFailed(false);
    },
    onError: () => {
      setResult(null);
      setFailed(true);
    },
  });

  function refocus() {
    setTimeout(() => inputRef.current?.focus(), 50);
  }

  function reset() {
    setBarcode("");
    setResult(null);
    setFailed(false);
    refocus();
  }

  function handleScan(code: string) {
    setBarcode(code);
    checkMutation.mutate(code);
  }

  // Auto-reset back to the scan screen after PriceCheckerResetSeconds so the
  // kiosk never sits showing a stale result for the next customer (§20).
  useEffect(() => {
    if (resetTimer.current) clearTimeout(resetTimer.current);
    if (result || failed) {
      const seconds = config?.resetSeconds ?? 10;
      resetTimer.current = setTimeout(reset, seconds * 1000);
    }
    return () => {
      if (resetTimer.current) clearTimeout(resetTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [result, failed, config?.resetSeconds]);

  useEffect(() => {
    refocus();
  }, []);

  if (!compId || !siteId) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-6 text-center">
        <p className="text-sm text-muted-foreground">Invalid kiosk configuration.</p>
      </div>
    );
  }

  const showing = !!result || failed || checkMutation.isPending;

  return (
    <div className="flex min-h-screen flex-col items-center bg-background p-6">
      <div className="flex w-full max-w-lg items-center justify-between">
        <h1 className="text-lg font-bold tracking-wide text-primary">{t("title")}</h1>
        <LanguageSwitcher />
      </div>

      <div className="mt-10 w-full max-w-lg">
        <BarcodeScannerInput ref={inputRef} value={barcode} onValueChange={setBarcode} onScan={handleScan} />
        {!showing && (
          <p className="mt-4 flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <Search className="h-4 w-4" />
            {t("scanPrompt")}
          </p>
        )}
      </div>

      {checkMutation.isPending && (
        <div className="mt-16 flex flex-col items-center gap-3 text-muted-foreground">
          <ScanBarcode className="h-16 w-16 animate-pulse" />
        </div>
      )}

      {!checkMutation.isPending && failed && (
        <div className="mt-16 flex flex-col items-center gap-3 text-center">
          <XCircle className="h-16 w-16 text-destructive" />
          <p className="text-lg font-semibold text-destructive">{t("serviceUnavailable")}</p>
        </div>
      )}

      {!checkMutation.isPending && result && (
        <div className="mt-12 flex w-full max-w-lg flex-col items-center gap-4 text-center">
          {result.status === "NOT_FOUND" && (
            <>
              <XCircle className="h-16 w-16 text-destructive" />
              <p className="text-xl font-semibold text-destructive">{t("itemNotFound")}</p>
              <p className="text-sm text-muted-foreground">{t("contactStaff")}</p>
            </>
          )}
          {result.status === "INACTIVE" && (
            <>
              <XCircle className="h-16 w-16 text-destructive" />
              <p className="text-xl font-semibold text-destructive">{t("itemNotAvailable")}</p>
              <p className="text-sm text-muted-foreground">{t("contactStaff")}</p>
            </>
          )}
          {result.status === "NO_PRICE" && (
            <>
              <XCircle className="h-16 w-16 text-destructive" />
              <p className="text-xl font-semibold text-destructive">{t("priceNotAvailable")}</p>
              <p className="text-sm text-muted-foreground">{t("contactStaff")}</p>
            </>
          )}
          {result.status === "OK" && (
            <>
              {result.imageUrl && (
                // eslint-disable-next-line @next/next/no-img-element -- backend-served upload
                <img src={result.imageUrl} alt="" className="h-32 w-32 rounded-md object-cover" />
              )}
              <p className="text-2xl font-bold">{locale === "ar" && result.itemNameArb ? result.itemNameArb : result.itemName}</p>
              {result.unitName && <p className="text-sm text-muted-foreground">{result.unitName}</p>}

              <div className="flex items-baseline gap-3">
                {result.hasPromotion && result.regularPrice != null && (
                  <span className="text-xl text-muted-foreground line-through">{formatMoney(result.regularPrice, undefined, locale)}</span>
                )}
                <span className="text-5xl font-extrabold text-primary">{formatMoney(result.currentPrice ?? 0, undefined, locale)}</span>
              </div>

              {result.hasPromotion && (
                <div className="flex flex-col items-center gap-1">
                  <Badge className="text-sm">{locale === "ar" && result.promotionTextArb ? result.promotionTextArb : result.promotionText ?? t("specialOffer")}</Badge>
                  {result.savingsAmount != null && result.savingsAmount > 0 && (
                    <p className="text-sm font-medium text-green-600">
                      {t("youSave")}: {formatMoney(result.savingsAmount, undefined, locale)}
                      {result.savingsPercentage != null ? ` (${result.savingsPercentage.toFixed(0)}%)` : ""}
                    </p>
                  )}
                </div>
              )}

              {result.stockStatus && (
                <Badge variant={result.stockStatus === "OUT_OF_STOCK" ? "destructive" : "secondary"}>
                  {t(`stock_${result.stockStatus}` as never)}
                </Badge>
              )}
            </>
          )}

          <button type="button" onClick={reset} className="mt-6 text-sm font-medium text-primary underline">
            {t("scanAnotherItem")}
          </button>
        </div>
      )}
    </div>
  );
}
