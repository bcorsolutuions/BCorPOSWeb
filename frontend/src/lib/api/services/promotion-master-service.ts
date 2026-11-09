import { apiClient } from "../axios-client";
import { useAuthStore } from "@/stores/auth-store";
import type { PromotionDto } from "@/types/salon";
import type { PromotionFormValues } from "@/schemas/salon-master.schema";

// Real BCorDFWebApi PromotionMasterController — now fully exposed by this
// form (see schemas/salon-master.schema.ts's promotionSchema). `details`
// targets the promotion at specific items/categories/brands/customer
// categories/payment modes (PromotionDetail.cs); an empty array applies
// bill-/every-line-wide.
export interface Promotion extends PromotionDto {
  id: string;
}

function toPromotion(dto: PromotionDto): Promotion {
  return { ...dto, id: dto.code };
}

// TimeOnly on the backend round-trips as "HH:mm:ss" (confirmed live against
// /api/PromotionMaster) — the form only collects "HH:mm", so pad/trim here.
function toWireTime(value: string | undefined | null): string | null {
  if (!value) return null;
  return value.length === 5 ? `${value}:00` : value;
}
function fromWireTime(value: string | undefined | null): string {
  if (!value) return "";
  return value.slice(0, 5);
}

function withDefaults(payload: PromotionFormValues) {
  return {
    promotionName: payload.promotionName,
    promotionNameArb: payload.promotionNameArb || null,
    promotionType: payload.promotionType,
    description: null,
    descriptionArb: null,
    validFrom: payload.validFrom,
    validTo: payload.validTo,
    startTime: toWireTime(payload.startTime),
    endTime: toWireTime(payload.endTime),
    applicableDays: null,
    minimumBillAmount: payload.minimumBillAmount ?? 0,
    maximumBillAmount: null,
    minimumQty: payload.minimumQty ?? 0,
    maximumQty: null,
    discountPercent: payload.discountPercent ?? null,
    discountAmount: payload.discountAmount ?? null,
    maximumDiscountAmount: payload.maximumDiscountAmount ?? null,
    buyQty: payload.buyQty ?? null,
    getQty: payload.getQty ?? null,
    freeItemCode: payload.freeItemCode || null,
    promoPrice: null,
    customerCategoryCode: payload.customerCategoryCode || null,
    priceLevelCode: null,
    paymentModeCode: null,
    orderTypeCode: null,
    diningTypeCode: null,
    priorityNo: payload.priorityNo ?? 0,
    allowMultipleUse: false,
    allowWithOtherPromo: payload.allowWithOtherPromo ?? false,
    couponRequired: payload.couponRequired ?? false,
    couponCode: payload.couponCode || null,
    autoApply: payload.autoApply ?? false,
    approvalRequired: false,
    remarks: payload.remarks || null,
    // `id` present → the backend's detail-sync updates that existing row;
    // absent (a row just added in the UI) → it inserts a new one. Any
    // existing row left out of this array gets deleted — see
    // MasterDetailCollectionHandler.SyncForUpdate (same convention as
    // item-master-service.ts's uoMs).
    details: (payload.details ?? []).map((d) => ({
      id: d.id || undefined,
      targetType: d.targetType,
      targetCode: d.targetCode,
      isExclude: d.isExclude ?? false,
    })),
  };
}

export const promotionMasterService = {
  list: async (): Promise<{ items: Promotion[]; total: number }> => {
    const compId = useAuthStore.getState().user?.compId ?? "";
    const { data } = await apiClient.get<PromotionDto[]>(`/PromotionMaster/${compId}`);
    const items = data.map(toPromotion);
    return { items, total: items.length };
  },

  create: async (payload: PromotionFormValues): Promise<Promotion> => {
    const user = useAuthStore.getState().user;
    const compId = user?.compId ?? "";
    const { data } = await apiClient.post<PromotionDto>(
      "/PromotionMaster",
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
    return toPromotion(data);
  },

  update: async (code: string, payload: PromotionFormValues): Promise<Promotion> => {
    const user = useAuthStore.getState().user;
    const compId = user?.compId ?? "";
    const { data } = await apiClient.put<PromotionDto>(
      `/PromotionMaster/${code}`,
      {
        active: payload.active,
        lastModifiedBy: user?.userName ?? "",
        ...withDefaults(payload),
      },
      { headers: { CompID: compId } },
    );
    return toPromotion(data);
  },

  remove: async (code: string): Promise<void> => {
    const compId = useAuthStore.getState().user?.compId ?? "";
    const userName = useAuthStore.getState().user?.userName ?? "";
    await apiClient.delete(`/PromotionMaster/${compId}/${code}`, { params: { user: userName } });
  },
};

export { fromWireTime };
