"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { CrudDataGridPage } from "@/components/shared/crud-data-grid-page";
import { shiftMasterService, type ShiftMaster } from "@/lib/api/services/shift-master-service";
import { tenantSetupService } from "@/lib/api/services/tenant-setup-service";
import { shiftSchema, type ShiftFormValues } from "@/schemas/shift-master.schema";
import { useAuthStore } from "@/stores/auth-store";
import { PERMISSIONS } from "@/lib/auth/permissions";
import type { FieldConfig } from "@/components/shared/entity-form-field";

const hhmm = (t?: string | null) => (t ? t.slice(0, 5) : "");

export default function ShiftMasterPage() {
  const compId = useAuthStore((s) => s.user?.compId ?? "");

  const { data: branches = [] } = useQuery({
    queryKey: ["tenant-branches", compId],
    queryFn: () => tenantSetupService.getBranches(compId),
    enabled: !!compId,
  });

  const fields: FieldConfig<ShiftFormValues>[] = useMemo(
    () => [
      { name: "code", labelKey: "common.code", type: "text" },
      { name: "shiftName", labelKey: "common.name", type: "text" },
      { name: "shiftNameArb", labelKey: "common.nameAr", type: "text" },
      {
        name: "siteId",
        labelKey: "common.branch",
        type: "select",
        options: branches.map((b) => ({ value: b.siteID, label: `${b.siteID} - ${b.siteName}` })),
      },
      { name: "startTime", labelKey: "shift.startTime", type: "time" },
      { name: "endTime", labelKey: "shift.endTime", type: "time" },
      { name: "graceMinutes", labelKey: "shift.graceMinutes", type: "number" },
      { name: "displayOrder", labelKey: "common.displayOrder", type: "number" },
      { name: "openingCashRequired", labelKey: "shift.openingCashRequired", type: "checkbox" },
      { name: "closingCashRequired", labelKey: "shift.closingCashRequired", type: "checkbox" },
      { name: "allowMultipleCashiers", labelKey: "shift.allowMultipleCashiers", type: "checkbox" },
      { name: "allowOverlappingShift", labelKey: "shift.allowOverlappingShift", type: "checkbox" },
      { name: "autoCloseShift", labelKey: "shift.autoCloseShift", type: "checkbox" },
      { name: "autoCloseAfterMinutes", labelKey: "shift.autoCloseAfterMinutes", type: "number" },
      { name: "remarks", labelKey: "common.remarks", type: "text" },
      { name: "active", labelKey: "common.active", type: "checkbox" },
    ],
    [branches],
  );

  return (
    <CrudDataGridPage<ShiftMaster, ShiftFormValues>
      queryKey="shift-master"
      titleKey="nav.shiftMaster"
      service={shiftMasterService}
      schema={shiftSchema}
      fields={fields}
      permission={PERMISSIONS.SYSADMIN_MANAGE_USERS}
      defaultValues={{
        code: "",
        shiftName: "",
        shiftNameArb: "",
        siteId: "",
        startTime: "00:00",
        endTime: "23:59",
        graceMinutes: 0,
        openingCashRequired: false,
        closingCashRequired: false,
        allowMultipleCashiers: false,
        allowOverlappingShift: false,
        autoCloseShift: false,
        autoCloseAfterMinutes: undefined,
        displayOrder: 0,
        remarks: "",
        active: true,
      }}
      toFormValues={(e) => ({
        code: e.code,
        shiftName: e.shiftName,
        shiftNameArb: e.shiftNameArb ?? "",
        siteId: e.siteID,
        startTime: hhmm(e.startTime),
        endTime: hhmm(e.endTime),
        graceMinutes: e.graceMinutes,
        openingCashRequired: e.openingCashRequired,
        closingCashRequired: e.closingCashRequired,
        allowMultipleCashiers: e.allowMultipleCashiers,
        allowOverlappingShift: e.allowOverlappingShift,
        autoCloseShift: e.autoCloseShift,
        autoCloseAfterMinutes: e.autoCloseAfterMinutes ?? undefined,
        displayOrder: e.displayOrder,
        remarks: e.remarks ?? "",
        active: e.active,
      })}
      columns={[
        { dataField: "code", captionKey: "common.code", width: 100 },
        { dataField: "shiftName", captionKey: "common.name" },
        { dataField: "siteID", captionKey: "common.branch", width: 100 },
        { dataField: "startTime", captionKey: "shift.startTime", width: 100, cellRender: (d) => hhmm(d.data.startTime as string) },
        { dataField: "endTime", captionKey: "shift.endTime", width: 100, cellRender: (d) => hhmm(d.data.endTime as string) },
        { dataField: "active", captionKey: "common.status", width: 100 },
      ]}
    />
  );
}
