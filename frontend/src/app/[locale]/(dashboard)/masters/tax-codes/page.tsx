"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { CrudDataGridPage } from "@/components/shared/crud-data-grid-page";
import { taxMasterService } from "@/lib/api/services/tax-master-service";
import { posLookupService } from "@/lib/api/services/pos-lookup-service";
import { taxMasterSchema, type TaxMasterFormValues } from "@/schemas/masters.schema";
import { useAuthStore } from "@/stores/auth-store";
import { PERMISSIONS } from "@/lib/auth/permissions";
import type { FieldConfig } from "@/components/shared/entity-form-field";
import type { TaxMaster } from "@/types/item-master";

type TaxMasterRow = TaxMaster & { id: string };

export default function TaxMasterPage() {
  const compId = useAuthStore((s) => s.user?.compId ?? "");

  const { data: sites = [] } = useQuery({
    queryKey: ["tax-master-sites", compId],
    queryFn: () => posLookupService.getSites(compId),
    enabled: !!compId,
  });

  const fields: FieldConfig<TaxMasterFormValues>[] = useMemo(
    () => [
      { name: "code", labelKey: "item.taxCode", type: "text" },
      { name: "taxName", labelKey: "tax.taxName", type: "text" },
      { name: "taxRate", labelKey: "tax.taxRate", type: "number" },
      {
        name: "siteId",
        labelKey: "common.branch",
        type: "select",
        options: sites.map((s) => ({ value: s.siteID, label: s.siteName })),
      },
      { name: "active", labelKey: "common.active", type: "checkbox" },
    ],
    [sites],
  );

  return (
    <CrudDataGridPage<TaxMasterRow, TaxMasterFormValues>
      queryKey="tax-master"
      titleKey="tax.title"
      descriptionKey="tax.taxCodeHint"
      service={taxMasterService}
      schema={taxMasterSchema}
      fields={fields}
      permission={PERMISSIONS.INVENTORY_MANAGE_ITEMS}
      defaultValues={{
        code: "",
        taxName: "",
        taxRate: 0,
        siteId: "",
        active: true,
      }}
      toFormValues={(entity) => ({
        code: entity.code,
        taxName: entity.taxName,
        taxRate: entity.taxRate,
        siteId: entity.siteID,
        active: entity.active,
      })}
      columns={[
        { dataField: "code", captionKey: "item.taxCode", width: 120 },
        { dataField: "taxName", captionKey: "tax.taxName" },
        { dataField: "taxRate", captionKey: "tax.taxRate", dataType: "number", width: 120 },
        { dataField: "active", captionKey: "common.status", width: 100 },
      ]}
    />
  );
}
