import { apiClient } from "../axios-client";
import type { TrialBalanceRow } from "@/types/trial-balance";

export const trialBalanceService = {
  /** siteId "ALL" = every branch. */
  get: async (
    compId: string,
    siteId: string,
    fromDate?: string,
    toDate?: string,
  ): Promise<TrialBalanceRow[]> => {
    const { data } = await apiClient.get<TrialBalanceRow[]>(`/TrialBalance/${compId}/${siteId}`, {
      params: { fromDate, toDate },
    });
    return data;
  },
};
