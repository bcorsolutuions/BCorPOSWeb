import { apiClient } from "../axios-client";
import { useAuthStore } from "@/stores/auth-store";
import type { LicenseEditionMasterDto } from "@/types/license";

// Real BCorDFWebApi LicenseEditionController — global lookup, GET is any
// authenticated role (dropdowns everywhere), writes are SuperAdmin-only.
export interface LicenseEditionRow extends LicenseEditionMasterDto {
  id: string; // = editionCode — the actual route key
}

function toRow(dto: LicenseEditionMasterDto): LicenseEditionRow {
  return { ...dto, id: dto.editionCode };
}

export interface LicenseEditionFormValues {
  editionCode: string;
  editionName: string;
  defaultMaxUsers?: number;
  defaultMaxBranches?: number;
  defaultMaxDevices?: number;
  trialDays?: number;
  active: boolean;
}

export const licenseEditionService = {
  list: async (): Promise<{ items: LicenseEditionRow[]; total: number }> => {
    const { data } = await apiClient.get<LicenseEditionMasterDto[]>("/LicenseEdition");
    const items = data.map(toRow);
    return { items, total: items.length };
  },

  create: async (payload: LicenseEditionFormValues): Promise<LicenseEditionRow> => {
    const userName = useAuthStore.getState().user?.userName ?? "";
    const { data } = await apiClient.post<LicenseEditionMasterDto>("/LicenseEdition", {
      ...payload,
      lastModifiedBy: userName,
    });
    return toRow(data);
  },

  update: async (id: string, payload: LicenseEditionFormValues): Promise<LicenseEditionRow> => {
    const userName = useAuthStore.getState().user?.userName ?? "";
    await apiClient.put(`/LicenseEdition/${id}`, {
      editionName: payload.editionName,
      defaultMaxUsers: payload.defaultMaxUsers,
      defaultMaxBranches: payload.defaultMaxBranches,
      defaultMaxDevices: payload.defaultMaxDevices,
      trialDays: payload.trialDays,
      active: payload.active,
      lastModifiedBy: userName,
    });
    return toRow({
      ...payload,
      id,
      editionCode: id,
      lastModifiedBy: userName,
      lastModifiedOn: null,
    });
  },

  remove: async (id: string): Promise<void> => {
    const userName = useAuthStore.getState().user?.userName ?? "";
    await apiClient.delete(`/LicenseEdition/${id}`, { params: { user: userName } });
  },
};
