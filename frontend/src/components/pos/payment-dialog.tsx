"use client";

import { useEffect, useMemo, useState, type KeyboardEvent } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Banknote, CreditCard, Wallet, Landmark, Trash2, Ticket, Award } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MoneyInput } from "@/components/shared/money-input";
import { useCurrencyStore } from "@/stores/currency-store";
import { useAuthStore } from "@/stores/auth-store";
import { usePosSessionStore } from "@/stores/pos-session-store";
import { useGiftVoucherCheck } from "@/hooks/use-gift-voucher-check";
import { useLoyaltyRedeemCheck } from "@/hooks/use-loyalty-redeem-check";
import { cn, formatMoney } from "@/lib/utils";
import { round } from "@/lib/pos/calc";
import type { PosPayment, PosPaymentType } from "@/types/pos";

const methodIcons: Record<PosPaymentType, typeof Banknote> = {
  Cash: Banknote,
  Card: CreditCard,
  BenefitPay: Wallet,
  Wallet: Wallet,
  Credit: Landmark,
  GiftVoucher: Ticket,
  LoyaltyRedemption: Award,
};

const methodLabelKeys: Record<PosPaymentType, "cash" | "card" | "benefitPay" | "wallet" | "credit" | "giftVoucher" | "loyaltyRedemption"> = {
  Cash: "cash",
  Card: "card",
  BenefitPay: "benefitPay",
  Wallet: "wallet",
  Credit: "credit",
  GiftVoucher: "giftVoucher",
  LoyaltyRedemption: "loyaltyRedemption",
};

// Notes / steps the quick cash buttons round the bill up to (0.5 covers 3-decimal currencies such as BHD).
const CASH_STEPS = [0.5, 1, 5, 10, 20, 50, 100];

/** "Exact" first, then the bill rounded up to the next note: e.g. 14.300 -> 14.300, 14.500, 15, 20, 50, 100. */
function quickCashAmounts(remaining: number): number[] {
  if (remaining <= 0) return [];
  const out = [round(remaining)];
  for (const step of CASH_STEPS) {
    const up = round(Math.ceil(round(remaining / step)) * step);
    if (up > remaining && !out.includes(up)) out.push(up);
  }
  return out.slice(0, 6);
}

// Methods that are paid in one go with the whole remaining amount (no voucher / points lookup needed).
const ONE_TAP: PosPaymentType[] = ["Cash", "Card", "BenefitPay", "Wallet", "Credit"];

export function PaymentDialog({
  open,
  onOpenChange,
  netTotal,
  hasCustomer,
  customerCode,
  onComplete,
  loading,
  onHold,
  holdLoading,
  initialPayments,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  netTotal: number;
  hasCustomer: boolean;
  customerCode?: string | null;
  onComplete: (payments: PosPayment[]) => void;
  loading?: boolean;
  /** When provided, shows a "Hold" button that parks whatever's been tendered so far instead of requiring full payment — used to recall/resume a restaurant bill later. */
  onHold?: (payments: PosPayment[]) => void;
  holdLoading?: boolean;
  /** Preseeds already-tendered payments — used when reopening a previously held bill. */
  initialPayments?: PosPayment[];
}) {
  const t = useTranslations("pos");
  const locale = useLocale();
  const currency = useCurrencyStore((s) => s.currencyCode);
  const compId = useAuthStore((s) => s.user?.compId ?? "");
  const siteId = usePosSessionStore((s) => s.siteId ?? "");
  const [payments, setPayments] = useState<PosPayment[]>(initialPayments ?? []);
  const [method, setMethod] = useState<PosPaymentType>("Cash");
  const [amount, setAmount] = useState("");
  const [voucherNo, setVoucherNo] = useState("");
  const voucherCheck = useGiftVoucherCheck(compId, siteId);
  const loyaltyCheck = useLoyaltyRedeemCheck(compId, siteId, customerCode, netTotal);

  // Reseed on every open so a held bill's prior tenders show up each time,
  // not just on first mount of this dialog instance — and clear the tender
  // method/amount and the gift-voucher/loyalty check state, since this
  // dialog instance is reused across sales (and customers) rather than
  // remounted, and stale data from the previous customer's check would
  // otherwise still be showing.
  useEffect(() => {
    if (open) {
      setPayments(initialPayments ?? []);
      setMethod("Cash");
      setAmount("");
      setVoucherNo("");
      voucherCheck.reset();
      loyaltyCheck.reset();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const paid = payments.reduce((sum, p) => sum + p.amount, 0);
  const remaining = Math.max(0, round(netTotal - paid));
  const change = method === "Cash" ? Math.max(0, round(Number(amount || 0) - remaining)) : 0;
  const isFullyPaid = paid >= netTotal;

  const methods: PosPaymentType[] = useMemo(() => {
    const base: PosPaymentType[] = ["Cash", "Card", "BenefitPay", "Wallet", "Credit", "GiftVoucher"];
    // Redemption is inherently tied to a customer's own account — no
    // "anonymous loyalty redemption" workflow exists (spec §18).
    return hasCustomer ? [...base, "LoyaltyRedemption"] : base;
  }, [hasCustomer]);

  function selectMethod(m: PosPaymentType) {
    setMethod(m);
    setAmount("");
    setVoucherNo("");
    voucherCheck.reset();
    if (m === "LoyaltyRedemption") loyaltyCheck.mutate();
    else loyaltyCheck.reset();
  }

  /** One tap: tender `tendered` with `type` and finish the sale straight away (it always covers what is still to pay). */
  function quickPay(type: PosPaymentType, tendered: number) {
    if (loading || remaining <= 0 || tendered < remaining) return;
    if (type === "Credit" && !hasCustomer) return;
    const finalPayments: PosPayment[] = [...payments, { type, amount: tendered }];
    onComplete(finalPayments);
    setPayments([]);
  }

  // Number keys 1-7 pick a payment method while the cursor is not in a text box (fast keyboard checkout).
  function handleHotkey(e: KeyboardEvent) {
    const target = e.target as HTMLElement;
    if (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || e.ctrlKey || e.altKey || e.metaKey) return;
    const index = Number(e.key) - 1;
    if (Number.isInteger(index) && index >= 0 && index < methods.length) {
      const m = methods[index];
      if (m && !(m === "Credit" && !hasCustomer)) {
        e.preventDefault();
        selectMethod(m);
      }
    }
  }

  function addPayment() {
    const value = Number(amount || 0);
    if (value <= 0) return;
    if (method === "Credit" && !hasCustomer) return;
    if (method === "GiftVoucher") {
      // Only reachable once voucherCheck has succeeded (the amount input is
      // disabled until then) — capped at the checked balance too, on top of
      // the usual `remaining` cap. The server independently re-validates
      // and re-redeems the real amount at save time regardless (see
      // PosController.RedeemGiftVouchersIfCompletedAsync) — this cap is
      // just so the cashier can't queue up an amount neither side will honor.
      if (!voucherCheck.data?.valid) return;
      const cappedAmount = Math.min(value, voucherCheck.data.balance, remaining);
      if (cappedAmount <= 0) return;
      setPayments((prev) => [...prev, { type: "GiftVoucher", amount: cappedAmount, refCode: voucherCheck.data!.giftVoucherNo ?? voucherNo }]);
      setAmount("");
      setVoucherNo("");
      voucherCheck.reset();
      return;
    }
    if (method === "LoyaltyRedemption") {
      // Same cap reasoning as GiftVoucher above — the server independently
      // re-validates and re-redeems the real amount at save time regardless
      // (PosController.RedeemLoyaltyPointsIfCompletedAsync).
      if (!loyaltyCheck.data) return;
      const cappedAmount = Math.min(value, loyaltyCheck.data.maxRedeemableValue, remaining);
      if (cappedAmount <= 0) return;
      setPayments((prev) => [...prev, { type: "LoyaltyRedemption", amount: cappedAmount, refCode: loyaltyCheck.data!.loyaltyNo }]);
      setAmount("");
      loyaltyCheck.reset();
      return;
    }
    const cappedAmount = method === "Cash" ? value : Math.min(value, remaining);
    setPayments((prev) => [...prev, { type: method, amount: cappedAmount }]);
    setAmount("");
  }

  function removePayment(index: number) {
    setPayments((prev) => prev.filter((_, i) => i !== index));
  }

  function handleComplete() {
    const finalPayments = remaining > 0 && payments.length === 0 ? [] : payments;
    onComplete(finalPayments);
    setPayments([]);
  }

  function handleHold() {
    onHold?.(payments);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl" onKeyDown={handleHotkey}>
        <DialogHeader>
          <DialogTitle>{t("payment")}</DialogTitle>
        </DialogHeader>

        <div className="rounded-md bg-muted p-4 text-center">
          <p className="text-sm text-muted-foreground">{t("remainingBalance")}</p>
          <p className="text-5xl font-bold tabular-nums">{formatMoney(remaining, currency, locale)}</p>
          {change > 0 && (
            <p className="mt-1 text-sm font-medium text-success">
              {t("change")}: {formatMoney(change, currency, locale)}
            </p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {methods.map((m, i) => {
            const Icon = methodIcons[m];
            const disabled = m === "Credit" && !hasCustomer;
            return (
              <button
                key={m}
                type="button"
                disabled={disabled}
                onClick={() => selectMethod(m)}
                aria-pressed={method === m}
                className={cn(
                  "relative flex min-h-[88px] flex-col items-center justify-center gap-2 rounded-lg border-2 p-3 text-base font-semibold transition-colors active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40",
                  method === m ? "border-primary bg-primary/10 text-primary" : "border-border hover:bg-accent",
                )}
              >
                <span className="absolute start-2 top-1 text-[11px] font-normal text-muted-foreground">{i + 1}</span>
                <Icon className="h-8 w-8" />
                {t(methodLabelKeys[m])}
              </button>
            );
          })}
        </div>

        {remaining > 0 && method === "Cash" && (
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">{t("quickCash")}</p>
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
              {quickCashAmounts(remaining).map((tender, i) => (
                <Button
                  key={tender}
                  type="button"
                  variant={i === 0 ? "default" : "outline"}
                  disabled={loading}
                  onClick={() => quickPay("Cash", tender)}
                  className="h-16 flex-col gap-0 text-lg font-bold tabular-nums"
                >
                  {i === 0 ? t("exactAmount") : formatMoney(tender, currency, locale)}
                  <span className="text-[11px] font-normal opacity-80">
                    {i === 0 ? formatMoney(tender, currency, locale) : `${t("change")} ${formatMoney(round(tender - remaining), currency, locale)}`}
                  </span>
                </Button>
              ))}
            </div>
          </div>
        )}

        {remaining > 0 && ONE_TAP.includes(method) && method !== "Cash" && (
          <Button
            type="button"
            size="lg"
            disabled={loading || (method === "Credit" && !hasCustomer)}
            onClick={() => quickPay(method, remaining)}
            className="h-16 w-full text-lg font-bold"
          >
            {t("payFull", { amount: formatMoney(remaining, currency, locale), method: t(methodLabelKeys[method]) })}
          </Button>
        )}

        {method === "GiftVoucher" ? (
          <div className="space-y-2">
            <div className="flex items-end gap-2">
              <div className="flex-1 space-y-1">
                <Input
                  value={voucherNo}
                  onChange={(e) => {
                    setVoucherNo(e.target.value);
                    if (voucherCheck.data || voucherCheck.error) voucherCheck.reset();
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && voucherNo.trim()) {
                      e.preventDefault();
                      voucherCheck.mutate(voucherNo);
                    }
                  }}
                  placeholder={t("giftVoucherNo")}
                />
              </div>
              <Button variant="outline" disabled={!voucherNo.trim() || voucherCheck.isPending} onClick={() => voucherCheck.mutate(voucherNo)}>
                {t("checkBalance")}
              </Button>
            </div>
            {voucherCheck.error && <p className="text-xs text-destructive">{voucherCheck.error.message}</p>}
            {voucherCheck.data?.valid && (
              <>
                <p className="text-xs text-muted-foreground">
                  {t("giftVoucherBalance")}: {formatMoney(voucherCheck.data.balance, currency, locale)}
                </p>
                <div className="flex items-end gap-2">
                  <div className="flex-1 space-y-1">
                    <MoneyInput
                      currency={currency}
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      placeholder={String(Math.min(voucherCheck.data.balance, remaining))}
                      onKeyDown={(e) => e.key === "Enter" && addPayment()}
                    />
                  </div>
                  <Button
                    variant="outline"
                    onClick={() => setAmount(String(Math.min(voucherCheck.data!.balance, remaining)))}
                  >
                    {t("remainingBalance")}
                  </Button>
                  <Button onClick={addPayment}>{t("addPayment")}</Button>
                </div>
              </>
            )}
          </div>
        ) : method === "LoyaltyRedemption" ? (
          <div className="space-y-2">
            {loyaltyCheck.isPending && <p className="text-xs text-muted-foreground">{t("loading")}</p>}
            {loyaltyCheck.error && <p className="text-xs text-destructive">{loyaltyCheck.error.message}</p>}
            {loyaltyCheck.data && (
              <>
                <p className="text-xs text-muted-foreground">
                  {t("loyaltyPoints")}: {loyaltyCheck.data.currentPoints} · {t("loyaltyRedeemableValue")}:{" "}
                  {formatMoney(loyaltyCheck.data.maxRedeemableValue, currency, locale)}
                </p>
                <div className="flex items-end gap-2">
                  <div className="flex-1 space-y-1">
                    <MoneyInput
                      currency={currency}
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      placeholder={String(Math.min(loyaltyCheck.data.maxRedeemableValue, remaining))}
                      onKeyDown={(e) => e.key === "Enter" && addPayment()}
                    />
                  </div>
                  <Button
                    variant="outline"
                    onClick={() => setAmount(String(Math.min(loyaltyCheck.data!.maxRedeemableValue, remaining)))}
                  >
                    {t("remainingBalance")}
                  </Button>
                  <Button onClick={addPayment} disabled={loyaltyCheck.data.maxRedeemableValue <= 0}>
                    {t("addPayment")}
                  </Button>
                </div>
              </>
            )}
          </div>
        ) : (
          <div className="flex items-end gap-2">
            <div className="flex-1 space-y-1">
              <p className="text-xs text-muted-foreground">{t("otherAmount")}</p>
              <MoneyInput
                currency={currency}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder={String(remaining)}
                onKeyDown={(e) => e.key === "Enter" && addPayment()}
              />
            </div>
            <Button variant="outline" onClick={() => setAmount(String(remaining))}>
              {t("remainingBalance")}
            </Button>
            <Button onClick={addPayment} disabled={method === "Credit" && !hasCustomer}>
              {t("addPayment")}
            </Button>
          </div>
        )}

        {payments.length > 0 && (
          <div className="space-y-1 rounded-md border p-2">
            <p className="text-xs font-medium text-muted-foreground">{t("splitPayment")}</p>
            {payments.map((p, idx) => (
              <div key={idx} className="flex items-center justify-between text-sm">
                <span>
                  {t(methodLabelKeys[p.type])}
                  {(p.type === "GiftVoucher" || p.type === "LoyaltyRedemption") && p.refCode ? ` (${p.refCode})` : ""}
                </span>
                <div className="flex items-center gap-2">
                  <span className="tabular-nums">{formatMoney(p.amount, currency, locale)}</span>
                  <button onClick={() => removePayment(idx)} aria-label="remove">
                    <Trash2 className="h-3.5 w-3.5 text-destructive" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        <DialogFooter className="flex-col gap-2 sm:flex-col">
          <Button size="lg" className="w-full text-base" disabled={!isFullyPaid || loading} onClick={handleComplete}>
            {t("completeSale")}
          </Button>
          {onHold && (
            <Button
              size="lg"
              variant="outline"
              className="w-full text-base"
              disabled={isFullyPaid || loading || holdLoading}
              onClick={handleHold}
            >
              {t("holdBill")}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
