import { apiClient } from "../axios-client";
import type { GiftVoucherValidationRequest, GiftVoucherValidationResult } from "@/types/gift-voucher";

// Real BCorDFWebApi GiftVoucherController — live "Check Balance" preview
// endpoint only. The server independently re-validates AND actually
// redeems (IssueAsync/RedeemAsync/ReverseAsync, never routed) at
// sale-finalization time inside PosController, before the sale itself is
// even written — see PosController.cs's RedeemGiftVouchersIfCompletedAsync.
export const giftVoucherService = {
  validate: async (
    compId: string,
    siteId: string,
    request: GiftVoucherValidationRequest,
  ): Promise<GiftVoucherValidationResult> => {
    const { data } = await apiClient.post<GiftVoucherValidationResult>(
      `/GiftVoucher/${compId}/${siteId}/validate`,
      request,
    );
    return data;
  },
};
