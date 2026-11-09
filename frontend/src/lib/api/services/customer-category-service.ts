import { apiClient } from "../axios-client";
import { useAuthStore } from "@/stores/auth-store";
import type { CustomerCategoryMaster } from "@/types/customer-master";
import type { CustomerCategoryFormValues } from "@/schemas/masters.schema";

// BCorDFWebApi's CustomerCatMasterController — generic MasterController CRUD keyed by CompID + Code. getCategories is the lookup for the
// Category picker on Customer Master; list/create/update/remove back the Customer Category screen (masters/customer-categories).
export type CustomerCategoryRow = CustomerCategoryMaster & { id: string };

/** The select cannot hold an empty value, so "none" is this sentinel in the form and null on the wire. */
export const NONE = "__none__";
const orNull = (v?: string | null) => (!v || v === NONE ? null : v);

function payloadOf(p: CustomerCategoryFormValues) {
  return {
    siteID: p.siteId,
    active: p.active,
    custCatName: p.custCatName,
    custCatNameArb: p.custCatNameArb || null,
    parentCode: orNull(p.parentCode),
    glCode: orNull(p.glCode),
    remarks: p.remarks || null,
  };
}

export const customerCategoryService = {
  getCategories: async (compId: string): Promise<CustomerCategoryMaster[]> => {
    const { data } = await apiClient.get<CustomerCategoryMaster[]>(`/CustomerCatMaster/${compId}`);
    return data;
  },

  list: async (): Promise<{ items: CustomerCategoryRow[]; total: number }> => {
    const compId = useAuthStore.getState().user?.compId ?? "";
    const { data } = await apiClient.get<CustomerCategoryMaster[]>(`/CustomerCatMaster/${compId}`);
    const items = data.map((c) => ({ ...c, id: c.code }));
    return { items, total: items.length };
  },

  create: async (payload: CustomerCategoryFormValues): Promise<CustomerCategoryRow> => {
    const user = useAuthStore.getState().user;
    const compId = user?.compId ?? "";
    const { data } = await apiClient.post<CustomerCategoryMaster>(
      "/CustomerCatMaster",
      { code: payload.code, compID: compId, lastModifiedBy: user?.userName ?? "", ...payloadOf(payload) },
      { headers: { CompID: compId } },
    );
    return { ...data, id: data.code };
  },

  update: async (code: string, payload: CustomerCategoryFormValues): Promise<CustomerCategoryRow> => {
    const user = useAuthStore.getState().user;
    const compId = user?.compId ?? "";
    await apiClient.put(`/CustomerCatMaster/${code}`, { lastModifiedBy: user?.userName ?? "", ...payloadOf(payload) }, { headers: { CompID: compId } });
    return { ...(payload as unknown as CustomerCategoryMaster), code, id: code, compID: compId, siteID: payload.siteId, active: payload.active };
  },

  remove: async (code: string): Promise<void> => {
    const compId = useAuthStore.getState().user?.compId ?? "";
    const userName = useAuthStore.getState().user?.userName ?? "";
    await apiClient.delete(`/CustomerCatMaster/${compId}/${code}`, { params: { user: userName } });
  },
};
