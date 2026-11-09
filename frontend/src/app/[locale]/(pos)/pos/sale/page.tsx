"use client";

import { useEffect, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Archive, AlertTriangle, Loader2, RotateCcw } from "lucide-react";
import { usePosCartStore } from "@/stores/pos-cart-store";
import { usePosSessionStore } from "@/stores/pos-session-store";
import { useAuthStore } from "@/stores/auth-store";
import { useCurrencyStore } from "@/stores/currency-store";
import { useOfflineSync } from "@/hooks/use-offline-sync";
import { usePosKeyboardShortcuts } from "@/hooks/use-pos-keyboard-shortcuts";
import { useSiteBusinessTypes } from "@/hooks/use-site-business-types";
import { useCustomerDisplaySync } from "@/hooks/use-customer-display-sync";
import { useMediaQuery } from "@/hooks/use-media-query";
import { usePromotionEvaluation } from "@/hooks/use-promotion-evaluation";
import { posService } from "@/lib/api/services/pos-service";
import { loyaltySiteSettingsService } from "@/lib/api/services/loyalty-service";
import { posOperationsService } from "@/lib/api/services/pos-operations-service";
import { inventoryLedgerService } from "@/lib/api/services/inventory-ledger-service";
import { buildCreatePosDto, buildOfflinePreviewPos, buildUpdatePosDto } from "@/lib/pos/mappers";
import { buildComboConsumeLines } from "@/lib/pos/combo-consume";
import { enqueueOfflineSale } from "@/lib/offline/offline-queue";
import { round } from "@/lib/pos/calc";
import { PosSetupDialog } from "@/components/pos/pos-setup-dialog";
import { PosStatusBar } from "@/components/pos/pos-status-bar";
import { ProductSearchPanel } from "@/components/pos/product-search-panel";
import { SupermarketScanPanel } from "@/components/pos/supermarket-scan-panel";
import { CartGrid } from "@/components/pos/cart-grid";
import { PaymentDialog } from "@/components/pos/payment-dialog";
import { QuickCustomerRegisterDialog } from "@/components/pos/quick-customer-register-dialog";
import { HeldBillsDrawer } from "@/components/pos/held-bills-drawer";
import { ReturnBillDialog } from "@/components/pos/return-bill-dialog";
import { ReceiptDialog } from "@/components/pos/receipt-dialog";
import { SalonCustomerDialog } from "@/components/pos/salon-customer-dialog";
import { getSalonOrderState, setSalonOrderState, stripSalonMarker, type SalonOrderState } from "@/lib/pos/salon-order";
import { CashDrawerButton } from "@/components/pos/cash-drawer-button";
import { CustomerDisplayButton } from "@/components/pos/customer-display-button";
import { PriceCheckButton } from "@/components/pos/price-check-button";
import { StockLookupButton } from "@/components/pos/stock-lookup-button";
import { XReportButton } from "@/components/pos/x-report-button";
import { ShiftCloseButton } from "@/components/pos/shift-close-button";
import { KeyboardShortcutsBar } from "@/components/pos/keyboard-shortcuts-bar";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useToast } from "@/components/ui/use-toast";
import { cn, formatMoney } from "@/lib/utils";
import type { PosDto, PosPayment } from "@/types/pos";
import { apiErrorMessage } from "@/lib/api-error";

export default function PosSalePage() {
  const t = useTranslations("pos");
  const tc = useTranslations("common");
  const { toast } = useToast();
  const searchInputRef = useRef<HTMLInputElement>(null);
  const locale = useLocale();
  const currency = useCurrencyStore((s) => s.currencyCode);

  const user = useAuthStore((s) => s.user);
  const { siteId, terminalId, shiftNo, isConfigured, reset: resetSession } = usePosSessionStore();
  const cart = usePosCartStore();
  const { isSupermarket, hasSalon, isLoading: businessTypesLoading } = useSiteBusinessTypes();
  // Supermarket till (desktop width): cart | item details + scan + number box | action buttons.
  // Phones (< 768px) keep the stacked layout with the bottom-sheet cart. The threshold is 768, not
  // lg (1024): a 1366-wide till at 125-150% Windows display scaling reports only ~910-1090 CSS px.
  const isDesktop = useMediaQuery("(min-width: 768px)");
  const supermarketCheckout = isSupermarket && isDesktop;
  const { postThankYou } = useCustomerDisplaySync(terminalId);
  usePromotionEvaluation(user?.compId ?? "", siteId ?? "");

  const [paymentOpen, setPaymentOpen] = useState(false);
  const [quickRegisterOpen, setQuickRegisterOpen] = useState(false);
  const [heldOpen, setHeldOpen] = useState(false);
  const [salonCustomerOpen, setSalonCustomerOpen] = useState(false);
  // A salon bill can't be saved without a customer; this remembers what the cashier was doing when the
  // "Customer for this order" dialog was raised, so it continues straight after the customer is chosen.
  const [salonNext, setSalonNext] = useState<"save" | "hold" | "pay">("save");
  const [returnOpen, setReturnOpen] = useState(false);
  const [cartSheetOpen, setCartSheetOpen] = useState(false);
  const [receiptPos, setReceiptPos] = useState<PosDto | null>(null);
  const [isOnline, setIsOnline] = useState(true);
  const pendingSync = useOfflineSync();

  useEffect(() => {
    setIsOnline(navigator.onLine);
    const goOnline = () => setIsOnline(true);
    const goOffline = () => setIsOnline(false);
    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);
    return () => {
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
    };
  }, []);

  const billTotals = cart.totals();

  const { data: shiftStatus } = useQuery({
    queryKey: ["pos-shift-status", user?.compId, siteId, terminalId, shiftNo],
    queryFn: () => posOperationsService.getShiftStatus(user!.compId, siteId!, terminalId!, shiftNo!),
    enabled: !!user?.compId && !!siteId && !!terminalId && !!shiftNo,
    refetchInterval: 60_000,
  });
  const billingBlocked = shiftStatus?.isShiftOpen === false;

  const { data: loyaltySettings } = useQuery({
    queryKey: ["loyalty-site-settings", user?.compId, siteId],
    queryFn: () => loyaltySiteSettingsService.getOrDefaultBySite(user!.compId, siteId!),
    enabled: !!user?.compId && !!siteId,
    staleTime: 5 * 60 * 1000,
  });

  // Loyalty §18 — if the site has loyalty enabled and no customer is on the
  // bill yet, offer to register/enroll one (mobile + name only) before
  // Payment opens; "Skip" on that dialog (or loyalty being off/no customer
  // needed) falls straight through to the normal Payment dialog.
  // Salon open order (saved with "Save Order"): payment waits for "Service done".
  const salonState = hasSalon ? getSalonOrderState(cart.remarks) : null;
  const payBlocked = salonState === "OPEN";

  function handlePayClick() {
    if (cart.lines.length === 0 || billingBlocked) return;
    if (payBlocked) {
      toast({ title: t("salonMarkDoneFirst"), variant: "destructive" });
      return;
    }
    if (hasSalon && !cart.customerCode) {
      setSalonNext("pay");
      setSalonCustomerOpen(true);
      return;
    }
    if (loyaltySettings?.enableCustomerLoyalty && !cart.customerCode) {
      setQuickRegisterOpen(true);
    } else {
      setPaymentOpen(true);
    }
  }

  // What a held bill is built from. A salon "Save Order" passes the customer it just picked/created (the cart
  // store update would not be visible to this closure yet) and the new state marker for Remarks.
  function heldInput(o?: { customer?: { code: string; name: string }; remarks?: string | null }) {
    return {
      lines: cart.lines,
      payments: [] as PosPayment[],
      status: "Held" as const,
      terminalId: terminalId!,
      shiftNo,
      custCode: o?.customer?.code ?? cart.customerCode,
      custName: o?.customer?.name ?? cart.customerName,
      salesManCode: cart.salesManCode,
      billDiscountAmount: cart.billDiscountAmount,
      billPromotionCode: cart.billPromotionCode,
      billPromotionDiscountAmount: cart.billPromotionDiscountAmount,
      couponCode: cart.couponCode,
      couponDiscountAmount: cart.couponDiscountAmount,
      remarks: o && "remarks" in o ? o.remarks : cart.remarks,
    };
  }

  const holdMutation = useMutation({
    mutationFn: async (opts?: { state?: SalonOrderState; customer?: { code: string; name: string } }) => {
      const input = heldInput({
        customer: opts?.customer,
        remarks: opts?.state ? setSalonOrderState(cart.remarks, opts.state) : cart.remarks,
      });
      if (cart.activeDocNo) {
        return posService.update(user!.compId, siteId!, user!.userName, cart.activeDocNo, buildUpdatePosDto(input));
      }
      return posService.create(user!.compId, siteId!, user!.userName, buildCreatePosDto(input));
    },
    onSuccess: (_pos, opts) => {
      toast({
        title: opts?.state ? t("salonOrderSaved", { name: opts.customer?.name ?? cart.customerName ?? "" }) : t("holdBill"),
      });
      cart.clear();
    },
    onError: (err) => toast({ title: apiErrorMessage(err, tc("errorGeneric")), variant: "destructive" }),
  });

  // Salon: save the open order for later payment. No customer yet -> ask for one first.
  function handleSaveOrder() {
    if (cart.lines.length === 0 || billingBlocked) return;
    if (!cart.customerCode) {
      setSalonNext("save");
      setSalonCustomerOpen(true);
    } else holdMutation.mutate({ state: salonState ?? "OPEN" });
  }

  // Plain Hold. On a salon till the bill still has to belong to a customer.
  function handleHold() {
    if (cart.lines.length === 0 || billingBlocked) return;
    if (hasSalon && !cart.customerCode) {
      setSalonNext("hold");
      setSalonCustomerOpen(true);
    } else holdMutation.mutate(undefined);
  }

  // Salon: the services are finished — keep the order loaded, mark it done so Pay unlocks.
  const serviceDoneMutation = useMutation({
    mutationFn: async () => {
      if (!cart.activeDocNo) throw new Error("Order is not saved yet.");
      const remarks = setSalonOrderState(cart.remarks, "DONE");
      await posService.update(user!.compId, siteId!, user!.userName, cart.activeDocNo, buildUpdatePosDto(heldInput({ remarks })));
      return remarks;
    },
    onSuccess: (remarks) => {
      cart.setRemarks(remarks);
      toast({ title: t("salonDoneSaved") });
    },
    onError: (err) => toast({ title: apiErrorMessage(err, tc("errorGeneric")), variant: "destructive" }),
  });

  const salonBanner =
    hasSalon && salonState ? (
      <div className="flex items-center justify-between gap-2 rounded-md border border-primary/40 bg-primary/10 px-3 py-2 text-sm">
        <div className="min-w-0">
          <p className="truncate font-medium">{t("salonOrderFor", { name: cart.customerName ?? "" })}</p>
          <p className="text-xs text-muted-foreground">{salonState === "OPEN" ? t("salonInService") : t("salonServiceDone")}</p>
        </div>
        {salonState === "OPEN" && (
          <Button size="sm" disabled={serviceDoneMutation.isPending} onClick={() => serviceDoneMutation.mutate()}>
            {t("salonMarkDone")}
          </Button>
        )}
      </div>
    ) : null;

  // Hold | (Save Order on salon tills) | Pay — shared by the cart column and the phone bottom sheet.
  function renderHoldPay(opts: { buttonClass?: string; closeSheet?: boolean }) {
    return (
      <div className={`grid gap-2 ${hasSalon ? "grid-cols-3" : "grid-cols-2"}`}>
        <Button
          variant="outline"
          size="lg"
          className={opts.buttonClass}
          disabled={cart.lines.length === 0 || holdMutation.isPending || billingBlocked}
          onClick={handleHold}
        >
          {t("holdBill")}
        </Button>
        {hasSalon && (
          <Button
            variant="secondary"
            size="lg"
            className={opts.buttonClass}
            disabled={cart.lines.length === 0 || holdMutation.isPending || billingBlocked || salonState === "DONE"}
            onClick={handleSaveOrder}
          >
            {t("saveOrder")}
          </Button>
        )}
        <Button
          size="lg"
          className={`text-base ${opts.buttonClass ?? ""}`}
          disabled={cart.lines.length === 0 || billingBlocked || payBlocked}
          onClick={() => {
            if (opts.closeSheet) setCartSheetOpen(false);
            handlePayClick();
          }}
        >
          {t("pay")}
        </Button>
      </div>
    );
  }

  const payMutation = useMutation({
    mutationFn: async (payments: PosPayment[]) => {
      const input = {
        lines: cart.lines,
        payments,
        status: (cart.isReturn ? "Returned" : "Completed") as "Returned" | "Completed",
        terminalId: terminalId!,
        shiftNo,
        custCode: cart.customerCode,
        custName: cart.customerName,
        salesManCode: cart.salesManCode,
        billDiscountAmount: cart.billDiscountAmount,
        billPromotionCode: cart.billPromotionCode,
        billPromotionDiscountAmount: cart.billPromotionDiscountAmount,
        couponCode: cart.couponCode,
        couponDiscountAmount: cart.couponDiscountAmount,
        remarks: stripSalonMarker(cart.remarks),
        isReturn: cart.isReturn,
        soRefNo: cart.returnRefNo,
      };

      if (!isOnline) {
        const dto = buildCreatePosDto(input);
        const clientKey = enqueueOfflineSale(user!.compId, siteId!, user!.userName, dto);
        return buildOfflinePreviewPos(dto, user!.compId, siteId!, clientKey);
      }

      if (cart.activeDocNo) {
        return posService.update(user!.compId, siteId!, user!.userName, cart.activeDocNo, buildUpdatePosDto(input));
      }
      const dto = buildCreatePosDto(input);
      return posService.create(user!.compId, siteId!, user!.userName, dto);
    },
    onSuccess: (pos, payments) => {
      toast({ title: isOnline ? t("completeSale") : t("offline") });
      setReceiptPos(pos);
      setPaymentOpen(false);
      if (!cart.isReturn) {
        const amountPaid = round(payments.reduce((sum, p) => sum + p.amount, 0));
        postThankYou(amountPaid, Math.max(0, round(amountPaid - billTotals.netTotal)));

        // Recipe-ingredient consumption — ordinary (non-combo) lines read
        // straight off the just-posted pos.details, same source
        // buildComboConsumeLines already reads for combo lines, rather than
        // cart.lines, so both halves stay in sync with what was actually
        // saved. Non-recipe/unresolvable itemCodes (plain items, gift
        // vouchers, etc.) are silently skipped server-side, so this can be
        // sent unfiltered. Best-effort/fire-and-forget, same risk profile as
        // the restaurant settle flow's equivalent call — skipped for an
        // offline-queued sale (isOnline false) since it hasn't actually
        // posted yet.
        if (isOnline) {
          const ordinaryLines = pos.details
            .filter((d) => !d.comboCode)
            .map((d) => ({ itemCode: d.itemCode, quantity: d.quantity }));
          const comboLines = buildComboConsumeLines(pos);
          const consumeLines = [...ordinaryLines, ...comboLines];
          if (consumeLines.length > 0) {
            inventoryLedgerService
              .consumeRecipe(user!.compId, siteId!, {
                refDocNo: pos.refNo ?? String(pos.docNo),
                docNo: pos.docNo,
                lines: consumeLines,
              })
              .catch(() => {});
          }
        }
      }
      cart.clear();
    },
    onError: (err) => toast({ title: apiErrorMessage(err, tc("errorGeneric")), variant: "destructive" }),
  });

  usePosKeyboardShortcuts({
    onFocusSearch: () => searchInputRef.current?.focus(),
    onHold: handleHold,
    onRecall: () => setHeldOpen(true),
    onPay: handlePayClick,
    onReturn: () => setReturnOpen(true),
    onNewSale: () => cart.clear(),
  });

  if (!isConfigured || !siteId || !terminalId || !shiftNo) {
    return <PosSetupDialog open onConfigured={() => {}} />;
  }

  // Which till layout to draw depends on the branch's business type. Until that is known, do not draw the plain tile layout and then
  // swap it - wait for it.
  if (businessTypesLoading) {
    return (
      <div className="flex h-full items-center justify-center text-muted-foreground">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <PosStatusBar isOnline={isOnline} pendingSync={pendingSync} shiftOnRight={supermarketCheckout} />

      {billingBlocked && (
        <div className="flex items-center justify-between gap-3 border-b bg-destructive/10 px-3 py-2 text-sm text-destructive">
          <span className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            {t("shiftClosedBanner")}
          </span>
          <Button size="sm" variant="destructive" onClick={resetSession}>
            {t("setupTitle")}
          </Button>
        </div>
      )}

      {supermarketCheckout ? (
        <div className="grid min-h-0 flex-1 grid-cols-[2fr_1fr_1fr] grid-rows-[minmax(0,1fr)] gap-3 overflow-hidden p-3 short:gap-2 short:p-2">
          <div className="min-h-0">
            <CartGrid variant="supermarket" />
          </div>
          <SupermarketScanPanel
            ref={searchInputRef}
            actions={{
              onHold: () => holdMutation.mutate(undefined),
              onPay: handlePayClick,
              onHeldBills: () => setHeldOpen(true),
              onReturn: () => setReturnOpen(true),
              holdDisabled: cart.lines.length === 0 || holdMutation.isPending || billingBlocked,
              payDisabled: cart.lines.length === 0 || billingBlocked,
              terminalId,
            }}
          />
        </div>
      ) : (
      <div
        className={cn(
          "grid min-h-0 flex-1 grid-cols-1 gap-3 overflow-hidden p-3 pb-20 md:grid-rows-[minmax(0,1fr)] md:pb-3 short:gap-2 short:px-2 short:pt-2",
          // No product tiles to browse in supermarket mode, so the cart can
          // take a full third of the screen instead of a fixed 380px sliver
          // — it's the primary reference view once scanning starts.
          // Trading / salon: products take two thirds, the cart one third (never narrower than 300px on a small till).
          "md:grid-cols-[minmax(0,2fr)_minmax(300px,1fr)]",
        )}
      >
        <ProductSearchPanel ref={searchInputRef} />

        <div className="hidden flex-col gap-2 overflow-hidden md:flex">
          <div className="flex flex-wrap gap-2 short:gap-1.5 short:[&_button]:h-7 short:[&_button]:px-2 short:[&_button]:text-xs">
            <Button variant="outline" size="sm" onClick={() => setHeldOpen(true)}>
              <Archive className="me-1 h-4 w-4" />
              {t("heldBills")}
            </Button>
            <Button variant="outline" size="sm" onClick={() => setReturnOpen(true)}>
              <RotateCcw className="me-1 h-4 w-4" />
              {t("returnBill")}
            </Button>
            <CashDrawerButton />
            <CustomerDisplayButton terminalId={terminalId} />
            <PriceCheckButton />
            <StockLookupButton />
            <XReportButton />
            <ShiftCloseButton />
          </div>

          {salonBanner}

          <div className="min-h-0 flex-1">
            <CartGrid variant="supermarket" compact />
          </div>

          {renderHoldPay({ buttonClass: "short:h-9" })}
        </div>
      </div>
      )}

      {/* Phone/tablet sticky cart bar (< lg) — the desktop cart panel above
          is hidden here, so this is the only way to reach totals/tax/discount
          without it; tapping it opens the full cart in a bottom sheet. Not used by the
          supermarket checkout layout, which always shows the cart. */}
      {!supermarketCheckout && (
      <>
      <button
        type="button"
        onClick={() => setCartSheetOpen(true)}
        className="fixed inset-x-0 bottom-0 z-40 flex items-center justify-between border-t bg-card p-3 text-start shadow-lg md:hidden"
      >
        <span className="text-sm font-medium">
          {cart.lines.length} {t("items")} · <span className="tabular-nums">{formatMoney(billTotals.netTotal, currency, locale)}</span>
        </span>
        <span className="text-sm font-semibold text-primary">{t("viewOrder")}</span>
      </button>

      <Sheet open={cartSheetOpen} onOpenChange={setCartSheetOpen}>
        <SheetContent side="bottom" className="flex max-h-[85vh] flex-col gap-3 md:hidden">
          <SheetHeader>
            <SheetTitle>{t("cart")}</SheetTitle>
          </SheetHeader>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={() => setHeldOpen(true)}>
              <Archive className="me-1 h-4 w-4" />
              {t("heldBills")}
            </Button>
            <Button variant="outline" size="sm" onClick={() => setReturnOpen(true)}>
              <RotateCcw className="me-1 h-4 w-4" />
              {t("returnBill")}
            </Button>
            <CashDrawerButton />
            <PriceCheckButton />
            <StockLookupButton />
            <XReportButton />
            <ShiftCloseButton />
          </div>
          {salonBanner}
          <div className="min-h-0 flex-1 overflow-hidden">
            <CartGrid variant="supermarket" />
          </div>
          {renderHoldPay({ closeSheet: true })}
        </SheetContent>
      </Sheet>
      </>
      )}

      <KeyboardShortcutsBar />

      <PaymentDialog
        open={paymentOpen}
        onOpenChange={setPaymentOpen}
        netTotal={billTotals.netTotal}
        hasCustomer={!!cart.customerCode}
        customerCode={cart.customerCode}
        loading={payMutation.isPending}
        onComplete={(payments) => payMutation.mutate(payments)}
      />

      <QuickCustomerRegisterDialog
        open={quickRegisterOpen}
        onOpenChange={setQuickRegisterOpen}
        onRegistered={(code, name) => {
          cart.setCustomer(code, name);
          setQuickRegisterOpen(false);
          setPaymentOpen(true);
        }}
        onSkip={() => {
          setQuickRegisterOpen(false);
          setPaymentOpen(true);
        }}
      />

      <SalonCustomerDialog
        open={salonCustomerOpen}
        onOpenChange={setSalonCustomerOpen}
        onConfirm={(code, name) => {
          cart.setCustomer(code, name);
          if (salonNext === "pay") setPaymentOpen(true);
          else if (salonNext === "hold") holdMutation.mutate({ customer: { code, name } });
          else holdMutation.mutate({ state: salonState ?? "OPEN", customer: { code, name } });
        }}
      />

      <HeldBillsDrawer open={heldOpen} onOpenChange={setHeldOpen} />
      <ReturnBillDialog open={returnOpen} onOpenChange={setReturnOpen} />
      <ReceiptDialog open={!!receiptPos} onOpenChange={(open) => !open && setReceiptPos(null)} pos={receiptPos} />
    </div>
  );
}
