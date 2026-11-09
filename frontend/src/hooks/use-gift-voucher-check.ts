"use client";

import { useMutation } from "@tanstack/react-query";
import { giftVoucherService } from "@/lib/api/services/gift-voucher-service";
import type { GiftVoucherValidationResult } from "@/types/gift-voucher";

/**
 * Live "Check Balance" lookup for the Payment dialog's Gift Voucher tile.
 * Never auto-applies anything — unlike Coupon's single "Apply" action, a
 * voucher redemption amount is a separate, explicit step the cashier takes
 * after seeing the balance (it may be a partial redemption). The server
 * independently re-validates AND actually redeems at save time anyway
 * (PosController.RedeemGiftVouchersIfCompletedAsync) — this call only
 * drives what the cashier sees before that.
 */
export function useGiftVoucherCheck(compId: string, siteId: string) {
  return useMutation<GiftVoucherValidationResult, Error, string>({
    mutationFn: async (giftVoucherNo: string) => {
      const result = await giftVoucherService.validate(compId, siteId, { giftVoucherNo: giftVoucherNo.trim().toUpperCase() });
      if (!result.valid) {
        throw new Error(result.reason ?? "Gift voucher is not valid.");
      }
      return result;
    },
  });
}
