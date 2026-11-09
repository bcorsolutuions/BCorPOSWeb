import { apiClient } from "../axios-client";
import type { CouponValidationRequest, CouponValidationResult } from "@/types/coupon";

// Real BCorDFWebApi CouponController — live-preview endpoint only. The
// server re-runs this same check itself (CouponService.ValidateAsync, not
// routed) at sale-finalization time inside PosController and overwrites
// whatever this preview showed. A failed/rejected call here must surface
// the reason to the cashier — unlike the Promotion Engine's best-effort
// auto-preview, this is a deliberate cashier action ("Apply").
export const couponService = {
  validate: async (
    compId: string,
    siteId: string,
    request: CouponValidationRequest,
  ): Promise<CouponValidationResult> => {
    const { data } = await apiClient.post<CouponValidationResult>(
      `/Coupon/${compId}/${siteId}/validate`,
      request,
    );
    return data;
  },
};
