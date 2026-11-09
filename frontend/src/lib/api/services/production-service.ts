import { apiClient } from "../axios-client";
import type { CreateProductionHdrInput, ProductionHdrDto } from "@/types/production";

// BCorDFWebApi's ProductionController — thin wrapper over the generic
// DocumentServiceNDetails engine, same compId/siteId/userName query-param
// convention as Kot/Pos/InventoryTransfer.
export const productionService = {
  getAll: async (compId: string, siteId: string): Promise<ProductionHdrDto[]> => {
    const { data } = await apiClient.get<ProductionHdrDto[]>(`/Production/${compId}/${siteId}`);
    return data;
  },

  get: async (compId: string, siteId: string, docNo: number): Promise<ProductionHdrDto> => {
    const { data } = await apiClient.get<ProductionHdrDto>(`/Production/${compId}/${siteId}/${docNo}`);
    return data;
  },

  create: async (compId: string, siteId: string, userName: string, dto: CreateProductionHdrInput): Promise<ProductionHdrDto> => {
    const { data } = await apiClient.post<ProductionHdrDto>("/Production", dto, {
      params: { compId, siteId, userName },
    });
    return data;
  },

  remove: async (compId: string, siteId: string, userName: string, docNo: number, reason?: string): Promise<void> => {
    await apiClient.delete(`/Production/${docNo}`, { params: { compId, siteId, userName, reason } });
  },
};
