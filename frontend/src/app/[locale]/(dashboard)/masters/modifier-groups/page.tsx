"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { CrudDataGridPage } from "@/components/shared/crud-data-grid-page";
import { modifierGroupService, type ModifierGroupMaster } from "@/lib/api/services/modifier-group-service";
import { posLookupService } from "@/lib/api/services/pos-lookup-service";
import { modifierGroupSchema, type ModifierGroupFormValues } from "@/schemas/restaurant-master.schema";
import { useAuthStore } from "@/stores/auth-store";
import { PERMISSIONS } from "@/lib/auth/permissions";
import type { FieldConfig } from "@/components/shared/entity-form-field";

export default function ModifierGroupMasterPage() {
  const compId = useAuthStore((s) => s.user?.compId ?? "");

  const { data: sites = [] } = useQuery({
    queryKey: ["modifier-group-sites", compId],
    queryFn: () => posLookupService.getSites(compId),
    enabled: !!compId,
  });

  const fields: FieldConfig<ModifierGroupFormValues>[] = useMemo(
    () => [
      { name: "code", labelKey: "common.code", type: "text" },
      { name: "modifierGroupName", labelKey: "common.name", type: "text" },
      { name: "modifierGroupNameArb", labelKey: "common.nameAr", type: "text" },
      {
        name: "siteId",
        labelKey: "common.branch",
        type: "select",
        options: sites.map((s) => ({ value: s.siteID, label: s.siteName })),
      },
      { name: "minimumSelection", labelKey: "restaurant.minimumSelection", type: "number" },
      { name: "maximumSelection", labelKey: "restaurant.maximumSelection", type: "number" },
      { name: "isRequired", labelKey: "restaurant.isRequired", type: "checkbox" },
      { name: "allowMultipleQty", labelKey: "restaurant.allowMultipleQty", type: "checkbox" },
      { name: "displayOrder", labelKey: "common.displayOrder", type: "number" },
      { name: "active", labelKey: "common.active", type: "checkbox" },
    ],
    [sites],
  );

  return (
    <CrudDataGridPage<ModifierGroupMaster, ModifierGroupFormValues>
      queryKey="modifier-group-master"
      titleKey="restaurant.modifierGroups"
      service={modifierGroupService}
      schema={modifierGroupSchema}
      fields={fields}
      permission={PERMISSIONS.RESTAURANT_MANAGE_TABLES}
      defaultValues={{
        code: "",
        modifierGroupName: "",
        modifierGroupNameArb: "",
        minimumSelection: 0,
        maximumSelection: 1,
        isRequired: false,
        allowMultipleQty: false,
        displayOrder: 0,
        siteId: "",
        active: true,
      }}
      toFormValues={(entity) => ({
        code: entity.code,
        modifierGroupName: entity.modifierGroupName,
        modifierGroupNameArb: entity.modifierGroupNameArb ?? "",
        minimumSelection: entity.minimumSelection,
        maximumSelection: entity.maximumSelection,
        isRequired: entity.isRequired,
        allowMultipleQty: entity.allowMultipleQty,
        displayOrder: entity.displayOrder,
        siteId: entity.siteID,
        active: entity.active,
      })}
      columns={[
        { dataField: "code", captionKey: "common.code", width: 100 },
        { dataField: "modifierGroupName", captionKey: "common.name" },
        { dataField: "isRequired", captionKey: "restaurant.isRequired", width: 120 },
        { dataField: "active", captionKey: "common.status", width: 100 },
      ]}
    />
  );
}
