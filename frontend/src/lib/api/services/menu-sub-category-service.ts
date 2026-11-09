import { apiClient } from "../axios-client";
import { useAuthStore } from "@/stores/auth-store";
import type { MenuSubCategoryDto } from "@/types/restaurant";
import type { MenuSubCategoryFormValues } from "@/schemas/restaurant-master.schema";

// Real BCorDFWebApi MenuSubCategoryMasterController — the second level under
// a Menu Category (Product Type → Product Group), same shape as Item
// Category's sub categories. The server checks the main category exists.
export interface MenuSubCategoryMaster extends MenuSubCategoryDto {
  id: string;
}

function toSubCategory(dto: MenuSubCategoryDto): MenuSubCategoryMaster {
  return { ...dto, id: dto.code };
}

export const menuSubCategoryService = {
  list: async (): Promise<{ items: MenuSubCategoryMaster[]; total: number }> => {
    const compId = useAuthStore.getState().user?.compId ?? "";
    const { data } = await apiClient.get<MenuSubCategoryDto[]>(`/MenuSubCategoryMaster/${compId}`);
    const items = data.map(toSubCategory);
    return { items, total: items.length };
  },

  create: async (payload: MenuSubCategoryFormValues): Promise<MenuSubCategoryMaster> => {
    const user = useAuthStore.getState().user;
    const compId = user?.compId ?? "";
    const { data } = await apiClient.post<MenuSubCategoryDto>(
      "/MenuSubCategoryMaster",
      {
        code: payload.code,
        compID: compId,
        siteID: payload.siteId,
        active: payload.active,
        lastModifiedBy: user?.userName ?? "",
        subCategoryName: payload.subCategoryName,
        subCategoryNameArb: payload.subCategoryNameArb || null,
        categoryCode: payload.categoryCode,
        kitchenCode: payload.kitchenCode || null,
        displayOrder: payload.displayOrder,
        showInPOS: payload.showInPOS,
        showInKiosk: payload.showInKiosk,
        showInOnlineOrder: payload.showInOnlineOrder,
      },
      { headers: { CompID: compId } },
    );
    return toSubCategory(data);
  },

  update: async (code: string, payload: MenuSubCategoryFormValues): Promise<MenuSubCategoryMaster> => {
    const user = useAuthStore.getState().user;
    const compId = user?.compId ?? "";

    // Carry forward the fields this form doesn't expose (image, colours,
    // remarks) — the update maps the whole DTO onto the stored row.
    const { data: current } = await apiClient.get<Record<string, unknown>>(`/MenuSubCategoryMaster/${compId}/${code}`);
    const { code: _code, compID, siteID, lastModifiedOn, ...rest } = current;
    void _code;
    void compID;
    void siteID;
    void lastModifiedOn;

    const { data } = await apiClient.put<MenuSubCategoryDto>(
      `/MenuSubCategoryMaster/${code}`,
      {
        ...rest,
        active: payload.active,
        lastModifiedBy: user?.userName ?? "",
        subCategoryName: payload.subCategoryName,
        subCategoryNameArb: payload.subCategoryNameArb || null,
        categoryCode: payload.categoryCode,
        kitchenCode: payload.kitchenCode || null,
        displayOrder: payload.displayOrder,
        showInPOS: payload.showInPOS,
        showInKiosk: payload.showInKiosk,
        showInOnlineOrder: payload.showInOnlineOrder,
      },
      { headers: { CompID: compId } },
    );
    return toSubCategory(data);
  },

  remove: async (code: string): Promise<void> => {
    const compId = useAuthStore.getState().user?.compId ?? "";
    const userName = useAuthStore.getState().user?.userName ?? "";
    await apiClient.delete(`/MenuSubCategoryMaster/${compId}/${code}`, { params: { user: userName } });
  },
};
