"use client";

import { useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { posLookupService } from "@/lib/api/services/pos-lookup-service";
import { promotionEngineService } from "@/lib/api/services/promotion-engine-service";
import { usePosCartStore } from "@/stores/pos-cart-store";
import type { PromotionEvalLine, PromotionEvaluationRequest } from "@/types/promotion-engine";

const DEBOUNCE_MS = 400;

/**
 * Local wall-clock time as "YYYY-MM-DDTHH:mm:ss" — deliberately NOT
 * `Date.toISOString()`, which is UTC. A promotion's StartTime/EndTime (e.g.
 * Happy Hour 17:00-19:00) is entered and understood as the site's local
 * business hours, and BCorDFWebApi.PromotionEngineService compares it
 * directly against the DateTime it's given with no timezone conversion — a
 * UTC instant would silently miss the window by the local UTC offset (e.g.
 * a 22:00-23:00 Bahrain window reads as 19:00-20:00 UTC). See PosController
 * .cs's save-time re-evaluation for why the same fix is needed server-side.
 */
function localDateTimeString(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

/**
 * Live Promotion Engine preview — call once from the POS Billing page.
 * Debounces on cart line/customer changes, resolves the selected customer's
 * CustCatCode (VIP-style promotions key off this), calls
 * POST /PromotionEngine/{compId}/{siteId}/evaluate, and stamps the result
 * back onto the cart via applyPromotionResults. Best-effort: a failed call
 * never blocks billing, it just leaves promotions un-applied until the next
 * successful debounce tick.
 */
export function usePromotionEvaluation(compId: string, siteId: string) {
  const lines = usePosCartStore((s) => s.lines);
  const customerCode = usePosCartStore((s) => s.customerCode);
  const applyPromotionResults = usePosCartStore((s) => s.applyPromotionResults);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Same queryKey as customer-salesman-bar.tsx so this shares its cache
  // instead of firing a second /CustomerMaster request.
  const { data: customers = [] } = useQuery({
    queryKey: ["pos-customers", compId],
    queryFn: () => posLookupService.getCustomers(compId),
    enabled: !!compId,
  });

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (!compId || !siteId) return;

    const productLines = lines.filter((l) => (l.lineType ?? "Product") === "Product" && !l.isPromotionFreeLine);
    if (productLines.length === 0) return;

    timerRef.current = setTimeout(() => {
      const customerCategoryCode = customerCode
        ? customers.find((c) => c.code === customerCode)?.custCatCode ?? null
        : null;

      const evalLines: PromotionEvalLine[] = productLines.map((l) => ({
        lineId: l.lineId,
        itemCode: l.itemCode,
        unitCode: l.unitCode ?? null,
        categoryCode: l.categoryCode ?? null,
        brandCode: l.brandCode ?? null,
        quantity: l.quantity,
        unitPrice: l.originalUnitPrice ?? l.unitPrice,
        existingDiscountAmt: l.discountAmt,
      }));

      const request: PromotionEvaluationRequest = {
        dateTime: localDateTimeString(new Date()),
        customerCode: customerCode ?? null,
        customerCategoryCode,
        paymentModeCode: null,
        lines: evalLines,
        appliedCouponCodes: [],
      };

      promotionEngineService
        .evaluate(compId, siteId, request)
        .then((result) => applyPromotionResults(result))
        .catch(() => {
          // Best-effort preview — leave whatever promo state the cart had.
        });
    }, DEBOUNCE_MS);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lines, customerCode, customers, compId, siteId]);
}
