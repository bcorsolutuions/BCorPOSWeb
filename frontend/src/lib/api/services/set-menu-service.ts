import { apiClient } from "../axios-client";
import { useAuthStore } from "@/stores/auth-store";
import type { SetMenuMasterDto } from "@/types/set-menu";
import type { SetMenuFormValues, SetMenuGroupRowFormValues } from "@/schemas/set-menu.schema";

// Real BCorDFWebApi SetMenuMasterController — full CRUD, hand-rolled
// service backend-side (3 levels: Master -> Group -> GroupItem), same
// generic MasterController<> HTTP contract as combo-master-service.ts.
export interface SetMenu extends SetMenuMasterDto {
  id: string;
}

function toSetMenu(dto: SetMenuMasterDto): SetMenu {
  return { ...dto, id: dto.code };
}

function buildGroupsPayload(groups: SetMenuGroupRowFormValues[]) {
  return groups.map((g) => ({
    id: g.id || undefined,
    groupCode: g.groupCode,
    groupName: g.groupName,
    groupNameArb: g.groupNameArb || null,
    sequence: g.sequence,
    minSelection: g.minSelection,
    maxSelection: g.maxSelection,
    isRequired: g.isRequired,
    displayOrder: g.displayOrder,
    active: g.active,
    items: g.items.map((i) => ({
      id: i.id || undefined,
      menuCode: i.menuCode,
      unitCode: i.unitCode || null,
      additionalPrice: i.additionalPrice,
      isDefault: i.isDefault,
      displayOrder: i.displayOrder,
      active: i.active,
    })),
  }));
}

function withDefaults(payload: SetMenuFormValues) {
  return {
    setMenuName: payload.setMenuName,
    setMenuNameArb: payload.setMenuNameArb || null,
    description: payload.description || null,
    menuCode: payload.menuCode || null,
    sellingPrice: payload.sellingPrice,
    taxCode: payload.taxCode || null,
    taxPercent: payload.taxPercent ?? null,
    validFrom: payload.validFrom || null,
    validTo: payload.validTo || null,
    startTime: payload.startTime || null,
    endTime: payload.endTime || null,
    availableDays: payload.availableDays || null,
    imagePath: null,
    displayOrder: 0,
    showInPOS: true,
    showInKiosk: true,
    showInOnlineOrder: true,
    allowDiscount: payload.allowDiscount,
    remarks: payload.remarks || null,
    groups: buildGroupsPayload(payload.groups),
  };
}

export const setMenuService = {
  list: async (): Promise<{ items: SetMenu[]; total: number }> => {
    const compId = useAuthStore.getState().user?.compId ?? "";
    const { data } = await apiClient.get<SetMenuMasterDto[]>(`/SetMenuMaster/${compId}`);
    const items = data.map(toSetMenu);
    return { items, total: items.length };
  },

  get: async (code: string): Promise<SetMenu | null> => {
    const compId = useAuthStore.getState().user?.compId ?? "";
    const { data } = await apiClient.get<SetMenuMasterDto | null>(`/SetMenuMaster/${compId}/${code}`);
    return data ? toSetMenu(data) : null;
  },

  create: async (payload: SetMenuFormValues): Promise<SetMenu> => {
    const user = useAuthStore.getState().user;
    const compId = user?.compId ?? "";
    const { data } = await apiClient.post<SetMenuMasterDto>(
      "/SetMenuMaster",
      {
        code: payload.code,
        compID: compId,
        siteID: payload.siteId,
        active: payload.active,
        lastModifiedBy: user?.userName ?? "",
        ...withDefaults(payload),
      },
      { headers: { CompID: compId } },
    );
    return toSetMenu(data);
  },

  update: async (code: string, payload: SetMenuFormValues): Promise<void> => {
    const user = useAuthStore.getState().user;
    const compId = user?.compId ?? "";
    await apiClient.put(
      `/SetMenuMaster/${code}`,
      {
        active: payload.active,
        lastModifiedBy: user?.userName ?? "",
        ...withDefaults(payload),
      },
      { headers: { CompID: compId } },
    );
  },

  remove: async (code: string): Promise<void> => {
    const compId = useAuthStore.getState().user?.compId ?? "";
    const userName = useAuthStore.getState().user?.userName ?? "";
    await apiClient.delete(`/SetMenuMaster/${compId}/${code}`, { params: { user: userName } });
  },

  getAvailability: async (code: string): Promise<{ code: string; available: boolean }> => {
    const compId = useAuthStore.getState().user?.compId ?? "";
    const { data } = await apiClient.get<{ code: string; available: boolean }>(
      `/SetMenuMaster/${compId}/${code}/availability`,
    );
    return data;
  },
};
