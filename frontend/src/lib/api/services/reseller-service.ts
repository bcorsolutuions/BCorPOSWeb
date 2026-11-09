import { apiClient } from "../axios-client";
import { useAuthStore } from "@/stores/auth-store";
import type { ResellerDto } from "@/types/license";

// Real BCorDFWebApi ResellerController — global entity (no CompID scoping),
// [Authorize(Roles = AppRoles.SuperAdmin)] on every action.
export interface ResellerRow extends ResellerDto {
  id: string; // = resellerCode — the actual route key, matching FloorMaster's id-mapping convention
}

function toRow(dto: ResellerDto): ResellerRow {
  return { ...dto, id: dto.resellerCode };
}

export interface ResellerFormValues {
  resellerCode: string;
  resellerName: string;
  contactPerson?: string;
  email?: string;
  phone?: string;
  address?: string;
  country?: string;
  active: boolean;
}

export const resellerService = {
  list: async (): Promise<{ items: ResellerRow[]; total: number }> => {
    const { data } = await apiClient.get<ResellerDto[]>("/Reseller");
    const items = data.map(toRow);
    return { items, total: items.length };
  },

  create: async (payload: ResellerFormValues): Promise<ResellerRow> => {
    const userName = useAuthStore.getState().user?.userName ?? "";
    const { data } = await apiClient.post<ResellerDto>("/Reseller", {
      ...payload,
      lastModifiedBy: userName,
    });
    return toRow(data);
  },

  update: async (id: string, payload: ResellerFormValues): Promise<ResellerRow> => {
    // ResellerController.Update returns 204 No Content — the caller relies
    // on the subsequent list-query invalidation for fresh data, this return
    // value only needs to be shaped correctly for the optimistic dialog close.
    const userName = useAuthStore.getState().user?.userName ?? "";
    await apiClient.put(`/Reseller/${id}`, {
      resellerName: payload.resellerName,
      contactPerson: payload.contactPerson,
      email: payload.email,
      phone: payload.phone,
      address: payload.address,
      country: payload.country,
      active: payload.active,
      lastModifiedBy: userName,
    });
    return toRow({ ...payload, id, resellerCode: id, lastModifiedBy: userName, lastModifiedOn: null });
  },

  remove: async (id: string): Promise<void> => {
    const userName = useAuthStore.getState().user?.userName ?? "";
    await apiClient.delete(`/Reseller/${id}`, { params: { user: userName } });
  },
};
