import { apiClient } from "../axios-client";
import { useAuthStore } from "@/stores/auth-store";
import type { FloorDto } from "@/types/restaurant";
import type { FloorFormValues } from "@/schemas/restaurant-master.schema";

// Real BCorDFWebApi FloorMasterController — a thin MasterController<FloorMasterDto,...>
// (generic master CRUD, keyed by CompID+Code, same pattern as ItemsController).
export interface FloorMaster extends FloorDto {
  id: string;
}

function toFloor(dto: FloorDto): FloorMaster {
  return { ...dto, id: dto.code };
}

export const floorMasterService = {
  list: async (): Promise<{ items: FloorMaster[]; total: number }> => {
    const compId = useAuthStore.getState().user?.compId ?? "";
    const { data } = await apiClient.get<FloorDto[]>(`/FloorMaster/${compId}`);
    const items = data.map(toFloor);
    return { items, total: items.length };
  },

  create: async (payload: FloorFormValues): Promise<FloorMaster> => {
    const user = useAuthStore.getState().user;
    const compId = user?.compId ?? "";
    const { data } = await apiClient.post<FloorDto>(
      "/FloorMaster",
      {
        code: payload.code,
        compID: compId,
        siteID: payload.siteId,
        active: payload.active,
        lastModifiedBy: user?.userName ?? "",
        floorName: payload.floorName,
        floorNameArb: payload.floorNameArb || null,
        displayOrder: payload.displayOrder,
        floorColor: payload.floorColor || null,
      },
      { headers: { CompID: compId } },
    );
    return toFloor(data);
  },

  update: async (code: string, payload: FloorFormValues): Promise<FloorMaster> => {
    const user = useAuthStore.getState().user;
    const compId = user?.compId ?? "";
    const { data } = await apiClient.put<FloorDto>(
      `/FloorMaster/${code}`,
      {
        active: payload.active,
        lastModifiedBy: user?.userName ?? "",
        floorName: payload.floorName,
        floorNameArb: payload.floorNameArb || null,
        displayOrder: payload.displayOrder,
        floorColor: payload.floorColor || null,
      },
      { headers: { CompID: compId } },
    );
    return toFloor(data);
  },

  remove: async (code: string): Promise<void> => {
    const compId = useAuthStore.getState().user?.compId ?? "";
    const userName = useAuthStore.getState().user?.userName ?? "";
    await apiClient.delete(`/FloorMaster/${compId}/${code}`, { params: { user: userName } });
  },
};
