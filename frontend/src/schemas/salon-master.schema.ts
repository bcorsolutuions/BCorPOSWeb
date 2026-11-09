import { z } from "zod";

export const serviceSchema = z.object({
  code: z.string().min(1, "validation.required"),
  siteId: z.string().min(1, "validation.required"),
  serviceName: z.string().min(1, "validation.required"),
  serviceNameArb: z.string().optional(),
  categoryCode: z.string().optional(),
  rate: z.coerce.number().min(0, "validation.mustBeZeroOrMore").default(0),
  durationMinutes: z.coerce.number().min(0, "validation.mustBeZeroOrMore").optional(),
  taxCode: z.string().optional(),
  taxPercentage: z.coerce.number().min(0, "validation.mustBeZeroOrMore").optional(),
  displayOrder: z.coerce.number().min(0, "validation.mustBeZeroOrMore").default(0),
  remarks: z.string().optional(),
  active: z.boolean().default(true),
});
export type ServiceFormValues = z.infer<typeof serviceSchema>;

export const staffSchema = z.object({
  code: z.string().min(1, "validation.required"),
  siteId: z.string().min(1, "validation.required"),
  staffName: z.string().min(1, "validation.required"),
  staffNameArb: z.string().optional(),
  commissionPercent: z.coerce.number().min(0, "validation.mustBeZeroOrMore").optional(),
  phone: z.string().optional(),
  remarks: z.string().optional(),
  active: z.boolean().default(true),
});
export type StaffFormValues = z.infer<typeof staffSchema>;

// The 8 types the Promotion Engine evaluates (Service/Documents/
// PromotionEngineService.cs's LineScopedTypes/BillScopedTypes) — a fixed
// enum, unlike the free-text field this replaced, since the engine branches
// on these exact string values.
export const PROMOTION_TYPES = [
  "PERCENTAGE",
  "FIXED_AMOUNT",
  "BUY_X_GET_Y",
  "ITEM_DISCOUNT",
  "CATEGORY_DISCOUNT",
  "BILL_DISCOUNT",
  "FREE_ITEM",
  "HAPPY_HOUR",
] as const;
export type PromotionType = (typeof PROMOTION_TYPES)[number];

// One targeting row (ITEM/ITEM_CATEGORY/BRAND/CUSTOMER_CATEGORY/PAYMENT_MODE
// + a code) on a PromotionMaster — see PromotionDetail.cs. No rows at all
// means the promotion applies bill-/every-line-wide (VIP %, Happy Hour).
export const PROMOTION_TARGET_TYPES = ["ITEM", "ITEM_CATEGORY", "BRAND", "CUSTOMER_CATEGORY", "PAYMENT_MODE"] as const;
export type PromotionTargetType = (typeof PROMOTION_TARGET_TYPES)[number];

export const promotionDetailRowSchema = z.object({
  id: z.string().optional(),
  targetType: z.enum(PROMOTION_TARGET_TYPES),
  targetCode: z.string().min(1, "validation.required"),
  isExclude: z.boolean().default(false),
});
export type PromotionDetailFormValues = z.infer<typeof promotionDetailRowSchema>;

// Real PromotionMaster form — backs masters/promotions/page.tsx against
// BCorDFWebApi's actual PromotionMasterController (see types/salon.ts's
// PromotionDto for the full field list this now mirrors).
export const promotionSchema = z.object({
  code: z.string().min(1, "validation.required"),
  siteId: z.string().min(1, "validation.required"),
  promotionName: z.string().min(1, "validation.required"),
  promotionNameArb: z.string().optional(),
  promotionType: z.enum(PROMOTION_TYPES),
  validFrom: z.string().min(1, "validation.required"),
  validTo: z.string().min(1, "validation.required"),
  // Plain "HH:mm" text — no dedicated time FieldConfig exists yet, matching
  // this form's existing minimal-field-type convention.
  startTime: z.string().optional(),
  endTime: z.string().optional(),
  minimumBillAmount: z.coerce.number().min(0, "validation.mustBeZeroOrMore").default(0),
  minimumQty: z.coerce.number().min(0, "validation.mustBeZeroOrMore").default(0),
  discountPercent: z.coerce.number().min(0, "validation.mustBeZeroOrMore").optional(),
  discountAmount: z.coerce.number().min(0, "validation.mustBeZeroOrMore").optional(),
  maximumDiscountAmount: z.coerce.number().min(0, "validation.mustBeZeroOrMore").optional(),
  buyQty: z.coerce.number().min(0, "validation.mustBeZeroOrMore").optional(),
  getQty: z.coerce.number().min(0, "validation.mustBeZeroOrMore").optional(),
  freeItemCode: z.string().optional(),
  customerCategoryCode: z.string().optional(),
  priorityNo: z.coerce.number().min(0, "validation.mustBeZeroOrMore").default(0),
  allowWithOtherPromo: z.boolean().default(false),
  autoApply: z.boolean().default(false),
  couponRequired: z.boolean().default(false),
  couponCode: z.string().optional(),
  remarks: z.string().optional(),
  active: z.boolean().default(true),
  details: z.array(promotionDetailRowSchema).default([]),
});
export type PromotionFormValues = z.infer<typeof promotionSchema>;

// Minimal editable subset of the real (much richer) LoyaltyMaster — see
// types/salon.ts's LoyaltyDto comment.
export const loyaltySchema = z.object({
  code: z.string().min(1, "validation.required"),
  siteId: z.string().min(1, "validation.required"),
  loyaltyName: z.string().min(1, "validation.required"),
  loyaltyNameArb: z.string().optional(),
  pointsCalculationType: z.string().min(1, "validation.required"),
  spendAmount: z.coerce.number().min(0, "validation.mustBeZeroOrMore"),
  earnPoints: z.coerce.number().min(0, "validation.mustBeZeroOrMore"),
  redeemPoints: z.coerce.number().min(0, "validation.mustBeZeroOrMore").default(1),
  redeemValue: z.coerce.number().min(0, "validation.mustBeZeroOrMore"),
  minimumRedeemPoints: z.coerce.number().min(0, "validation.mustBeZeroOrMore").default(0),
  maximumRedeemPoints: z.coerce.number().min(0, "validation.mustBeZeroOrMore").optional(),
  maximumRedeemPercent: z.coerce.number().min(0, "validation.mustBeZeroOrMore").max(100).optional(),
  pointExpiryDays: z.coerce.number().min(0, "validation.mustBeZeroOrMore").optional(),
  allowNegativePoints: z.boolean().default(false),
  allowPartialRedeem: z.boolean().default(true),
  autoEnrollCustomer: z.boolean().default(false),
  earningBasis: z.string().default("AFTER_ALL_DISCOUNT"),
  pointRoundingMethod: z.string().default("ROUND"),
  companyWideLoyalty: z.boolean().default(true),
  earnPointsOnRedeemedAmount: z.boolean().default(false),
  allowPointsOnDiscountedItems: z.boolean().default(true),
  allowPointsOnPromotionalItems: z.boolean().default(true),
  remarks: z.string().optional(),
  active: z.boolean().default(true),
});
export type LoyaltyFormValues = z.infer<typeof loyaltySchema>;

export const membershipTierSchema = z.object({
  code: z.string().min(1, "validation.required"),
  siteId: z.string().min(1, "validation.required"),
  tierName: z.string().min(1, "validation.required"),
  tierNameArb: z.string().optional(),
  minSpend: z.coerce.number().min(0, "validation.mustBeZeroOrMore").default(0),
  discountPercent: z.coerce.number().min(0, "validation.mustBeZeroOrMore").optional(),
  remarks: z.string().optional(),
  active: z.boolean().default(true),
});
export type MembershipTierFormValues = z.infer<typeof membershipTierSchema>;
