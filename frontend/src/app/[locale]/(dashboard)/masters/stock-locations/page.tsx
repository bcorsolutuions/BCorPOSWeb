"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { CrudDataGridPage } from "@/components/shared/crud-data-grid-page";
import { stockLocationService, type StockLocationMaster } from "@/lib/api/services/stock-location-service";
import { posLookupService } from "@/lib/api/services/pos-lookup-service";
import { stockLocationSchema, type StockLocationFormValues } from "@/schemas/stock-location.schema";
import { useAuthStore } from "@/stores/auth-store";
import { PERMISSIONS } from "@/lib/auth/permissions";
import type { FieldConfig } from "@/components/shared/entity-form-field";
import type { StockLocationType } from "@/types/stock-location";

const LOCATION_TYPES: StockLocationType[] = ["STORE", "BAR", "COUNTER", "KITCHEN", "OTHER"];

/** Bar Counter Management §15 — Counter Stock locations (Main Store, Main Bar, ...). */
export default function StockLocationMasterPage() {
  const compId = useAuthStore((s) => s.user?.compId ?? "");

  const { data: sites = [] } = useQuery({
    queryKey: ["stock-location-sites", compId],
    queryFn: () => posLookupService.getSites(compId),
    enabled: !!compId,
  });

  const fields: FieldConfig<StockLocationFormValues>[] = useMemo(
    () => [
      { name: "code", labelKey: "common.code", type: "text" },
      { name: "locationName", labelKey: "common.name", type: "text" },
      { name: "locationNameArb", labelKey: "common.nameAr", type: "text" },
      {
        name: "siteId",
        labelKey: "common.branch",
        type: "select",
        options: sites.map((s) => ({ value: s.siteID, label: s.siteName })),
      },
      {
        name: "locationType",
        labelKey: "barCounter.stationType",
        type: "select",
        options: LOCATION_TYPES.map((t) => ({ value: t, label: t })),
      },
      { name: "displayOrder", labelKey: "common.displayOrder", type: "number" },
      { name: "active", labelKey: "common.active", type: "checkbox" },
    ],
    [sites],
  );

  return (
    <CrudDataGridPage<StockLocationMaster, StockLocationFormValues>
      queryKey="stock-location-master"
      titleKey="barCounter.stockLocation"
      service={stockLocationService}
      schema={stockLocationSchema}
      fields={fields}
      permission={PERMISSIONS.BAR_COUNTER_MANAGE}
      defaultValues={{
        code: "",
        locationName: "",
        locationNameArb: "",
        locationType: "STORE",
        displayOrder: 0,
        siteId: "",
        active: true,
      }}
      toFormValues={(entity) => ({
        code: entity.code,
        locationName: entity.locationName,
        locationNameArb: entity.locationNameArb ?? "",
        locationType: entity.locationType,
        displayOrder: entity.displayOrder,
        siteId: entity.siteID,
        active: entity.active,
      })}
      columns={[
        { dataField: "code", captionKey: "common.code", width: 100 },
        { dataField: "locationName", captionKey: "common.name" },
        { dataField: "locationType", captionKey: "barCounter.stationType", width: 120 },
        { dataField: "active", captionKey: "common.status", width: 100 },
      ]}
    />
  );
}
