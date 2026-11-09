import { apiClient } from "../axios-client";
import type { GeneralLedgerResult } from "@/types/general-ledger";

export const generalLedgerService = {
  get: async (
    compId: string,
    siteId: string,
    glCode: string,
    fromDate?: string,
    toDate?: string,
  ): Promise<GeneralLedgerResult> => {
    const { data } = await apiClient.get<GeneralLedgerResult>(
      `/GeneralLedger/${compId}/${siteId}/${glCode}`,
      { params: { fromDate, toDate } },
    );
    return data;
  },
};
