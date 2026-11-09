"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { posLookupService } from "@/lib/api/services/pos-lookup-service";
import { customerCategoryService } from "@/lib/api/services/customer-category-service";
import { useAuthStore } from "@/stores/auth-store";
import { PROMOTION_TYPES, type PromotionFormValues } from "@/schemas/salon-master.schema";
import type { FieldConfig } from "@/components/shared/entity-form-field";

/**
 * The PromotionMaster form's field list — lifted out of the admin page so
 * both the list page's edit dialog (masters CrudDataGridPage) and the
 * standalone create page (/promotions/new) render the exact same fields
 * from one source, rather than two copies that could drift.
 */
export function usePromotionFields(): FieldConfig<PromotionFormValues>[] {
  const compId = useAuthStore((s) => s.user?.compId ?? "");

  const { data: sites = [] } = useQuery({
    queryKey: ["promotion-master-sites", compId],
    queryFn: () => posLookupService.getSites(compId),
    enabled: !!compId,
  });

  const { data: customerCategories = [] } = useQuery({
    queryKey: ["promotion-master-customer-categories", compId],
    queryFn: () => customerCategoryService.getCategories(compId),
    enabled: !!compId,
  });

  return useMemo(
    () => [
      { name: "code", labelKey: "common.code", type: "text" },
      { name: "promotionName", labelKey: "salon.promotionName", type: "text" },
      { name: "promotionNameArb", labelKey: "common.nameAr", type: "text" },
      {
        name: "siteId",
        labelKey: "common.branch",
        type: "select",
        options: sites.map((s) => ({ value: s.siteID, label: s.siteName })),
      },
      {
        name: "promotionType",
        labelKey: "salon.promotionType",
        type: "select",
        options: PROMOTION_TYPES.map((t) => ({ value: t, label: t })),
      },
      { name: "validFrom", labelKey: "salon.validFrom", type: "date" },
      { name: "validTo", labelKey: "salon.validTo", type: "date" },
      { name: "startTime", labelKey: "salon.startTime", type: "text" },
      { name: "endTime", labelKey: "salon.endTime", type: "text" },
      { name: "minimumBillAmount", labelKey: "salon.minimumBillAmount", type: "money" },
      { name: "minimumQty", labelKey: "salon.minimumQty", type: "number" },
      { name: "discountPercent", labelKey: "salon.discountPercent", type: "number" },
      { name: "discountAmount", labelKey: "salon.discountAmount", type: "money" },
      { name: "maximumDiscountAmount", labelKey: "salon.maximumDiscountAmount", type: "money" },
      { name: "buyQty", labelKey: "salon.buyQty", type: "number" },
      { name: "getQty", labelKey: "salon.getQty", type: "number" },
      { name: "freeItemCode", labelKey: "salon.freeItemCode", type: "text" },
      {
        name: "customerCategoryCode",
        labelKey: "salon.customerCategory",
        type: "select",
        options: customerCategories.map((c) => ({ value: c.code, label: c.custCatName })),
      },
      { name: "priorityNo", labelKey: "salon.priorityNo", type: "number" },
      { name: "allowWithOtherPromo", labelKey: "salon.allowWithOtherPromo", type: "checkbox" },
      { name: "autoApply", labelKey: "salon.autoApply", type: "checkbox" },
      { name: "couponRequired", labelKey: "salon.couponRequired", type: "checkbox" },
      { name: "couponCode", labelKey: "salon.couponCode", type: "text" },
      { name: "remarks", labelKey: "common.remarks", type: "text" },
      { name: "active", labelKey: "common.active", type: "checkbox" },
    ],
    [sites, customerCategories],
  );
}
