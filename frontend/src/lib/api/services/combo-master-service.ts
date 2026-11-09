import { apiClient } from "../axios-client";
import { useAuthStore } from "@/stores/auth-store";
import type { ComboMasterDto } from "@/types/combo";
import type { ComboFormValues } from "@/schemas/combo-master.schema";

// Real BCorDFWebApi ComboMasterController — full CRUD, same
// MasterServiceWithDetails<...> pattern as PromotionMaster/InventoryMaster.
export interface Combo extends ComboMasterDto {
  id: string;
}

function toCombo(dto: ComboMasterDto): Combo {
  return { ...dto, id: dto.code };
}

function buildDetailsPayload(payload: ComboFormValues) {
  return payload.details.map((d) => ({
    id: d.id || undefined,
    groupNo: d.groupNo,
    groupName: d.groupName || null,
    componentType: d.componentType,
    menuCode: d.componentType === "Menu" ? d.componentCode : null,
    inventoryCode: d.componentType === "Inventory" ? d.componentCode : null,
    serviceCode: d.componentType === "Service" ? d.componentCode : null,
    unitCode: d.unitCode || null,
    isOptional: d.isOptional,
    quantity: d.quantity,
    minimumSelection: d.minimumSelection,
    maximumSelection: d.maximumSelection,
    additionalPrice: d.additionalPrice,
    isDefault: d.isDefault,
    displayOrder: d.displayOrder,
    remarks: null,
  }));
}

function withDefaults(payload: ComboFormValues) {
  return {
    comboName: payload.comboName,
    comboNameArb: payload.comboNameArb || null,
    menuCode: payload.menuCode || null,
    categoryCode: payload.categoryCode || null,
    sellingPrice: payload.sellingPrice,
    takeAwayPrice: null,
    deliveryPrice: null,
    taxCode: payload.taxCode || null,
    taxPercent: payload.taxPercent ?? null,
    validFrom: payload.validFrom || null,
    validTo: payload.validTo || null,
    availableFromTime: null,
    availableToTime: null,
    imagePath: null,
    displayOrder: 0,
    showInPOS: true,
    showInKiosk: true,
    showInOnlineOrder: true,
    allowDiscount: payload.allowDiscount,
    allowItemSubstitution: payload.allowItemSubstitution,
    remarks: payload.remarks || null,
    details: buildDetailsPayload(payload),
  };
}

export const comboMasterService = {
  list: async (): Promise<{ items: Combo[]; total: number }> => {
    const compId = useAuthStore.getState().user?.compId ?? "";
    const { data } = await apiClient.get<ComboMasterDto[]>(`/ComboMaster/${compId}`);
    const items = data.map(toCombo);
    return { items, total: items.length };
  },

  create: async (payload: ComboFormValues): Promise<Combo> => {
    const user = useAuthStore.getState().user;
    const compId = user?.compId ?? "";
    const { data } = await apiClient.post<ComboMasterDto>(
      "/ComboMaster",
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
    return toCombo(data);
  },

  update: async (code: string, payload: ComboFormValues): Promise<Combo> => {
    const user = useAuthStore.getState().user;
    const compId = user?.compId ?? "";
    const { data } = await apiClient.put<ComboMasterDto>(
      `/ComboMaster/${code}`,
      {
        active: payload.active,
        lastModifiedBy: user?.userName ?? "",
        ...withDefaults(payload),
      },
      { headers: { CompID: compId } },
    );
    return toCombo(data);
  },

  remove: async (code: string): Promise<void> => {
    const compId = useAuthStore.getState().user?.compId ?? "";
    const userName = useAuthStore.getState().user?.userName ?? "";
    await apiClient.delete(`/ComboMaster/${compId}/${code}`, { params: { user: userName } });
  },
};
