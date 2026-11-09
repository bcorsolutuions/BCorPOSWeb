import { apiClient } from "../axios-client";
import { useAuthStore } from "@/stores/auth-store";
import type { LoyaltyDto } from "@/types/salon";
import type { LoyaltyFormValues } from "@/schemas/salon-master.schema";

// Real BCorDFWebApi LoyaltyMasterController — a pre-existing, much richer
// master than this screen's minimal form exposes (see types/salon.ts's
// LoyaltyDto for the full field list: enrollment fee, redeem limits, point
// expiry, tier linkage, etc.). withDefaults() below fills every NOT-NULL
// backend field this screen doesn't ask for with a safe technical default,
// same pattern purchase-service.ts uses for PurchaseInvoiceHdr/Det.
export interface Loyalty extends LoyaltyDto {
  id: string;
}

function toLoyalty(dto: LoyaltyDto): Loyalty {
  return { ...dto, id: dto.code };
}

function withDefaults(payload: LoyaltyFormValues) {
  return {
    loyaltyName: payload.loyaltyName,
    loyaltyNameArb: payload.loyaltyNameArb || null,
    description: null,
    enrollmentFee: 0,
    minimumSpend: 0,
    pointsCalculationType: payload.pointsCalculationType,
    spendAmount: payload.spendAmount,
    earnPoints: payload.earnPoints,
    redeemPoints: payload.redeemPoints,
    redeemValue: payload.redeemValue,
    minimumRedeemPoints: payload.minimumRedeemPoints,
    maximumRedeemPoints: payload.maximumRedeemPoints ?? null,
    maximumRedeemPercent: payload.maximumRedeemPercent ?? null,
    pointExpiryDays: payload.pointExpiryDays ?? null,
    membershipValidityDays: null,
    tierCode: null,
    allowNegativePoints: payload.allowNegativePoints,
    allowPartialRedeem: payload.allowPartialRedeem,
    autoEnrollCustomer: payload.autoEnrollCustomer,
    mobileNoRequired: false,
    emailRequired: false,
    validFrom: null,
    validTo: null,
    remarks: payload.remarks || null,
    earningBasis: payload.earningBasis,
    pointRoundingMethod: payload.pointRoundingMethod,
    companyWideLoyalty: payload.companyWideLoyalty,
    earnPointsOnRedeemedAmount: payload.earnPointsOnRedeemedAmount,
    allowPointsOnDiscountedItems: payload.allowPointsOnDiscountedItems,
    allowPointsOnPromotionalItems: payload.allowPointsOnPromotionalItems,
  };
}

export const loyaltyMasterService = {
  list: async (): Promise<{ items: Loyalty[]; total: number }> => {
    const compId = useAuthStore.getState().user?.compId ?? "";
    const { data } = await apiClient.get<LoyaltyDto[]>(`/LoyaltyMaster/${compId}`);
    const items = data.map(toLoyalty);
    return { items, total: items.length };
  },

  create: async (payload: LoyaltyFormValues): Promise<Loyalty> => {
    const user = useAuthStore.getState().user;
    const compId = user?.compId ?? "";
    const { data } = await apiClient.post<LoyaltyDto>(
      "/LoyaltyMaster",
      {
        code: payload.code,
        compID: compId,
        siteID: payload.siteId,
        active: payload.active,
        lastModifiedBy: user?.userName ?? "",
        ...withDefaults(payload),
      },
      { headers: { CompID: compId } },
    );
    return toLoyalty(data);
  },

  update: async (code: string, payload: LoyaltyFormValues): Promise<Loyalty> => {
    const user = useAuthStore.getState().user;
    const compId = user?.compId ?? "";
    const { data } = await apiClient.put<LoyaltyDto>(
      `/LoyaltyMaster/${code}`,
      {
        active: payload.active,
        lastModifiedBy: user?.userName ?? "",
        ...withDefaults(payload),
      },
      { headers: { CompID: compId } },
    );
    return toLoyalty(data);
  },

  remove: async (code: string): Promise<void> => {
    const compId = useAuthStore.getState().user?.compId ?? "";
    const userName = useAuthStore.getState().user?.userName ?? "";
    await apiClient.delete(`/LoyaltyMaster/${compId}/${code}`, { params: { user: userName } });
  },
};
