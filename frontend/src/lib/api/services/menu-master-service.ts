import { apiClient } from "../axios-client";
import { useAuthStore } from "@/stores/auth-store";
import type { MenuItemDto } from "@/types/restaurant";
import type { MenuItemFormValues } from "@/schemas/restaurant-master.schema";

// Real BCorDFWebApi MenuMasterController — the entity behind the table-
// ordering screen's menu grid and the public QR menu. This is the admin
// CRUD side (no admin page existed for it before).
//
// UpdateMenuMasterDto has far more fields (ImagePath, SubCategoryCode,
// TakeAwayPrice, ServiceChargeCode, ShowInPOS, ...) than this simplified
// admin form exposes. Since MasterService.UpdateAsync maps the whole DTO
// onto the tracked entity, update() fetches the current record first and
// carries every untouched field forward — otherwise every edit here would
// silently blank the item's photo and every other field not on this form
// (the same class of bug already fixed for Customer/Vendor Master).
export interface MenuMaster extends MenuItemDto {
  id: string;
}

function toMenuItem(dto: MenuItemDto): MenuMaster {
  return { ...dto, id: dto.code };
}

export const menuMasterService = {
  list: async (): Promise<{ items: MenuMaster[]; total: number }> => {
    const compId = useAuthStore.getState().user?.compId ?? "";
    const { data } = await apiClient.get<MenuItemDto[]>(`/MenuMaster/${compId}`);
    const items = data.map(toMenuItem);
    return { items, total: items.length };
  },

  create: async (payload: MenuItemFormValues): Promise<MenuMaster> => {
    const user = useAuthStore.getState().user;
    const compId = user?.compId ?? "";
    const { data } = await apiClient.post<MenuItemDto>(
      "/MenuMaster",
      {
        code: payload.code,
        compID: compId,
        siteID: payload.siteId,
        active: payload.active,
        lastModifiedBy: user?.userName ?? "",
        menuName: payload.menuName,
        menuNameArb: payload.menuNameArb || null,
        categoryCode: payload.categoryCode,
        subCategoryCode: payload.subCategoryCode || null,
        kitchenCode: payload.kitchenCode || null,
        unitCode: payload.unitCode || null,
        barcode: payload.barcode || null,
        description: payload.description || null,
        sellingPrice: payload.sellingPrice,
        takeAwayPrice: payload.takeAwayPrice ?? null,
        taxCode: payload.taxCode || null,
        taxPercent: payload.taxPercent,
        preparationMinutes: payload.preparationMinutes,
        isRecipeItem: payload.isRecipeItem,
        isVegetarian: payload.isVegetarian,
        isSpicy: payload.isSpicy,
        showInOnlineOrder: payload.showInOnlineOrder,
        showInPOS: true,
        showInKiosk: true,
        allowDiscount: true,
      },
      { headers: { CompID: compId } },
    );
    return toMenuItem(data);
  },

  update: async (code: string, payload: MenuItemFormValues): Promise<MenuMaster> => {
    const user = useAuthStore.getState().user;
    const compId = user?.compId ?? "";

    const { data: current } = await apiClient.get<Record<string, unknown>>(`/MenuMaster/${compId}/${code}`);
    const { code: _code, compID, lastModifiedOn, ...rest } = current;
    void _code;
    void compID;
    void lastModifiedOn;

    const { data } = await apiClient.put<MenuItemDto>(
      `/MenuMaster/${code}`,
      {
        ...rest,
        active: payload.active,
        lastModifiedBy: user?.userName ?? "",
        menuName: payload.menuName,
        menuNameArb: payload.menuNameArb || null,
        categoryCode: payload.categoryCode,
        subCategoryCode: payload.subCategoryCode || null,
        kitchenCode: payload.kitchenCode || null,
        unitCode: payload.unitCode || null,
        barcode: payload.barcode || null,
        description: payload.description || null,
        sellingPrice: payload.sellingPrice,
        takeAwayPrice: payload.takeAwayPrice ?? null,
        taxCode: payload.taxCode || null,
        taxPercent: payload.taxPercent,
        preparationMinutes: payload.preparationMinutes,
        isRecipeItem: payload.isRecipeItem,
        isVegetarian: payload.isVegetarian,
        isSpicy: payload.isSpicy,
        showInOnlineOrder: payload.showInOnlineOrder,
      },
      { headers: { CompID: compId } },
    );
    return toMenuItem(data);
  },

  remove: async (code: string): Promise<void> => {
    const compId = useAuthStore.getState().user?.compId ?? "";
    const userName = useAuthStore.getState().user?.userName ?? "";
    await apiClient.delete(`/MenuMaster/${compId}/${code}`, { params: { user: userName } });
  },
};
