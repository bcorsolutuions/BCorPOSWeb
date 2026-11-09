import type { PosBillTotals, PosCartLine, PosLineTotals } from "@/types/pos";

/**
 * Line math: Gross = UnitPrice × Qty; tax is computed on the
 * discounted (taxable) amount, matching PosDet's GrossAmount/DiscountAmt/
 * TaxAmount/NetAmount fields (see 06-database-design.md's money-column
 * conventions). Everything rounds to 3dp — BHD's real minor-unit precision,
 * the only currency actually exercised in this app so far (see
 * currency-store.ts's SUPPORTED_CURRENCIES for the 2dp ones — AED/SAR/QAR/
 * USD — that would need this to become currency-aware if/when they're
 * wired up for real POS billing).
 *
 * POS calculation pipeline (see PosController.cs's class-level doc comment
 * for the full 11-step order) — this function is steps 5 (manual line
 * discount, `line.discountAmt`) and 6 (tax): line promotion (step 2) is
 * folded in here too as a second, additive subtrahend off the same taxable
 * base, not a separate sequential pass — the two discounts are commutative,
 * there's no ordering between them that would change the result.
 */
export function calcLineTotals(
  line: Pick<PosCartLine, "unitPrice" | "quantity" | "discountAmt" | "taxPercentage" | "promotionDiscountAmount">,
): PosLineTotals {
  const gross = round(line.unitPrice * line.quantity);
  // Promotion discount is additive with the manual/generic line discount,
  // not a replacement for it — see PromotionEngineService's "store
  // separately" requirement. Both come off the same taxable base.
  const discount = round(Math.min(line.discountAmt + (line.promotionDiscountAmount ?? 0), gross));
  const taxable = round(gross - discount);
  const tax = round(taxable * (line.taxPercentage / 100));
  return { gross, discount, taxable, tax, net: round(taxable + tax) };
}

/**
 * Bill totals sum every line, then apply an optional bill-level discount on
 * top of line-level discounts (entered separately in the cart panel).
 * Simplification: the bill-level discount is not re-taxed — it comes off
 * the already-taxed net total, which matches how most tills post a
 * "manager discount" line rather than recomputing VAT on a reduced base.
 *
 * Pipeline steps 5-7 (manual/bill-level discount, tax, invoice net) —
 * billPromotionDiscountAmount (step 2, bill-level) and couponDiscountAmount
 * (step 4) are folded in exactly like billDiscountAmount, all three
 * deliberately NOT re-taxed. This is the one function PosController.cs's
 * server-side hooks never re-invoke — the server only corrects the
 * PromotionDiscountAmount/CouponDiscountAmount inputs (see
 * ApplyPromotionsIfCompletedAsync/ApplyCouponIfCompletedAsync's doc
 * comments), it does not re-run this arithmetic itself.
 */
export function calcBillTotals(
  lines: PosCartLine[],
  billDiscountAmount = 0,
  billPromotionDiscountAmount = 0,
  couponDiscountAmount = 0,
): PosBillTotals {
  let subTotal = 0;
  let lineDiscount = 0;
  let taxAmount = 0;

  for (const line of lines) {
    const totals = calcLineTotals(line);
    subTotal += totals.gross;
    lineDiscount += totals.discount;
    taxAmount += totals.tax;
  }

  // billPromotionDiscountAmount (e.g. Happy Hour, "spend X get Y off") and
  // couponDiscountAmount (a standalone CouponMaster redemption — a
  // genuinely separate mechanism, see types/coupon.ts) are both additional
  // bill-level reductions alongside the manual billDiscountAmount — same
  // "not re-taxed" treatment as that one, and additive with each other
  // (a coupon and an active promotion can both apply when the coupon's
  // AllowWithPromotion is true — see CouponService.ValidateAsync).
  const discountAmount = round(lineDiscount + billDiscountAmount + billPromotionDiscountAmount + couponDiscountAmount);
  const netTotal = Math.max(0, round(subTotal - discountAmount + taxAmount));

  return {
    subTotal: round(subTotal),
    discountAmount,
    taxAmount: round(taxAmount),
    netTotal,
  };
}

export function round(value: number): number {
  return Math.round((value + Number.EPSILON) * 1000) / 1000;
}

/**
 * Staff commission for a salon service line — internal cart-view figure
 * only, never part of the customer-facing bill totals (see calcBillTotals)
 * and never printed on the receipt. Computed off the line's pre-discount
 * gross (rate × qty), matching StaffMaster.CommissionPercent's role as a
 * simple "percentage of what was sold" rate.
 */
export function calcCommission(line: Pick<PosCartLine, "unitPrice" | "quantity" | "commissionPercent">): number {
  if (!line.commissionPercent) return 0;
  return round(line.unitPrice * line.quantity * (line.commissionPercent / 100));
}
