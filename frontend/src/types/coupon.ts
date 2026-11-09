// Wire-format types for BCorDFWebApi's CouponMaster/CouponDetail/CouponUsage
// (see D:\Works\BCorApi\PowerDFWebApi\Dto\Masters\CouponMasterDto.cs and
// Dto\Documents\CouponEngineDto.cs) — camelCase, same convention as
// types/pos.ts and types/combo.ts.
//
// A genuinely separate mechanism from PromotionMaster's own CouponRequired/
// CouponCode gate (types/salon.ts's PromotionDto) — that one just turns ON a
// single promotion. This is its own standalone catalog with its own
// targeting, usage tracking, and admin screen. See
// lib/api/services/coupon-service.ts's doc comment.

export const COUPON_TYPES = ["PERCENTAGE", "FIXED_AMOUNT", "FREE_ITEM", "CATEGORY_DISCOUNT", "ITEM_DISCOUNT"] as const;
export type CouponType = (typeof COUPON_TYPES)[number];

// CouponDetail's generic TargetType — same ITEM/ITEM_CATEGORY/BRAND pattern
// PromotionDetail uses, plus SITE (new here: CouponMaster's header carries no
// site field at all, so site restriction is 100% SITE-typed detail rows —
// zero rows = valid at every site).
export const COUPON_TARGET_TYPES = ["ITEM", "ITEM_CATEGORY", "BRAND", "SITE"] as const;
export type CouponTargetType = (typeof COUPON_TARGET_TYPES)[number];

export interface CouponDetailDto {
  id: string;
  masterID: string;
  rowID: number;
  targetType: CouponTargetType;
  targetCode: string;
  isExclude: boolean;
}

export interface CouponMasterDto {
  code: string; // → CouponCode
  compID: string;
  // Always "ALL" — framework plumbing only (IMasterEntity requires a
  // SiteID), never shown on the admin form, never consulted for
  // eligibility. Real site restriction lives on SITE-typed details above.
  siteID: string;
  active: boolean;
  lastModifiedBy: string;
  lastModifiedOn?: string | null;

  couponName: string;
  couponType: CouponType;
  validFrom: string;
  validTo: string;
  startTime?: string | null;
  endTime?: string | null;
  minimumBillAmount: number;
  discountPercentage?: number | null;
  discountAmount?: number | null;
  maximumDiscountAmount?: number | null;
  applicableBusinessType?: string | null;
  customerCode?: string | null;
  customerCategoryCode?: string | null;
  usageLimit: number;
  usageLimitPerCustomer: number;
  currentUsageCount: number;
  oneTimeUse: boolean;
  allowWithPromotion: boolean;

  details: CouponDetailDto[];
}

export interface CreateCouponDetailDto {
  id?: string;
  targetType: CouponTargetType;
  targetCode: string;
  isExclude: boolean;
}

export interface CreateCouponMasterDto {
  code: string;
  siteID: string;
  active: boolean;
  couponName: string;
  couponType: CouponType;
  validFrom: string;
  validTo: string;
  startTime?: string | null;
  endTime?: string | null;
  minimumBillAmount: number;
  discountPercentage?: number | null;
  discountAmount?: number | null;
  maximumDiscountAmount?: number | null;
  applicableBusinessType?: string | null;
  customerCode?: string | null;
  customerCategoryCode?: string | null;
  usageLimit: number;
  usageLimitPerCustomer: number;
  oneTimeUse: boolean;
  allowWithPromotion: boolean;
  details: CreateCouponDetailDto[];
}

export type UpdateCouponMasterDto = Omit<CreateCouponMasterDto, "code" | "siteID">;

// ── CouponEngine (Service/Documents/CouponService.cs) ───────────────────

// Reuses the same line shape as promotion-engine.ts's PromotionEvalLine —
// the backend's CouponValidationRequestDto literally reuses
// PromotionEvalLineDto rather than inventing a parallel type.
export interface CouponEvalLine {
  lineId: string;
  itemCode: string;
  unitCode?: string | null;
  categoryCode?: string | null;
  brandCode?: string | null;
  quantity: number;
  unitPrice: number;
  existingDiscountAmt: number;
}

export interface CouponValidationRequest {
  couponCode: string;
  customerCode?: string | null;
  dateTime: string;
  lines: CouponEvalLine[];
}

export interface CouponValidationResult {
  valid: boolean;
  reason?: string | null;
  couponCode?: string | null;
  couponName?: string | null;
  couponType?: string | null;
  discountAmount: number;
}
