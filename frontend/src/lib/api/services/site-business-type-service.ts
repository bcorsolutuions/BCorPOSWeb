import { apiClient } from "../axios-client";

// Real BCorDFWebApi SiteBusinessTypeController — configures which business
// types (from BusinessTypeCodes.All, e.g. "SAL"/"SUP") a given branch/site
// actually runs. This is what useSiteBusinessTypes (POS) reads to switch
// layouts — a license merely permitting a business type (LicenseBusinessType)
// does NOT tag any site with it; that's this table's job. Server enforces
// "site's type must be one the company's license covers".
export interface SiteBusinessTypeDto {
  id: string;
  compID: string;
  siteID: string;
  businessTypeCode: string;
  isPrimary: boolean;
  active: boolean;
  lastModifiedBy: string;
  lastModifiedOn?: string | null;
}

export interface CreateSiteBusinessTypeDto {
  compID: string;
  siteID: string;
  businessTypeCode: string;
  isPrimary: boolean;
  lastModifiedBy: string;
}

export interface UpdateSiteBusinessTypeDto {
  isPrimary: boolean;
  active: boolean;
  lastModifiedBy: string;
}

export const siteBusinessTypeService = {
  getForSite: async (compId: string, siteId: string): Promise<SiteBusinessTypeDto[]> => {
    const { data } = await apiClient.get<SiteBusinessTypeDto[]>(`/SiteBusinessType/${compId}/${siteId}`);
    return data;
  },

  create: async (dto: CreateSiteBusinessTypeDto): Promise<SiteBusinessTypeDto> => {
    const { data } = await apiClient.post<SiteBusinessTypeDto>("/SiteBusinessType", dto);
    return data;
  },

  update: async (id: string, dto: UpdateSiteBusinessTypeDto): Promise<void> => {
    await apiClient.put(`/SiteBusinessType/${id}`, dto);
  },

  remove: async (id: string, user: string): Promise<void> => {
    await apiClient.delete(`/SiteBusinessType/${id}`, { params: { user } });
  },
};
