import { apiClient } from "../axios-client";
import { useAuthStore } from "@/stores/auth-store";
import type { ItemCategoryMaster } from "@/types/item-master";
import type { ItemCategoryFormValues } from "@/schemas/masters.schema";

// Real BCorDFWebApi InventoryCatMasterController — reused as Item Category
// Master's actual backing store (see item-master-service.ts's header comment
// for why). /api/ItemCategories is left fully intact and untouched, just no
// longer called from here. `getCategories` is the pre-existing read-only
// lookup the Category picker on Item Master uses; list/create/update/remove
// back the actual admin screen (masters/item-categories/page.tsx).
interface InventoryCatMasterDto {
  id: string;
  code: string;
  inventoryCatName: string;
  description?: string | null;
  parentCode?: string | null;
  inventoryGLCode?: string | null;
  costGLCode?: string | null;
  salesGLCode?: string | null;
  glCode?: string | null;
  salesGLCode2?: string | null;
  costGLCode2?: string | null;
  compID: string;
  siteID: string;
  lastModifiedBy: string;
  lastModifiedOn?: string | null;
  active: boolean;
}

// `id` is set to the category's Code (the real PUT/DELETE address), not a
// server Guid — same convention as every other master this session.
function toItemCategoryMaster(dto: InventoryCatMasterDto): ItemCategoryMaster & { id: string } {
  return {
    id: dto.code,
    code: dto.code,
    name: dto.inventoryCatName,
    description: dto.description,
    parentCode: dto.parentCode || null,
    inventoryGLCode: dto.inventoryGLCode,
    costGLCode: dto.costGLCode,
    salesGLCode: dto.salesGLCode,
    glCode: dto.glCode,
    salesGLCode2: dto.salesGLCode2,
    costGLCode2: dto.costGLCode2,
    compID: dto.compID,
    siteID: dto.siteID,
    lastModifiedBy: dto.lastModifiedBy,
    lastModifiedOn: dto.lastModifiedOn,
    active: dto.active,
  };
}

// The select field can't hold an empty value (Radix Select rejects ""), so
// "no parent / main category" is this sentinel in the form and null on the wire.
export const MAIN_CATEGORY = "__main__";
// Same for "no GL account chosen".
export const NO_GL = "__none__";
const glOrNull = (v?: string | null) => (!v || v === NO_GL ? null : v);

// InventoryType is a required field on InventoryCatMaster (capped at 5
// chars) that this screen doesn't expose — same "ITEM" default as
// item-master-service.ts.
function buildPayload(payload: ItemCategoryFormValues, compId: string, userName: string) {
  return {
    code: payload.code,
    compID: compId,
    siteID: payload.siteId,
    active: payload.active,
    lastModifiedBy: userName,
    inventoryCatName: payload.name,
    description: payload.description || null,
    parentCode: !payload.parentCode || payload.parentCode === MAIN_CATEGORY ? null : payload.parentCode,
    inventoryType: "ITEM",
    inventoryGLCode: glOrNull(payload.inventoryGlCode),
    costGLCode: glOrNull(payload.costGlCode),
    salesGLCode: glOrNull(payload.salesGlCode),
    // Not on this screen: send back what the record had (the update replaces every column).
    glCode: glOrNull(payload.glCode),
    salesGLCode2: glOrNull(payload.salesGlCode2),
    costGLCode2: glOrNull(payload.costGlCode2),
  };
}

export const itemCategoryService = {
  getCategories: async (compId: string): Promise<ItemCategoryMaster[]> => {
    const { data } = await apiClient.get<InventoryCatMasterDto[]>(`/InventoryCatMaster/${compId}`);
    return data.map(toItemCategoryMaster);
  },

  list: async (): Promise<{ items: (ItemCategoryMaster & { id: string })[]; total: number }> => {
    const compId = useAuthStore.getState().user?.compId ?? "";
    const { data } = await apiClient.get<InventoryCatMasterDto[]>(`/InventoryCatMaster/${compId}`);
    const items = data.map(toItemCategoryMaster);
    const names = new Map(items.map((c) => [c.code, c.name]));
    const withParentNames = items.map((c) => ({
      ...c,
      parentName: c.parentCode ? names.get(c.parentCode) ?? c.parentCode : null,
    }));
    return { items: withParentNames, total: withParentNames.length };
  },

  create: async (payload: ItemCategoryFormValues): Promise<ItemCategoryMaster & { id: string }> => {
    const user = useAuthStore.getState().user;
    const compId = user?.compId ?? "";
    const { data } = await apiClient.post<InventoryCatMasterDto>(
      "/InventoryCatMaster",
      buildPayload(payload, compId, user?.userName ?? ""),
      { headers: { CompID: compId } },
    );
    return toItemCategoryMaster(data);
  },

  update: async (code: string, payload: ItemCategoryFormValues): Promise<ItemCategoryMaster & { id: string }> => {
    const user = useAuthStore.getState().user;
    const compId = user?.compId ?? "";
    const { data } = await apiClient.put<InventoryCatMasterDto>(
      `/InventoryCatMaster/${code}`,
      buildPayload(payload, compId, user?.userName ?? ""),
      { headers: { CompID: compId } },
    );
    return toItemCategoryMaster(data);
  },

  remove: async (code: string): Promise<void> => {
    const compId = useAuthStore.getState().user?.compId ?? "";
    const userName = useAuthStore.getState().user?.userName ?? "";
    await apiClient.delete(`/InventoryCatMaster/${compId}/${code}`, { params: { user: userName } });
  },
};
