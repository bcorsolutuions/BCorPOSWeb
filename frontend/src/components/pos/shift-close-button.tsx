"use client";

import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, Loader2, LockKeyhole, Printer } from "lucide-react";
import { posOperationsService, type ShiftCloseResult } from "@/lib/api/services/pos-operations-service";
import { ShiftReportSlip } from "@/components/pos/shift-report";
import { GlPostingNote } from "@/components/pos/gl-posting-note";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { usePermission } from "@/hooks/use-permission";
import { useSiteBusinessTypes } from "@/hooks/use-site-business-types";
import { locales, localeLabels, type Locale } from "@/i18n/config";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { pendingCount } from "@/lib/offline/offline-queue";
import { cn, formatMoney } from "@/lib/utils";
import { useAuthStore } from "@/stores/auth-store";
import { useCurrencyStore } from "@/stores/currency-store";
import { usePosCartStore } from "@/stores/pos-cart-store";
import { usePosSessionStore } from "@/stores/pos-session-store";

const toNumber = (s: string) => {
  const n = parseFloat(s);
  return Number.isFinite(n) ? n : NaN;
};

/**
 * Shift Close: the cashier counts the drawer, sees expected cash vs counted (over / short), and cashes up. The server recomputes
 * the totals, records the Day Close (billing on this terminal + shift stops) and flags the shift's bills as closed. Afterwards the
 * cashier gets the printable cash-up slip and is returned to Till Setup for the next shift.
 */
export function ShiftCloseButton() {
  const t = useTranslations("shiftReport");
  const tc = useTranslations("common");
  const appLocale = useLocale() as Locale;
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { can } = usePermission();
  const { isRetail } = useSiteBusinessTypes();
  const user = useAuthStore((s) => s.user);
  const currency = useCurrencyStore((s) => s.currencyCode);
  const cartLines = usePosCartStore((s) => s.lines.length);
  const { siteId, terminalId, shiftNo } = usePosSessionStore();

  const [open, setOpen] = useState(false);
  const [printLocale, setPrintLocale] = useState<Locale>(appLocale);
  const [opening, setOpening] = useState("");
  const [counted, setCounted] = useState("");
  const [deposit, setDeposit] = useState("");
  const [result, setResult] = useState<ShiftCloseResult | null>(null);
  const [pending, setPending] = useState(0);
  const [online, setOnline] = useState(true);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["shift-close-report", user?.compId, siteId, terminalId, shiftNo],
    queryFn: () => posOperationsService.getXReport(user!.compId, siteId!, terminalId!, shiftNo!),
    enabled: open && !result && !!user?.compId && !!siteId && !!terminalId && !!shiftNo,
    staleTime: 0,
    gcTime: 0,
  });

  // Fresh each time the dialog opens: the drawer's default float comes from the report, the rest starts empty.
  useEffect(() => {
    if (open) {
      setCounted("");
      setDeposit("");
      setResult(null);
      setPending(pendingCount());
      setOnline(typeof navigator === "undefined" ? true : navigator.onLine);
    }
  }, [open]);
  useEffect(() => {
    if (data && open && !result) setOpening(String(data.openingFloat));
  }, [data, open, result]);

  const closeMutation = useMutation({
    mutationFn: () =>
      posOperationsService.closeShift(user!.compId, siteId!, {
        terminalId: terminalId!,
        shiftNo: shiftNo!,
        openingCash: toNumber(opening) || 0,
        countedCash: toNumber(counted),
        bankDeposit: toNumber(deposit) || 0,
      }),
    onSuccess: (res) => {
      setResult(res);
      queryClient.invalidateQueries({ queryKey: ["pos-shift-status"] });
      toast({ title: t("closedToast") });
    },
    onError: (err: unknown) => {
      const message = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast({ title: message || tc("errorGeneric"), variant: "destructive" });
    },
  });

  // Supermarket / trading tills only (a salon or restaurant branch has its own flow).
  if (!isRetail || !can(PERMISSIONS.POS_SHIFT_CLOSE)) return null;

  const openingNum = toNumber(opening);
  const countedNum = toNumber(counted);
  const expected = data ? (Number.isFinite(openingNum) ? openingNum : 0) + data.cashNet : 0;
  const overShort = Number.isFinite(countedNum) ? Math.round((countedNum - expected) * 1000) / 1000 : null;
  const money = (n: number) => formatMoney(n, currency, appLocale);

  const blocker = !online ? t("offlineBlock") : pending > 0 ? t("pendingBlock", { count: pending }) : cartLines > 0 ? t("cartBlock") : data?.alreadyClosed ? t("alreadyClosed") : null;
  const canClose = !!data && !blocker && Number.isFinite(countedNum) && countedNum >= 0 && !closeMutation.isPending;

  function finish() {
    setOpen(false);
    // Back to Till Setup: the cashier picks the next shift (or the same one tomorrow). Same as the "shift closed" banner's button.
    usePosSessionStore.getState().reset();
  }

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)} disabled={!siteId || !terminalId || !shiftNo}>
        <LockKeyhole className="me-1 h-4 w-4" />
        {t("shiftClose")}
      </Button>

      <Dialog open={open} onOpenChange={(o) => (result ? finish() : setOpen(o))}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{result ? t("closeTitle") : t("closeDialogTitle")}</DialogTitle>
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

          {result ? (
            <>
              <div className="max-h-[55vh] overflow-y-auto rounded-md border bg-muted/30 p-2">
                <ShiftReportSlip report={result.report} locale={printLocale} cashier={result.closedBy} siteId={siteId ?? ""} close={result} />
              </div>
              <div className="receipt-print-area">
                <ShiftReportSlip report={result.report} locale={printLocale} cashier={result.closedBy} siteId={siteId ?? ""} close={result} />
              </div>
              {result.glPosting && <GlPostingNote posting={result.glPosting} />}
              <DialogFooter>
                <Button variant="outline" onClick={() => window.print()}>
                  <Printer className="me-1 h-4 w-4" />
                  {t("print")}
                </Button>
                <Button onClick={finish}>{t("done")}</Button>
              </DialogFooter>
            </>
          ) : (
            <>
              <p className="text-sm text-muted-foreground">{t("closeIntro")}</p>

              <div className="max-h-[32vh] min-h-20 overflow-y-auto rounded-md border bg-muted/30 p-2">
                {isLoading ? (
                  <p className="flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {t("loading")}
                  </p>
                ) : isError || !data ? (
                  <p className="py-8 text-center text-sm text-destructive">{t("loadError")}</p>
                ) : (
                  <ShiftReportSlip report={data} locale={printLocale} cashier={user?.userName ?? ""} siteId={siteId ?? ""} />
                )}
              </div>

              {data && (
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label htmlFor="shift-opening">{t("openingFloat")}</Label>
                    <Input id="shift-opening" type="number" min="0" step="0.001" inputMode="decimal" value={opening} onChange={(e) => setOpening(e.target.value)} />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="shift-deposit">{t("bankDeposit")}</Label>
                    <Input id="shift-deposit" type="number" min="0" step="0.001" inputMode="decimal" value={deposit} onChange={(e) => setDeposit(e.target.value)} />
                  </div>
                  <div className="col-span-2 space-y-1">
                    <Label htmlFor="shift-counted">{t("countedCash")}</Label>
                    <Input id="shift-counted" type="number" min="0" step="0.001" inputMode="decimal" autoFocus value={counted} onChange={(e) => setCounted(e.target.value)} placeholder={t("countedPlaceholder")} />
                  </div>

                  <div className="col-span-2 rounded-md border p-3 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">{t("expectedCash")}</span>
                      <span className="font-semibold tabular-nums">{money(expected)}</span>
                    </div>
                    <div className="mt-1 flex justify-between">
                      <span className="text-muted-foreground">{overShort == null ? t("overShort") : overShort === 0 ? t("balanced") : overShort > 0 ? t("excess") : t("short")}</span>
                      <span
                        className="font-semibold tabular-nums"
                        style={{ color: overShort == null || overShort === 0 ? undefined : overShort > 0 ? "var(--viz-warn, #c98500)" : "#d03b3b" }}
                      >
                        {overShort == null ? "—" : money(Math.abs(overShort))}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {data && data.heldBills > 0 && <p className="text-xs text-muted-foreground">{t("heldNote", { count: data.heldBills })}</p>}
              {blocker && (
                <p className="flex items-start gap-2 rounded-md bg-destructive/10 p-2 text-sm text-destructive">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                  {blocker}
                </p>
              )}

              <DialogFooter>
                <Button variant="outline" onClick={() => setOpen(false)}>
                  {tc("cancel")}
                </Button>
                <Button variant="destructive" onClick={() => closeMutation.mutate()} disabled={!canClose}>
                  {closeMutation.isPending && <Loader2 className="me-1 h-4 w-4 animate-spin" />}
                  {t("confirmClose")}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
