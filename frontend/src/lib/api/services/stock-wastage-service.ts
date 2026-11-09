import { apiClient } from "../axios-client";

export interface StockWastageDto {
  id: string;
  compID: string;
  siteID: string;
  docDt: string;
  inventoryCode: string;
  unitCode?: string | null;
  qty: number;
  locationCode: string;
  reason: string;
  stationCode?: string | null;
  userName: string;
  remarks?: string | null;
}

export interface CreateStockWastageInput {
  docDt?: string | null;
  inventoryCode: string;
  unitCode?: string | null;
  qty: number;
  locationCode: string;
  reason: string;
  stationCode?: string | null;
  userName: string;
  remarks?: string | null;
}

// Real BCorDFWebApi StockWastageController — a plain flat append-only log
// (create + list only, no update/delete, same "correction is a new entry"
// convention InventoryLedger itself uses).
export const stockWastageService = {
  list: async (compId: string, siteId: string, fromDate?: string, toDate?: string): Promise<StockWastageDto[]> => {
    const { data } = await apiClient.get<StockWastageDto[]>(`/StockWastage/${compId}/${siteId}`, {
      params: { fromDate, toDate },
    });
    return data;
  },

  create: async (compId: string, siteId: string, payload: CreateStockWastageInput): Promise<StockWastageDto> => {
    const { data } = await apiClient.post<StockWastageDto>(`/StockWastage/${compId}/${siteId}`, payload);
    return data;
  },
};
