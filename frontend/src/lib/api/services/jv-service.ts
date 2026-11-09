import { apiClient } from "../axios-client";
import type { JournalVoucher, CreateJournalVoucherInput, UpdateJournalVoucherInput } from "@/types/jv";

// Real BCorDFWebApi JVController — same compId+siteId+docNo+userName
// document shape as purchase-service.ts's purchaseOrderService. compId/
// siteId/userName are explicit params, not pulled from a store, for the
// same reason documented there (the backend doesn't resolve tenant scoping
// from JWT claims).
export const jvService = {
  get: async (compId: string, siteId: string, docNo: number): Promise<JournalVoucher> => {
    const { data } = await apiClient.get<JournalVoucher>(`/JV/${compId}/${siteId}/${docNo}`);
    return data;
  },

  getAll: async (compId: string, siteId: string): Promise<JournalVoucher[]> => {
    const { data } = await apiClient.get<JournalVoucher[]>(`/JV/${compId}/${siteId}`);
    return data;
  },

  update: async (
    compId: string,
    siteId: string,
    userName: string,
    docNo: number,
    dto: UpdateJournalVoucherInput,
  ): Promise<JournalVoucher> => {
    const { data } = await apiClient.put<JournalVoucher>(`/JV/${docNo}`, dto, {
      params: { compId, siteId, userName },
    });
    return data;
  },

  create: async (
    compId: string,
    siteId: string,
    userName: string,
    dto: CreateJournalVoucherInput,
  ): Promise<JournalVoucher> => {
    const { data } = await apiClient.post<JournalVoucher>("/JV", dto, {
      params: { compId, siteId, userName },
    });
    return data;
  },
};
