import { apiClient } from "../axios-client";
import { useAuthStore } from "@/stores/auth-store";
import type { KitchenDto } from "@/types/restaurant";
import type { KitchenFormValues } from "@/schemas/restaurant-master.schema";

// Real BCorDFWebApi KitchenMasterController.
export interface KitchenMaster extends KitchenDto {
  id: string;
}

function toKitchen(dto: KitchenDto): KitchenMaster {
  return { ...dto, id: dto.code };
}

export const kitchenMasterService = {
  list: async (): Promise<{ items: KitchenMaster[]; total: number }> => {
    const compId = useAuthStore.getState().user?.compId ?? "";
    const { data } = await apiClient.get<KitchenDto[]>(`/KitchenMaster/${compId}`);
    const items = data.map(toKitchen);
    return { items, total: items.length };
  },

  create: async (payload: KitchenFormValues): Promise<KitchenMaster> => {
    const user = useAuthStore.getState().user;
    const compId = user?.compId ?? "";
    const { data } = await apiClient.post<KitchenDto>(
      "/KitchenMaster",
      {
        code: payload.code,
        compID: compId,
        siteID: payload.siteId,
        active: payload.active,
        lastModifiedBy: user?.userName ?? "",
        kitchenName: payload.kitchenName,
        kitchenNameArb: payload.kitchenNameArb || null,
        preparationMinutes: payload.preparationMinutes,
        enableKDS: payload.enableKDS,
        stationType: payload.stationType,
        displayMode: payload.displayMode,
        warehouseCode: payload.warehouseCode || null,
        displayOrder: payload.displayOrder,
      },
      { headers: { CompID: compId } },
    );
    return toKitchen(data);
  },

  update: async (code: string, payload: KitchenFormValues): Promise<KitchenMaster> => {
    const user = useAuthStore.getState().user;
    const compId = user?.compId ?? "";
    const { data } = await apiClient.put<KitchenDto>(
      `/KitchenMaster/${code}`,
      {
        active: payload.active,
        lastModifiedBy: user?.userName ?? "",
        kitchenName: payload.kitchenName,
        kitchenNameArb: payload.kitchenNameArb || null,
        preparationMinutes: payload.preparationMinutes,
        enableKDS: payload.enableKDS,
        stationType: payload.stationType,
        displayMode: payload.displayMode,
        warehouseCode: payload.warehouseCode || null,
        displayOrder: payload.displayOrder,
      },
      { headers: { CompID: compId } },
    );
    return toKitchen(data);
  },

  remove: async (code: string): Promise<void> => {
    const compId = useAuthStore.getState().user?.compId ?? "";
    const userName = useAuthStore.getState().user?.userName ?? "";
    await apiClient.delete(`/KitchenMaster/${compId}/${code}`, { params: { user: userName } });
  },
};
