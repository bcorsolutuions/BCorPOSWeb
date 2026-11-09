"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { CrudDataGridPage } from "@/components/shared/crud-data-grid-page";
import { kitchenMasterService, type KitchenMaster } from "@/lib/api/services/kitchen-master-service";
import { posLookupService } from "@/lib/api/services/pos-lookup-service";
import { kitchenSchema, type KitchenFormValues } from "@/schemas/restaurant-master.schema";
import { useAuthStore } from "@/stores/auth-store";
import { PERMISSIONS } from "@/lib/auth/permissions";
import type { FieldConfig } from "@/components/shared/entity-form-field";
import type { StationType, StationDisplayMode } from "@/types/restaurant";

const STATION_TYPES: StationType[] = ["KITCHEN", "BAR", "COFFEE", "JUICE", "DESSERT", "GRILL", "BAKERY", "OTHER"];
const DISPLAY_MODES: StationDisplayMode[] = ["PRINT_ONLY", "DISPLAY_ONLY", "PRINT_AND_DISPLAY"];

export default function KitchenMasterPage() {
  const compId = useAuthStore((s) => s.user?.compId ?? "");

  const { data: sites = [] } = useQuery({
    queryKey: ["kitchen-master-sites", compId],
    queryFn: () => posLookupService.getSites(compId),
    enabled: !!compId,
  });

  const fields: FieldConfig<KitchenFormValues>[] = useMemo(
    () => [
      { name: "code", labelKey: "common.code", type: "text" },
      { name: "kitchenName", labelKey: "common.name", type: "text" },
      { name: "kitchenNameArb", labelKey: "common.nameAr", type: "text" },
      {
        name: "siteId",
        labelKey: "common.branch",
        type: "select",
        options: sites.map((s) => ({ value: s.siteID, label: s.siteName })),
      },
      { name: "preparationMinutes", labelKey: "restaurant.preparationMinutes", type: "number" },
      { name: "enableKDS", labelKey: "restaurant.enableKDS", type: "checkbox" },
      {
        name: "stationType",
        labelKey: "barCounter.stationType",
        type: "select",
        options: STATION_TYPES.map((t) => ({ value: t, label: t })),
      },
      {
        name: "displayMode",
        labelKey: "barCounter.displayMode",
        type: "select",
        options: DISPLAY_MODES.map((m) => ({ value: m, label: m })),
      },
      { name: "warehouseCode", labelKey: "barCounter.stockLocation", type: "text" },
      { name: "displayOrder", labelKey: "common.displayOrder", type: "number" },
      { name: "active", labelKey: "common.active", type: "checkbox" },
    ],
    [sites],
  );

  return (
    <CrudDataGridPage<KitchenMaster, KitchenFormValues>
      queryKey="kitchen-master"
      titleKey="restaurant.kitchens"
      service={kitchenMasterService}
      schema={kitchenSchema}
      fields={fields}
      permission={PERMISSIONS.RESTAURANT_MANAGE_TABLES}
      defaultValues={{
        code: "",
        kitchenName: "",
        kitchenNameArb: "",
        preparationMinutes: undefined,
        enableKDS: true,
        stationType: "KITCHEN",
        displayMode: "PRINT_AND_DISPLAY",
        warehouseCode: "",
        displayOrder: 0,
        siteId: "",
        active: true,
      }}
      toFormValues={(entity) => ({
        code: entity.code,
        kitchenName: entity.kitchenName,
        kitchenNameArb: entity.kitchenNameArb ?? "",
        preparationMinutes: entity.preparationMinutes ?? undefined,
        enableKDS: entity.enableKDS,
        stationType: entity.stationType,
        displayMode: entity.displayMode,
        warehouseCode: entity.warehouseCode ?? "",
        displayOrder: entity.displayOrder,
        siteId: entity.siteID,
        active: entity.active,
      })}
      columns={[
        { dataField: "code", captionKey: "common.code", width: 100 },
        { dataField: "kitchenName", captionKey: "common.name" },
        { dataField: "stationType", captionKey: "barCounter.stationType", width: 110 },
        { dataField: "enableKDS", captionKey: "restaurant.enableKDS", width: 120 },
        { dataField: "active", captionKey: "common.status", width: 100 },
      ]}
    />
  );
}
