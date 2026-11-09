import { apiClient } from "../axios-client";
import { useAuthStore } from "@/stores/auth-store";
import type { OrderTypeDto } from "@/types/restaurant";
import type { OrderTypeFormValues } from "@/schemas/restaurant-master.schema";

// Real BCorDFWebApi OrderTypeMasterController (generic master CRUD keyed by CompID + Code). An order type says what kind of order
// it is - Dine In (needs a table), Takeaway, Home Delivery, Online Pickup ... - and what the cashier must capture for it.
export interface OrderTypeMaster extends OrderTypeDto {
  id: string;
}

const toOrderType = (dto: OrderTypeDto): OrderTypeMaster => ({ ...dto, id: dto.code });

function body(payload: OrderTypeFormValues, userName: string) {
  return {
    active: payload.active,
    // OrderTypeMaster.LastModifiedBy is a 10-character column.
    lastModifiedBy: userName.slice(0, 10),
    orderTypeName: payload.orderTypeName,
    orderTypeNameArb: payload.orderTypeNameArb || null,
    diningTypeCode: payload.diningTypeCode || null,
    requiresTable: payload.requiresTable,
    requiresCustomer: payload.requiresCustomer,
    requiresAddress: payload.requiresAddress,
    requiresWaiter: payload.requiresWaiter,
    requiresDriver: payload.requiresDriver,
    allowScheduledOrder: payload.allowScheduledOrder,
    allowOnlineOrder: payload.allowOnlineOrder,
    displayOrder: payload.displayOrder,
  };
}

export const orderTypeService = {
  list: async (): Promise<{ items: OrderTypeMaster[]; total: number }> => {
    const compId = useAuthStore.getState().user?.compId ?? "";
    const { data } = await apiClient.get<OrderTypeDto[]>(`/OrderTypeMaster/${compId}`);
    const items = data.map(toOrderType);
    return { items, total: items.length };
  },

  create: async (payload: OrderTypeFormValues): Promise<OrderTypeMaster> => {
    const user = useAuthStore.getState().user;
    const compId = user?.compId ?? "";
    const { data } = await apiClient.post<OrderTypeDto>(
      "/OrderTypeMaster",
      { code: payload.code, compID: compId, siteID: payload.siteId, ...body(payload, user?.userName ?? "") },
      { headers: { CompID: compId } },
    );
    return toOrderType(data);
  },

  // The form edits only part of an order type (price level, warehouse, tax and service-charge codes are not on it) and the update
  // replaces the whole record, so the current one is fetched first and its untouched fields are carried forward.
  update: async (code: string, payload: OrderTypeFormValues): Promise<OrderTypeMaster> => {
    const user = useAuthStore.getState().user;
    const compId = user?.compId ?? "";
    const { data: current } = await apiClient.get<Record<string, unknown>>(`/OrderTypeMaster/${compId}/${code}`);
    const { code: _code, compID, siteID, lastModifiedOn, ...rest } = current;
    void _code;
    void compID;
    void siteID;
    void lastModifiedOn;
    const { data } = await apiClient.put<OrderTypeDto>(
      `/OrderTypeMaster/${code}`,
      { ...rest, ...body(payload, user?.userName ?? "") },
      { headers: { CompID: compId } },
    );
    return toOrderType(data);
  },

  remove: async (code: string): Promise<void> => {
    const compId = useAuthStore.getState().user?.compId ?? "";
    const userName = useAuthStore.getState().user?.userName ?? "";
    await apiClient.delete(`/OrderTypeMaster/${compId}/${code}`, { params: { user: userName } });
  },
};
