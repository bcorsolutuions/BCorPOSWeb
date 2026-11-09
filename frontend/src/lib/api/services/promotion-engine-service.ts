import { apiClient } from "../axios-client";
import type { PromotionEvaluationRequest, PromotionEvaluationResult } from "@/types/promotion-engine";

// Real BCorDFWebApi PromotionEngineController — live-preview endpoint only.
// The server re-runs this same computation itself (ApplyPromotionsAsync,
// not routed) at sale-finalization time and overwrites whatever this
// preview showed — see PosController.cs. A failed call here is best-effort:
// callers should swallow errors rather than block billing.
export const promotionEngineService = {
  evaluate: async (
    compId: string,
    siteId: string,
    request: PromotionEvaluationRequest,
  ): Promise<PromotionEvaluationResult> => {
    const { data } = await apiClient.post<PromotionEvaluationResult>(
      `/PromotionEngine/${compId}/${siteId}/evaluate`,
      request,
    );
    return data;
  },
};
