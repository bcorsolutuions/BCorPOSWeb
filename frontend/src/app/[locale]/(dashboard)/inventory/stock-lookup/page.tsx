"use client";

import { useEffect, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useMutation, useQuery } from "@tanstack/react-query";
import { RefreshCw, ScanBarcode, XCircle } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { BarcodeScannerInput } from "@/components/pos/barcode-scanner-input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PermissionGate } from "@/components/auth/permission-gate";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { useAuthStore } from "@/stores/auth-store";
import { usePosSessionStore } from "@/stores/pos-session-store";
import { posLookupService } from "@/lib/api/services/pos-lookup-service";
import { stockLookupService } from "@/lib/api/services/stock-lookup-service";
import { formatMoney } from "@/lib/utils";
import type { StockLookupResultDto } from "@/types/stock-lookup";

/**
 * Stock Lookup §6/§9/§10/§12 — standalone staff page. Unlike POS's own
 * session (which always has a configured site once Till Setup runs), a
 * back-office/warehouse user reaching this page directly may have none, so
 * this page keeps its own site selector — defaulting to the POS session's
 * site when one exists (§9's "don't require choosing site every time"),
 * otherwise the company's first active site.
 */
export default function StockLookupPage() {
  const t = useTranslations("stockLookup");
  const tc = useTranslations("common");
  const locale = useLocale();
  const compId = useAuthStore((s) => s.user?.compId ?? "");
  const posSiteId = usePosSessionStore((s) => s.siteId);

  const [siteId, setSiteId] = useState<string>(posSiteId ?? "");
  const [barcode, setBarcode] = useState("");
  const [result, setResult] = useState<StockLookupResultDto | null>(null);
  // Distinct from a genuine "NOT_FOUND" API response — a real request
  // failure (403 company mismatch, 500, network) must never be silently
  // relabeled as "item not found".
  const [requestFailed, setRequestFailed] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const { data: sites } = useQuery({
    queryKey: ["stock-lookup-sites", compId],
    queryFn: () => posLookupService.getSites(compId),
    enabled: !!compId,
  });

  useEffect(() => {
    if (!siteId && sites?.[0]) {
      setSiteId(sites[0].siteID);
    }
  }, [sites, siteId]);

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

  function handleScan(code: string) {
    setBarcode(code);
    lookupMutation.mutate(code);
  }

  function refresh() {
    if (barcode) lookupMutation.mutate(barcode);
  }

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  return (
    <PermissionGate permission={PERMISSIONS.STOCK_LOOKUP_VIEW} fallback={<p className="p-6 text-sm text-muted-foreground">{tc("errorGeneric")}</p>}>
      <div className="flex flex-col gap-4">
        <PageHeader
          title={t("title")}
          actions={
            sites && sites.length > 1 ? (
              <Select value={siteId} onValueChange={setSiteId}>
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {sites.map((s) => (
                    <SelectItem key={s.siteID} value={s.siteID}>
                      {locale === "ar" && s.siteNameArb ? s.siteNameArb : s.siteName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : undefined
          }
        />

        <Card className="p-4">
          <BarcodeScannerInput ref={inputRef} value={barcode} onValueChange={setBarcode} onScan={handleScan} />
          {!result && !lookupMutation.isPending && <p className="mt-3 text-sm text-muted-foreground">{t("scanPrompt")}</p>}
        </Card>

        {lookupMutation.isPending && (
          <div className="flex flex-col items-center gap-2 py-12 text-muted-foreground">
            <ScanBarcode className="h-10 w-10 animate-pulse" />
          </div>
        )}

        {!lookupMutation.isPending && requestFailed && (
          <Card className="flex flex-col items-center gap-2 p-8 text-center">
            <XCircle className="h-10 w-10 text-destructive" />
            <p className="text-lg font-semibold text-destructive">{t("serviceUnavailable")}</p>
          </Card>
        )}

        {!lookupMutation.isPending && result?.status === "NOT_FOUND" && (
          <Card className="flex flex-col items-center gap-2 p-8 text-center">
            <XCircle className="h-10 w-10 text-destructive" />
            <p className="text-lg font-semibold text-destructive">{t("itemNotFound")}</p>
          </Card>
        )}

        {!lookupMutation.isPending && result?.status === "INACTIVE" && (
          <Card className="flex flex-col items-center gap-2 p-8 text-center">
            <XCircle className="h-10 w-10 text-destructive" />
            <p className="text-lg font-semibold text-destructive">{t("itemNotAvailable")}</p>
          </Card>
        )}

        {!lookupMutation.isPending && result?.status === "OK" && (
          <div className="grid gap-4 lg:grid-cols-2">
            <Card className="space-y-3 p-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-lg font-semibold">
                    {locale === "ar" && result.inventoryNameArb ? result.inventoryNameArb : result.inventoryName}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {result.inventoryCode} · {t("unit")}: {result.unitName ?? result.unitCode}
                  </p>
                </div>
                <Button variant="ghost" size="icon" onClick={refresh} aria-label={t("refresh")}>
                  <RefreshCw className="h-4 w-4" />
                </Button>
              </div>

              <p className="text-xs font-medium uppercase text-muted-foreground">{t("currentSite")}</p>
              <p className="text-base font-medium">{result.siteName ?? result.siteId}</p>

              <div className="grid grid-cols-3 gap-3 text-center">
                <div>
                  <p className="text-2xl font-bold">{result.onHandQty}</p>
                  <p className="text-xs text-muted-foreground">{t("onHand")}</p>
                </div>
                <div>
                  <p className="text-2xl font-bold">{result.reservedQty}</p>
                  <p className="text-xs text-muted-foreground">{t("reserved")}</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-primary">{result.availableQty}</p>
                  <p className="text-xs text-muted-foreground">{t("available")}</p>
                </div>
              </div>

              {result.stockStatus && (
                <Badge variant={result.stockStatus === "OUT_OF_STOCK" ? "destructive" : "secondary"}>
                  {t(`stock_${result.stockStatus}` as never)}
                </Badge>
              )}

              {result.preferredBinCode && (
                <p className="text-sm text-muted-foreground">
                  {t("preferredBin")}: <span className="font-medium text-foreground">{result.preferredBinCode}</span>
                </p>
              )}

              {result.unitConversions && result.unitConversions.length > 0 && (
                <div className="space-y-1 border-t pt-2">
                  <p className="text-xs font-medium text-muted-foreground">{t("unitEquivalent")}</p>
                  {result.unitConversions.map((u) => (
                    <div key={u.unitCode} className="flex justify-between text-sm">
                      <span>{u.unitName ?? u.unitCode}</span>
                      <span className="tabular-nums">{u.qty}</span>
                    </div>
                  ))}
                </div>
              )}

              {(result.sellingPrice != null || result.stockValue != null) && (
                <div className="space-y-1 border-t pt-2">
                  {result.sellingPrice != null && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">{t("sellingPrice")}</span>
                      <span className="font-medium">{formatMoney(result.sellingPrice, undefined, locale)}</span>
                    </div>
                  )}
                  {result.unitCost != null && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">{t("averageCost")}</span>
                      <span className="font-medium">{formatMoney(result.unitCost, undefined, locale)}</span>
                    </div>
                  )}
                  {result.stockValue != null && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">{t("stockValue")}</span>
                      <span className="font-medium">{formatMoney(result.stockValue, undefined, locale)}</span>
                    </div>
                  )}
                </div>
              )}
            </Card>

            <div className="space-y-4">
              {result.warehouses.length > 0 && (
                <Card className="p-4">
                  <p className="mb-2 text-sm font-semibold">{t("warehouseStock")}</p>
                  <div className="space-y-1">
                    {result.warehouses.map((w) => (
                      <div key={w.warehouseCode} className="flex justify-between text-sm">
                        <span>{w.warehouseName}</span>
                        <span className="tabular-nums">{w.onHandQty}</span>
                      </div>
                    ))}
                    <div className="flex justify-between border-t pt-1 text-sm font-semibold">
                      <span>{t("total")}</span>
                      <span className="tabular-nums">{result.onHandQty}</span>
                    </div>
                  </div>
                </Card>
              )}

              {result.otherSites && result.otherSites.length > 0 && (
                <PermissionGate permission={PERMISSIONS.STOCK_LOOKUP_VIEW_OTHER_SITES}>
                  <Card className="p-4">
                    <p className="mb-2 text-sm font-semibold">{t("otherBranches")}</p>
                    <div className="space-y-1">
                      {result.otherSites.map((s) => (
                        <div key={s.siteId} className="flex justify-between text-sm">
                          <span>{s.siteName}</span>
                          <span className="tabular-nums">{s.availableQty}</span>
                        </div>
                      ))}
                    </div>
                  </Card>
                </PermissionGate>
              )}
            </div>
          </div>
        )}
      </div>
    </PermissionGate>
  );
}
