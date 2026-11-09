import { apiClient } from "../axios-client";
import { useAuthStore } from "@/stores/auth-store";
import type { MenuCategoryDto } from "@/types/restaurant";
import type { MenuCategoryFormValues } from "@/schemas/restaurant-master.schema";

// Real BCorDFWebApi MenuCategoryMasterController.
export interface MenuCategoryMaster extends MenuCategoryDto {
  id: string;
}

function toCategory(dto: MenuCategoryDto): MenuCategoryMaster {
  return { ...dto, id: dto.code };
}

export const menuCategoryService = {
  list: async (): Promise<{ items: MenuCategoryMaster[]; total: number }> => {
    const compId = useAuthStore.getState().user?.compId ?? "";
    const { data } = await apiClient.get<MenuCategoryDto[]>(`/MenuCategoryMaster/${compId}`);
    const items = data.map(toCategory);
    return { items, total: items.length };
  },

  create: async (payload: MenuCategoryFormValues): Promise<MenuCategoryMaster> => {
    const user = useAuthStore.getState().user;
    const compId = user?.compId ?? "";
    const { data } = await apiClient.post<MenuCategoryDto>(
      "/MenuCategoryMaster",
      {
        code: payload.code,
        compID: compId,
        siteID: payload.siteId,
        active: payload.active,
        lastModifiedBy: user?.userName ?? "",
        categoryName: payload.categoryName,
        categoryNameArb: payload.categoryNameArb || null,
        kitchenCode: payload.kitchenCode || null,
        displayOrder: payload.displayOrder,
        showInPOS: payload.showInPOS,
        showInKiosk: payload.showInKiosk,
        showInOnlineOrder: payload.showInOnlineOrder,
      },
      { headers: { CompID: compId } },
    );
    return toCategory(data);
  },

  update: async (code: string, payload: MenuCategoryFormValues): Promise<MenuCategoryMaster> => {
    const user = useAuthStore.getState().user;
    const compId = user?.compId ?? "";
    const { data } = await apiClient.put<MenuCategoryDto>(
      `/MenuCategoryMaster/${code}`,
      {
        active: payload.active,
        lastModifiedBy: user?.userName ?? "",
        categoryName: payload.categoryName,
        categoryNameArb: payload.categoryNameArb || null,
        kitchenCode: payload.kitchenCode || null,
        displayOrder: payload.displayOrder,
        showInPOS: payload.showInPOS,
        showInKiosk: payload.showInKiosk,
        showInOnlineOrder: payload.showInOnlineOrder,
      },
      { headers: { CompID: compId } },
    );
    return toCategory(data);
  },

  remove: async (code: string): Promise<void> => {
    const compId = useAuthStore.getState().user?.compId ?? "";
    const userName = useAuthStore.getState().user?.userName ?? "";
    await apiClient.delete(`/MenuCategoryMaster/${compId}/${code}`, { params: { user: userName } });
  },
};
