"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { CrudDataGridPage } from "@/components/shared/crud-data-grid-page";
import { tableSectionService, type TableSectionMaster } from "@/lib/api/services/table-section-service";
import { floorMasterService } from "@/lib/api/services/floor-master-service";
import { posLookupService } from "@/lib/api/services/pos-lookup-service";
import { tableSectionSchema, type TableSectionFormValues } from "@/schemas/restaurant-master.schema";
import { useAuthStore } from "@/stores/auth-store";
import { PERMISSIONS } from "@/lib/auth/permissions";
import type { FieldConfig } from "@/components/shared/entity-form-field";

export default function TableSectionMasterPage() {
  const compId = useAuthStore((s) => s.user?.compId ?? "");

  const { data: sites = [] } = useQuery({
    queryKey: ["table-section-sites", compId],
    queryFn: () => posLookupService.getSites(compId),
    enabled: !!compId,
  });

  const { data: floorsResult } = useQuery({
    queryKey: ["table-section-floors"],
    queryFn: () => floorMasterService.list(),
    enabled: !!compId,
  });
  const floors = floorsResult?.items ?? [];

  const fields: FieldConfig<TableSectionFormValues>[] = useMemo(
    () => [
      { name: "code", labelKey: "common.code", type: "text" },
      { name: "sectionName", labelKey: "common.name", type: "text" },
      { name: "sectionNameArb", labelKey: "common.nameAr", type: "text" },
      {
        name: "siteId",
        labelKey: "common.branch",
        type: "select",
        options: sites.map((s) => ({ value: s.siteID, label: s.siteName })),
        // Floors belong to a branch (the same codes exist in several branches), so picking another branch clears the floor.
        resetOnChange: ["floorCode"],
      },
      {
        name: "floorCode",
        labelKey: "restaurant.floor",
        type: "select",
        dependsOn: "siteId",
        optionsFor: (site) => floors.filter((f) => f.siteID === site).map((f) => ({ value: f.code, label: f.floorName })),
      },
      { name: "sectionColor", labelKey: "restaurant.color", type: "text" },
      { name: "displayOrder", labelKey: "common.displayOrder", type: "number" },
      { name: "active", labelKey: "common.active", type: "checkbox" },
    ],
    [sites, floors],
  );

  return (
    <CrudDataGridPage<TableSectionMaster, TableSectionFormValues>
      queryKey="table-section-master"
      titleKey="restaurant.tableSections"
      service={tableSectionService}
      schema={tableSectionSchema}
      fields={fields}
      permission={PERMISSIONS.RESTAURANT_MANAGE_TABLES}
      defaultValues={{
        code: "",
        sectionName: "",
        sectionNameArb: "",
        floorCode: "",
        sectionColor: "",
        displayOrder: 0,
        siteId: "",
        active: true,
      }}
      toFormValues={(entity) => ({
        code: entity.code,
        sectionName: entity.sectionName,
        sectionNameArb: entity.sectionNameArb ?? "",
        floorCode: entity.floorCode,
        sectionColor: entity.sectionColor ?? "",
        displayOrder: entity.displayOrder,
        siteId: entity.siteID,
        active: entity.active,
      })}
      columns={[
        { dataField: "code", captionKey: "common.code", width: 100 },
        { dataField: "sectionName", captionKey: "common.name" },
        { dataField: "floorCode", captionKey: "restaurant.floor", width: 120 },
        { dataField: "active", captionKey: "common.status", width: 100 },
      ]}
    />
  );
}
