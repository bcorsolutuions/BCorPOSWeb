"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { CrudDataGridPage } from "@/components/shared/crud-data-grid-page";
import {
  sysUserGroupService,
  authRoleService,
  type SysUserGroup,
} from "@/lib/api/services/sys-user-group-service";
import { posLookupService } from "@/lib/api/services/pos-lookup-service";
import { sysUserGroupSchema, type SysUserGroupFormValues } from "@/schemas/admin.schema";
import { useAuthStore } from "@/stores/auth-store";
import { PERMISSIONS } from "@/lib/auth/permissions";
import type { FieldConfig } from "@/components/shared/entity-form-field";

export default function RolePermissionPage() {
  const compId = useAuthStore((s) => s.user?.compId ?? "");

  const { data: sites = [] } = useQuery({
    queryKey: ["user-group-sites", compId],
    queryFn: () => posLookupService.getSites(compId),
    enabled: !!compId,
  });

  const { data: authRoles = [] } = useQuery({
    queryKey: ["auth-roles"],
    queryFn: () => authRoleService.list(),
  });

  const fields: FieldConfig<SysUserGroupFormValues>[] = useMemo(
    () => [
      { name: "code", labelKey: "common.code", type: "text" },
      { name: "userGroupName", labelKey: "common.name", type: "text" },
      {
        name: "authRoleId",
        labelKey: "rolePermission.role",
        type: "select",
        options: authRoles.map((r) => ({ value: r.id, label: r.name })),
      },
      {
        name: "siteId",
        labelKey: "common.branch",
        type: "select",
        options: sites.map((s) => ({ value: s.siteID, label: s.siteName })),
      },
      { name: "allowedCompany", labelKey: "rolePermission.allowedCompany", type: "text" },
      { name: "active", labelKey: "common.active", type: "checkbox" },
    ],
    [sites, authRoles],
  );

  return (
    <CrudDataGridPage<SysUserGroup, SysUserGroupFormValues>
      queryKey="sys-user-group"
      titleKey="rolePermission.title"
      service={sysUserGroupService}
      schema={sysUserGroupSchema}
      fields={fields}
      permission={PERMISSIONS.SYSADMIN_MANAGE_USERS}
      defaultValues={{
        code: "",
        userGroupName: "",
        authRoleId: "",
        allowedCompany: "",
        siteId: "",
        active: true,
      }}
      toFormValues={(entity) => ({
        code: entity.code,
        userGroupName: entity.userGroupName,
        authRoleId: entity.authRoleId,
        allowedCompany: entity.allowedCompany ?? "",
        siteId: entity.siteID,
        active: entity.active,
      })}
      columns={[
        { dataField: "code", captionKey: "common.code", width: 100 },
        { dataField: "userGroupName", captionKey: "common.name" },
        {
          dataField: "authRoleId",
          captionKey: "rolePermission.role",
          width: 160,
          cellRender: (row) =>
            authRoles.find((r) => r.id === row.data.authRoleId)?.name ??
            (row.data.authRoleId as string),
        },
        { dataField: "active", captionKey: "common.status", width: 100 },
      ]}
    />
  );
}
