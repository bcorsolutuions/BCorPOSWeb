// Mirrors BCorDFWebApi's real ServiceMasterDto / StaffMasterDto
// (Dto/Masters/ServiceMasterDto.cs, StaffMasterDto.cs).

export interface ServiceDto {
  code: string;
  compID: string;
  siteID: string;
  active: boolean;
  lastModifiedBy: string;
  lastModifiedOn?: string | null;

  serviceName: string;
  serviceNameArb?: string | null;
  categoryCode?: string | null;
  rate: number;
  durationMinutes?: number | null;
  taxCode?: string | null;
  taxPercentage?: number | null;
  imagePath?: string | null;
  displayOrder: number;
  remarks?: string | null;
}

export interface StaffDto {
  code: string;
  compID: string;
  siteID: string;
  active: boolean;
  lastModifiedBy: string;
  lastModifiedOn?: string | null;

  staffName: string;
  staffNameArb?: string | null;
  commissionPercent?: number | null;
  phone?: string | null;
  imagePath?: string | null;
  remarks?: string | null;
}

// Mirrors BCorDFWebApi's real PromotionMasterDto (Dto/Masters/PromotionMasterDto.cs)
// — a pre-existing, much richer master (buy-X-get-Y, coupon codes, price
// levels, etc.) than this screen exposes. Only a minimal subset (name,
// type, discount, validity window) is user-editable here per this pass's
// scope; every other field gets a safe technical default in
// promotion-master-service.ts, same padding pattern purchase-service.ts
// already uses for PurchaseInvoiceHdr/Det's own NOT-NULL backend columns.
export interface PromotionDto {
  id?: string;
  code: string;
  compID: string;
  siteID: string;
  active: boolean;
  lastModifiedBy: string;
  lastModifiedOn?: string | null;

  promotionName: string;
  promotionNameArb?: string | null;
  promotionType: string;
  description?: string | null;
  descriptionArb?: string | null;
  validFrom: string;
  validTo: string;
  startTime?: string | null;
  endTime?: string | null;
  applicableDays?: string | null;
  minimumBillAmount: number;
  maximumBillAmount?: number | null;
  minimumQty: number;
  maximumQty?: number | null;
  discountPercent?: number | null;
  discountAmount?: number | null;
  maximumDiscountAmount?: number | null;
  buyQty?: number | null;
  getQty?: number | null;
  freeItemCode?: string | null;
  promoPrice?: number | null;
  customerCategoryCode?: string | null;
  priceLevelCode?: string | null;
  paymentModeCode?: string | null;
  orderTypeCode?: string | null;
  diningTypeCode?: string | null;
  priorityNo: number;
  allowMultipleUse: boolean;
  allowWithOtherPromo: boolean;
  couponRequired: boolean;
  couponCode?: string | null;
  autoApply: boolean;
  approvalRequired: boolean;
  remarks?: string | null;
  details: PromotionDetailDto[];
}

// Promotion targeting row — generic multi-row list (ITEM/ITEM_CATEGORY/
// BRAND/CUSTOMER_CATEGORY/PAYMENT_MODE + a code), not five nullable columns.
// A promotion with zero rows applies bill-/every-line-wide (VIP %, Happy Hour).
export type PromotionTargetType = "ITEM" | "ITEM_CATEGORY" | "BRAND" | "CUSTOMER_CATEGORY" | "PAYMENT_MODE";

export interface PromotionDetailDto {
  id?: string | null;
  targetType: PromotionTargetType;
  targetCode: string;
  isExclude: boolean;
}

// Mirrors BCorDFWebApi's real LoyaltyMasterDto (Dto/Masters/LoyaltyMasterDto.cs)
// — same "pre-existing, richer than this screen exposes" situation as
// PromotionDto above; loyalty-master-service.ts pads the rest.
export interface LoyaltyDto {
  id?: string;
  code: string;
  compID: string;
  siteID: string;
  active: boolean;
  lastModifiedBy: string;
  lastModifiedOn?: string | null;

  loyaltyName: string;
  loyaltyNameArb?: string | null;
  description?: string | null;
  enrollmentFee: number;
  minimumSpend: number;
  pointsCalculationType: string;
  spendAmount: number;
  earnPoints: number;
  redeemPoints: number;
  redeemValue: number;
  minimumRedeemPoints: number;
  maximumRedeemPoints?: number | null;
  maximumRedeemPercent?: number | null;
  pointExpiryDays?: number | null;
  membershipValidityDays?: number | null;
  tierCode?: string | null;
  allowNegativePoints: boolean;
  allowPartialRedeem: boolean;
  autoEnrollCustomer: boolean;
  mobileNoRequired: boolean;
  emailRequired: boolean;
  validFrom?: string | null;
  validTo?: string | null;
  remarks?: string | null;

  earningBasis: string;
  pointRoundingMethod: string;
  companyWideLoyalty: boolean;
  earnPointsOnRedeemedAmount: boolean;
  allowPointsOnDiscountedItems: boolean;
  allowPointsOnPromotionalItems: boolean;
}

// Mirrors BCorDFWebApi's real MembershipTierMasterDto — new, minimal (this
// one has no hidden extra fields; every field is exposed on the screen).
export interface MembershipTierDto {
  code: string;
  compID: string;
  siteID: string;
  active: boolean;
  lastModifiedBy: string;
  lastModifiedOn?: string | null;

  tierName: string;
  tierNameArb?: string | null;
  minSpend: number;
  discountPercent?: number | null;
  remarks?: string | null;
}
