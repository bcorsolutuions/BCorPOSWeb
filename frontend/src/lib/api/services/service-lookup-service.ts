import { apiClient } from "../axios-client";
import type { ServiceDto, StaffDto } from "@/types/salon";

// Read-only salon lookups the POS sale screen needs when Site Business Type
// includes SAL — mirrors posLookupService.searchItems/getSalesmen, backed by
// ServiceMasterController's Search action and StaffMasterController's plain GetAll.
export const serviceLookupService = {
  searchServices: async (compId: string, query?: string): Promise<ServiceDto[]> => {
    const { data } = await apiClient.get<ServiceDto[]>(`/ServiceMaster/${compId}/search`, {
      params: query ? { query } : undefined,
    });
    return data;
  },

  getStaff: async (compId: string): Promise<StaffDto[]> => {
    const { data } = await apiClient.get<StaffDto[]>(`/StaffMaster/${compId}`);
    return data;
  },
};
