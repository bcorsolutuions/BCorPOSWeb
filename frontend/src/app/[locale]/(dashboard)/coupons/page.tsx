"use client";

import { CrudDataGridPage } from "@/components/shared/crud-data-grid-page";
import { couponMasterService, fromWireTime, type Coupon } from "@/lib/api/services/coupon-master-service";
import { CouponDetailEditor } from "@/components/masters/coupon-detail-editor";
import { couponSchema, type CouponFormValues } from "@/schemas/coupon-master.schema";
import { useCouponFields } from "@/hooks/use-coupon-fields";
import { PERMISSIONS } from "@/lib/auth/permissions";

// Admin CRUD for the standalone CouponMaster catalog — a genuinely separate
// mechanism from Promotion Master's own CouponRequired/CouponCode gate (see
// lib/api/services/coupon-service.ts's doc comment). No site-picker field
// (Design Decision A — CouponMaster.SiteID is framework plumbing only,
// hardcoded to "ALL" in coupon-master-service.ts). Real site restriction
// lives on SITE-typed rows in CouponDetailEditor below.
export default function CouponMasterPage() {
  const fields = useCouponFields();

  return (
    <CrudDataGridPage<Coupon, CouponFormValues>
      queryKey="coupon-master"
      titleKey="coupon.couponMaster"
      service={couponMasterService}
      schema={couponSchema}
      fields={fields}
      permission={PERMISSIONS.COUPON_MANAGE}
      createHref="/coupons/new"
      defaultValues={{
        code: "",
        couponName: "",
        couponType: "PERCENTAGE",
        validFrom: new Date().toISOString().slice(0, 10),
        validTo: new Date().toISOString().slice(0, 10),
        startTime: "",
        endTime: "",
        minimumBillAmount: 0,
        discountPercentage: undefined,
        discountAmount: undefined,
        maximumDiscountAmount: undefined,
        applicableBusinessType: "",
        customerCode: "",
        customerCategoryCode: "",
        usageLimit: 0,
        usageLimitPerCustomer: 0,
        oneTimeUse: false,
        allowWithPromotion: false,
        active: true,
        details: [],
      }}
      toFormValues={(entity) => ({
        code: entity.code,
        couponName: entity.couponName,
        couponType: entity.couponType,
        validFrom: entity.validFrom.slice(0, 10),
        validTo: entity.validTo.slice(0, 10),
        startTime: fromWireTime(entity.startTime),
        endTime: fromWireTime(entity.endTime),
        minimumBillAmount: entity.minimumBillAmount ?? 0,
        discountPercentage: entity.discountPercentage ?? undefined,
        discountAmount: entity.discountAmount ?? undefined,
        maximumDiscountAmount: entity.maximumDiscountAmount ?? undefined,
        applicableBusinessType: entity.applicableBusinessType ?? "",
        customerCode: entity.customerCode ?? "",
        customerCategoryCode: entity.customerCategoryCode ?? "",
        usageLimit: entity.usageLimit ?? 0,
        usageLimitPerCustomer: entity.usageLimitPerCustomer ?? 0,
        oneTimeUse: entity.oneTimeUse ?? false,
        allowWithPromotion: entity.allowWithPromotion ?? false,
        active: entity.active,
        details: (entity.details ?? []).map((d) => ({
          id: d.id,
          targetType: d.targetType,
          targetCode: d.targetCode,
          isExclude: d.isExclude,
        })),
      })}
      renderExtra={({ form }) => <CouponDetailEditor form={form} />}
      columns={[
        { dataField: "code", captionKey: "common.code", width: 100 },
        { dataField: "couponName", captionKey: "coupon.couponName" },
        { dataField: "couponType", captionKey: "coupon.couponType", width: 140 },
        { dataField: "currentUsageCount", captionKey: "coupon.currentUsageCount", dataType: "number", width: 110 },
        { dataField: "active", captionKey: "common.status", width: 100 },
      ]}
    />
  );
}
