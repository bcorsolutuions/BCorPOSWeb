import { apiClient } from "../axios-client";
import { useAuthStore } from "@/stores/auth-store";
import type { ServiceDto } from "@/types/salon";
import type { ServiceFormValues } from "@/schemas/salon-master.schema";

// Real BCorDFWebApi ServiceMasterController — salon/spa services sold
// alongside physical products on the POS sale screen (see PosServiceDet).
export interface Service extends ServiceDto {
  id: string;
}

function toService(dto: ServiceDto): Service {
  return { ...dto, id: dto.code };
}

export const serviceMasterService = {
  list: async (): Promise<{ items: Service[]; total: number }> => {
    const compId = useAuthStore.getState().user?.compId ?? "";
    const { data } = await apiClient.get<ServiceDto[]>(`/ServiceMaster/${compId}`);
    const items = data.map(toService);
    return { items, total: items.length };
  },

  search: async (compId: string, query?: string): Promise<Service[]> => {
    const { data } = await apiClient.get<ServiceDto[]>(`/ServiceMaster/${compId}/search`, {
      params: query ? { query } : undefined,
    });
    return data.map(toService);
  },

  create: async (payload: ServiceFormValues): Promise<Service> => {
    const user = useAuthStore.getState().user;
    const compId = user?.compId ?? "";
    const { data } = await apiClient.post<ServiceDto>(
      "/ServiceMaster",
      {
        code: payload.code,
        compID: compId,
        siteID: payload.siteId,
        active: payload.active,
        lastModifiedBy: user?.userName ?? "",
        serviceName: payload.serviceName,
        serviceNameArb: payload.serviceNameArb || null,
        categoryCode: payload.categoryCode || null,
        rate: payload.rate,
        durationMinutes: payload.durationMinutes ?? null,
        taxCode: payload.taxCode || null,
        taxPercentage: payload.taxPercentage ?? null,
        displayOrder: payload.displayOrder,
        remarks: payload.remarks || null,
      },
      { headers: { CompID: compId } },
    );
    return toService(data);
  },

  update: async (code: string, payload: ServiceFormValues): Promise<Service> => {
    const user = useAuthStore.getState().user;
    const compId = user?.compId ?? "";
    const { data } = await apiClient.put<ServiceDto>(
      `/ServiceMaster/${code}`,
      {
        active: payload.active,
        lastModifiedBy: user?.userName ?? "",
        serviceName: payload.serviceName,
        serviceNameArb: payload.serviceNameArb || null,
        categoryCode: payload.categoryCode || null,
        rate: payload.rate,
        durationMinutes: payload.durationMinutes ?? null,
        taxCode: payload.taxCode || null,
        taxPercentage: payload.taxPercentage ?? null,
        displayOrder: payload.displayOrder,
        remarks: payload.remarks || null,
      },
      { headers: { CompID: compId } },
    );
    return toService(data);
  },

  remove: async (code: string): Promise<void> => {
    const compId = useAuthStore.getState().user?.compId ?? "";
    const userName = useAuthStore.getState().user?.userName ?? "";
    await apiClient.delete(`/ServiceMaster/${compId}/${code}`, { params: { user: userName } });
  },
};
