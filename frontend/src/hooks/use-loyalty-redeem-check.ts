"use client";

import { useMutation } from "@tanstack/react-query";
import { loyaltyService } from "@/lib/api/services/loyalty-service";

/**
 * Live "Check Balance" lookup for the Payment dialog's Loyalty Redemption
 * tile — mirrors useGiftVoucherCheck exactly. Resolves the selected
 * customer's loyalty account, then previews the maximum redeemable value at
 * the current bill total. The server independently re-validates AND
 * actually redeems at save time regardless (PosController.
 * RedeemLoyaltyPointsIfCompletedAsync) — this call only drives what the
 * cashier sees before that (spec §53: frontend calculation is informational
 * only, backend remains authoritative).
 */
export function useLoyaltyRedeemCheck(compId: string, siteId: string, customerCode: string | null | undefined, billNetTotal: number) {
  return useMutation<
    { loyaltyNo: string; currentPoints: number; maxRedeemableValue: number },
    Error,
    void
  >({
    mutationFn: async () => {
      if (!customerCode) throw new Error("Select a customer first.");

      const lookup = await loyaltyService.lookup(compId, { customerCode });
      if (!lookup.found || !lookup.loyaltyNo) {
        throw new Error(lookup.reason ?? "Customer is not enrolled in a loyalty program.");
      }

      const validation = await loyaltyService.validateRedemption(compId, siteId, {
        loyaltyNo: lookup.loyaltyNo,
        billNetTotal,
        requestedValue: lookup.redemptionValue,
      });
      if (!validation.valid && validation.currentPoints <= 0) {
        throw new Error(validation.reason ?? "No points available to redeem.");
      }

      return {
        loyaltyNo: lookup.loyaltyNo,
        currentPoints: validation.currentPoints,
        maxRedeemableValue: validation.valid ? validation.redemptionValue : 0,
      };
    },
  });
}
