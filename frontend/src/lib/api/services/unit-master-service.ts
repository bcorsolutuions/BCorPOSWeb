import { apiClient } from "../axios-client";
import { useAuthStore } from "@/stores/auth-store";
import type { UnitMaster } from "@/types/item-master";
import type { UnitMasterFormValues } from "@/schemas/masters.schema";

// BCorDFWebApi's UnitMasterController — was previously only a read-only
// lookup for the Unit picker on Item Master (and anywhere else a UnitCode
// field should be browsed rather than hand-typed); now also backs the actual
// Unit Master admin screen (masters/units/page.tsx), same "id = code" /
// buildPayload convention as Item Category Master and Tax Master. See
// types/item-master.ts's UnitMaster doc comment for why this targets
// /UnitMaster and not the older, dead /Units.
function buildPayload(payload: UnitMasterFormValues, compId: string, userName: string) {
  return {
    code: payload.code,
    compID: compId,
    siteID: payload.siteId,
    active: payload.active,
    lastModifiedBy: userName,
    unitName: payload.unitName,
    abbreviation: payload.abbreviation || null,
  };
}

export const unitMasterService = {
  getUnits: async (compId: string): Promise<UnitMaster[]> => {
    const { data } = await apiClient.get<UnitMaster[]>(`/UnitMaster/${compId}`);
    return data;
  },

  list: async (): Promise<{ items: (UnitMaster & { id: string })[]; total: number }> => {
    const compId = useAuthStore.getState().user?.compId ?? "";
    const { data } = await apiClient.get<UnitMaster[]>(`/UnitMaster/${compId}`);
    const items = data.map((u) => ({ ...u, id: u.code }));
    return { items, total: items.length };
  },

  create: async (payload: UnitMasterFormValues): Promise<UnitMaster & { id: string }> => {
    const user = useAuthStore.getState().user;
    const compId = user?.compId ?? "";
    const { data } = await apiClient.post<UnitMaster>(
      "/UnitMaster",
      buildPayload(payload, compId, user?.userName ?? ""),
      { headers: { CompID: compId } },
    );
    return { ...data, id: data.code };
  },

  update: async (code: string, payload: UnitMasterFormValues): Promise<UnitMaster & { id: string }> => {
    const user = useAuthStore.getState().user;
    const compId = user?.compId ?? "";
    const { data } = await apiClient.put<UnitMaster>(
      `/UnitMaster/${code}`,
      buildPayload(payload, compId, user?.userName ?? ""),
      { headers: { CompID: compId } },
    );
    return { ...data, id: data.code };
  },

  remove: async (code: string): Promise<void> => {
    const compId = useAuthStore.getState().user?.compId ?? "";
    const userName = useAuthStore.getState().user?.userName ?? "";
    await apiClient.delete(`/UnitMaster/${compId}/${code}`, { params: { user: userName } });
  },
};
