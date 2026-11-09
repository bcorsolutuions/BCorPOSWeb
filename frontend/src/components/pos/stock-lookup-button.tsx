"use client";

import { useEffect, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useMutation } from "@tanstack/react-query";
import { Boxes } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PermissionGate } from "@/components/auth/permission-gate";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { useAuthStore } from "@/stores/auth-store";
import { usePosSessionStore } from "@/stores/pos-session-store";
import { stockLookupService } from "@/lib/api/services/stock-lookup-service";
import { BarcodeScannerInput } from "@/components/pos/barcode-scanner-input";
import { formatMoney } from "@/lib/utils";
import type { StockLookupResultDto } from "@/types/stock-lookup";

/**
 * Stock Lookup §2/§30 — the staff popup. Scanning here NEVER adds to the POS
 * cart or moves any stock (TEST 2/3) — it calls the same read-only endpoint
 * the standalone /inventory/stock-lookup page uses. While open, the barcode
 * input below owns the scanner's keystrokes (Radix Dialog focus trap +
 * explicit focus on open), so closing it (TEST 20) returns scanner input to
 * whatever normal POS scan box already had focus.
 */
export function StockLookupButton() {
  const t = useTranslations("stockLookup");
  const tc = useTranslations("common");
  const locale = useLocale();
  const compId = useAuthStore((s) => s.user?.compId ?? "");
  const siteId = usePosSessionStore((s) => s.siteId ?? "");

  const [open, setOpen] = useState(false);
  const [barcode, setBarcode] = useState("");
  const [result, setResult] = useState<StockLookupResultDto | null>(null);
  // Distinct from a genuine "NOT_FOUND" API response (200 OK, item doesn't
  // exist) — this is a real request failure (403 company mismatch, 500,
  // network) that must never be silently relabeled as "item not found",
  // or a permission/server problem looks identical to a missing item.
  const [requestFailed, setRequestFailed] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const lookupMutation = useMutation({
    mutationFn: (code: string) => stockLookupService.lookupByBarcode(compId, siteId, code),
    onSuccess: (res) => {
      setResult(res);
      setRequestFailed(false);
    },
    onError: (err) => {
      console.error("Stock Lookup request failed", err);
      setResult(null);
      setRequestFailed(true);
    },
  });

  useEffect(() => {
    if (open) {
      setBarcode("");
      setResult(null);
      setRequestFailed(false);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  function handleScan(code: string) {
    setBarcode(code);
    lookupMutation.mutate(code);
  }

  return (
    <PermissionGate permission={PERMISSIONS.STOCK_LOOKUP_VIEW}>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        <Boxes className="me-1 h-4 w-4" />
        {t("stockCheck")}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{t("title")}</DialogTitle>
          </DialogHeader>

          <BarcodeScannerInput ref={inputRef} value={barcode} onValueChange={setBarcode} onScan={handleScan} />

          {lookupMutation.isPending && <p className="py-6 text-center text-sm text-muted-foreground">{tc("loading")}</p>}

          {!lookupMutation.isPending && requestFailed && (
            <p className="py-4 text-center text-sm font-medium text-destructive">{t("serviceUnavailable")}</p>
          )}

          {!lookupMutation.isPending && result && (
            <div className="space-y-2 rounded-md border p-3">
              {result.status === "NOT_FOUND" && <p className="text-center font-medium text-destructive">{t("itemNotFound")}</p>}
              {result.status === "INACTIVE" && <p className="text-center font-medium text-destructive">{t("itemNotAvailable")}</p>}
              {result.status === "OK" && (
                <>
                  <p className="text-center text-base font-semibold">
                    {locale === "ar" && result.inventoryNameArb ? result.inventoryNameArb : result.inventoryName}
                  </p>
                  <p className="text-center text-xs text-muted-foreground">
                    {result.inventoryCode} · {t("unit")}: {result.unitName ?? result.unitCode}
                  </p>

                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div>
                      <p className="text-lg font-bold">{result.onHandQty}</p>
                      <p className="text-xs text-muted-foreground">{t("onHand")}</p>
                    </div>
                    <div>
                      <p className="text-lg font-bold">{result.reservedQty}</p>
                      <p className="text-xs text-muted-foreground">{t("reserved")}</p>
                    </div>
                    <div>
                      <p className="text-lg font-bold text-primary">{result.availableQty}</p>
                      <p className="text-xs text-muted-foreground">{t("available")}</p>
                    </div>
                  </div>

                  {result.stockStatus && (
                    <div className="text-center">
                      <Badge variant={result.stockStatus === "OUT_OF_STOCK" ? "destructive" : "secondary"}>
                        {t(`stock_${result.stockStatus}` as never)}
                      </Badge>
                    </div>
                  )}

                  {result.warehouses.length > 1 && (
                    <div className="space-y-1 border-t pt-2">
                      <p className="text-xs font-medium text-muted-foreground">{t("warehouseStock")}</p>
                      {result.warehouses.map((w) => (
                        <div key={w.warehouseCode} className="flex justify-between text-sm">
                          <span>{w.warehouseName}</span>
                          <span className="tabular-nums">{w.onHandQty}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {result.sellingPrice != null && (
                    <div className="flex justify-between border-t pt-2 text-sm">
                      <span className="text-muted-foreground">{t("sellingPrice")}</span>
                      <span className="font-medium">{formatMoney(result.sellingPrice, undefined, locale)}</span>
                    </div>
                  )}

                  {result.stockValue != null && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">{t("stockValue")}</span>
                      <span className="font-medium">{formatMoney(result.stockValue, undefined, locale)}</span>
                    </div>
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
    </PermissionGate>
  );
}
