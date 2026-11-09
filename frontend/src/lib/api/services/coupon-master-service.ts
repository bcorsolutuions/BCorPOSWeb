import { apiClient } from "../axios-client";
import { useAuthStore } from "@/stores/auth-store";
import type { CouponMasterDto } from "@/types/coupon";
import type { CouponFormValues } from "@/schemas/coupon-master.schema";

// Real BCorDFWebApi CouponMasterController — full CRUD, same
// MasterServiceWithDetails<...> pattern as PromotionMaster/ComboMaster.
export interface Coupon extends CouponMasterDto {
  id: string;
}

function toCoupon(dto: CouponMasterDto): Coupon {
  return { ...dto, id: dto.code };
}

// TimeOnly on the backend round-trips as "HH:mm:ss" (same convention as
// promotion-master-service.ts) — the form only collects "HH:mm".
function toWireTime(value: string | undefined | null): string | null {
  if (!value) return null;
  return value.length === 5 ? `${value}:00` : value;
}
function fromWireTime(value: string | undefined | null): string {
  if (!value) return "";
  return value.slice(0, 5);
}

function withDefaults(payload: CouponFormValues) {
  return {
    couponName: payload.couponName,
    couponType: payload.couponType,
    validFrom: payload.validFrom,
    validTo: payload.validTo,
    startTime: toWireTime(payload.startTime),
    endTime: toWireTime(payload.endTime),
    minimumBillAmount: payload.minimumBillAmount ?? 0,
    discountPercentage: payload.discountPercentage ?? null,
    discountAmount: payload.discountAmount ?? null,
    maximumDiscountAmount: payload.maximumDiscountAmount ?? null,
    applicableBusinessType: payload.applicableBusinessType || null,
    customerCode: payload.customerCode || null,
    customerCategoryCode: payload.customerCategoryCode || null,
    usageLimit: payload.usageLimit ?? 0,
    usageLimitPerCustomer: payload.usageLimitPerCustomer ?? 0,
    oneTimeUse: payload.oneTimeUse ?? false,
    allowWithPromotion: payload.allowWithPromotion ?? false,
    // `id` present → the backend's detail-sync updates that existing row;
    // absent → it inserts a new one. Same convention as promotion/combo.
    details: (payload.details ?? []).map((d) => ({
      id: d.id || undefined,
      targetType: d.targetType,
      targetCode: d.targetCode,
      isExclude: d.isExclude ?? false,
    })),
  };
}

export const couponMasterService = {
  list: async (): Promise<{ items: Coupon[]; total: number }> => {
    const compId = useAuthStore.getState().user?.compId ?? "";
    const { data } = await apiClient.get<CouponMasterDto[]>(`/CouponMaster/${compId}`);
    const items = data.map(toCoupon);
    return { items, total: items.length };
  },

  create: async (payload: CouponFormValues): Promise<Coupon> => {
    const user = useAuthStore.getState().user;
    const compId = user?.compId ?? "";
    const { data } = await apiClient.post<CouponMasterDto>(
      "/CouponMaster",
      {
        code: payload.code,
        compID: compId,
        // No site field on this form (Design Decision A) — CouponMaster.SiteID
        // is pure framework plumbing, always "ALL". Real site restriction is
        // SITE-typed rows in `details`.
        siteID: "ALL",
        active: payload.active,
        lastModifiedBy: user?.userName ?? "",
        ...withDefaults(payload),
      },
      { headers: { CompID: compId } },
    );
    return toCoupon(data);
  },

  update: async (code: string, payload: CouponFormValues): Promise<Coupon> => {
    const user = useAuthStore.getState().user;
    const compId = user?.compId ?? "";
    const { data } = await apiClient.put<CouponMasterDto>(
      `/CouponMaster/${code}`,
      {
        active: payload.active,
        lastModifiedBy: user?.userName ?? "",
        ...withDefaults(payload),
      },
      { headers: { CompID: compId } },
    );
    return toCoupon(data);
  },

  remove: async (code: string): Promise<void> => {
    const compId = useAuthStore.getState().user?.compId ?? "";
    const userName = useAuthStore.getState().user?.userName ?? "";
    await apiClient.delete(`/CouponMaster/${compId}/${code}`, { params: { user: userName } });
  },
};

export { fromWireTime };
