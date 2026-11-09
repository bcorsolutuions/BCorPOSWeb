"use client";

import { useMutation } from "@tanstack/react-query";
import { couponService } from "@/lib/api/services/coupon-service";
import { usePosCartStore } from "@/stores/pos-cart-store";
import type { CouponEvalLine, CouponValidationRequest } from "@/types/coupon";

/**
 * Local wall-clock time as "YYYY-MM-DDTHH:mm:ss" — same fix, same reasoning
 * as use-promotion-evaluation.ts's localDateTimeString: a coupon's
 * ValidFrom/ValidTo/StartTime/EndTime are entered and understood as the
 * site's local business hours, and CouponService compares them with no
 * timezone conversion. `Date.toISOString()` (UTC) would silently miss the
 * window.
 */
function localDateTimeString(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

/**
 * Live "Apply" click for the POS Billing screen's Coupon Code field —
 * unlike use-promotion-evaluation.ts's silent, debounced, best-effort
 * preview, this is a deliberate cashier action: it must surface a
 * rejection reason, not swallow it. The server independently re-validates
 * and re-computes at save time anyway (PosController.ApplyCouponIfCompletedAsync)
 * — this call only drives what the cashier sees before that.
 */
export function useCouponApply(compId: string, siteId: string) {
  const lines = usePosCartStore((s) => s.lines);
  const customerCode = usePosCartStore((s) => s.customerCode);
  const applyCoupon = usePosCartStore((s) => s.applyCoupon);

  return useMutation({
    mutationFn: async (couponCode: string) => {
      const productLines = lines.filter((l) => (l.lineType ?? "Product") === "Product" && !l.isPromotionFreeLine);
      const evalLines: CouponEvalLine[] = productLines.map((l) => ({
        lineId: l.lineId,
        itemCode: l.itemCode,
        unitCode: l.unitCode ?? null,
        categoryCode: l.categoryCode ?? null,
        brandCode: l.brandCode ?? null,
        quantity: l.quantity,
        unitPrice: l.originalUnitPrice ?? l.unitPrice,
        existingDiscountAmt: l.discountAmt,
      }));

      const request: CouponValidationRequest = {
        couponCode: couponCode.trim().toUpperCase(),
        customerCode: customerCode ?? null,
        dateTime: localDateTimeString(new Date()),
        lines: evalLines,
      };

      const result = await couponService.validate(compId, siteId, request);
      if (!result.valid) {
        throw new Error(result.reason ?? "Coupon is not valid.");
      }
      applyCoupon({
        code: result.couponCode ?? request.couponCode,
        name: result.couponName ?? null,
        discountAmount: result.discountAmount,
      });
      return result;
    },
  });
}
