"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { CrudDataGridPage } from "@/components/shared/crud-data-grid-page";
import { glGroupMasterService, type GLGroupMaster } from "@/lib/api/services/gl-master-service";
import { posLookupService } from "@/lib/api/services/pos-lookup-service";
import { glGroupSchema, type GLGroupFormValues } from "@/schemas/gl-master.schema";
import { GL_ACCOUNT_TYPES } from "@/types/gl-master";
import { useAuthStore } from "@/stores/auth-store";
import { PERMISSIONS } from "@/lib/auth/permissions";
import type { FieldConfig } from "@/components/shared/entity-form-field";

export default function GLGroupMasterPage() {
  const compId = useAuthStore((s) => s.user?.compId ?? "");

  const { data: sites = [] } = useQuery({
    queryKey: ["gl-group-sites", compId],
    queryFn: () => posLookupService.getSites(compId),
    enabled: !!compId,
  });

  const { data: groups } = useQuery({
    queryKey: ["gl-group-master"],
    queryFn: () => glGroupMasterService.list(),
  });

  const fields: FieldConfig<GLGroupFormValues>[] = useMemo(
    () => [
      { name: "accountType", labelKey: "gl.accountType", type: "select", options: [...GL_ACCOUNT_TYPES], resetOnChange: ["parentCode"] },
      { name: "code", labelKey: "gl.groupCode", type: "text", placeholder: "1300", hintKey: "gl.codeHint" },
      { name: "glGroupName", labelKey: "gl.groupName", type: "text" },
      { name: "glCtrlTypeCode", labelKey: "gl.controlType", type: "text" },
      {
        name: "parentCode",
        labelKey: "gl.parentGroup",
        type: "select",
        dependsOn: "accountType",
        // a parent group has the same account type
        optionsFor: (type) =>
          (groups?.items ?? [])
            .filter((g) => String(g.accountType) === String(type))
            .map((g) => ({ value: g.code, label: `${g.code} - ${g.glGroupName}` })),
      },
      {
        name: "siteId",
        labelKey: "common.branch",
        type: "select",
        options: sites.map((s) => ({ value: s.siteID, label: s.siteName })),
      },
      { name: "active", labelKey: "common.active", type: "checkbox" },
    ],
    [sites, groups],
  );

  return (
    <CrudDataGridPage<GLGroupMaster, GLGroupFormValues>
      queryKey="gl-group-master"
      titleKey="gl.groupTitle"
      service={glGroupMasterService}
      schema={glGroupSchema}
      fields={fields}
      permission={PERMISSIONS.ACCOUNTING_MANAGE_GL}
      defaultValues={{
        code: "",
        glGroupName: "",
        accountType: "1",
        glCtrlTypeCode: "",
        parentCode: "",
        siteId: "",
        active: true,
      }}
      toFormValues={(entity) => ({
        code: entity.code,
        glGroupName: entity.glGroupName,
        accountType: String(entity.accountType),
        glCtrlTypeCode: entity.glCtrlTypeCode ?? "",
        parentCode: entity.parentCode ?? "",
        siteId: entity.siteID,
        active: entity.active,
      })}
      columns={[
        { dataField: "code", captionKey: "gl.groupCode", width: 100 },
        { dataField: "glGroupName", captionKey: "gl.groupName" },
        { dataField: "parentCode", captionKey: "gl.parentGroup", width: 140 },
        { dataField: "active", captionKey: "common.status", width: 100 },
      ]}
    />
  );
}
