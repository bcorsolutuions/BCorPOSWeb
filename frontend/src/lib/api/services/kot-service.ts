import { apiClient } from "../axios-client";
import type { CreateKotInput, KotDto, UpdateKotInput } from "@/types/restaurant";

// Talks directly to BCorDFWebApi's KOTController — same thin-wrapper-over-
// DocumentServiceNDetails<KOTHeader,...> shape as PosController (see
// pos-service.ts). compId/siteId/userName are explicit params for the same
// reason documented there.
export const kotService = {
  get: async (compId: string, siteId: string, docNo: number): Promise<KotDto> => {
    const { data } = await apiClient.get<KotDto>(`/Kot/${compId}/${siteId}/${docNo}`);
    return data;
  },

  getAll: async (compId: string, siteId: string): Promise<KotDto[]> => {
    const { data } = await apiClient.get<KotDto[]>(`/Kot/${compId}/${siteId}`);
    return data;
  },

  create: async (compId: string, siteId: string, userName: string, dto: CreateKotInput): Promise<KotDto> => {
    const { data } = await apiClient.post<KotDto>("/Kot", dto, {
      params: { compId, siteId, userName },
    });
    return data;
  },

  /** Full-replace update (the generic document engine's contract) — used both to edit an open order and to advance kotStatus/itemStatus. */
  update: async (
    compId: string,
    siteId: string,
    userName: string,
    docNo: number,
    dto: UpdateKotInput,
  ): Promise<KotDto> => {
    const { data } = await apiClient.put<KotDto>(`/Kot/${docNo}`, dto, {
      params: { compId, siteId, userName },
    });
    return data;
  },

  remove: async (compId: string, siteId: string, userName: string, docNo: number, reason?: string): Promise<void> => {
    await apiClient.delete(`/Kot/${docNo}`, { params: { compId, siteId, userName, reason } });
  },
};
