import { apiClient } from "../axios-client";

// Real BCorDFWebApi TenantSetupController — the Setup screen's company group
// / company / branch details (SysCompanyGroupMaster, SysCompanyMast,
// SysSiteMast), keyed by CompId only. Codes and the license-issued LKey are
// never editable here.
export interface TenantGroupDto {
  compGroupId: string;
  compGroupCode: string;
  compGroupName: string;
  compAddress?: string | null;
}

export interface TenantCompanyDto {
  compId: string;
  compCode: string;
  companyName: string;
  compAddress?: string | null;
  taxRegisterNo?: string | null;
  finPeriodStart?: string | null;
  finperiodEnd?: string | null;
  active: boolean;
}

export interface TenantSetupDto {
  group: TenantGroupDto;
  company: TenantCompanyDto;
}

export interface TenantBranchDto {
  siteID: string;
  siteName: string;
  siteNameArb?: string | null;
  siteShortName?: string | null;
  siteShortNameArb?: string | null;
  siteAddress?: string | null;
  siteAddressArb?: string | null;
  building?: string | null;
  road?: string | null;
  block?: string | null;
  area?: string | null;
  city?: string | null;
  countryCode?: string | null;
  pinPOBox?: string | null;
  contactNo?: string | null;
  alternateContactNo?: string | null;
  fax?: string | null;
  email?: string | null;
  webSite?: string | null;
  siteOrder: number;
  isInvSite: boolean;
  isLoginSite: boolean;
  defGLCCCode?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  timeZoneCode?: string | null;
  currencyCode?: string | null;
  active: boolean;
}

export const tenantSetupService = {
  get: async (compId: string): Promise<TenantSetupDto> => {
    const { data } = await apiClient.get<TenantSetupDto>(`/TenantSetup/${compId}`);
    return data;
  },

  updateGroup: async (compId: string, dto: TenantGroupDto): Promise<void> => {
    await apiClient.put(`/TenantSetup/${compId}/group`, dto);
  },

  updateCompany: async (compId: string, dto: TenantCompanyDto): Promise<void> => {
    await apiClient.put(`/TenantSetup/${compId}/company`, dto);
  },

  getBranches: async (compId: string): Promise<TenantBranchDto[]> => {
    const { data } = await apiClient.get<TenantBranchDto[]>(`/TenantSetup/${compId}/branches`);
    return data;
  },

  createBranch: async (compId: string, dto: TenantBranchDto): Promise<void> => {
    await apiClient.post(`/TenantSetup/${compId}/branches`, dto);
  },

  updateBranch: async (compId: string, dto: TenantBranchDto): Promise<void> => {
    await apiClient.put(`/TenantSetup/${compId}/branches/${encodeURIComponent(dto.siteID)}`, dto);
  },
};
