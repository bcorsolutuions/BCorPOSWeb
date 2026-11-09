"use client";

import { CrudDataGridPage } from "@/components/shared/crud-data-grid-page";
import { promotionMasterService, type Promotion } from "@/lib/api/services/promotion-master-service";
import { usePromotionFields } from "@/hooks/use-promotion-fields";
import { PromotionDetailEditor } from "@/components/masters/promotion-detail-editor";
import { promotionSchema, type PromotionFormValues } from "@/schemas/salon-master.schema";
import { PERMISSIONS } from "@/lib/auth/permissions";

// Slice back to "HH:mm" — the backend round-trips TimeOnly as "HH:mm:ss"
// (see promotion-master-service.ts's fromWireTime/toWireTime).
function toTimeInput(value: string | null | undefined): string {
  return value ? value.slice(0, 5) : "";
}

export default function PromotionMasterPage() {
  const fields = usePromotionFields();

  return (
    <CrudDataGridPage<Promotion, PromotionFormValues>
      queryKey="promotion-master"
      titleKey="salon.promotionMaster"
      service={promotionMasterService}
      schema={promotionSchema}
      fields={fields}
      permission={PERMISSIONS.PROMOTION_MANAGE}
      createHref="/promotions/new"
      defaultValues={{
        code: "",
        siteId: "",
        promotionName: "",
        promotionNameArb: "",
        promotionType: "PERCENTAGE",
        validFrom: new Date().toISOString().slice(0, 10),
        validTo: new Date().toISOString().slice(0, 10),
        startTime: "",
        endTime: "",
        minimumBillAmount: 0,
        minimumQty: 0,
        discountPercent: undefined,
        discountAmount: undefined,
        maximumDiscountAmount: undefined,
        buyQty: undefined,
        getQty: undefined,
        freeItemCode: "",
        customerCategoryCode: "",
        priorityNo: 0,
        allowWithOtherPromo: false,
        autoApply: false,
        couponRequired: false,
        couponCode: "",
        remarks: "",
        active: true,
        details: [],
      }}
      toFormValues={(entity) => ({
        code: entity.code,
        siteId: entity.siteID,
        promotionName: entity.promotionName,
        promotionNameArb: entity.promotionNameArb ?? "",
        promotionType: entity.promotionType as PromotionFormValues["promotionType"],
        validFrom: entity.validFrom.slice(0, 10),
        validTo: entity.validTo.slice(0, 10),
        startTime: toTimeInput(entity.startTime),
        endTime: toTimeInput(entity.endTime),
        minimumBillAmount: entity.minimumBillAmount ?? 0,
        minimumQty: entity.minimumQty ?? 0,
        discountPercent: entity.discountPercent ?? undefined,
        discountAmount: entity.discountAmount ?? undefined,
        maximumDiscountAmount: entity.maximumDiscountAmount ?? undefined,
        buyQty: entity.buyQty ?? undefined,
        getQty: entity.getQty ?? undefined,
        freeItemCode: entity.freeItemCode ?? "",
        customerCategoryCode: entity.customerCategoryCode ?? "",
        priorityNo: entity.priorityNo ?? 0,
        allowWithOtherPromo: entity.allowWithOtherPromo ?? false,
        autoApply: entity.autoApply ?? false,
        couponRequired: entity.couponRequired ?? false,
        couponCode: entity.couponCode ?? "",
        remarks: entity.remarks ?? "",
        active: entity.active,
        details: (entity.details ?? []).map((d) => ({
          id: d.id ?? undefined,
          targetType: d.targetType,
          targetCode: d.targetCode,
          isExclude: d.isExclude,
        })),
      })}
      renderExtra={({ form }) => <PromotionDetailEditor form={form} />}
      columns={[
        { dataField: "code", captionKey: "common.code", width: 100 },
        { dataField: "promotionName", captionKey: "salon.promotionName" },
        { dataField: "promotionType", captionKey: "salon.promotionType", width: 140 },
        { dataField: "validFrom", captionKey: "salon.validFrom", dataType: "date", width: 120 },
        { dataField: "validTo", captionKey: "salon.validTo", dataType: "date", width: 120 },
        { dataField: "active", captionKey: "common.status", width: 100 },
      ]}
    />
  );
}
