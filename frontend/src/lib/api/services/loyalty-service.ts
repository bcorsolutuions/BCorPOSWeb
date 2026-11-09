import { apiClient } from "../axios-client";
import type {
  LoyaltyAdjustmentRequestDto,
  LoyaltyAdjustmentResultDto,
  LoyaltyCalculateRequestDto,
  LoyaltyCalculateResultDto,
  LoyaltyEnrollResultDto,
  LoyaltyLedgerDto,
  LoyaltyLookupResultDto,
  LoyaltyQuickRegisterResultDto,
  LoyaltyRedeemValidateRequestDto,
  LoyaltyRedeemValidateResultDto,
  LoyaltySiteSettingsDto,
} from "@/types/loyalty";

// BCorDFWebApi's LoyaltyController — staff-only. The actual EARN/REDEEM
// posting is never called from here (spec §52/RULE 3) — that only ever
// happens server-side, inside PosController's own hooks, when a sale saves.
export const loyaltyService = {
  lookup: async (
    compId: string,
    params: { customerCode?: string; mobile?: string; loyaltyNo?: string },
  ): Promise<LoyaltyLookupResultDto> => {
    const { data } = await apiClient.get<LoyaltyLookupResultDto>(`/Loyalty/${compId}/lookup`, { params });
    return data;
  },

  enroll: async (compId: string, siteId: string, customerCode: string, loyaltyCode: string, userName: string): Promise<LoyaltyEnrollResultDto> => {
    const { data } = await apiClient.post<LoyaltyEnrollResultDto>(
      `/Loyalty/${compId}/${siteId}/enroll`,
      { customerCode, loyaltyCode },
      { params: { userName } },
    );
    return data;
  },

  calculate: async (compId: string, siteId: string, request: LoyaltyCalculateRequestDto): Promise<LoyaltyCalculateResultDto> => {
    const { data } = await apiClient.post<LoyaltyCalculateResultDto>(`/Loyalty/${compId}/${siteId}/calculate`, request);
    return data;
  },

  validateRedemption: async (compId: string, siteId: string, request: LoyaltyRedeemValidateRequestDto): Promise<LoyaltyRedeemValidateResultDto> => {
    const { data } = await apiClient.post<LoyaltyRedeemValidateResultDto>(`/Loyalty/${compId}/${siteId}/redeem/validate`, request);
    return data;
  },

  adjust: async (compId: string, siteId: string, userName: string, request: LoyaltyAdjustmentRequestDto): Promise<LoyaltyAdjustmentResultDto> => {
    const { data } = await apiClient.post<LoyaltyAdjustmentResultDto>(
      `/Loyalty/${compId}/${siteId}/adjustment`,
      request,
      { params: { userName } },
    );
    return data;
  },

  getHistory: async (
    compId: string,
    loyaltyNo: string,
    params?: { fromDate?: string; toDate?: string; transType?: string },
  ): Promise<LoyaltyLedgerDto[]> => {
    const { data } = await apiClient.get<LoyaltyLedgerDto[]>(`/Loyalty/${compId}/account/${loyaltyNo}/history`, { params });
    return data;
  },

  // POS "no customer selected, loyalty is enabled" prompt — asks for a
  // phone number (and, only for a brand-new customer, name + Local ID).
  // Registers (or reuses, by mobile) a CustomerMaster row and enrolls it in
  // one call; see PosController's own "never trust the frontend" stance —
  // the customer/loyalty records this creates are still the backend's own
  // authoritative CustomerMaster/CustomerLoyaltyAccount rows, and the
  // backend itself requires name + localId when it actually has to create a
  // new customer, not just the frontend's disabled-field UI.
  quickRegister: async (
    compId: string,
    siteId: string,
    userName: string,
    mobile: string,
    customerName?: string,
    localId?: string,
  ): Promise<LoyaltyQuickRegisterResultDto> => {
    const { data } = await apiClient.post<LoyaltyQuickRegisterResultDto>(
      `/Loyalty/${compId}/${siteId}/quick-register`,
      { mobile, customerName, localId },
      { params: { userName } },
    );
    return data;
  },
};

export const loyaltySiteSettingsService = {
  getOrDefaultBySite: async (compId: string, siteId: string): Promise<LoyaltySiteSettingsDto> => {
    const { data } = await apiClient.get<LoyaltySiteSettingsDto>(`/LoyaltySiteSettings/${compId}/site/${siteId}`);
    return data;
  },
};
