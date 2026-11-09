"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { CrudDataGridPage } from "@/components/shared/crud-data-grid-page";
import { unitMasterService } from "@/lib/api/services/unit-master-service";
import { posLookupService } from "@/lib/api/services/pos-lookup-service";
import { unitMasterSchema, type UnitMasterFormValues } from "@/schemas/masters.schema";
import { useAuthStore } from "@/stores/auth-store";
import { PERMISSIONS } from "@/lib/auth/permissions";
import type { FieldConfig } from "@/components/shared/entity-form-field";
import type { UnitMaster } from "@/types/item-master";

type UnitMasterRow = UnitMaster & { id: string };

export default function UnitMasterPage() {
  const compId = useAuthStore((s) => s.user?.compId ?? "");

  const { data: sites = [] } = useQuery({
    queryKey: ["unit-master-sites", compId],
    queryFn: () => posLookupService.getSites(compId),
    enabled: !!compId,
  });

  const fields: FieldConfig<UnitMasterFormValues>[] = useMemo(
    () => [
      { name: "code", labelKey: "common.code", type: "text" },
      { name: "unitName", labelKey: "unit.unitName", type: "text" },
      { name: "abbreviation", labelKey: "unit.abbreviation", type: "text" },
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
    <CrudDataGridPage<UnitMasterRow, UnitMasterFormValues>
      queryKey="unit-master"
      titleKey="unit.title"
      service={unitMasterService}
      schema={unitMasterSchema}
      fields={fields}
      permission={PERMISSIONS.INVENTORY_MANAGE_ITEMS}
      defaultValues={{
        code: "",
        unitName: "",
        abbreviation: "",
        siteId: "",
        active: true,
      }}
      toFormValues={(entity) => ({
        code: entity.code,
        unitName: entity.unitName,
        abbreviation: entity.abbreviation ?? "",
        siteId: entity.siteID,
        active: entity.active,
      })}
      columns={[
        { dataField: "code", captionKey: "common.code", width: 100 },
        { dataField: "unitName", captionKey: "unit.unitName" },
        { dataField: "abbreviation", captionKey: "unit.abbreviation", width: 140 },
        { dataField: "active", captionKey: "common.status", width: 100 },
      ]}
    />
  );
}
