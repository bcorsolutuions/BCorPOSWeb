"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useQuery } from "@tanstack/react-query";
import { ClipboardList, Loader2, Printer, RefreshCw } from "lucide-react";
import { posOperationsService } from "@/lib/api/services/pos-operations-service";
import { ShiftReportSlip } from "@/components/pos/shift-report";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { usePermission } from "@/hooks/use-permission";
import { useSiteBusinessTypes } from "@/hooks/use-site-business-types";
import { locales, localeLabels, type Locale } from "@/i18n/config";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/stores/auth-store";
import { usePosSessionStore } from "@/stores/pos-session-store";

/**
 * X Report: the till's takings so far in this shift (sales, returns, payments by type, expected cash). Read-only - nothing is
 * closed or reset, it can be run as often as needed. Prints on the 80mm receipt printer like a receipt.
 */
export function XReportButton() {
  const t = useTranslations("shiftReport");
  const tc = useTranslations("common");
  const appLocale = useLocale() as Locale;
  const { can } = usePermission();
  const { isRetail } = useSiteBusinessTypes();
  const user = useAuthStore((s) => s.user);
  const { siteId, terminalId, shiftNo } = usePosSessionStore();
  const [open, setOpen] = useState(false);
  const [printLocale, setPrintLocale] = useState<Locale>(appLocale);

  const { data, isLoading, isFetching, isError, refetch } = useQuery({
    queryKey: ["x-report", user?.compId, siteId, terminalId, shiftNo],
    queryFn: () => posOperationsService.getXReport(user!.compId, siteId!, terminalId!, shiftNo!),
    enabled: open && !!user?.compId && !!siteId && !!terminalId && !!shiftNo,
    staleTime: 0,
    gcTime: 0,
  });

  // Supermarket / trading tills only (a salon or restaurant branch has its own flow).
  if (!isRetail || !can(PERMISSIONS.POS_XREPORT)) return null;

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)} disabled={!siteId || !terminalId || !shiftNo}>
        <ClipboardList className="me-1 h-4 w-4" />
        {t("xReport")}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{t("xReport")}</DialogTitle>
          </DialogHeader>

          <div className="flex justify-center gap-2">
            {locales.map((l) => (
              <button
                key={l}
                onClick={() => setPrintLocale(l)}
                className={cn("rounded-md border px-3 py-1 text-sm", printLocale === l ? "border-primary bg-primary/10 text-primary" : "hover:bg-accent")}
              >
                {localeLabels[l]}
              </button>
            ))}
          </div>

          <div className="max-h-[60vh] min-h-24 overflow-y-auto rounded-md border bg-muted/30 p-2">
            {isLoading ? (
              <p className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                {t("loading")}
              </p>
            ) : isError || !data ? (
              <p className="py-10 text-center text-sm text-destructive">{t("loadError")}</p>
            ) : (
              <ShiftReportSlip report={data} locale={printLocale} cashier={user?.userName ?? ""} siteId={siteId ?? ""} />
            )}
          </div>

          {data?.alreadyClosed && <p className="text-center text-sm text-muted-foreground">{t("alreadyClosed")}</p>}

          {/* Print-only twin - see ReceiptDialog / globals.css (.receipt-print-area). */}
          {data && (
            <div className="receipt-print-area">
              <ShiftReportSlip report={data} locale={printLocale} cashier={user?.userName ?? ""} siteId={siteId ?? ""} />
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => refetch()} disabled={isFetching}>
              <RefreshCw className={cn("me-1 h-4 w-4", isFetching && "animate-spin")} />
              {t("refresh")}
            </Button>
            <Button variant="outline" onClick={() => setOpen(false)}>
              {tc("close")}
            </Button>
            <Button onClick={() => window.print()} disabled={!data}>
              <Printer className="me-1 h-4 w-4" />
              {t("print")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
