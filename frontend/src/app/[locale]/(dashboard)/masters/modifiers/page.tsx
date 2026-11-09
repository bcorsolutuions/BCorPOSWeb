"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { CrudDataGridPage } from "@/components/shared/crud-data-grid-page";
import { modifierService, type ModifierMaster } from "@/lib/api/services/modifier-service";
import { modifierGroupService } from "@/lib/api/services/modifier-group-service";
import { kitchenMasterService } from "@/lib/api/services/kitchen-master-service";
import { unitMasterService } from "@/lib/api/services/unit-master-service";
import { posLookupService } from "@/lib/api/services/pos-lookup-service";
import { modifierSchema, type ModifierFormValues } from "@/schemas/restaurant-master.schema";
import { useAuthStore } from "@/stores/auth-store";
import { PERMISSIONS } from "@/lib/auth/permissions";
import type { FieldConfig } from "@/components/shared/entity-form-field";

export default function ModifierMasterPage() {
  const compId = useAuthStore((s) => s.user?.compId ?? "");

  const { data: sites = [] } = useQuery({
    queryKey: ["modifier-sites", compId],
    queryFn: () => posLookupService.getSites(compId),
    enabled: !!compId,
  });

  const { data: groupsResult } = useQuery({
    queryKey: ["modifier-groups-lookup"],
    queryFn: () => modifierGroupService.list(),
    enabled: !!compId,
  });
  const groups = groupsResult?.items ?? [];

  const { data: kitchensResult } = useQuery({
    queryKey: ["modifier-kitchens"],
    queryFn: () => kitchenMasterService.list(),
    enabled: !!compId,
  });
  const kitchens = kitchensResult?.items ?? [];

  const { data: units = [] } = useQuery({
    queryKey: ["modifier-units", compId],
    queryFn: () => unitMasterService.getUnits(compId),
    enabled: !!compId,
  });

  const fields: FieldConfig<ModifierFormValues>[] = useMemo(
    () => [
      { name: "code", labelKey: "common.code", type: "text" },
      { name: "modifierName", labelKey: "common.name", type: "text" },
      { name: "modifierNameArb", labelKey: "common.nameAr", type: "text" },
      {
        name: "siteId",
        labelKey: "common.branch",
        type: "select",
        options: sites.map((s) => ({ value: s.siteID, label: s.siteName })),
      },
      {
        name: "modifierGroupCode",
        labelKey: "restaurant.modifierGroup",
        type: "select",
        options: groups.map((g) => ({ value: g.code, label: g.modifierGroupName })),
      },
      {
        name: "kitchenCode",
        labelKey: "restaurant.kitchen",
        type: "select",
        options: kitchens.map((k) => ({ value: k.code, label: k.kitchenName })),
      },
      {
        name: "unitCode",
        labelKey: "item.unit",
        type: "select",
        options: units.map((u) => ({
          value: u.code,
          label: u.abbreviation ? `${u.unitName} (${u.abbreviation})` : u.unitName,
        })),
      },
      { name: "additionalPrice", labelKey: "restaurant.additionalPrice", type: "money" },
      { name: "displayOrder", labelKey: "common.displayOrder", type: "number" },
      { name: "isDefault", labelKey: "restaurant.isDefault", type: "checkbox" },
      { name: "printInKitchen", labelKey: "restaurant.printInKitchen", type: "checkbox" },
      { name: "active", labelKey: "common.active", type: "checkbox" },
    ],
    [sites, groups, kitchens, units],
  );

  return (
    <CrudDataGridPage<ModifierMaster, ModifierFormValues>
      queryKey="modifier-master"
      titleKey="restaurant.modifiers"
      service={modifierService}
      schema={modifierSchema}
      fields={fields}
      permission={PERMISSIONS.RESTAURANT_MANAGE_TABLES}
      defaultValues={{
        code: "",
        modifierName: "",
        modifierNameArb: "",
        modifierGroupCode: "",
        unitCode: "",
        additionalPrice: 0,
        kitchenCode: "",
        displayOrder: 0,
        isDefault: false,
        printInKitchen: true,
        siteId: "",
        active: true,
      }}
      toFormValues={(entity) => ({
        code: entity.code,
        modifierName: entity.modifierName,
        modifierNameArb: entity.modifierNameArb ?? "",
        modifierGroupCode: entity.modifierGroupCode,
        unitCode: entity.unitCode ?? "",
        additionalPrice: entity.additionalPrice,
        kitchenCode: entity.kitchenCode ?? "",
        displayOrder: entity.displayOrder,
        isDefault: entity.isDefault,
        printInKitchen: entity.printInKitchen,
        siteId: entity.siteID,
        active: entity.active,
      })}
      columns={[
        { dataField: "code", captionKey: "common.code", width: 100 },
        { dataField: "modifierName", captionKey: "common.name" },
        { dataField: "modifierGroupCode", captionKey: "restaurant.modifierGroup", width: 140 },
        { dataField: "additionalPrice", captionKey: "restaurant.additionalPrice", dataType: "number", width: 120 },
        { dataField: "active", captionKey: "common.status", width: 100 },
      ]}
    />
  );
}
