"use client";

import { CrudDataGridPage } from "@/components/shared/crud-data-grid-page";
import {
  licenseEditionService,
  type LicenseEditionRow,
  type LicenseEditionFormValues,
} from "@/lib/api/services/license-edition-service";
import { PERMISSIONS } from "@/lib/auth/permissions";
import type { FieldConfig } from "@/components/shared/entity-form-field";
import { z } from "zod";

const editionSchema = z.object({
  editionCode: z.string().min(1, "validation.required"),
  editionName: z.string().min(1, "validation.required"),
  defaultMaxUsers: z.coerce.number().min(0, "validation.mustBeZeroOrMore").optional(),
  defaultMaxBranches: z.coerce.number().min(0, "validation.mustBeZeroOrMore").optional(),
  defaultMaxDevices: z.coerce.number().min(0, "validation.mustBeZeroOrMore").optional(),
  trialDays: z.coerce.number().min(0, "validation.mustBeZeroOrMore").optional(),
  active: z.boolean().default(true),
});

const fields: FieldConfig<LicenseEditionFormValues>[] = [
  { name: "editionCode", labelKey: "common.code", type: "text" },
  { name: "editionName", labelKey: "superAdmin.editionName", type: "text" },
  { name: "defaultMaxUsers", labelKey: "license.maxUsers", type: "number" },
  { name: "defaultMaxBranches", labelKey: "license.maxBranches", type: "number" },
  { name: "defaultMaxDevices", labelKey: "license.maxDevices", type: "number" },
  { name: "trialDays", labelKey: "superAdmin.trialDays", type: "number" },
  { name: "active", labelKey: "common.active", type: "checkbox" },
];

export default function SuperAdminEditionsPage() {
  return (
    <CrudDataGridPage<LicenseEditionRow, LicenseEditionFormValues>
      queryKey="superadmin-editions"
      titleKey="superAdmin.editionsTitle"
      descriptionKey="superAdmin.editionsDescription"
      service={licenseEditionService}
      schema={editionSchema}
      fields={fields}
      permission={PERMISSIONS.LICENSE_SUPERADMIN_MANAGE}
      defaultValues={{
        editionCode: "",
        editionName: "",
        defaultMaxUsers: undefined,
        defaultMaxBranches: undefined,
        defaultMaxDevices: undefined,
        trialDays: undefined,
        active: true,
      }}
      toFormValues={(entity) => ({
        editionCode: entity.editionCode,
        editionName: entity.editionName,
        defaultMaxUsers: entity.defaultMaxUsers ?? undefined,
        defaultMaxBranches: entity.defaultMaxBranches ?? undefined,
        defaultMaxDevices: entity.defaultMaxDevices ?? undefined,
        trialDays: entity.trialDays ?? undefined,
        active: entity.active,
      })}
      columns={[
        { dataField: "editionCode", captionKey: "common.code", width: 120 },
        { dataField: "editionName", captionKey: "superAdmin.editionName" },
        { dataField: "defaultMaxUsers", captionKey: "license.maxUsers", dataType: "number", width: 120 },
        { dataField: "defaultMaxBranches", captionKey: "license.maxBranches", dataType: "number", width: 120 },
        { dataField: "active", captionKey: "common.status", width: 100 },
      ]}
    />
  );
}
