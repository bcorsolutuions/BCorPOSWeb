"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { CrudDataGridPage } from "@/components/shared/crud-data-grid-page";
import { floorMasterService, type FloorMaster } from "@/lib/api/services/floor-master-service";
import { posLookupService } from "@/lib/api/services/pos-lookup-service";
import { floorSchema, type FloorFormValues } from "@/schemas/restaurant-master.schema";
import { useAuthStore } from "@/stores/auth-store";
import { PERMISSIONS } from "@/lib/auth/permissions";
import type { FieldConfig } from "@/components/shared/entity-form-field";

export default function FloorMasterPage() {
  const compId = useAuthStore((s) => s.user?.compId ?? "");

  const { data: sites = [] } = useQuery({
    queryKey: ["floor-master-sites", compId],
    queryFn: () => posLookupService.getSites(compId),
    enabled: !!compId,
  });

  const fields: FieldConfig<FloorFormValues>[] = useMemo(
    () => [
      { name: "code", labelKey: "common.code", type: "text" },
      { name: "floorName", labelKey: "common.name", type: "text" },
      { name: "floorNameArb", labelKey: "common.nameAr", type: "text" },
      {
        name: "siteId",
        labelKey: "common.branch",
        type: "select",
        options: sites.map((s) => ({ value: s.siteID, label: s.siteName })),
      },
      { name: "floorColor", labelKey: "restaurant.color", type: "text" },
      { name: "displayOrder", labelKey: "common.displayOrder", type: "number" },
      { name: "active", labelKey: "common.active", type: "checkbox" },
    ],
    [sites],
  );

  return (
    <CrudDataGridPage<FloorMaster, FloorFormValues>
      queryKey="floor-master"
      titleKey="restaurant.floors"
      service={floorMasterService}
      schema={floorSchema}
      fields={fields}
      permission={PERMISSIONS.RESTAURANT_MANAGE_TABLES}
      defaultValues={{
        code: "",
        floorName: "",
        floorNameArb: "",
        floorColor: "",
        displayOrder: 0,
        siteId: "",
        active: true,
      }}
      toFormValues={(entity) => ({
        code: entity.code,
        floorName: entity.floorName,
        floorNameArb: entity.floorNameArb ?? "",
        floorColor: entity.floorColor ?? "",
        displayOrder: entity.displayOrder,
        siteId: entity.siteID,
        active: entity.active,
      })}
      columns={[
        { dataField: "code", captionKey: "common.code", width: 100 },
        { dataField: "floorName", captionKey: "common.name" },
        { dataField: "displayOrder", captionKey: "common.displayOrder", dataType: "number", width: 120 },
        { dataField: "active", captionKey: "common.status", width: 100 },
      ]}
    />
  );
}
