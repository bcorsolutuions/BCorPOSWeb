import { apiClient } from "../axios-client";
import { useAuthStore } from "@/stores/auth-store";
import type { TableSectionDto } from "@/types/restaurant";
import type { TableSectionFormValues } from "@/schemas/restaurant-master.schema";

// Real BCorDFWebApi TableSectionMasterController.
export interface TableSectionMaster extends TableSectionDto {
  id: string;
}

function toSection(dto: TableSectionDto): TableSectionMaster {
  return { ...dto, id: dto.code };
}

export const tableSectionService = {
  list: async (): Promise<{ items: TableSectionMaster[]; total: number }> => {
    const compId = useAuthStore.getState().user?.compId ?? "";
    const { data } = await apiClient.get<TableSectionDto[]>(`/TableSectionMaster/${compId}`);
    const items = data.map(toSection);
    return { items, total: items.length };
  },

  create: async (payload: TableSectionFormValues): Promise<TableSectionMaster> => {
    const user = useAuthStore.getState().user;
    const compId = user?.compId ?? "";
    const { data } = await apiClient.post<TableSectionDto>(
      "/TableSectionMaster",
      {
        code: payload.code,
        compID: compId,
        siteID: payload.siteId,
        active: payload.active,
        lastModifiedBy: user?.userName ?? "",
        sectionName: payload.sectionName,
        sectionNameArb: payload.sectionNameArb || null,
        floorCode: payload.floorCode,
        sectionColor: payload.sectionColor || null,
        displayOrder: payload.displayOrder,
      },
      { headers: { CompID: compId } },
    );
    return toSection(data);
  },

  update: async (code: string, payload: TableSectionFormValues): Promise<TableSectionMaster> => {
    const user = useAuthStore.getState().user;
    const compId = user?.compId ?? "";
    const { data } = await apiClient.put<TableSectionDto>(
      `/TableSectionMaster/${code}`,
      {
        active: payload.active,
        lastModifiedBy: user?.userName ?? "",
        sectionName: payload.sectionName,
        sectionNameArb: payload.sectionNameArb || null,
        floorCode: payload.floorCode,
        sectionColor: payload.sectionColor || null,
        displayOrder: payload.displayOrder,
      },
      { headers: { CompID: compId } },
    );
    return toSection(data);
  },

  remove: async (code: string): Promise<void> => {
    const compId = useAuthStore.getState().user?.compId ?? "";
    const userName = useAuthStore.getState().user?.userName ?? "";
    await apiClient.delete(`/TableSectionMaster/${compId}/${code}`, { params: { user: userName } });
  },
};
