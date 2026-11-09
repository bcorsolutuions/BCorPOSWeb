import { apiClient } from "../axios-client";
import { useAuthStore } from "@/stores/auth-store";
import type {
  LicenseMasterDto,
  LicenseDetailDto,
  LicenseHistoryEntryDto,
  LicenseActivationDto,
  LicenseDashboardStatsDto,
  CreateClientLicenseDto,
  OnboardClientDto,
  OnboardClientResultDto,
  ActivateLicenseDto,
  RenewLicenseDto,
  SuspendLicenseDto,
  ReactivateLicenseDto,
  AddLicenseModulesDto,
  TransferLicenseDto,
  ValidateLicenseResponseDto,
} from "@/types/license";

// Real BCorDFWebApi LicenseController — Phase 1: plain [Authorize], no role
// scoping yet (added in Phase 2 once SuperAdmin/ResellerAdmin/TenantAdmin
// roles exist). Every write action stamps `userName` from the current
// session rather than trusting a caller-supplied value.
function currentUserName(): string {
  return useAuthStore.getState().user?.userName ?? "";
}

export const licenseService = {
  list: async (params?: { compId?: string; resellerCode?: string }): Promise<LicenseMasterDto[]> => {
    const { data } = await apiClient.get<LicenseMasterDto[]>("/License", {
      params: { compId: params?.compId, resellerCode: params?.resellerCode },
    });
    return data;
  },

  get: async (compId: string, code: string): Promise<LicenseDetailDto> => {
    const { data } = await apiClient.get<LicenseDetailDto>(`/License/${compId}/${code}`);
    return data;
  },

  createClient: async (payload: Omit<CreateClientLicenseDto, "userName">): Promise<LicenseMasterDto> => {
    const { data } = await apiClient.post<LicenseMasterDto>("/License/client", {
      ...payload,
      userName: currentUserName(),
    });
    return data;
  },

  // "New Client" onboarding — a Reseller/Super Admin creates a brand-new
  // tenant (SysCompanyGroupMaster + its first SysCompanyMast) and issues its
  // first license in one call. Use this instead of createClient whenever the
  // company doesn't already exist — see companyService for the "pick an
  // existing company" path, which stays on createClient.
  onboardClient: async (payload: Omit<OnboardClientDto, "userName">): Promise<OnboardClientResultDto> => {
    const { data } = await apiClient.post<OnboardClientResultDto>("/License/onboard-client", {
      ...payload,
      userName: currentUserName(),
    });
    return data;
  },

  generateKey: async (compId: string, code: string): Promise<LicenseMasterDto> => {
    const { data } = await apiClient.post<LicenseMasterDto>(
      `/License/${compId}/${code}/generate-key`,
      null,
      { params: { user: currentUserName() } },
    );
    return data;
  },

  activate: async (compId: string, code: string, payload: Omit<ActivateLicenseDto, "userName">): Promise<void> => {
    await apiClient.post(`/License/${compId}/${code}/activate`, {
      ...payload,
      userName: currentUserName(),
    });
  },

  renew: async (compId: string, code: string, payload: Omit<RenewLicenseDto, "userName">): Promise<void> => {
    await apiClient.post(`/License/${compId}/${code}/renew`, {
      ...payload,
      userName: currentUserName(),
    });
  },

  suspend: async (compId: string, code: string, payload: Omit<SuspendLicenseDto, "userName">): Promise<void> => {
    await apiClient.post(`/License/${compId}/${code}/suspend`, {
      ...payload,
      userName: currentUserName(),
    });
  },

  reactivate: async (compId: string, code: string, payload: Omit<ReactivateLicenseDto, "userName">): Promise<void> => {
    await apiClient.post(`/License/${compId}/${code}/reactivate`, {
      ...payload,
      userName: currentUserName(),
    });
  },

  // Super/Reseller admin only server-side (AuthorizeLicenseActionAsync
  // allowTenant:false) — adds module(s) to an already-issued license.
  addModules: async (compId: string, code: string, moduleCodes: AddLicenseModulesDto["moduleCodes"]): Promise<void> => {
    await apiClient.post(`/License/${compId}/${code}/modules`, {
      moduleCodes,
      userName: currentUserName(),
    });
  },

  transfer: async (compId: string, code: string, payload: Omit<TransferLicenseDto, "userName">): Promise<LicenseMasterDto> => {
    const { data } = await apiClient.post<LicenseMasterDto>(`/License/${compId}/${code}/transfer`, {
      ...payload,
      userName: currentUserName(),
    });
    return data;
  },

  remove: async (compId: string, code: string): Promise<void> => {
    await apiClient.delete(`/License/${compId}/${code}`, { params: { user: currentUserName() } });
  },

  validate: async (compId: string, deviceId?: string): Promise<ValidateLicenseResponseDto> => {
    const { data } = await apiClient.post<ValidateLicenseResponseDto>("/License/validate", {
      compID: compId,
      deviceID: deviceId,
    });
    return data;
  },

  history: async (compId: string, code: string): Promise<LicenseHistoryEntryDto[]> => {
    const { data } = await apiClient.get<LicenseHistoryEntryDto[]>(`/License/${compId}/${code}/history`);
    return data;
  },

  activations: async (compId: string, code: string): Promise<LicenseActivationDto[]> => {
    const { data } = await apiClient.get<LicenseActivationDto[]>(`/License/${compId}/${code}/activations`);
    return data;
  },

  dashboardStats: async (params?: { compId?: string; resellerCode?: string }): Promise<LicenseDashboardStatsDto> => {
    const { data } = await apiClient.get<LicenseDashboardStatsDto>("/License/dashboard-stats", {
      params: { compId: params?.compId, resellerCode: params?.resellerCode },
    });
    return data;
  },
};
