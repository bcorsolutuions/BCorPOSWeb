import { apiClient } from "../axios-client";
import { useAuthStore } from "@/stores/auth-store";
import type { RestaurantTableDto } from "@/types/restaurant";
import type { RestaurantTableFormValues } from "@/schemas/restaurant-master.schema";

// Real BCorDFWebApi RestaurantTableMasterController — the same entity the
// floor/table map UI (pos/tables) already reads via restaurant-lookup-service's
// getTables(); this is the admin CRUD side.
export interface RestaurantTableMaster extends RestaurantTableDto {
  id: string;
}

function toTable(dto: RestaurantTableDto): RestaurantTableMaster {
  return { ...dto, id: dto.code };
}

export const restaurantTableService = {
  list: async (): Promise<{ items: RestaurantTableMaster[]; total: number }> => {
    const compId = useAuthStore.getState().user?.compId ?? "";
    const { data } = await apiClient.get<RestaurantTableDto[]>(`/RestaurantTableMaster/${compId}`);
    const items = data.map(toTable);
    return { items, total: items.length };
  },

  create: async (payload: RestaurantTableFormValues): Promise<RestaurantTableMaster> => {
    const user = useAuthStore.getState().user;
    const compId = user?.compId ?? "";
    const { data } = await apiClient.post<RestaurantTableDto>(
      "/RestaurantTableMaster",
      {
        code: payload.code,
        compID: compId,
        siteID: payload.siteId,
        active: payload.active,
        lastModifiedBy: user?.userName ?? "",
        tableName: payload.tableName,
        tableNameArb: payload.tableNameArb || null,
        floorCode: payload.floorCode,
        sectionCode: payload.sectionCode || null,
        capacity: payload.capacity,
        shapeType: payload.shapeType || null,
        currentStatus: payload.currentStatus,
        isVIP: payload.isVIP,
        isOutdoor: payload.isOutdoor,
        isReservable: payload.isReservable,
        isMergeAllowed: payload.isMergeAllowed,
        displayOrder: payload.displayOrder,
      },
      { headers: { CompID: compId } },
    );
    return toTable(data);
  },

  update: async (code: string, payload: RestaurantTableFormValues): Promise<RestaurantTableMaster> => {
    const user = useAuthStore.getState().user;
    const compId = user?.compId ?? "";
    const { data } = await apiClient.put<RestaurantTableDto>(
      `/RestaurantTableMaster/${code}`,
      {
        active: payload.active,
        lastModifiedBy: user?.userName ?? "",
        tableName: payload.tableName,
        tableNameArb: payload.tableNameArb || null,
        floorCode: payload.floorCode,
        sectionCode: payload.sectionCode || null,
        capacity: payload.capacity,
        shapeType: payload.shapeType || null,
        currentStatus: payload.currentStatus,
        isVIP: payload.isVIP,
        isOutdoor: payload.isOutdoor,
        isReservable: payload.isReservable,
        isMergeAllowed: payload.isMergeAllowed,
        displayOrder: payload.displayOrder,
      },
      { headers: { CompID: compId } },
    );
    return toTable(data);
  },

  remove: async (code: string): Promise<void> => {
    const compId = useAuthStore.getState().user?.compId ?? "";
    const userName = useAuthStore.getState().user?.userName ?? "";
    await apiClient.delete(`/RestaurantTableMaster/${compId}/${code}`, { params: { user: userName } });
  },
};
