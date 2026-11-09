import { apiClient } from "../axios-client";
import { useAuthStore } from "@/stores/auth-store";
import type { StaffDto } from "@/types/salon";
import type { StaffFormValues } from "@/schemas/salon-master.schema";

// Real BCorDFWebApi StaffMasterController — salon staff who can be assigned
// to a service line on the POS sale screen (commission tracked per line).
export interface Staff extends StaffDto {
  id: string;
}

function toStaff(dto: StaffDto): Staff {
  return { ...dto, id: dto.code };
}

export const staffMasterService = {
  list: async (): Promise<{ items: Staff[]; total: number }> => {
    const compId = useAuthStore.getState().user?.compId ?? "";
    const { data } = await apiClient.get<StaffDto[]>(`/StaffMaster/${compId}`);
    const items = data.map(toStaff);
    return { items, total: items.length };
  },

  create: async (payload: StaffFormValues): Promise<Staff> => {
    const user = useAuthStore.getState().user;
    const compId = user?.compId ?? "";
    const { data } = await apiClient.post<StaffDto>(
      "/StaffMaster",
      {
        code: payload.code,
        compID: compId,
        siteID: payload.siteId,
        active: payload.active,
        lastModifiedBy: user?.userName ?? "",
        staffName: payload.staffName,
        staffNameArb: payload.staffNameArb || null,
        commissionPercent: payload.commissionPercent ?? null,
        phone: payload.phone || null,
        remarks: payload.remarks || null,
      },
      { headers: { CompID: compId } },
    );
    return toStaff(data);
  },

  update: async (code: string, payload: StaffFormValues): Promise<Staff> => {
    const user = useAuthStore.getState().user;
    const compId = user?.compId ?? "";
    const { data } = await apiClient.put<StaffDto>(
      `/StaffMaster/${code}`,
      {
        active: payload.active,
        lastModifiedBy: user?.userName ?? "",
        staffName: payload.staffName,
        staffNameArb: payload.staffNameArb || null,
        commissionPercent: payload.commissionPercent ?? null,
        phone: payload.phone || null,
        remarks: payload.remarks || null,
      },
      { headers: { CompID: compId } },
    );
    return toStaff(data);
  },

  remove: async (code: string): Promise<void> => {
    const compId = useAuthStore.getState().user?.compId ?? "";
    const userName = useAuthStore.getState().user?.userName ?? "";
    await apiClient.delete(`/StaffMaster/${compId}/${code}`, { params: { user: userName } });
  },
};
