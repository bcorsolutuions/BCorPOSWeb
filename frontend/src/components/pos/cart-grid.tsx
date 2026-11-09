"use client";

import { useEffect, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Minus, Plus, Trash2, Pencil, Scissors, Ticket, X } from "lucide-react";
import { usePosCartStore } from "@/stores/pos-cart-store";
import { useCurrencyStore } from "@/stores/currency-store";
import { useAuthStore } from "@/stores/auth-store";
import { usePosSessionStore } from "@/stores/pos-session-store";
import { useCouponApply } from "@/hooks/use-coupon-apply";
import { calcLineTotals, calcCommission } from "@/lib/pos/calc";
import { PriceOverrideDialog } from "@/components/pos/price-override-dialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/use-toast";
import { formatMoney, formatMoneyPlain } from "@/lib/utils";
import type { PosCartLine } from "@/types/pos";

// Supermarket cart: one row per item under column headings — Item | Price | Qty | Disc | Total | (remove).
const SUPERMARKET_COLS = "grid-cols-[minmax(0,1fr)_3rem_2.75rem_2.5rem_3.5rem_1.5rem]";
// Narrow cart (trading / salon: a third of the screen): below 1024px the per-line Disc column is dropped so the
// item name keeps room; the bill-level discount below the list is unaffected.
const COMPACT_COLS = "grid-cols-[minmax(0,1fr)_3rem_2.75rem_3.5rem_1.5rem] lg:grid-cols-[minmax(0,1fr)_3rem_2.75rem_2.5rem_3.5rem_1.5rem]";

function CartLineRow({
  line,
  variant = "default",
  compact = false,
}: {
  line: PosCartLine;
  variant?: "default" | "supermarket";
  compact?: boolean;
}) {
  // Supermarket checkout has no +/- steppers: quantities come from scanning (or the number box's Qty key);
  // a line's quantity can still be typed in by tapping it.
  const showSteppers = variant !== "supermarket";
  const t = useTranslations("pos");
  const tSalon = useTranslations("salon");
  const locale = useLocale();
  const currency = useCurrencyStore((s) => s.currencyCode);
  const { updateQuantity, removeLine, setLineDiscount, overrideLinePrice, selectLine, selectedLineId } = usePosCartStore();
  const selected = variant === "supermarket" && selectedLineId === line.lineId;
  const [priceDialogOpen, setPriceDialogOpen] = useState(false);
  const [editingQty, setEditingQty] = useState(false);
  const totals = calcLineTotals(line);
  const isService = line.lineType === "Service";
  const commission = isService ? calcCommission(line) : 0;

  if (variant === "supermarket") {
    const promoAmount = line.promotionDiscountAmount ?? 0;
    return (
      <div
        data-line-id={line.lineId}
        // Tap a row to select it; the number box's "Set Qty" key then changes this line's quantity.
        onClick={() => selectLine(line.lineId)}
        className={`grid ${compact ? COMPACT_COLS : SUPERMARKET_COLS} cursor-pointer items-center gap-1 rounded-md border px-2 py-1.5 ${
          selected ? "border-primary bg-primary/10 ring-1 ring-primary" : ""
        }`}
      >
        <div className="min-w-0">
          <p className="line-clamp-2 break-words text-sm font-medium leading-tight" title={line.name}>
            {line.name}
          </p>
          {line.lineType === "Service" && line.staffName && (
            <p className="truncate text-[10px] text-muted-foreground">{line.staffName}</p>
          )}
          {line.barcode && <p className="truncate font-mono text-[10px] text-muted-foreground">{line.barcode}</p>}
          {promoAmount > 0 && (
            <p className="truncate text-[10px] text-muted-foreground">
              {line.promotionName ?? line.promotionCode}: -{formatMoneyPlain(promoAmount, currency, locale)}
            </p>
          )}
        </div>

        <button
          onClick={() => setPriceDialogOpen(true)}
          className="flex items-center justify-end gap-0.5 text-xs tabular-nums text-muted-foreground hover:text-primary"
        >
          {line.priceOverrideBy && <Pencil className="h-3 w-3 text-warning" />}
          {formatMoneyPlain(line.unitPrice, currency, locale)}
        </button>

        {line.isWeighted ? (
          // Weighed lines take their quantity from the scanned sticker; not editable here.
          <span className="text-center text-xs tabular-nums">
            {line.quantity.toFixed(3)} {t("weightKg")}
          </span>
        ) : editingQty ? (
          <Input
            autoFocus
            type="number"
            defaultValue={line.quantity}
            onFocus={(e) => e.target.select()}
            onKeyDown={(e) => {
              if (e.key === "Enter") e.currentTarget.blur();
              if (e.key === "Escape") setEditingQty(false);
            }}
            onBlur={(e) => {
              const n = Number(e.target.value);
              // 0 / blank keeps the old quantity — removing a line is the bin button's job.
              if (n > 0) updateQuantity(line.lineId, n);
              setEditingQty(false);
            }}
            className="h-7 w-full px-1 text-center text-sm"
          />
        ) : (
          <button
            onClick={() => setEditingQty(true)}
            className="rounded border px-1 py-0.5 text-center text-sm font-medium tabular-nums hover:border-primary"
          >
            {line.quantity}
          </button>
        )}

        <Input
          type="number"
          value={line.discountAmt || ""}
          onChange={(e) => setLineDiscount(line.lineId, Number(e.target.value) || 0)}
          title={t("lineDiscount")}
          className={`h-7 w-full px-1 text-end text-xs ${compact ? "hidden lg:block" : ""}`}
        />

        <p className="text-end text-sm font-semibold tabular-nums">{formatMoneyPlain(totals.taxable, currency, locale)}</p>

        <Button
          size="icon"
          variant="ghost"
          className="h-6 w-6"
          onClick={() => removeLine(line.lineId)}
          aria-label={t("voidLine")}
        >
          <Trash2 className="h-3.5 w-3.5 text-destructive" />
        </Button>

        <PriceOverrideDialog
          open={priceDialogOpen}
          onOpenChange={setPriceDialogOpen}
          currentPrice={line.unitPrice}
          onApproved={(newPrice, approvedBy) => overrideLinePrice(line.lineId, newPrice, approvedBy)}
        />
      </div>
    );
  }

  return (
    <div data-line-id={line.lineId} className="space-y-1.5 rounded-md border p-2">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1 space-y-1">
          <p className="text-sm font-medium leading-snug">{line.name}</p>
          {line.barcode && <p className="font-mono text-[10px] text-muted-foreground">{line.barcode}</p>}
          {isService && (
            <div className="flex flex-wrap items-center gap-1.5">
              <Badge variant="secondary" className="gap-1 px-1.5 py-0 text-[10px]">
                <Scissors className="h-2.5 w-2.5" />
                {line.staffName ?? tSalon("staff")}
              </Badge>
              {commission > 0 && (
                <span className="text-[10px] text-muted-foreground">
                  {tSalon("commission")}: {formatMoneyPlain(commission, currency, locale)}
                </span>
              )}
            </div>
          )}
          {(line.promotionDiscountAmount ?? 0) > 0 && (
            <Badge variant="secondary" className="gap-1 px-1.5 py-0 text-[10px]">
              {line.promotionName ?? line.promotionCode}: -{formatMoneyPlain(line.promotionDiscountAmount ?? 0, currency, locale)}
            </Badge>
          )}
        </div>
        <Button
          size="icon"
          variant="ghost"
          className="h-6 w-6 shrink-0"
          onClick={() => removeLine(line.lineId)}
          aria-label={t("voidLine")}
        >
          <Trash2 className="h-3.5 w-3.5 text-destructive" />
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={() => setPriceDialogOpen(true)}
          className="flex shrink-0 items-center gap-1 text-xs text-muted-foreground hover:text-primary"
        >
          {formatMoneyPlain(line.unitPrice, currency, locale)}
          {line.priceOverrideBy && <Pencil className="h-3 w-3 text-warning" />}
        </button>

        {line.isWeighted ? (
          // A weighed line's quantity comes from the scanned sticker's
          // encoded weight, not manual +/- steps — incrementing by whole
          // units makes no sense for a kg value. Read-only; a mis-weighed
          // line is corrected by removing it and re-scanning.
          <span className="shrink-0 text-sm tabular-nums">{line.quantity.toFixed(3)} {t("weightKg")}</span>
        ) : (
          <div className="flex shrink-0 items-center gap-1">
            {showSteppers && (
              <Button size="icon" variant="outline" className="h-8 w-8" onClick={() => updateQuantity(line.lineId, line.quantity - 1)}>
                <Minus className="h-3.5 w-3.5" />
              </Button>
            )}
            {editingQty ? (
              <Input
                autoFocus
                type="number"
                defaultValue={line.quantity}
                onBlur={(e) => {
                  updateQuantity(line.lineId, Number(e.target.value) || 0);
                  setEditingQty(false);
                }}
                className="h-8 w-14 text-center"
              />
            ) : (
              <button
                onClick={() => setEditingQty(true)}
                className={showSteppers ? "w-8 text-center text-sm tabular-nums" : "min-w-10 rounded border px-2 py-1 text-center text-sm font-medium tabular-nums"}
              >
                {line.quantity}
              </button>
            )}
            {showSteppers && (
              <Button size="icon" variant="outline" className="h-8 w-8" onClick={() => updateQuantity(line.lineId, line.quantity + 1)}>
                <Plus className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        )}

        <Input
          type="number"
          value={line.discountAmt || ""}
          onChange={(e) => setLineDiscount(line.lineId, Number(e.target.value) || 0)}
          placeholder={t("lineDiscount")}
          title={t("lineDiscount")}
          className="h-8 w-16 shrink-0 text-end text-xs"
        />

        <div className="ms-auto shrink-0 whitespace-nowrap text-end">
          {(line.promotionDiscountAmount ?? 0) > 0 && (
            <p className="text-[10px] text-muted-foreground line-through tabular-nums">
              {formatMoneyPlain(totals.gross, currency, locale)}
            </p>
          )}
          <p className="text-sm font-semibold tabular-nums">
            {formatMoneyPlain(totals.taxable, currency, locale)}
          </p>
        </div>
      </div>

      <PriceOverrideDialog
        open={priceDialogOpen}
        onOpenChange={setPriceDialogOpen}
        currentPrice={line.unitPrice}
        onApproved={(newPrice, approvedBy) => overrideLinePrice(line.lineId, newPrice, approvedBy)}
      />
    </div>
  );
}

/** "Coupon Code: [Input] [Apply]" / "Coupon {code} Applied — Discount: {amount} [Remove Coupon]" — supports a barcode/QR scanner as plain keyboard input (Enter submits, same convention as barcode-scanner-input.tsx). */
function CouponRow() {
  const t = useTranslations("pos");
  const locale = useLocale();
  const currency = useCurrencyStore((s) => s.currencyCode);
  const { toast } = useToast();
  const compId = useAuthStore((s) => s.user?.compId ?? "");
  const siteId = usePosSessionStore((s) => s.siteId ?? "");
  const { couponCode, couponName, couponDiscountAmount, removeCoupon } = usePosCartStore();
  const [input, setInput] = useState("");
  const applyMutation = useCouponApply(compId, siteId);

  const handleApply = () => {
    const code = input.trim();
    if (!code) return;
    applyMutation.mutate(code, {
      onSuccess: () => setInput(""),
      onError: (error) => toast({ title: error instanceof Error ? error.message : t("couponInvalid"), variant: "destructive" }),
    });
  };

  if (couponCode) {
    return (
      <div className="flex items-center justify-between rounded-md bg-success/10 px-2 py-1.5">
        <div className="flex items-center gap-1.5 text-xs">
          <Ticket className="h-3.5 w-3.5 text-success" />
          <span className="font-medium">
            {t("couponApplied", { code: couponName ?? couponCode })}
          </span>
          <span className="text-muted-foreground">
            {t("couponDiscount")}: {formatMoneyPlain(couponDiscountAmount, currency, locale)}
          </span>
        </div>
        <Button size="icon" variant="ghost" className="h-6 w-6 shrink-0" onClick={removeCoupon} aria-label={t("removeCoupon")}>
          <X className="h-3.5 w-3.5 text-destructive" />
        </Button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1.5">
      <Input
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            handleApply();
          }
        }}
        placeholder={t("couponCode")}
        className="h-8 flex-1 text-xs"
      />
      <Button size="sm" variant="outline" className="h-8 shrink-0" disabled={!input.trim() || applyMutation.isPending} onClick={handleApply}>
        {t("applyCoupon")}
      </Button>
    </div>
  );
}

export function CartGrid({ variant = "default", compact = false }: { variant?: "default" | "supermarket"; compact?: boolean }) {
  const t = useTranslations("pos");
  const tc = useTranslations("common");
  const locale = useLocale();
  const currency = useCurrencyStore((s) => s.currencyCode);
  const { lines, billDiscountAmount, setBillDiscount, billPromotionCode, billPromotionName, billPromotionDiscountAmount, totals } =
    usePosCartStore();
  const billTotals = totals();

  // Keep the item just scanned (or whose quantity just changed) in view: a long cart scrolls
  // so the cashier always sees the last entry without touching the list.
  const listRef = useRef<HTMLDivElement>(null);
  const prevQtyRef = useRef<Map<string, number>>(new Map());
  useEffect(() => {
    const prev = prevQtyRef.current;
    const changed = lines.filter((l) => prev.get(l.lineId) !== l.quantity);
    prevQtyRef.current = new Map(lines.map((l) => [l.lineId, l.quantity]));
    const target = changed[changed.length - 1];
    if (!target) return;
    listRef.current
      ?.querySelector(`[data-line-id="${target.lineId}"]`)
      ?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [lines]);

  return (
    <Card className="flex h-full flex-col p-0">
      <div className="flex items-center justify-between border-b p-3 short:px-3 short:py-1.5">
        <h2 className="font-semibold">
          {t("cart")} <span className="font-normal text-muted-foreground">({currency})</span>
        </h2>
        <span className="text-sm text-muted-foreground">{lines.length}</span>
      </div>

      {variant === "supermarket" && (
        <div
          className={`grid ${compact ? COMPACT_COLS : SUPERMARKET_COLS} gap-1 border-b bg-muted/40 px-5 py-1.5 text-xs font-medium text-muted-foreground`}
        >
          <span>{t("cartColItem")}</span>
          <span className="text-end">{t("cartColPrice")}</span>
          <span className="text-center">{t("qty")}</span>
          <span className={`text-end ${compact ? "hidden lg:block" : ""}`}>{t("cartColDisc")}</span>
          <span className="text-end">{t("cartColTotal")}</span>
          <span />
        </div>
      )}

      <div ref={listRef} className="flex-1 space-y-2 overflow-y-auto p-3 short:space-y-1.5 short:p-2">
        {lines.length === 0 && <p className="py-8 text-center text-sm text-muted-foreground">{t("emptyCart")}</p>}
        {lines.map((line) => (
          <CartLineRow key={line.lineId} line={line} variant={variant} compact={compact} />
        ))}
      </div>

      {variant === "supermarket" ? (
        <div className="space-y-2 border-t p-3 text-sm short:px-3 short:py-2">
          {/* Bill discount, subtotal, discount, tax and grand total on one row. */}
          <div className="grid grid-cols-[1.1fr_1fr_1fr_0.9fr_1.9fr] items-end gap-1.5">
            <div className="flex min-w-0 flex-col">
              <span className="truncate text-xs text-muted-foreground">{t("billDiscount")}</span>
              <Input
                type="number"
                value={billDiscountAmount || ""}
                onChange={(e) => setBillDiscount(Number(e.target.value) || 0)}
                className="h-8 w-full px-2 text-end"
              />
            </div>
            <div className="flex min-w-0 flex-col">
              <span className="truncate text-xs text-muted-foreground">{tc("subtotal")}</span>
              <span className="py-1 tabular-nums">{formatMoneyPlain(billTotals.subTotal, currency, locale)}</span>
            </div>
            <div className="flex min-w-0 flex-col">
              <span className="truncate text-xs text-muted-foreground">{tc("discount")}</span>
              <span className="py-1 tabular-nums">
                {billTotals.discountAmount > 0 ? "-" : ""}
                {formatMoneyPlain(billTotals.discountAmount, currency, locale)}
              </span>
            </div>
            <div className="flex min-w-0 flex-col">
              <span className="truncate text-xs text-muted-foreground">{tc("tax")}</span>
              <span className="py-1 tabular-nums">{formatMoneyPlain(billTotals.taxAmount, currency, locale)}</span>
            </div>
            <div className="flex min-w-0 flex-col">
              <span className="truncate text-xs font-semibold text-muted-foreground">{tc("grandTotal")}</span>
              <span className="whitespace-nowrap py-1 text-sm font-bold tabular-nums lg:text-base">{formatMoney(billTotals.netTotal, currency, locale)}</span>
            </div>
          </div>
          {billPromotionCode && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">
                {t("billPromotion")} ({billPromotionName ?? billPromotionCode})
              </span>
              <span className="tabular-nums">-{formatMoneyPlain(billPromotionDiscountAmount, currency, locale)}</span>
            </div>
          )}
          <CouponRow />
        </div>
      ) : (
      <div className="space-y-1 border-t p-3 text-sm short:px-3 short:py-2">
        {/* On a short screen the bill discount and coupon sit side by side, and
            subtotal / discount / tax share one row, so the totals take about
            half the height and the item list keeps room. */}
        <div className="space-y-1 short:grid short:grid-cols-2 short:items-center short:gap-x-3 short:space-y-0">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">{t("billDiscount")}</span>
            <Input
              type="number"
              value={billDiscountAmount || ""}
              onChange={(e) => setBillDiscount(Number(e.target.value) || 0)}
              className="h-7 w-24 text-end short:w-20"
            />
          </div>
          {billPromotionCode && (
            <div className="flex justify-between short:order-last short:col-span-2">
              <span className="text-muted-foreground">
                {t("billPromotion")} ({billPromotionName ?? billPromotionCode})
              </span>
              <span className="tabular-nums">-{formatMoneyPlain(billPromotionDiscountAmount, currency, locale)}</span>
            </div>
          )}
          <CouponRow />
        </div>
        <div className="space-y-1 short:flex short:justify-between short:gap-3 short:space-y-0">
          <div className="flex justify-between short:flex-1 short:flex-col short:items-start">
            <span className="text-muted-foreground short:text-xs">{tc("subtotal")}</span>
            <span className="tabular-nums">{formatMoneyPlain(billTotals.subTotal, currency, locale)}</span>
          </div>
          <div className="flex justify-between short:flex-1 short:flex-col short:items-center">
            <span className="text-muted-foreground short:text-xs">{tc("discount")}</span>
            <span className="tabular-nums">
              {billTotals.discountAmount > 0 ? "-" : ""}
              {formatMoneyPlain(billTotals.discountAmount, currency, locale)}
            </span>
          </div>
          <div className="flex justify-between short:flex-1 short:flex-col short:items-end">
            <span className="text-muted-foreground short:text-xs">{tc("tax")}</span>
            <span className="tabular-nums">{formatMoneyPlain(billTotals.taxAmount, currency, locale)}</span>
          </div>
        </div>
        <Separator className="my-2 short:my-1" />
        <div className="flex justify-between text-base font-semibold">
          <span>{tc("grandTotal")}</span>
          <span className="tabular-nums">{formatMoney(billTotals.netTotal, currency, locale)}</span>
        </div>
      </div>
      )}
    </Card>
  );
}
