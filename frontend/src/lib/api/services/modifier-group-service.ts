import { apiClient } from "../axios-client";
import { useAuthStore } from "@/stores/auth-store";
import type { ModifierGroupDto } from "@/types/restaurant";
import type { ModifierGroupFormValues } from "@/schemas/restaurant-master.schema";

// Real BCorDFWebApi ModifierGroupMasterController.
export interface ModifierGroupMaster extends ModifierGroupDto {
  id: string;
}

function toGroup(dto: ModifierGroupDto): ModifierGroupMaster {
  return { ...dto, id: dto.code };
}

export const modifierGroupService = {
  list: async (): Promise<{ items: ModifierGroupMaster[]; total: number }> => {
    const compId = useAuthStore.getState().user?.compId ?? "";
    const { data } = await apiClient.get<ModifierGroupDto[]>(`/ModifierGroupMaster/${compId}`);
    const items = data.map(toGroup);
    return { items, total: items.length };
  },

  create: async (payload: ModifierGroupFormValues): Promise<ModifierGroupMaster> => {
    const user = useAuthStore.getState().user;
    const compId = user?.compId ?? "";
    const { data } = await apiClient.post<ModifierGroupDto>(
      "/ModifierGroupMaster",
      {
        code: payload.code,
        compID: compId,
        siteID: payload.siteId,
        active: payload.active,
        lastModifiedBy: user?.userName ?? "",
        modifierGroupName: payload.modifierGroupName,
        modifierGroupNameArb: payload.modifierGroupNameArb || null,
        minimumSelection: payload.minimumSelection,
        maximumSelection: payload.maximumSelection,
        isRequired: payload.isRequired,
        allowMultipleQty: payload.allowMultipleQty,
        displayOrder: payload.displayOrder,
      },
      { headers: { CompID: compId } },
    );
    return toGroup(data);
  },

  update: async (code: string, payload: ModifierGroupFormValues): Promise<ModifierGroupMaster> => {
    const user = useAuthStore.getState().user;
    const compId = user?.compId ?? "";
    const { data } = await apiClient.put<ModifierGroupDto>(
      `/ModifierGroupMaster/${code}`,
      {
        active: payload.active,
        lastModifiedBy: user?.userName ?? "",
        modifierGroupName: payload.modifierGroupName,
        modifierGroupNameArb: payload.modifierGroupNameArb || null,
        minimumSelection: payload.minimumSelection,
        maximumSelection: payload.maximumSelection,
        isRequired: payload.isRequired,
        allowMultipleQty: payload.allowMultipleQty,
        displayOrder: payload.displayOrder,
      },
      { headers: { CompID: compId } },
    );
    return toGroup(data);
  },

  remove: async (code: string): Promise<void> => {
    const compId = useAuthStore.getState().user?.compId ?? "";
    const userName = useAuthStore.getState().user?.userName ?? "";
    await apiClient.delete(`/ModifierGroupMaster/${compId}/${code}`, { params: { user: userName } });
  },
};
