"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { CrudDataGridPage } from "@/components/shared/crud-data-grid-page";
import { restaurantTableService, type RestaurantTableMaster } from "@/lib/api/services/restaurant-table-service";
import { floorMasterService } from "@/lib/api/services/floor-master-service";
import { tableSectionService } from "@/lib/api/services/table-section-service";
import { posLookupService } from "@/lib/api/services/pos-lookup-service";
import { restaurantTableSchema, type RestaurantTableFormValues } from "@/schemas/restaurant-master.schema";
import { useAuthStore } from "@/stores/auth-store";
import { PERMISSIONS } from "@/lib/auth/permissions";
import type { FieldConfig } from "@/components/shared/entity-form-field";

export default function RestaurantTableMasterPage() {
  const compId = useAuthStore((s) => s.user?.compId ?? "");

  const { data: sites = [] } = useQuery({
    queryKey: ["restaurant-table-sites", compId],
    queryFn: () => posLookupService.getSites(compId),
    enabled: !!compId,
  });

  const { data: floorsResult } = useQuery({
    queryKey: ["restaurant-table-floors"],
    queryFn: () => floorMasterService.list(),
    enabled: !!compId,
  });
  const floors = floorsResult?.items ?? [];

  const { data: sectionsResult } = useQuery({
    queryKey: ["restaurant-table-sections"],
    queryFn: () => tableSectionService.list(),
    enabled: !!compId,
  });
  const sections = sectionsResult?.items ?? [];

  const fields: FieldConfig<RestaurantTableFormValues>[] = useMemo(
    () => [
      { name: "code", labelKey: "common.code", type: "text" },
      { name: "tableName", labelKey: "common.name", type: "text" },
      { name: "tableNameArb", labelKey: "common.nameAr", type: "text" },
      {
        name: "siteId",
        labelKey: "common.branch",
        type: "select",
        options: sites.map((s) => ({ value: s.siteID, label: s.siteName })),
        // Floors and sections belong to a branch (the same codes exist in several branches), so picking another branch clears them.
        resetOnChange: ["floorCode", "sectionCode"],
      },
      {
        name: "floorCode",
        labelKey: "restaurant.floor",
        type: "select",
        dependsOn: "siteId",
        optionsFor: (site) => floors.filter((f) => f.siteID === site).map((f) => ({ value: f.code, label: f.floorName })),
        resetOnChange: ["sectionCode"],
      },
      {
        name: "sectionCode",
        labelKey: "restaurant.section",
        type: "select",
        dependsOn: "floorCode",
        // This branch's sections, on the chosen floor.
        optionsFor: (floor, values) =>
          sections
            .filter((s) => s.siteID === values.siteId && (!floor || s.floorCode === floor))
            .map((s) => ({ value: s.code, label: s.sectionName })),
      },
      { name: "capacity", labelKey: "restaurant.capacity", type: "number" },
      {
        name: "shapeType",
        labelKey: "restaurant.shape",
        type: "select",
        options: [
          { value: "SQUARE", label: "Square" },
          { value: "ROUND", label: "Round" },
          { value: "RECTANGLE", label: "Rectangle" },
        ],
      },
      {
        name: "currentStatus",
        labelKey: "common.status",
        type: "select",
        options: [
          { value: "AVAILABLE", label: "Available" },
          { value: "OCCUPIED", label: "Occupied" },
          { value: "RESERVED", label: "Reserved" },
          { value: "DIRTY", label: "Dirty" },
        ],
      },
      { name: "isVIP", labelKey: "restaurant.isVIP", type: "checkbox" },
      { name: "isOutdoor", labelKey: "restaurant.isOutdoor", type: "checkbox" },
      { name: "isReservable", labelKey: "restaurant.isReservable", type: "checkbox" },
      { name: "isMergeAllowed", labelKey: "restaurant.isMergeAllowed", type: "checkbox" },
      { name: "displayOrder", labelKey: "common.displayOrder", type: "number" },
      { name: "active", labelKey: "common.active", type: "checkbox" },
    ],
    [sites, floors, sections],
  );

  return (
    <CrudDataGridPage<RestaurantTableMaster, RestaurantTableFormValues>
      queryKey="restaurant-table-master"
      titleKey="restaurant.tables"
      service={restaurantTableService}
      schema={restaurantTableSchema}
      fields={fields}
      permission={PERMISSIONS.RESTAURANT_MANAGE_TABLES}
      defaultValues={{
        code: "",
        tableName: "",
        tableNameArb: "",
        floorCode: "",
        sectionCode: "",
        capacity: 4,
        shapeType: "SQUARE",
        currentStatus: "AVAILABLE",
        isVIP: false,
        isOutdoor: false,
        isReservable: true,
        isMergeAllowed: true,
        displayOrder: 0,
        siteId: "",
        active: true,
      }}
      toFormValues={(entity) => ({
        code: entity.code,
        tableName: entity.tableName,
        tableNameArb: entity.tableNameArb ?? "",
        floorCode: entity.floorCode,
        sectionCode: entity.sectionCode ?? "",
        capacity: entity.capacity,
        shapeType: entity.shapeType ?? "SQUARE",
        currentStatus: entity.currentStatus,
        isVIP: entity.isVIP,
        isOutdoor: entity.isOutdoor,
        isReservable: entity.isReservable,
        isMergeAllowed: entity.isMergeAllowed,
        displayOrder: entity.displayOrder,
        siteId: entity.siteID,
        active: entity.active,
      })}
      columns={[
        { dataField: "code", captionKey: "common.code", width: 100 },
        { dataField: "tableName", captionKey: "common.name" },
        { dataField: "floorCode", captionKey: "restaurant.floor", width: 120 },
        { dataField: "capacity", captionKey: "restaurant.capacity", dataType: "number", width: 100 },
        { dataField: "currentStatus", captionKey: "common.status", width: 120 },
      ]}
    />
  );
}
