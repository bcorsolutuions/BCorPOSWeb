import { z } from "zod";
import { COUPON_TYPES, COUPON_TARGET_TYPES } from "@/types/coupon";

// One coupon targeting row (ITEM/ITEM_CATEGORY/BRAND/SITE + a code). Zero
// rows of a given type means unrestricted on that axis — see
// types/coupon.ts's CouponTargetType doc comment.
export const couponDetailRowSchema = z.object({
  id: z.string().optional(),
  targetType: z.enum(COUPON_TARGET_TYPES),
  targetCode: z.string().min(1, "validation.required"),
  isExclude: z.boolean().default(false),
});
export type CouponDetailRowFormValues = z.infer<typeof couponDetailRowSchema>;

// Real CouponMaster form — backs masters/coupons/page.tsx against
// BCorDFWebApi's actual CouponMasterController (see types/coupon.ts's
// CouponMasterDto for the full field list this mirrors). No `siteId` field
// — CouponMaster.SiteID is framework plumbing only, hardcoded to "ALL" by
// coupon-master-service.ts (Design Decision A).
export const couponSchema = z.object({
  code: z.string().min(1, "validation.required"),
  couponName: z.string().min(1, "validation.required"),
  couponType: z.enum(COUPON_TYPES),
  validFrom: z.string().min(1, "validation.required"),
  validTo: z.string().min(1, "validation.required"),
  startTime: z.string().optional(),
  endTime: z.string().optional(),
  minimumBillAmount: z.coerce.number().min(0, "validation.mustBeZeroOrMore").default(0),
  discountPercentage: z.coerce.number().min(0, "validation.mustBeZeroOrMore").optional(),
  discountAmount: z.coerce.number().min(0, "validation.mustBeZeroOrMore").optional(),
  maximumDiscountAmount: z.coerce.number().min(0, "validation.mustBeZeroOrMore").optional(),
  applicableBusinessType: z.string().optional(),
  customerCode: z.string().optional(),
  customerCategoryCode: z.string().optional(),
  usageLimit: z.coerce.number().min(0, "validation.mustBeZeroOrMore").default(0),
  usageLimitPerCustomer: z.coerce.number().min(0, "validation.mustBeZeroOrMore").default(0),
  oneTimeUse: z.boolean().default(false),
  allowWithPromotion: z.boolean().default(false),
  active: z.boolean().default(true),
  details: z.array(couponDetailRowSchema).default([]),
});
export type CouponFormValues = z.infer<typeof couponSchema>;
