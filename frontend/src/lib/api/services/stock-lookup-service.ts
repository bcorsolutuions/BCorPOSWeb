import { apiClient } from "../axios-client";
import type { StockLookupResultDto, StockLookupSearchItemDto } from "@/types/stock-lookup";

// BCorDFWebApi's StockLookupController — read-only, staff-only (requires
// [Authorize] + StockLookup.View, unlike Price Checker's anonymous kiosk).
export const stockLookupService = {
  lookupByBarcode: async (compId: string, siteId: string, barcode: string): Promise<StockLookupResultDto> => {
    const { data } = await apiClient.get<StockLookupResultDto>(
      `/StockLookup/${compId}/${siteId}/barcode/${encodeURIComponent(barcode)}`,
    );
    return data;
  },
  lookupByCode: async (compId: string, siteId: string, inventoryCode: string): Promise<StockLookupResultDto> => {
    const { data } = await apiClient.get<StockLookupResultDto>(
      `/StockLookup/${compId}/${siteId}/item/${encodeURIComponent(inventoryCode)}`,
    );
    return data;
  },
  search: async (compId: string, siteId: string, query: string): Promise<StockLookupSearchItemDto[]> => {
    const { data } = await apiClient.get<StockLookupSearchItemDto[]>(`/StockLookup/${compId}/${siteId}/search`, {
      params: { query },
    });
    return data;
  },
};
