"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { CrudDataGridPage } from "@/components/shared/crud-data-grid-page";
import { customerMasterService } from "@/lib/api/services/customer-master-service";
import { posLookupService } from "@/lib/api/services/pos-lookup-service";
import { customerCategoryService } from "@/lib/api/services/customer-category-service";
import { customerMasterSchema, type CustomerMasterFormValues } from "@/schemas/masters.schema";
import { useAuthStore } from "@/stores/auth-store";
import type { CustomerMaster } from "@/types/customer-master";
import { PERMISSIONS } from "@/lib/auth/permissions";
import type { FieldConfig } from "@/components/shared/entity-form-field";

export default function CustomerMasterPage() {
  const compId = useAuthStore((s) => s.user?.compId ?? "");

  const { data: sites = [] } = useQuery({
    queryKey: ["customer-master-sites", compId],
    queryFn: () => posLookupService.getSites(compId),
    enabled: !!compId,
  });

  const { data: categories = [] } = useQuery({
    queryKey: ["customer-master-categories", compId],
    queryFn: () => customerCategoryService.getCategories(compId),
    enabled: !!compId,
  });

  const fields: FieldConfig<CustomerMasterFormValues>[] = useMemo(
    () => [
      { name: "code", labelKey: "common.code", type: "text", placeholderKey: "accounting.codeAutomatic", lockOnEdit: true, hintKey: "accounting.customerCodeHint" },
      { name: "custName", labelKey: "common.name", type: "text" },
      { name: "custNameArabic", labelKey: "common.nameAr", type: "text" },
      {
        name: "siteId",
        labelKey: "common.branch",
        type: "select",
        options: sites.map((s) => ({ value: s.siteID, label: s.siteName })),
      },
      {
        name: "custCatCode",
        labelKey: "customer.category",
        type: "select",
        options: categories.map((c) => ({ value: c.code, label: c.custCatName })),
      },
      { name: "mobile1", labelKey: "customer.phone", type: "text" },
      { name: "email", labelKey: "customer.email", type: "text" },
      { name: "active", labelKey: "common.active", type: "checkbox" },
    ],
    [sites, categories],
  );

  return (
    <CrudDataGridPage<CustomerMaster, CustomerMasterFormValues>
      queryKey="customer-master"
      titleKey="customer.title"
      service={customerMasterService}
      schema={customerMasterSchema}
      fields={fields}
      permission={PERMISSIONS.CRM_MANAGE_CUSTOMERS}
      defaultValues={{
        code: "",
        custName: "",
        custNameArabic: "",
        custCatCode: "",
        mobile1: "",
        email: "",
        creditLimit: 0,
        siteId: "",
        active: true,
      }}
      toFormValues={(entity) => ({
        code: entity.code,
        custName: entity.custName,
        custNameArabic: entity.custNameArabic ?? "",
        custCatCode: entity.custCatCode ?? "",
        mobile1: entity.mobile1 ?? "",
        email: entity.email ?? "",
        creditLimit: entity.creditLimit ?? 0,
        siteId: entity.siteID,
        active: entity.active,
      })}
      columns={[
        { dataField: "code", captionKey: "common.code", width: 100 },
        { dataField: "custName", captionKey: "common.name" },
        { dataField: "custNameArabic", captionKey: "common.nameAr" },
        { dataField: "custCatCode", captionKey: "customer.category", width: 140 },
        { dataField: "mobile1", captionKey: "customer.phone", width: 140 },
        { dataField: "active", captionKey: "common.status", width: 100 },
      ]}
    />
  );
}
