"use client";

import { useQuery } from "@tanstack/react-query";
import { CrudDataGridPage } from "@/components/shared/crud-data-grid-page";
import { EntityFormField, type FieldConfig } from "@/components/shared/entity-form-field";
import { userAdminService, type ManagedUser } from "@/lib/api/services/user-admin-service";
import { authRoleService } from "@/lib/api/services/sys-user-group-service";
import { posLookupService } from "@/lib/api/services/pos-lookup-service";
import { userSchema, type UserFormValues } from "@/schemas/admin.schema";
import { useAuthStore } from "@/stores/auth-store";
import { PERMISSIONS } from "@/lib/auth/permissions";

// Platform roles only Super Admin may hand out (the API enforces this too).
const PLATFORM_ROLES = ["SuperAdmin", "ResellerAdmin"];

export default function UserManagementPage() {
  const compId = useAuthStore((s) => s.user?.compId ?? "");
  const isSuperAdmin = useAuthStore((s) => s.user?.roles.includes("SuperAdmin") ?? false);

  const { data: roles } = useQuery({ queryKey: ["auth-roles"], queryFn: authRoleService.list });
  const { data: sites } = useQuery({
    queryKey: ["user-mgmt-sites", compId],
    queryFn: () => posLookupService.getSites(compId),
    enabled: !!compId,
  });

  const fields: FieldConfig<UserFormValues>[] = [
    { name: "fullName", labelKey: "userMgmt.fullName", type: "text" },
    { name: "email", labelKey: "userMgmt.email", type: "text" },
    {
      name: "roleId",
      labelKey: "userMgmt.role",
      type: "select",
      options: (roles ?? [])
        .filter((r) => isSuperAdmin || !PLATFORM_ROLES.includes(r.name))
        .map((r) => ({ value: r.name, label: r.name })),
    },
    {
      name: "status",
      labelKey: "common.status",
      type: "select",
      options: [
        { value: "Active", label: "Active" },
        { value: "Inactive", label: "Inactive" },
      ],
    },
  ];

  const userNameField: FieldConfig<UserFormValues> = { name: "userName", labelKey: "userMgmt.userName", type: "text" };
  const siteField: FieldConfig<UserFormValues> = {
    name: "siteId",
    labelKey: "userMgmt.branch",
    type: "select",
    options: (sites ?? []).map((s) => ({ value: s.siteID, label: `${s.siteID} - ${s.siteName}` })),
  };

  return (
    <CrudDataGridPage<ManagedUser, UserFormValues>
      queryKey="users"
      titleKey="userMgmt.title"
      service={userAdminService}
      schema={userSchema}
      fields={fields}
      permission={PERMISSIONS.SYSADMIN_MANAGE_USERS}
      defaultValues={{ userName: "", fullName: "", email: "", password: "", roleId: "", siteId: "", status: "Active" }}
      toFormValues={(e) => ({
        userName: e.userName,
        fullName: e.fullName,
        email: e.email,
        password: "",
        roleId: e.roleName.split(", ")[0] ?? "",
        siteId: "",
        status: e.status,
      })}
      renderExtra={({ form, editingEntity }) => (
        <>
          {!editingEntity && <EntityFormField control={form.control} field={userNameField} />}
          <EntityFormField
            control={form.control}
            field={{
              name: "password",
              labelKey: editingEntity ? "userMgmt.newPassword" : "userMgmt.password",
              type: "password",
            }}
          />
          {!editingEntity && <EntityFormField control={form.control} field={siteField} />}
        </>
      )}
      columns={[
        { dataField: "userName", captionKey: "userMgmt.userName", width: 160 },
        { dataField: "fullName", captionKey: "userMgmt.fullName" },
        { dataField: "email", captionKey: "userMgmt.email" },
        { dataField: "roleName", captionKey: "userMgmt.role", width: 160 },
        { dataField: "status", captionKey: "common.status", width: 100 },
      ]}
    />
  );
}
