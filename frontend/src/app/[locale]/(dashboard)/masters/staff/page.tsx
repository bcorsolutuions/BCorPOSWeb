"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { CrudDataGridPage } from "@/components/shared/crud-data-grid-page";
import { staffMasterService, type Staff } from "@/lib/api/services/staff-master-service";
import { posLookupService } from "@/lib/api/services/pos-lookup-service";
import { staffSchema, type StaffFormValues } from "@/schemas/salon-master.schema";
import { useAuthStore } from "@/stores/auth-store";
import { PERMISSIONS } from "@/lib/auth/permissions";
import type { FieldConfig } from "@/components/shared/entity-form-field";

export default function StaffMasterPage() {
  const compId = useAuthStore((s) => s.user?.compId ?? "");

  const { data: sites = [] } = useQuery({
    queryKey: ["staff-master-sites", compId],
    queryFn: () => posLookupService.getSites(compId),
    enabled: !!compId,
  });

  const fields: FieldConfig<StaffFormValues>[] = useMemo(
    () => [
      { name: "code", labelKey: "common.code", type: "text" },
      { name: "staffName", labelKey: "common.name", type: "text" },
      { name: "staffNameArb", labelKey: "common.nameAr", type: "text" },
      {
        name: "siteId",
        labelKey: "common.branch",
        type: "select",
        options: sites.map((s) => ({ value: s.siteID, label: s.siteName })),
      },
      // Default rate pre-filled onto a POS service line when this staff
      // member is picked; editable per line just like a discount.
      { name: "commissionPercent", labelKey: "salon.commissionPercent", type: "number" },
      { name: "phone", labelKey: "common.phone", type: "text" },
      { name: "remarks", labelKey: "common.remarks", type: "text" },
      { name: "active", labelKey: "common.active", type: "checkbox" },
    ],
    [sites],
  );

  return (
    <CrudDataGridPage<Staff, StaffFormValues>
      queryKey="staff-master"
      titleKey="salon.staffMaster"
      service={staffMasterService}
      schema={staffSchema}
      fields={fields}
      permission={PERMISSIONS.SALON_MANAGE}
      defaultValues={{
        code: "",
        siteId: "",
        staffName: "",
        staffNameArb: "",
        commissionPercent: undefined,
        phone: "",
        remarks: "",
        active: true,
      }}
      toFormValues={(entity) => ({
        code: entity.code,
        siteId: entity.siteID,
        staffName: entity.staffName,
        staffNameArb: entity.staffNameArb ?? "",
        commissionPercent: entity.commissionPercent ?? undefined,
        phone: entity.phone ?? "",
        remarks: entity.remarks ?? "",
        active: entity.active,
      })}
      columns={[
        { dataField: "code", captionKey: "common.code", width: 100 },
        { dataField: "staffName", captionKey: "common.name" },
        { dataField: "commissionPercent", captionKey: "salon.commissionPercent", dataType: "number", width: 140 },
        { dataField: "phone", captionKey: "common.phone", width: 140 },
        { dataField: "active", captionKey: "common.status", width: 100 },
      ]}
    />
  );
}
