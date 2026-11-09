"use client";

import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useMutation } from "@tanstack/react-query";
import { AlertTriangle, Loader2 } from "lucide-react";
import { posOperationsService } from "@/lib/api/services/pos-operations-service";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { usePermission } from "@/hooks/use-permission";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { formatMoney } from "@/lib/utils";
import { useAuthStore } from "@/stores/auth-store";
import { useCurrencyStore } from "@/stores/currency-store";
import { usePosSessionStore } from "@/stores/pos-session-store";

const PRESETS = ["changedMind", "wrongItem", "priceError", "duplicate", "customerLeft"] as const;

/**
 * Void a paid bill (any business type). Asks for a reason; someone without the void right must also have a supervisor type their
 * username and password, which the server checks again - nothing is trusted from the screen. Once voided, the bill stays on record as
 * VOIDED and everything the sale did (stock, loyalty points, gift vouchers, coupon) is undone.
 */
export function VoidBillDialog({
  bill,
  open,
  onOpenChange,
  onVoided,
}: {
  bill: { docNo: number; refNo?: string | null; netTotal: number } | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onVoided: () => void;
}) {
  const t = useTranslations("billLookup");
  const tc = useTranslations("common");
  const locale = useLocale();
  const { can } = usePermission();
  const compId = useAuthStore((s) => s.user?.compId ?? "");
  const siteId = usePosSessionStore((s) => s.siteId ?? "");
  const currency = useCurrencyStore((s) => s.currencyCode);
  const needsApproval = !can(PERMISSIONS.POS_VOID_BILL);

  const [reason, setReason] = useState("");
  const [supervisor, setSupervisor] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setReason("");
      setSupervisor("");
      setPassword("");
      setError(null);
    }
  }, [open]);

  const mutation = useMutation({
    mutationFn: () =>
      posOperationsService.voidBill(compId, siteId, bill!.docNo, {
        reason: reason.trim(),
        supervisorUsername: needsApproval ? supervisor.trim() : undefined,
        supervisorPassword: needsApproval ? password : undefined,
      }),
    onSuccess: () => {
      onVoided();
      onOpenChange(false);
    },
    onError: (err: unknown) => {
      const message = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setError(message || tc("errorGeneric"));
    },
  });

  const canSubmit = reason.trim().length >= 3 && (!needsApproval || (supervisor.trim() !== "" && password !== "")) && !mutation.isPending;

  return (
    <Dialog open={open} onOpenChange={(o) => !mutation.isPending && onOpenChange(o)}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t("voidTitle")}</DialogTitle>
          {bill && (
            <DialogDescription>
              {t("voidSubtitle", { bill: bill.refNo || String(bill.docNo), amount: formatMoney(bill.netTotal, currency, locale) })}
            </DialogDescription>
          )}
        </DialogHeader>

        <p className="flex items-start gap-2 rounded-md bg-amber-100 p-2 text-sm text-amber-900 dark:bg-amber-900/30 dark:text-amber-200">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          {t("voidWarning")}
        </p>

        <div className="space-y-2">
          <Label htmlFor="void-reason">{t("voidReason")}</Label>
          <div className="flex flex-wrap gap-1.5">
            {PRESETS.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setReason(t(`reason_${p}`))}
                className="rounded-full border px-2.5 py-0.5 text-xs text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              >
                {t(`reason_${p}`)}
              </button>
            ))}
          </div>
          <Input id="void-reason" value={reason} maxLength={200} onChange={(e) => setReason(e.target.value)} placeholder={t("voidReasonPlaceholder")} autoFocus />
        </div>

        {needsApproval && (
          <div className="space-y-2 rounded-md border p-3">
            <p className="text-sm font-medium">{t("supervisorApproval")}</p>
            <p className="text-xs text-muted-foreground">{t("supervisorApprovalHint")}</p>
            <div className="grid grid-cols-2 gap-2">
              <Input value={supervisor} onChange={(e) => setSupervisor(e.target.value)} placeholder={t("supervisorUser")} autoComplete="off" />
              <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder={t("supervisorPassword")} autoComplete="new-password" />
            </div>
          </div>
        )}

        {error && <p className="rounded-md bg-destructive/10 p-2 text-sm text-destructive">{error}</p>}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={mutation.isPending}>
            {tc("cancel")}
          </Button>
          <Button variant="destructive" onClick={() => mutation.mutate()} disabled={!canSubmit}>
            {mutation.isPending && <Loader2 className="me-1 h-4 w-4 animate-spin" />}
            {t("confirmVoid")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
