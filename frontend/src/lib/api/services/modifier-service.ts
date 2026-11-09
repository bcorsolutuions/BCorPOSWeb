import { apiClient } from "../axios-client";
import { useAuthStore } from "@/stores/auth-store";
import type { ModifierDto } from "@/types/restaurant";
import type { ModifierFormValues } from "@/schemas/restaurant-master.schema";

// Real BCorDFWebApi ModifierMasterController — the individual choices within
// a Modifier Group (e.g. "Extra Cheese" inside the "Toppings" group).
export interface ModifierMaster extends ModifierDto {
  id: string;
}

function toModifier(dto: ModifierDto): ModifierMaster {
  return { ...dto, id: dto.code };
}

export const modifierService = {
  list: async (): Promise<{ items: ModifierMaster[]; total: number }> => {
    const compId = useAuthStore.getState().user?.compId ?? "";
    const { data } = await apiClient.get<ModifierDto[]>(`/ModifierMaster/${compId}`);
    const items = data.map(toModifier);
    return { items, total: items.length };
  },

  create: async (payload: ModifierFormValues): Promise<ModifierMaster> => {
    const user = useAuthStore.getState().user;
    const compId = user?.compId ?? "";
    const { data } = await apiClient.post<ModifierDto>(
      "/ModifierMaster",
      {
        code: payload.code,
        compID: compId,
        siteID: payload.siteId,
        active: payload.active,
        lastModifiedBy: user?.userName ?? "",
        modifierName: payload.modifierName,
        modifierNameArb: payload.modifierNameArb || null,
        modifierGroupCode: payload.modifierGroupCode,
        unitCode: payload.unitCode || null,
        additionalPrice: payload.additionalPrice,
        kitchenCode: payload.kitchenCode || null,
        displayOrder: payload.displayOrder,
        isDefault: payload.isDefault,
        printInKitchen: payload.printInKitchen,
      },
      { headers: { CompID: compId } },
    );
    return toModifier(data);
  },

  update: async (code: string, payload: ModifierFormValues): Promise<ModifierMaster> => {
    const user = useAuthStore.getState().user;
    const compId = user?.compId ?? "";
    const { data } = await apiClient.put<ModifierDto>(
      `/ModifierMaster/${code}`,
      {
        active: payload.active,
        lastModifiedBy: user?.userName ?? "",
        modifierName: payload.modifierName,
        modifierNameArb: payload.modifierNameArb || null,
        modifierGroupCode: payload.modifierGroupCode,
        unitCode: payload.unitCode || null,
        additionalPrice: payload.additionalPrice,
        kitchenCode: payload.kitchenCode || null,
        displayOrder: payload.displayOrder,
        isDefault: payload.isDefault,
        printInKitchen: payload.printInKitchen,
      },
      { headers: { CompID: compId } },
    );
    return toModifier(data);
  },

  remove: async (code: string): Promise<void> => {
    const compId = useAuthStore.getState().user?.compId ?? "";
    const userName = useAuthStore.getState().user?.userName ?? "";
    await apiClient.delete(`/ModifierMaster/${compId}/${code}`, { params: { user: userName } });
  },
};
