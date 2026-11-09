"use client";

import { useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Plus, Receipt as ReceiptIcon } from "lucide-react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PaymentDialog } from "@/components/pos/payment-dialog";
import { ReceiptDialog } from "@/components/pos/receipt-dialog";
import { useCurrencyStore } from "@/stores/currency-store";
import { calcBillTotals } from "@/lib/pos/calc";
import { cn, formatMoney, formatMoneyPlain } from "@/lib/utils";
import { buildByItemSplitDtos, buildEvenSplitDtos, kotToCartLines } from "@/lib/restaurant/kot-mappers";
import type { KotDto } from "@/types/restaurant";
import type { CreatePosDto, PosCartLine, PosDto, PosPayment } from "@/types/pos";

const MAX_GUESTS = 8;
const MAX_WAYS = 8;

type Step = "method" | "assign" | "pay" | "done";
type Method = "byItem" | "even";

export function SplitBillDialog({
  open,
  onOpenChange,
  terminalId,
  shiftNo,
  onSyncKot,
  onSubmitSplits,
  submitting,
  onDone,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  terminalId: string;
  shiftNo?: number | null;
  onSyncKot: (close: boolean) => Promise<KotDto>;
  onSubmitSplits: (dtos: CreatePosDto[]) => Promise<PosDto[]>;
  submitting?: boolean;
  /** Fires when the "done" screen is closed after a successful split — e.g. to route back to the floor map, matching ReceiptDialog's behavior after a normal settle. */
  onDone?: () => void;
}) {
  const t = useTranslations("order");
  const tc = useTranslations("common");
  const locale = useLocale();
  const currency = useCurrencyStore((s) => s.currencyCode);

  const [step, setStep] = useState<Step>("method");
  const [method, setMethod] = useState<Method>("byItem");
  const [ways, setWays] = useState(2);
  const [guestCount, setGuestCount] = useState(2);
  const [assignment, setAssignment] = useState<Record<string, number>>({});
  const [syncedKot, setSyncedKot] = useState<KotDto | null>(null);
  const [draftDtos, setDraftDtos] = useState<CreatePosDto[]>([]);
  const [currentSplitIdx, setCurrentSplitIdx] = useState(0);
  const [collectedPayments, setCollectedPayments] = useState<PosPayment[][]>([]);
  const [results, setResults] = useState<PosDto[] | null>(null);
  const [viewingReceipt, setViewingReceipt] = useState<PosDto | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const lines: PosCartLine[] = useMemo(() => (syncedKot ? kotToCartLines(syncedKot) : []), [syncedKot]);

  function reset() {
    setStep("method");
    setMethod("byItem");
    setWays(2);
    setGuestCount(2);
    setAssignment({});
    setSyncedKot(null);
    setDraftDtos([]);
    setCurrentSplitIdx(0);
    setCollectedPayments([]);
    setResults(null);
    setViewingReceipt(null);
    setError(null);
    setBusy(false);
  }

  function handleClose(open: boolean) {
    if (open) {
      onOpenChange(open);
      return;
    }
    // Radix fires onOpenChange(false) for every dismissal path (the Close
    // button, Escape, clicking the backdrop) — routing onDone through here
    // instead of only the button's onClick means the caller navigates back
    // regardless of how the "done" screen gets dismissed. Capture before
    // reset() clears it.
    const succeeded = !!results;
    reset();
    onOpenChange(false);
    if (succeeded) onDone?.();
  }

  function guestSubtotal(guestIdx: number): number {
    const guestLines = lines.filter((l) => assignment[l.lineId] === guestIdx);
    return calcBillTotals(guestLines, 0).netTotal;
  }

  // Syncs+closes the KOT exactly once for the whole dialog lifetime — every
  // later step (assignment UI, guestSubtotal, both builders) reads off this
  // same KotDto. Calling onSyncKot a second time later (e.g. once more when
  // assignment is confirmed) was the original design, but each call reissues
  // its own server-side detail rows independently of what an earlier call
  // returned; assignment keys captured from one snapshot's lineIds then no
  // longer matched the next snapshot's, so every guest's line filter came up
  // empty and every split priced at 0. One sync call removes the mismatch
  // at the source instead of trying to keep two snapshots' ids in sync.
  async function handleMethodContinue() {
    setError(null);
    setBusy(true);
    try {
      const closedKot = await onSyncKot(true);
      setSyncedKot(closedKot);

      if (method === "even") {
        const previews = buildEvenSplitDtos({
          kot: closedKot,
          ways,
          payments: Array.from({ length: ways }, () => []),
          terminalId,
          shiftNo,
        });
        setDraftDtos(previews);
        setCollectedPayments(Array.from({ length: ways }, () => []));
        setCurrentSplitIdx(0);
        setStep("pay");
      } else {
        setStep("assign");
      }
    } catch {
      setError(tc("errorGeneric"));
    } finally {
      setBusy(false);
    }
  }

  function handleConfirmAssignment() {
    setError(null);
    if (!syncedKot) return;
    const assignedCount = Object.keys(assignment).length;
    if (assignedCount < lines.length) {
      setError(t("unassignedItemsError"));
      return;
    }
    const usedGuests = new Set(Object.values(assignment));
    for (let i = 0; i < guestCount; i++) {
      if (!usedGuests.has(i)) {
        setError(t("emptyGuestError"));
        return;
      }
    }

    const previews = buildByItemSplitDtos({
      kot: syncedKot,
      assignment,
      guestCount,
      payments: Array.from({ length: guestCount }, () => []),
      terminalId,
      shiftNo,
    });
    setDraftDtos(previews);
    setCollectedPayments(Array.from({ length: guestCount }, () => []));
    setCurrentSplitIdx(0);
    setStep("pay");
  }

  async function handleSplitPaymentComplete(payments: PosPayment[]) {
    if (!syncedKot) return;
    const nextPayments = [...collectedPayments];
    nextPayments[currentSplitIdx] = payments;
    setCollectedPayments(nextPayments);

    const splitCount = draftDtos.length;
    if (currentSplitIdx + 1 < splitCount) {
      setCurrentSplitIdx(currentSplitIdx + 1);
      return;
    }

    setBusy(true);
    setError(null);
    try {
      const finalDtos =
        method === "even"
          ? buildEvenSplitDtos({ kot: syncedKot, ways: splitCount, payments: nextPayments, terminalId, shiftNo })
          : buildByItemSplitDtos({ kot: syncedKot, assignment, guestCount: splitCount, payments: nextPayments, terminalId, shiftNo });
      const created = await onSubmitSplits(finalDtos);
      setResults(created);
      setStep("done");
    } catch {
      setError(tc("errorGeneric"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Dialog open={open && step !== "pay"} onOpenChange={handleClose}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{t("splitBill")}</DialogTitle>
            {step === "pay" && (
              <DialogDescription>
                {t("splitProgress", { current: currentSplitIdx + 1, total: draftDtos.length })}
              </DialogDescription>
            )}
          </DialogHeader>

          {step === "method" && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setMethod("byItem")}
                  className={cn(
                    "rounded-md border p-3 text-sm font-medium transition-colors",
                    method === "byItem" ? "border-primary bg-primary/10 text-primary" : "hover:bg-accent",
                  )}
                >
                  {t("splitByItem")}
                </button>
                <button
                  type="button"
                  onClick={() => setMethod("even")}
                  className={cn(
                    "rounded-md border p-3 text-sm font-medium transition-colors",
                    method === "even" ? "border-primary bg-primary/10 text-primary" : "hover:bg-accent",
                  )}
                >
                  {t("splitEvenly")}
                </button>
              </div>

              {method === "even" && (
                <div className="space-y-1">
                  <Label>{t("numberOfWays")}</Label>
                  <Input
                    type="number"
                    min={2}
                    max={MAX_WAYS}
                    value={ways}
                    onChange={(e) => setWays(Math.min(MAX_WAYS, Math.max(2, Number(e.target.value) || 2)))}
                    className="w-24"
                  />
                </div>
              )}

              {error && <p className="text-sm font-medium text-destructive">{error}</p>}

              <DialogFooter>
                <Button className="w-full" disabled={busy} onClick={handleMethodContinue}>
                  {tc("continue")}
                </Button>
              </DialogFooter>
            </div>
          )}

          {step === "assign" && (
            <div className="space-y-3">
              <div className="max-h-80 space-y-2 overflow-y-auto">
                {lines.map((line) => (
                  <div key={line.lineId} className="rounded-md border p-2 text-sm">
                    <div className="mb-1 flex items-center justify-between">
                      <span className="font-medium">
                        {line.quantity}× {line.name}
                      </span>
                      <span className="tabular-nums">{formatMoneyPlain(line.unitPrice * line.quantity, currency, locale)}</span>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {Array.from({ length: guestCount }, (_, guestIdx) => (
                        <button
                          key={guestIdx}
                          type="button"
                          onClick={() => setAssignment((prev) => ({ ...prev, [line.lineId]: guestIdx }))}
                          className={cn(
                            "rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors",
                            assignment[line.lineId] === guestIdx
                              ? "border-primary bg-primary/10 text-primary"
                              : "hover:bg-accent",
                          )}
                        >
                          {t("guestLabel", { n: guestIdx + 1 })}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              {guestCount < MAX_GUESTS && (
                <Button variant="outline" size="sm" onClick={() => setGuestCount((c) => c + 1)}>
                  <Plus className="me-1 h-3.5 w-3.5" />
                  {t("addGuest")}
                </Button>
              )}

              <div className="space-y-1 rounded-md border p-2 text-sm">
                {Array.from({ length: guestCount }, (_, guestIdx) => (
                  <div key={guestIdx} className="flex items-center justify-between">
                    <span>{t("guestLabel", { n: guestIdx + 1 })}</span>
                    <span className="tabular-nums">{formatMoney(guestSubtotal(guestIdx), currency, locale)}</span>
                  </div>
                ))}
              </div>

              {error && <p className="text-sm font-medium text-destructive">{error}</p>}

              <DialogFooter>
                <Button className="w-full" disabled={busy} onClick={handleConfirmAssignment}>
                  {t("confirmAndPay")}
                </Button>
              </DialogFooter>
            </div>
          )}

          {step === "done" && results && (
            <div className="space-y-3">
              <p className="text-sm font-medium text-success">{t("splitComplete")}</p>
              <div className="space-y-2">
                {results.map((pos, idx) => (
                  <button
                    key={pos.docNo}
                    type="button"
                    onClick={() => setViewingReceipt(pos)}
                    className="flex w-full items-center justify-between rounded-md border p-3 text-start text-sm hover:bg-accent"
                  >
                    <span className="flex items-center gap-2 font-medium">
                      <ReceiptIcon className="h-4 w-4" />
                      {t("guestLabel", { n: idx + 1 })} — #{pos.docNo}
                    </span>
                    <span className="tabular-nums">{formatMoney(pos.netTotal, currency, locale)}</span>
                  </button>
                ))}
              </div>
              <DialogFooter>
                <Button className="w-full" onClick={() => handleClose(false)}>
                  {tc("close")}
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {draftDtos[currentSplitIdx] && (
        <PaymentDialog
          open={open && step === "pay"}
          onOpenChange={(o) => !o && handleClose(false)}
          netTotal={draftDtos[currentSplitIdx].netTotal}
          hasCustomer={!!draftDtos[currentSplitIdx].custCode}
          loading={busy || submitting}
          onComplete={handleSplitPaymentComplete}
        />
      )}

      <ReceiptDialog open={!!viewingReceipt} onOpenChange={(o) => !o && setViewingReceipt(null)} pos={viewingReceipt} />
    </>
  );
}
