import { apiClient } from "../axios-client";
import { useAuthStore } from "@/stores/auth-store";
import type { StockLocationDto } from "@/types/stock-location";
import type { StockLocationFormValues } from "@/schemas/stock-location.schema";

// Real BCorDFWebApi StockLocationMasterController.
export interface StockLocationMaster extends StockLocationDto {
  id: string;
}

function toStockLocation(dto: StockLocationDto): StockLocationMaster {
  return { ...dto, id: dto.code };
}

export const stockLocationService = {
  list: async (): Promise<{ items: StockLocationMaster[]; total: number }> => {
    const compId = useAuthStore.getState().user?.compId ?? "";
    const { data } = await apiClient.get<StockLocationDto[]>(`/StockLocationMaster/${compId}`);
    const items = data.map(toStockLocation);
    return { items, total: items.length };
  },

  create: async (payload: StockLocationFormValues): Promise<StockLocationMaster> => {
    const user = useAuthStore.getState().user;
    const compId = user?.compId ?? "";
    const { data } = await apiClient.post<StockLocationDto>(
      "/StockLocationMaster",
      {
        code: payload.code,
        compID: compId,
        siteID: payload.siteId,
        active: payload.active,
        lastModifiedBy: user?.userName ?? "",
        locationName: payload.locationName,
        locationNameArb: payload.locationNameArb || null,
        locationType: payload.locationType,
        displayOrder: payload.displayOrder,
      },
      { headers: { CompID: compId } },
    );
    return toStockLocation(data);
  },

  update: async (code: string, payload: StockLocationFormValues): Promise<StockLocationMaster> => {
    const user = useAuthStore.getState().user;
    const compId = user?.compId ?? "";
    const { data } = await apiClient.put<StockLocationDto>(
      `/StockLocationMaster/${code}`,
      {
        active: payload.active,
        lastModifiedBy: user?.userName ?? "",
        locationName: payload.locationName,
        locationNameArb: payload.locationNameArb || null,
        locationType: payload.locationType,
        displayOrder: payload.displayOrder,
      },
      { headers: { CompID: compId } },
    );
    return toStockLocation(data);
  },

  remove: async (code: string): Promise<void> => {
    const compId = useAuthStore.getState().user?.compId ?? "";
    const userName = useAuthStore.getState().user?.userName ?? "";
    await apiClient.delete(`/StockLocationMaster/${compId}/${code}`, { params: { user: userName } });
  },
};
