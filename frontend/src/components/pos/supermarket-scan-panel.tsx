"use client";

import { forwardRef, useEffect, useState, type Dispatch, type SetStateAction } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useQuery } from "@tanstack/react-query";
import { Archive, Delete, Layers, Package, RotateCcw, ScanLine, Search, Ticket } from "lucide-react";
import { posLookupService } from "@/lib/api/services/pos-lookup-service";
import { comboLookupService } from "@/lib/api/services/combo-lookup-service";
import { useAuthStore } from "@/stores/auth-store";
import { usePosCartStore } from "@/stores/pos-cart-store";
import { usePosSessionStore } from "@/stores/pos-session-store";
import { BarcodeScannerInput } from "@/components/pos/barcode-scanner-input";
import { SelectComboOptionsDialog } from "@/components/pos/select-combo-options-dialog";
import { CashDrawerButton } from "@/components/pos/cash-drawer-button";
import { QuickPayButtons, type QuickPayType } from "@/components/pos/quick-pay-buttons";
import { CustomerDisplayButton } from "@/components/pos/customer-display-button";
import { PriceCheckButton } from "@/components/pos/price-check-button";
import { StockLookupButton } from "@/components/pos/stock-lookup-button";
import { XReportButton } from "@/components/pos/x-report-button";
import { ShiftCloseButton } from "@/components/pos/shift-close-button";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { MoneyInput } from "@/components/shared/money-input";
import { useToast } from "@/components/ui/use-toast";
import { useCurrencyStore } from "@/stores/currency-store";
import { formatMoney, resolveImageUrl } from "@/lib/utils";
import { parseWeightBarcode } from "@/lib/pos/weight-barcode";
import { calcLineTotals } from "@/lib/pos/calc";
import type { ItemSearchResult } from "@/types/pos-lookups";
import type { ComboDetailDto, ComboMasterDto, ResolvedComboComponent } from "@/types/combo";

// Supermarket/hypermarket browse layout ("SUP" business type, see
// useSiteBusinessTypes) — a large SKU catalog makes a category-tab tile grid
// impractical (see product-search-panel.tsx for that layout, used everywhere
// else). Instead this is barcode-first, checkout-lane style: a big scan
// input plus a running "last added" confirmation dominate the screen; a
// compact name search is only a fallback for a damaged/missing barcode, and
// renders as a plain list rather than tiles.
/**
 * Page-level actions of the till. When supplied (desktop supermarket checkout) the panel renders the
 * second and third columns of the screen — scan / item details / number box, and the aligned action
 * buttons with PAYMENT at the bottom. Without it the panel renders the stacked layout used below `lg`.
 */
export interface SupermarketActions {
  onHold: () => void;
  /** the "Payment" button: opens the payment dialog */
  onPay: () => void;
  /** Cash / Card / BenefitPay: pay the full bill in one tap and print */
  onQuickPay: (type: QuickPayType) => void;
  payLoading?: boolean;
  onHeldBills: () => void;
  onReturn: () => void;
  holdDisabled: boolean;
  payDisabled: boolean;
  terminalId: string;
}

/** Touch number box: digits go into the same text the scan box holds, so a barcode can be keyed in without a keyboard. */
function NumberBox({
  value,
  onChange,
  onEnter,
  onSetQty,
  pendingQty,
  selectedLine,
  onApplyToLine,
  onClearSelection,
}: {
  value: string;
  // A state setter: digits use functional updates so quick taps never overwrite each other.
  onChange: Dispatch<SetStateAction<string>>;
  onEnter: () => void;
  onSetQty: () => void;
  pendingQty: number;
  /** A cart line picked by tapping its row — while set, the pad edits that line's quantity instead of scanning. */
  selectedLine: { name: string; quantity: number; isWeighted?: boolean } | null;
  onApplyToLine: () => void;
  onClearSelection: () => void;
}) {
  const t = useTranslations("pos");
  const tc = useTranslations("common");
  // onMouseDown preventDefault keeps focus in the scan box, so a hardware scanner keeps working after a tap.
  const keep = (e: React.MouseEvent) => e.preventDefault();
  const key = "h-12 text-lg font-semibold short:h-10";

  return (
    <div className="grid grid-cols-3 gap-2 short:gap-1.5">
      {selectedLine && (
        <div className="col-span-3 flex items-center justify-between gap-2 rounded-md border border-primary bg-primary/10 px-2 py-1 text-xs">
          <span className="min-w-0 truncate">
            {t("editingQtyFor", { name: selectedLine.name })} ({selectedLine.quantity})
          </span>
          <button type="button" aria-label={tc("cancel")} className="shrink-0 font-semibold" onMouseDown={keep} onClick={onClearSelection}>
            ✕
          </button>
        </div>
      )}
      {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((k) => (
        <Button key={k} type="button" variant="outline" className={key} onMouseDown={keep} onClick={() => onChange((v) => v + k)}>
          {k}
        </Button>
      ))}
      <Button type="button" variant="outline" className={`${key} text-sm`} onMouseDown={keep} onClick={() => onChange("")}>
        {tc("clear")}
      </Button>
      <Button type="button" variant="outline" className={key} onMouseDown={keep} onClick={() => onChange((v) => v + "0")}>
        0
      </Button>
      <Button type="button" variant="outline" className={key} onMouseDown={keep} onClick={() => onChange((v) => v.slice(0, -1))}>
        <Delete className="h-5 w-5" />
      </Button>
      {selectedLine ? (
        <Button
          type="button"
          className={`${key} col-span-3 text-sm`}
          disabled={!(Number(value) > 0) || !!selectedLine.isWeighted}
          onMouseDown={keep}
          onClick={onApplyToLine}
        >
          {t("setQuantity")} {Number(value) > 0 ? `→ ${value}` : ""}
        </Button>
      ) : (
        <>
          <Button type="button" variant="secondary" className={`${key} text-sm`} disabled={!(Number(value) > 0)} onMouseDown={keep} onClick={onSetQty}>
            {t("qty")} {pendingQty > 1 ? `×${pendingQty}` : ""}
          </Button>
          <Button type="button" className={`${key} col-span-2 text-sm`} disabled={!value.trim()} onMouseDown={keep} onClick={onEnter}>
            {t("enterKey")}
          </Button>
        </>
      )}
    </div>
  );
}

export const SupermarketScanPanel = forwardRef<HTMLInputElement, { actions?: SupermarketActions }>(function SupermarketScanPanel(
  { actions },
  searchInputRef,
) {
  const t = useTranslations("pos");
  const tItem = useTranslations("item");
  const tCombo = useTranslations("combo");
  const tc = useTranslations("common");
  const locale = useLocale();
  const { toast } = useToast();
  const compId = useAuthStore((s) => s.user?.compId ?? "");
  const siteId = usePosSessionStore((s) => s.siteId ?? "");
  const currency = useCurrencyStore((s) => s.currencyCode);
  const addItem = usePosCartStore((s) => s.addItem);
  const addComboLine = usePosCartStore((s) => s.addComboLine);
  const addGiftVoucherSaleLine = usePosCartStore((s) => s.addGiftVoucherSaleLine);
  const lineCount = usePosCartStore((s) => s.lines.length);
  const selectedLine = usePosCartStore((s) => s.lines.find((l) => l.lineId === s.selectedLineId) ?? null);
  const updateQuantity = usePosCartStore((s) => s.updateQuantity);
  const selectLine = usePosCartStore((s) => s.selectLine);

  const [query, setQuery] = useState("");
  const [pendingQty, setPendingQty] = useState(1);
  const [lastAdded, setLastAdded] = useState<ItemSearchResult | null>(null);
  const [fallbackOpen, setFallbackOpen] = useState(false);
  const [fallbackQuery, setFallbackQuery] = useState("");
  const [fallbackResults, setFallbackResults] = useState<ItemSearchResult[]>([]);
  const [pickingCombo, setPickingCombo] = useState<ComboMasterDto | null>(null);
  const [sellingVoucher, setSellingVoucher] = useState(false);
  const [voucherAmount, setVoucherAmount] = useState("");
  const [combosOpen, setCombosOpen] = useState(false);

  // A supermarket counter still sells combos (e.g. a Bakery Combo) even
  // though its main flow is barcode-first — see product-search-panel.tsx's
  // tile grid for the same feature on the non-supermarket layout.
  const { data: combos = [] } = useQuery({
    queryKey: ["pos-combo-search", compId, siteId],
    queryFn: () => comboLookupService.search(compId, siteId),
    enabled: !!compId,
  });
  const { data: allItems = [] } = useQuery({
    queryKey: ["combo-all-items", compId, siteId],
    queryFn: () => posLookupService.searchItems(compId, undefined, undefined, undefined, siteId),
    enabled: !!compId && combos.length > 0,
  });

  function resolveComboComponentName(d: ComboDetailDto): string {
    if (d.componentType === "Inventory") return allItems.find((i) => i.code === d.inventoryCode)?.name ?? d.inventoryCode ?? "";
    return d.componentType === "Service" ? d.serviceCode ?? "" : d.menuCode ?? "";
  }

  function handleAddCombo(combo: ComboMasterDto) {
    const needsPicker = combo.details.some(
      (d) => d.isOptional || (combo.allowItemSubstitution && combo.details.filter((x) => x.groupNo === d.groupNo).length > 1),
    );
    if (needsPicker) {
      setPickingCombo(combo);
      return;
    }
    const resolvedComponents: ResolvedComboComponent[] = combo.details.map((d) => ({
      componentType: d.componentType,
      code: d.componentType === "Inventory" ? d.inventoryCode ?? "" : d.componentType === "Service" ? d.serviceCode ?? "" : d.menuCode ?? "",
      name: resolveComboComponentName(d),
      unitCode: d.unitCode ?? null,
      qty: d.quantity,
      additionalPrice: d.additionalPrice,
      isOptional: d.isOptional,
      selected: true,
      kitchenCode: null,
      groupNo: d.groupNo,
    }));
    addComboLine(combo, resolvedComponents);
  }

  // "Added" card, fallback search box, etc. are local UI state — they don't
  // live in the cart store, so completing a sale (or holding it, or "New
  // Sale") clears the cart via cart.clear() but leaves this panel showing
  // the previous customer's last-scanned item. Reset everything here too
  // whenever the cart goes back to empty, so a fresh sale starts clean.
  useEffect(() => {
    if (lineCount === 0) {
      setLastAdded(null);
      setFallbackOpen(false);
      setFallbackQuery("");
      setFallbackResults([]);
    }
  }, [lineCount]);

  async function handleScan(code: string) {
    // Scale-printed weight barcode (produce/bakery/deli) — decode the PLU +
    // weight client-side and look the item up by PLU, bypassing the qty
    // multiplier entirely (the weight IS the quantity, already known from the
    // sticker). Manual keypad entry of the same 13-digit code hits this same
    // path, so no separate UI is needed for that case.
    const weightInfo = parseWeightBarcode(code);
    if (weightInfo) {
      const matches = await posLookupService.searchItems(compId, undefined, undefined, weightInfo.plu, siteId);
      const match = matches[0];
      if (match && match.isWeighted) {
        addItem(match, weightInfo.weightKg);
        setLastAdded(match);
        setQuery("");
        return;
      }
      toast({ title: t("itemNotFoundScan"), variant: "destructive" });
      setFallbackOpen(true);
      setFallbackQuery("");
      return;
    }

    const matches = await posLookupService.searchItems(compId, undefined, code, undefined, siteId);
    const match = matches[0];
    if (match) {
      addItem(match, pendingQty);
      setLastAdded(match);
      setPendingQty(1);
      setQuery("");
    } else {
      toast({ title: t("itemNotFoundScan"), variant: "destructive" });
      setFallbackOpen(true);
      setFallbackQuery(code);
      void runFallbackSearch(code);
    }
  }

  async function runFallbackSearch(text: string) {
    if (!text.trim()) {
      setFallbackResults([]);
      return;
    }
    const matches = await posLookupService.searchItems(compId, text, undefined, undefined, siteId);
    setFallbackResults(matches);
  }

  function handleFallbackQueryChange(value: string) {
    setFallbackQuery(value);
    void runFallbackSearch(value);
  }

  function handleFallbackAdd(item: ItemSearchResult) {
    // A weighed item has no fixed price-per-unit weight known from a name
    // search alone — its weight only ever comes from a scanned sticker, so
    // adding it here would need a made-up quantity. Require a scan instead.
    if (item.isWeighted) {
      toast({ title: t("scanRequiredForWeighed"), variant: "destructive" });
      return;
    }
    addItem(item, pendingQty);
    setLastAdded(item);
    setPendingQty(1);
  }

  // Qty key of the number box: whatever is typed becomes the multiplier for the next scan.
  function handleSetQtyFromPad() {
    const n = Number(query);
    if (!Number.isFinite(n) || n <= 0) return;
    setPendingQty(n);
    setQuery("");
  }

  // "Set Qty" with a cart line selected: the typed number becomes that line's quantity.
  function handleApplyToLine() {
    const n = Number(query);
    if (!selectedLine || !Number.isFinite(n) || n <= 0) return;
    updateQuantity(selectedLine.lineId, n);
    selectLine(null);
    setQuery("");
  }

  // The details card shows the cart line the cashier selected, else the item scanned last.
  const details = selectedLine
    ? {
        selected: true,
        name: selectedLine.name,
        code: selectedLine.itemCode,
        barcode: selectedLine.barcode,
        categoryCode: selectedLine.categoryCode,
        unitCode: selectedLine.unitCode,
        taxRate: selectedLine.taxPercentage,
        price: selectedLine.unitPrice,
        imagePath: selectedLine.imagePath,
        quantity: selectedLine.quantity,
        lineTotal: calcLineTotals(selectedLine).taxable,
      }
    : lastAdded
      ? {
          selected: false,
          name: lastAdded.name,
          code: lastAdded.code,
          barcode: lastAdded.barCode,
          categoryCode: lastAdded.categoryCode,
          unitCode: lastAdded.unitCode,
          taxRate: lastAdded.taxRate,
          price: lastAdded.price ?? 0,
          imagePath: lastAdded.imagePath,
          quantity: undefined as number | undefined,
          lineTotal: undefined as number | undefined,
        }
      : null;

  const dialogs = (
    <>
      <SelectComboOptionsDialog
        combo={pickingCombo}
        resolveName={resolveComboComponentName}
        onOpenChange={(open) => !open && setPickingCombo(null)}
        onConfirm={(resolvedComponents, quantity) => {
          if (pickingCombo) addComboLine(pickingCombo, resolvedComponents, quantity);
        }}
      />

      <Dialog
        open={sellingVoucher}
        onOpenChange={(open) => {
          setSellingVoucher(open);
          if (!open) setVoucherAmount("");
        }}
      >
        <DialogContent className="max-w-xs">
          <DialogHeader>
            <DialogTitle>{t("sellGiftVoucher")}</DialogTitle>
          </DialogHeader>
          <MoneyInput
            currency={currency}
            value={voucherAmount}
            onChange={(e) => setVoucherAmount(e.target.value)}
            placeholder={t("giftVoucherAmount")}
            onKeyDown={(e) => {
              if (e.key === "Enter" && Number(voucherAmount) > 0) {
                addGiftVoucherSaleLine(Number(voucherAmount));
                setSellingVoucher(false);
                setVoucherAmount("");
              }
            }}
          />
          <DialogFooter>
            <Button
              disabled={!(Number(voucherAmount) > 0)}
              onClick={() => {
                addGiftVoucherSaleLine(Number(voucherAmount));
                setSellingVoucher(false);
                setVoucherAmount("");
              }}
            >
              {t("addToCart")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );

  // Desktop supermarket checkout: second column = item details + scan + number box,
  // third column = every action button aligned top-down with PAYMENT at the bottom.
  if (actions) {
    return (
      <>
        <div className="flex min-h-0 flex-col gap-3 short:gap-2">
          <div
            className={`flex min-h-[7rem] flex-1 flex-col gap-2 overflow-hidden rounded-lg border bg-card p-3 short:p-2 ${
              details?.selected ? "border-primary ring-1 ring-primary" : ""
            }`}
          >
            {details ? (
              <>
                <div className="flex items-start gap-3">
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-md bg-muted short:h-10 short:w-10">
                    {resolveImageUrl(details.imagePath) ? (
                      // eslint-disable-next-line @next/next/no-img-element -- backend-served upload
                      <img src={resolveImageUrl(details.imagePath)} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <Package className="h-6 w-6 text-muted-foreground" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-muted-foreground">{details.selected ? t("selectedItem") : t("lastAdded")}</p>
                    <p className="line-clamp-2 font-medium leading-snug">{details.name}</p>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-1.5">
                  <Badge variant="secondary" className="font-mono text-[10px]">
                    {tc("code")}: {details.code}
                  </Badge>
                  {details.barcode && (
                    <Badge variant="secondary" className="font-mono text-[10px]">
                      {tItem("barcode")}: {details.barcode}
                    </Badge>
                  )}
                  {details.categoryCode && (
                    <Badge variant="outline" className="text-[10px]">
                      {tItem("category")}: {details.categoryCode}
                    </Badge>
                  )}
                  {details.unitCode && (
                    <Badge variant="outline" className="text-[10px]">
                      {tItem("unit")}: {details.unitCode}
                    </Badge>
                  )}
                  {!!details.taxRate && (
                    <Badge variant="outline" className="text-[10px]">
                      {tItem("taxRate")}: {details.taxRate}%
                    </Badge>
                  )}
                </div>
                <div className="mt-auto flex items-end justify-between gap-2">
                  {details.quantity !== undefined && (
                    <p className="text-sm text-muted-foreground tabular-nums">
                      {t("qty")}: <span className="font-semibold text-foreground">{details.quantity}</span>
                      {details.lineTotal !== undefined && <> · {formatMoney(details.lineTotal, currency, locale)}</>}
                    </p>
                  )}
                  <p className="ms-auto text-xl font-bold tabular-nums text-primary">
                    {formatMoney(details.price ?? 0, currency, locale)}
                  </p>
                </div>
              </>
            ) : (
              <div className="flex h-full flex-col items-center justify-center gap-2 text-center text-muted-foreground">
                <ScanLine className="h-8 w-8 short:h-6 short:w-6" />
                <p className="text-sm">{t("scanPrompt")}</p>
              </div>
            )}
          </div>

          <div className="space-y-1">
            <BarcodeScannerInput ref={searchInputRef} value={query} onValueChange={setQuery} onScan={handleScan} onQuantitySet={setPendingQty} />
            {pendingQty > 1 && <p className="text-xs font-medium text-primary">{t("scanQtyHint", { qty: pendingQty })}</p>}
          </div>

          <NumberBox
            value={query}
            onChange={setQuery}
            onEnter={() => query.trim() && void handleScan(query.trim())}
            onSetQty={handleSetQtyFromPad}
            pendingQty={pendingQty}
            selectedLine={selectedLine}
            onApplyToLine={handleApplyToLine}
            onClearSelection={() => selectLine(null)}
          />
        </div>

        <div className="flex min-h-0 flex-col gap-2 short:gap-1.5">
          <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto short:gap-1.5 [&_button]:w-full [&_button]:justify-center short:[&_button]:h-9 [&_button]:h-11">
            <Button variant="outline" disabled={actions.holdDisabled} onClick={actions.onHold}>
              {t("holdBill")}
            </Button>
            <Button variant="outline" onClick={actions.onHeldBills}>
              <Archive className="me-1 h-4 w-4" />
              {t("heldBills")}
            </Button>
            <Button variant="outline" onClick={actions.onReturn}>
              <RotateCcw className="me-1 h-4 w-4" />
              {t("returnBill")}
            </Button>
            <CashDrawerButton />
            <CustomerDisplayButton terminalId={actions.terminalId} />
            <PriceCheckButton />
            <StockLookupButton />
            <XReportButton />
            <ShiftCloseButton />
            <Button type="button" variant="outline" onClick={() => setSellingVoucher(true)}>
              <Ticket className="me-1 h-4 w-4" />
              {t("sellGiftVoucher")}
            </Button>
            <Button type="button" variant="outline" onClick={() => setFallbackOpen(true)}>
              <Search className="me-1 h-4 w-4" />
              {t("fallbackSearchLabel")}
            </Button>
            {combos.length > 0 && (
              <Button type="button" variant="outline" onClick={() => setCombosOpen(true)}>
                <Layers className="me-1 h-4 w-4" />
                {tCombo("combos")}
              </Button>
            )}
          </div>

          <QuickPayButtons
            className="shrink-0"
            onQuickPay={actions.onQuickPay}
            onPayment={actions.onPay}
            disabled={actions.payDisabled}
            loading={actions.payLoading}
          />
        </div>

        <Dialog open={fallbackOpen} onOpenChange={setFallbackOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>{t("fallbackSearchLabel")}</DialogTitle>
            </DialogHeader>
            <Input
              autoFocus
              value={fallbackQuery}
              onChange={(e) => handleFallbackQueryChange(e.target.value)}
              placeholder={t("fallbackSearchLabel")}
            />
            <div className="flex max-h-72 flex-col gap-1 overflow-y-auto">
              {fallbackResults.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleFallbackAdd(item)}
                  className="flex items-center justify-between rounded-md border px-3 py-2 text-start text-sm hover:border-primary hover:bg-accent"
                >
                  <span className="flex flex-col">
                    <span>{item.name}</span>
                    {item.barCode && <span className="font-mono text-xs text-muted-foreground">{item.barCode}</span>}
                    {item.isWeighted && <span className="text-xs text-muted-foreground">{t("scanRequiredForWeighed")}</span>}
                  </span>
                  <span className="font-semibold tabular-nums text-primary">{formatMoney(item.price ?? 0, currency, locale)}</span>
                </button>
              ))}
              {fallbackQuery && fallbackResults.length === 0 && (
                <p className="py-2 text-center text-sm text-muted-foreground">{t("noProductsFound")}</p>
              )}
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={combosOpen} onOpenChange={setCombosOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>{tCombo("combos")}</DialogTitle>
            </DialogHeader>
            <div className="flex max-h-80 flex-col gap-1.5 overflow-y-auto">
              {combos.map((combo) => (
                <button
                  key={combo.code}
                  type="button"
                  onClick={() => {
                    setCombosOpen(false);
                    handleAddCombo(combo);
                  }}
                  className="flex items-center justify-between gap-2 rounded-md border bg-card px-3 py-2 text-start text-sm hover:border-primary hover:bg-accent"
                >
                  <span className="flex items-center gap-2">
                    <Layers className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">{combo.comboName}</span>
                  </span>
                  <span className="font-semibold tabular-nums text-primary">{formatMoney(combo.sellingPrice, currency, locale)}</span>
                </button>
              ))}
            </div>
          </DialogContent>
        </Dialog>

        {dialogs}
      </>
    );
  }

  return (
    <div className="flex h-full flex-col gap-4 short:gap-2">
      <div className="flex flex-col items-center gap-3 rounded-lg border bg-muted/30 px-4 py-8 short:gap-2 short:py-3">
        <ScanLine className="h-10 w-10 text-muted-foreground short:h-6 short:w-6" />
        <p className="text-sm text-muted-foreground">{t("scanPrompt")}</p>
        <div className="w-full max-w-md">
          <BarcodeScannerInput
            ref={searchInputRef}
            value={query}
            onValueChange={setQuery}
            onScan={handleScan}
            onQuantitySet={setPendingQty}
          />
        </div>
        {pendingQty > 1 && (
          <p className="text-sm font-medium text-primary">{t("scanQtyHint", { qty: pendingQty })}</p>
        )}
        <Button type="button" size="sm" variant="outline" className="gap-1.5" onClick={() => setSellingVoucher(true)}>
          <Ticket className="h-3.5 w-3.5" />
          {t("sellGiftVoucher")}
        </Button>
      </div>

      {combos.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-xs font-medium text-muted-foreground">{tCombo("combos")}</p>
          <div className="flex gap-2 overflow-x-auto pb-1">
          {combos.map((combo) => (
            <button
              key={combo.code}
              type="button"
              onClick={() => handleAddCombo(combo)}
              className="flex shrink-0 items-center gap-2 rounded-md border bg-card px-3 py-2 text-start text-sm hover:border-primary hover:bg-accent"
            >
              <Layers className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">{combo.comboName}</span>
              <span className="font-semibold tabular-nums text-primary">
                {formatMoney(combo.sellingPrice, currency, locale)}
              </span>
            </button>
          ))}
          </div>
        </div>
      )}

      {lastAdded && (
        <div className="flex items-center gap-4 rounded-md border bg-card px-4 py-3 short:py-2">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-md bg-muted short:h-10 short:w-10">
            {resolveImageUrl(lastAdded.imagePath) ? (
              // eslint-disable-next-line @next/next/no-img-element -- backend-served upload
              <img src={resolveImageUrl(lastAdded.imagePath)} alt="" className="h-full w-full object-cover" />
            ) : (
              <Package className="h-7 w-7 text-muted-foreground" />
            )}
          </div>

          <div className="min-w-0 flex-1">
            <p className="text-xs text-muted-foreground">{t("lastAdded")}</p>
            <p className="truncate font-medium">{lastAdded.name}</p>
            <div className="mt-1 flex flex-wrap items-center gap-1.5">
              <Badge variant="secondary" className="font-mono text-[10px]">
                {tc("code")}: {lastAdded.code}
              </Badge>
              {lastAdded.categoryCode && (
                <Badge variant="outline" className="text-[10px]">
                  {tItem("category")}: {lastAdded.categoryCode}
                </Badge>
              )}
              {lastAdded.unitCode && (
                <Badge variant="outline" className="text-[10px]">
                  {tItem("unit")}: {lastAdded.unitCode}
                </Badge>
              )}
              {!!lastAdded.taxRate && (
                <Badge variant="outline" className="text-[10px]">
                  {tItem("taxRate")}: {lastAdded.taxRate}%
                </Badge>
              )}
            </div>
          </div>

          <p className="shrink-0 font-semibold tabular-nums text-primary">
            {formatMoney(lastAdded.price ?? 0, currency, locale)}
          </p>
        </div>
      )}

      <p className="text-center text-xs text-muted-foreground">{t("itemsScannedCount", { count: lineCount })}</p>

      <div className="mt-auto">
        {!fallbackOpen ? (
          <Button
            type="button"
            variant="link"
            size="sm"
            className="mx-auto flex gap-1 text-muted-foreground"
            onClick={() => setFallbackOpen(true)}
          >
            <Search className="h-3.5 w-3.5" />
            {t("fallbackSearchLabel")}
          </Button>
        ) : (
          <div className="flex flex-1 flex-col gap-2 overflow-hidden">
            <Input
              autoFocus
              value={fallbackQuery}
              onChange={(e) => handleFallbackQueryChange(e.target.value)}
              placeholder={t("fallbackSearchLabel")}
            />
            <div className="flex max-h-64 flex-col gap-1 overflow-y-auto">
              {fallbackResults.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleFallbackAdd(item)}
                  className="flex items-center justify-between rounded-md border px-3 py-2 text-start text-sm hover:border-primary hover:bg-accent"
                >
                  <span className="flex flex-col">
                    <span>{item.name}</span>
                    {item.barCode && <span className="font-mono text-xs text-muted-foreground">{item.barCode}</span>}
                    {item.isWeighted && (
                      <span className="text-xs text-muted-foreground">{t("scanRequiredForWeighed")}</span>
                    )}
                  </span>
                  <span className="font-semibold tabular-nums text-primary">
                    {formatMoney(item.price ?? 0, currency, locale)}
                  </span>
                </button>
              ))}
              {fallbackQuery && fallbackResults.length === 0 && (
                <p className="py-2 text-center text-sm text-muted-foreground">{t("noProductsFound")}</p>
              )}
            </div>
          </div>
        )}
      </div>

      {dialogs}
    </div>
  );
});
