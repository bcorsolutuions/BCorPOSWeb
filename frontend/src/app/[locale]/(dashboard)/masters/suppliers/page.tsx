"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { CrudDataGridPage } from "@/components/shared/crud-data-grid-page";
import { vendorMasterService } from "@/lib/api/services/vendor-master-service";
import { posLookupService } from "@/lib/api/services/pos-lookup-service";
import { vendorCategoryService } from "@/lib/api/services/vendor-category-service";
import { vendorMasterSchema, type VendorMasterFormValues } from "@/schemas/masters.schema";
import { useAuthStore } from "@/stores/auth-store";
import type { VendorMaster } from "@/types/vendor-master";
import { PERMISSIONS } from "@/lib/auth/permissions";
import type { FieldConfig } from "@/components/shared/entity-form-field";

export default function SupplierMasterPage() {
  const compId = useAuthStore((s) => s.user?.compId ?? "");

  const { data: sites = [] } = useQuery({
    queryKey: ["vendor-master-sites", compId],
    queryFn: () => posLookupService.getSites(compId),
    enabled: !!compId,
  });

  const { data: categories = [] } = useQuery({
    queryKey: ["vendor-master-categories", compId],
    queryFn: () => vendorCategoryService.getCategories(compId),
    enabled: !!compId,
  });

  const fields: FieldConfig<VendorMasterFormValues>[] = useMemo(
    () => [
      { name: "code", labelKey: "common.code", type: "text", hintKey: "accounting.supplierCodeHint" },
      { name: "vendorName", labelKey: "common.name", type: "text" },
      { name: "vendorNameArb", labelKey: "common.nameAr", type: "text" },
      {
        name: "siteId",
        labelKey: "common.branch",
        type: "select",
        options: sites.map((s) => ({ value: s.siteID, label: s.siteName })),
      },
      {
        name: "vendorCatCode",
        labelKey: "supplier.category",
        type: "select",
        options: categories.map((c) => ({ value: c.code, label: c.vendorCatName })),
      },
      { name: "mobile1", labelKey: "supplier.phone", type: "text" },
      { name: "email", labelKey: "supplier.email", type: "text" },
      { name: "taxRegisterNo", labelKey: "supplier.taxRegNo", type: "text" },
      { name: "creditPeriod", labelKey: "supplier.paymentTerms", type: "number" },
      { name: "active", labelKey: "common.active", type: "checkbox" },
    ],
    [sites, categories],
  );

  return (
    <CrudDataGridPage<VendorMaster, VendorMasterFormValues>
      queryKey="vendor-master"
      titleKey="supplier.title"
      service={vendorMasterService}
      schema={vendorMasterSchema}
      fields={fields}
      permission={PERMISSIONS.SUPPLIER_MANAGE}
      defaultValues={{
        code: "",
        vendorName: "",
        vendorNameArb: "",
        vendorCatCode: "",
        mobile1: "",
        email: "",
        taxRegisterNo: "",
        creditPeriod: 30,
        siteId: "",
        active: true,
      }}
      toFormValues={(entity) => ({
        code: entity.code,
        vendorName: entity.vendorName,
        vendorNameArb: entity.vendorNameArb ?? "",
        vendorCatCode: entity.vendorCatCode ?? "",
        mobile1: entity.mobile1 ?? "",
        email: entity.email ?? "",
        taxRegisterNo: entity.taxRegisterNo ?? "",
        creditPeriod: entity.creditPeriod ?? 0,
        siteId: entity.siteID,
        active: entity.active,
      })}
      columns={[
        { dataField: "code", captionKey: "common.code", width: 100 },
        { dataField: "vendorName", captionKey: "common.name" },
        { dataField: "vendorNameArb", captionKey: "common.nameAr" },
        { dataField: "mobile1", captionKey: "supplier.phone", width: 140 },
        { dataField: "creditPeriod", captionKey: "supplier.paymentTerms", dataType: "number", width: 120 },
        { dataField: "active", captionKey: "common.status", width: 100 },
      ]}
    />
  );
}
