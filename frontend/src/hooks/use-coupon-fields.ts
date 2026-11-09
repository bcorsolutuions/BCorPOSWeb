"use client";

import { useMemo } from "react";
import { COUPON_TYPES } from "@/types/coupon";
import type { CouponFormValues } from "@/schemas/coupon-master.schema";
import type { FieldConfig } from "@/components/shared/entity-form-field";

/**
 * The CouponMaster form's field list — lifted out of the admin page so both
 * the list page's edit dialog and the standalone create page (/coupons/new)
 * render the exact same fields from one source. No live lookups needed
 * (unlike Promotion/Combo) — kept as a hook anyway for a uniform call shape
 * across all three screens.
 */
export function useCouponFields(): FieldConfig<CouponFormValues>[] {
  return useMemo(
    () => [
      { name: "code", labelKey: "common.code", type: "text" },
      { name: "couponName", labelKey: "coupon.couponName", type: "text" },
      {
        name: "couponType",
        labelKey: "coupon.couponType",
        type: "select",
        options: COUPON_TYPES.map((t) => ({ value: t, label: t })),
      },
      { name: "validFrom", labelKey: "coupon.validFrom", type: "date" },
      { name: "validTo", labelKey: "coupon.validTo", type: "date" },
      { name: "startTime", labelKey: "coupon.startTime", type: "text" },
      { name: "endTime", labelKey: "coupon.endTime", type: "text" },
      { name: "minimumBillAmount", labelKey: "coupon.minimumBillAmount", type: "money" },
      { name: "discountPercentage", labelKey: "coupon.discountPercentage", type: "number" },
      { name: "discountAmount", labelKey: "coupon.discountAmount", type: "money" },
      { name: "maximumDiscountAmount", labelKey: "coupon.maximumDiscountAmount", type: "money" },
      { name: "applicableBusinessType", labelKey: "coupon.applicableBusinessType", type: "text" },
      { name: "customerCode", labelKey: "coupon.customerCode", type: "text" },
      { name: "customerCategoryCode", labelKey: "coupon.customerCategoryCode", type: "text" },
      { name: "usageLimit", labelKey: "coupon.usageLimit", type: "number" },
      { name: "usageLimitPerCustomer", labelKey: "coupon.usageLimitPerCustomer", type: "number" },
      { name: "oneTimeUse", labelKey: "coupon.oneTimeUse", type: "checkbox" },
      { name: "allowWithPromotion", labelKey: "coupon.allowWithPromotion", type: "checkbox" },
      { name: "active", labelKey: "common.active", type: "checkbox" },
    ],
    [],
  );
}
