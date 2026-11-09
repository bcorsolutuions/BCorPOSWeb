import { apiClient } from "../axios-client";

// Real BCorDFWebApi BusinessTypeModuleController — global lookup, GET is any
// authenticated role. Used by the "Create License" screens to pre-check the
// modules recommended for a given business type (e.g. SAL) when it's ticked.
export interface BusinessTypeModuleDto {
  id: string;
  businessTypeCode: string;
  moduleCode: string;
  isRecommended: boolean;
  active: boolean;
  lastModifiedBy: string;
  lastModifiedOn?: string | null;
}

export const businessTypeModuleService = {
  getRecommended: async (businessTypeCode: string): Promise<BusinessTypeModuleDto[]> => {
    const { data } = await apiClient.get<BusinessTypeModuleDto[]>(`/BusinessTypeModule/${businessTypeCode}`);
    return data;
  },
};
