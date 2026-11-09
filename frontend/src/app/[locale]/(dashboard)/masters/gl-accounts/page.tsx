"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { CrudDataGridPage } from "@/components/shared/crud-data-grid-page";
import { glMasterService, glGroupMasterService, type GLMaster } from "@/lib/api/services/gl-master-service";
import { posLookupService } from "@/lib/api/services/pos-lookup-service";
import { glMasterSchema, type GLMasterFormValues } from "@/schemas/gl-master.schema";
import { GL_ACCOUNT_TYPES, GL_DRCR_TYPES } from "@/types/gl-master";
import { useAuthStore } from "@/stores/auth-store";
import { PERMISSIONS } from "@/lib/auth/permissions";
import type { FieldConfig } from "@/components/shared/entity-form-field";
import { GlAccountTree } from "@/components/accounting/gl-account-tree";

export default function GLMasterPage() {
  const compId = useAuthStore((s) => s.user?.compId ?? "");

  const { data: sites = [] } = useQuery({
    queryKey: ["gl-account-sites", compId],
    queryFn: () => posLookupService.getSites(compId),
    enabled: !!compId,
  });

  const { data: groups } = useQuery({
    queryKey: ["gl-group-master"],
    queryFn: () => glGroupMasterService.list(),
  });

  const fields: FieldConfig<GLMasterFormValues>[] = useMemo(
    () => [
      { name: "accountType", labelKey: "gl.accountType", type: "select", options: [...GL_ACCOUNT_TYPES], resetOnChange: ["glGroupCode"] },
      { name: "code", labelKey: "gl.code", type: "text", placeholder: "1301", hintKey: "gl.codeHint" },
      { name: "glName", labelKey: "gl.name", type: "text" },
      {
        // only the groups of the chosen account type
        name: "glGroupCode",
        labelKey: "gl.group",
        type: "select",
        dependsOn: "accountType",
        optionsFor: (type) =>
          (groups?.items ?? [])
            .filter((g) => String(g.accountType) === String(type))
            .map((g) => ({ value: g.code, label: `${g.code} - ${g.glGroupName}` })),
      },
      { name: "glCtrlTypeCode", labelKey: "gl.controlType", type: "text" },
      { name: "drCrType", labelKey: "gl.defaultType", type: "select", options: [...GL_DRCR_TYPES] },
      { name: "allowedLimit", labelKey: "gl.limit", type: "number" },
      { name: "glRemarks", labelKey: "gl.remarks", type: "textarea" },
      { name: "interCoGLCode", labelKey: "gl.interCompany", type: "checkbox" },
      {
        name: "siteId",
        labelKey: "common.branch",
        type: "select",
        options: sites.map((s) => ({ value: s.siteID, label: s.siteName })),
      },
      { name: "active", labelKey: "common.active", type: "checkbox", hintKey: "gl.activeHint" },
    ],
    [sites, groups],
  );

  return (
    <CrudDataGridPage<GLMaster, GLMasterFormValues>
      queryKey="gl-master"
      titleKey="gl.title"
      service={glMasterService}
      schema={glMasterSchema}
      fields={fields}
      permission={PERMISSIONS.ACCOUNTING_MANAGE_GL}
      treeView={({ items, loading, onEdit, onAdd }) => (
        <GlAccountTree groups={groups?.items ?? []} accounts={items} loading={loading} onEdit={onEdit} onAdd={onAdd} />
      )}
      defaultValues={{
        code: "",
        glName: "",
        glGroupCode: "",
        glCtrlTypeCode: "",
        accountType: "1",
        drCrType: "",
        allowedLimit: undefined,
        glRemarks: "",
        interCoGLCode: false,
        siteId: "",
        active: true,
      }}
      toFormValues={(entity) => ({
        code: entity.code,
        glName: entity.glName,
        glGroupCode: entity.glGroupCode,
        glCtrlTypeCode: entity.glCtrlTypeCode,
        accountType: String(entity.accountType),
        drCrType: entity.drCrType ?? "",
        allowedLimit: entity.allowedLimit ?? undefined,
        glRemarks: entity.glRemarks ?? "",
        interCoGLCode: entity.interCoGLCode,
        siteId: entity.siteID,
        active: entity.active,
      })}
      columns={[
        { dataField: "code", captionKey: "gl.code", width: 100 },
        { dataField: "glName", captionKey: "gl.name" },
        { dataField: "glGroupCode", captionKey: "gl.group", width: 140 },
        { dataField: "drCrType", captionKey: "gl.defaultType", width: 100 },
        { dataField: "active", captionKey: "common.status", width: 100 },
      ]}
    />
  );
}
