import { apiClient } from "../axios-client";
import type { OpenItemSettingsDto } from "@/types/open-item-settings";

// Real BCorDFWebApi OpenItemSettingsController.
export const openItemSettingsService = {
  getBySite: async (compId: string, siteId: string): Promise<OpenItemSettingsDto> => {
    const { data } = await apiClient.get<OpenItemSettingsDto>(`/OpenItemSettings/${compId}/site/${siteId}`);
    return data;
  },
};
