import { apiClient } from "../axios-client";
import { useAuthStore } from "@/stores/auth-store";
import type { VendorCategoryMaster } from "@/types/vendor-master";
import type { VendorCategoryFormValues } from "@/schemas/masters.schema";

// BCorDFWebApi's VendorCatMasterController — generic MasterController CRUD keyed by CompID + Code. getCategories is the lookup for the
// Category picker on Supplier Master; list/create/update/remove back the Supplier Category screen (masters/supplier-categories).
export type VendorCategoryRow = VendorCategoryMaster & { id: string };

/** The select cannot hold an empty value, so "none" is this sentinel in the form and null on the wire. */
export const NONE = "__none__";
const orNull = (v?: string | null) => (!v || v === NONE ? null : v);

function payloadOf(p: VendorCategoryFormValues) {
  return {
    active: p.active,
    vendorCatName: p.vendorCatName,
    parentCode: orNull(p.parentCode),
    glCode: orNull(p.glCode),
    remarks: p.remarks || null,
  };
}

export const vendorCategoryService = {
  getCategories: async (compId: string): Promise<VendorCategoryMaster[]> => {
    const { data } = await apiClient.get<VendorCategoryMaster[]>(`/VendorCatMaster/${compId}`);
    return data;
  },

  list: async (): Promise<{ items: VendorCategoryRow[]; total: number }> => {
    const compId = useAuthStore.getState().user?.compId ?? "";
    const { data } = await apiClient.get<VendorCategoryMaster[]>(`/VendorCatMaster/${compId}`);
    const items = data.map((c) => ({ ...c, id: c.code }));
    return { items, total: items.length };
  },

  create: async (payload: VendorCategoryFormValues): Promise<VendorCategoryRow> => {
    const user = useAuthStore.getState().user;
    const compId = user?.compId ?? "";
    const { data } = await apiClient.post<VendorCategoryMaster>(
      "/VendorCatMaster",
      { code: payload.code, compID: compId, siteID: payload.siteId, lastModifiedBy: user?.userName ?? "", ...payloadOf(payload) },
      { headers: { CompID: compId } },
    );
    return { ...data, id: data.code };
  },

  update: async (code: string, payload: VendorCategoryFormValues): Promise<VendorCategoryRow> => {
    const user = useAuthStore.getState().user;
    const compId = user?.compId ?? "";
    await apiClient.put(`/VendorCatMaster/${code}`, { lastModifiedBy: user?.userName ?? "", ...payloadOf(payload) }, { headers: { CompID: compId } });
    return { ...(payload as unknown as VendorCategoryMaster), code, id: code, compID: compId, siteID: payload.siteId, active: payload.active };
  },

  remove: async (code: string): Promise<void> => {
    const compId = useAuthStore.getState().user?.compId ?? "";
    const userName = useAuthStore.getState().user?.userName ?? "";
    await apiClient.delete(`/VendorCatMaster/${compId}/${code}`, { params: { user: userName } });
  },
};
