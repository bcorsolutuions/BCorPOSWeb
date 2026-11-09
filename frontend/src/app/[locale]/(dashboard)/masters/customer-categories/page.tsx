"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import { useQuery } from "@tanstack/react-query";
import { CrudDataGridPage } from "@/components/shared/crud-data-grid-page";
import { customerCategoryService, NONE, type CustomerCategoryRow } from "@/lib/api/services/customer-category-service";
import { glMasterService } from "@/lib/api/services/gl-master-service";
import { posLookupService } from "@/lib/api/services/pos-lookup-service";
import { customerCategorySchema, type CustomerCategoryFormValues } from "@/schemas/masters.schema";
import { useAuthStore } from "@/stores/auth-store";
import { PERMISSIONS } from "@/lib/auth/permissions";
import type { FieldConfig } from "@/components/shared/entity-form-field";

export default function CustomerCategoryMasterPage() {
  const t = useTranslations();
  const compId = useAuthStore((s) => s.user?.compId ?? "");

  const { data: sites = [] } = useQuery({
    queryKey: ["customer-category-sites", compId],
    queryFn: () => posLookupService.getSites(compId),
    enabled: !!compId,
  });

  // A category can sit under another category. Same key prefix as the grid's own list, so a save here refreshes these options too.
  const { data: categories = [] } = useQuery({
    queryKey: ["customer-category-master", "options", compId],
    queryFn: () => customerCategoryService.getCategories(compId),
    enabled: !!compId,
    select: (all) => all.filter((c) => c.active),
  });

  // The GL account is optional; customers are assets (receivables).
  const { data: glAccounts = [] } = useQuery({
    queryKey: ["gl-master", "customer-category-gl", compId],
    queryFn: async () => (await glMasterService.list()).items,
    enabled: !!compId,
    select: (all) => all.filter((a) => a.active && a.accountType === 1),
  });

  const fields: FieldConfig<CustomerCategoryFormValues>[] = useMemo(
    () => [
      { name: "code", labelKey: "common.code", type: "text" },
      { name: "custCatName", labelKey: "common.name", type: "text" },
      { name: "custCatNameArb", labelKey: "common.nameAr", type: "text" },
      {
        name: "parentCode",
        labelKey: "masters.parentCategory",
        type: "select",
        options: [{ value: NONE, label: "—" }, ...categories.map((x) => ({ value: x.code, label: `${x.code} - ${x.custCatName}` }))],
      },
      {
        name: "glCode",
        labelKey: "masters.categoryGl",
        type: "select",
        options: [{ value: NONE, label: "—" }, ...glAccounts.map((a) => ({ value: a.code, label: `${a.code} — ${a.glName}` }))],
      },
      { name: "remarks", labelKey: "gl.remarks", type: "textarea" },
      {
        name: "siteId",
        labelKey: "common.branch",
        type: "select",
        options: sites.map((s) => ({ value: s.siteID, label: s.siteName })),
      },
      { name: "active", labelKey: "common.active", type: "checkbox" },
    ],
    [sites, categories, glAccounts],
  );

  return (
    <CrudDataGridPage<CustomerCategoryRow, CustomerCategoryFormValues>
      queryKey="customer-category-master"
      titleKey="nav.customerCategoryMaster"
      service={customerCategoryService}
      schema={customerCategorySchema}
      fields={fields}
      permission={PERMISSIONS.CRM_MANAGE_CUSTOMERS}
      defaultValues={{
        code: "",
        custCatName: "",
        custCatNameArb: "",
        parentCode: NONE,
        glCode: NONE,
        remarks: "",
        siteId: sites[0]?.siteID ?? "",
        active: true,
      }}
      toFormValues={(entity) => ({
        code: entity.code,
        custCatName: entity.custCatName,
        custCatNameArb: entity.custCatNameArb ?? "",
        parentCode: entity.parentCode || NONE,
        glCode: entity.glCode || NONE,
        remarks: entity.remarks ?? "",
        siteId: entity.siteID,
        active: entity.active,
      })}
      columns={[
        { dataField: "code", captionKey: "common.code", width: 120 },
        { dataField: "custCatName", captionKey: "common.name" },
        { dataField: "custCatNameArb", captionKey: "common.nameAr" },
        { dataField: "parentCode", captionKey: "masters.parentCategory", width: 140 },
        { dataField: "glCode", captionKey: "masters.categoryGl", width: 120 },
        { dataField: "active", captionKey: "common.status", width: 100 },
      ]}
    />
  );
}
