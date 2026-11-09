"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { CrudDataGridPage } from "@/components/shared/crud-data-grid-page";
import { loyaltyMasterService, type Loyalty } from "@/lib/api/services/loyalty-master-service";
import { posLookupService } from "@/lib/api/services/pos-lookup-service";
import { loyaltySchema, type LoyaltyFormValues } from "@/schemas/salon-master.schema";
import { useAuthStore } from "@/stores/auth-store";
import { PERMISSIONS } from "@/lib/auth/permissions";
import type { FieldConfig } from "@/components/shared/entity-form-field";

const POINTS_CALCULATION_TYPES = ["Fixed", "Percentage"];
const EARNING_BASIS_OPTIONS = ["GROSS_AMOUNT", "AFTER_LINE_DISCOUNT", "AFTER_PROMOTION", "AFTER_ALL_DISCOUNT", "BEFORE_VAT", "AFTER_VAT"];
const ROUNDING_OPTIONS = ["FLOOR", "ROUND", "CEILING", "ALLOW_DECIMAL"];

export default function LoyaltyMasterPage() {
  const compId = useAuthStore((s) => s.user?.compId ?? "");

  const { data: sites = [] } = useQuery({
    queryKey: ["loyalty-master-sites", compId],
    queryFn: () => posLookupService.getSites(compId),
    enabled: !!compId,
  });

  const fields: FieldConfig<LoyaltyFormValues>[] = useMemo(
    () => [
      { name: "code", labelKey: "common.code", type: "text" },
      { name: "loyaltyName", labelKey: "salon.loyaltyName", type: "text" },
      { name: "loyaltyNameArb", labelKey: "common.nameAr", type: "text" },
      {
        name: "siteId",
        labelKey: "common.branch",
        type: "select",
        options: sites.map((s) => ({ value: s.siteID, label: s.siteName })),
      },
      {
        name: "pointsCalculationType",
        labelKey: "salon.pointsCalculationType",
        type: "select",
        options: POINTS_CALCULATION_TYPES.map((t) => ({ value: t, label: t })),
      },
      // Points earned per this many currency units spent.
      { name: "spendAmount", labelKey: "salon.spendAmount", type: "number" },
      { name: "earnPoints", labelKey: "salon.earnPoints", type: "number" },
      { name: "redeemPoints", labelKey: "loyalty.redeemPointsRatio", type: "number" },
      { name: "redeemValue", labelKey: "salon.redeemValue", type: "number" },
      { name: "minimumRedeemPoints", labelKey: "loyalty.minimumRedemption", type: "number" },
      { name: "maximumRedeemPoints", labelKey: "loyalty.maximumRedeemPoints", type: "number" },
      { name: "maximumRedeemPercent", labelKey: "loyalty.maximumRedeemPercent", type: "number" },
      { name: "pointExpiryDays", labelKey: "loyalty.pointExpiryDays", type: "number" },
      {
        name: "earningBasis",
        labelKey: "loyalty.earningBasis",
        type: "select",
        options: EARNING_BASIS_OPTIONS.map((v) => ({ value: v, label: v })),
      },
      {
        name: "pointRoundingMethod",
        labelKey: "loyalty.pointRoundingMethod",
        type: "select",
        options: ROUNDING_OPTIONS.map((v) => ({ value: v, label: v })),
      },
      { name: "companyWideLoyalty", labelKey: "loyalty.companyWideLoyalty", type: "checkbox" },
      { name: "allowNegativePoints", labelKey: "loyalty.allowNegativePoints", type: "checkbox" },
      { name: "allowPartialRedeem", labelKey: "loyalty.allowPartialRedeem", type: "checkbox" },
      { name: "autoEnrollCustomer", labelKey: "loyalty.autoEnrollCustomer", type: "checkbox" },
      { name: "earnPointsOnRedeemedAmount", labelKey: "loyalty.earnPointsOnRedeemedAmount", type: "checkbox" },
      { name: "allowPointsOnDiscountedItems", labelKey: "loyalty.allowPointsOnDiscountedItems", type: "checkbox" },
      { name: "allowPointsOnPromotionalItems", labelKey: "loyalty.allowPointsOnPromotionalItems", type: "checkbox" },
      { name: "remarks", labelKey: "common.remarks", type: "text" },
      { name: "active", labelKey: "common.active", type: "checkbox" },
    ],
    [sites],
  );

  return (
    <CrudDataGridPage<Loyalty, LoyaltyFormValues>
      queryKey="loyalty-master"
      titleKey="salon.loyaltyMaster"
      service={loyaltyMasterService}
      schema={loyaltySchema}
      fields={fields}
      // Was PERMISSIONS.SALON_MANAGE — an intentional correction, not a
      // random side change: Customer Loyalty is ONE central engine shared by
      // every business type (Retail/Restaurant/Salon/Bar), so gating its
      // config behind Salon's own permission contradicted that from the
      // start. See the plan's "Existing tables/code requiring modification".
      permission={PERMISSIONS.LOYALTY_CONFIGURE}
      defaultValues={{
        code: "",
        siteId: "",
        loyaltyName: "",
        loyaltyNameArb: "",
        pointsCalculationType: "Fixed",
        spendAmount: 1,
        earnPoints: 1,
        redeemPoints: 1,
        redeemValue: 1,
        minimumRedeemPoints: 0,
        maximumRedeemPoints: undefined,
        maximumRedeemPercent: undefined,
        pointExpiryDays: undefined,
        allowNegativePoints: false,
        allowPartialRedeem: true,
        autoEnrollCustomer: false,
        earningBasis: "AFTER_ALL_DISCOUNT",
        pointRoundingMethod: "ROUND",
        companyWideLoyalty: true,
        earnPointsOnRedeemedAmount: false,
        allowPointsOnDiscountedItems: true,
        allowPointsOnPromotionalItems: true,
        remarks: "",
        active: true,
      }}
      toFormValues={(entity) => ({
        code: entity.code,
        siteId: entity.siteID,
        loyaltyName: entity.loyaltyName,
        loyaltyNameArb: entity.loyaltyNameArb ?? "",
        pointsCalculationType: entity.pointsCalculationType,
        spendAmount: entity.spendAmount,
        earnPoints: entity.earnPoints,
        redeemPoints: entity.redeemPoints,
        redeemValue: entity.redeemValue,
        minimumRedeemPoints: entity.minimumRedeemPoints,
        maximumRedeemPoints: entity.maximumRedeemPoints ?? undefined,
        maximumRedeemPercent: entity.maximumRedeemPercent ?? undefined,
        pointExpiryDays: entity.pointExpiryDays ?? undefined,
        allowNegativePoints: entity.allowNegativePoints,
        allowPartialRedeem: entity.allowPartialRedeem,
        autoEnrollCustomer: entity.autoEnrollCustomer,
        earningBasis: entity.earningBasis,
        pointRoundingMethod: entity.pointRoundingMethod,
        companyWideLoyalty: entity.companyWideLoyalty,
        earnPointsOnRedeemedAmount: entity.earnPointsOnRedeemedAmount,
        allowPointsOnDiscountedItems: entity.allowPointsOnDiscountedItems,
        allowPointsOnPromotionalItems: entity.allowPointsOnPromotionalItems,
        remarks: entity.remarks ?? "",
        active: entity.active,
      })}
      columns={[
        { dataField: "code", captionKey: "common.code", width: 100 },
        { dataField: "loyaltyName", captionKey: "salon.loyaltyName" },
        { dataField: "earnPoints", captionKey: "salon.earnPoints", dataType: "number", width: 130 },
        { dataField: "redeemValue", captionKey: "salon.redeemValue", dataType: "number", width: 140 },
        { dataField: "active", captionKey: "common.status", width: 100 },
      ]}
    />
  );
}
