import { apiClient } from "../axios-client";
import { useAuthStore } from "@/stores/auth-store";
import type { SysUserGroupDto, AuthRoleLookup } from "@/types/admin";
import type { SysUserGroupFormValues } from "@/schemas/admin.schema";

// Real BCorDFWebApi SysUserGroupController (Controllers/Masters/SysUserGroupController.cs).
export interface SysUserGroup extends SysUserGroupDto {
  id: string;
}

function toUserGroup(dto: SysUserGroupDto): SysUserGroup {
  return { ...dto, id: dto.code };
}

export const sysUserGroupService = {
  list: async (): Promise<{ items: SysUserGroup[]; total: number }> => {
    const compId = useAuthStore.getState().user?.compId ?? "";
    const { data } = await apiClient.get<SysUserGroupDto[]>(`/SysUserGroup/${compId}`);
    const items = data.map(toUserGroup);
    return { items, total: items.length };
  },

  create: async (payload: SysUserGroupFormValues): Promise<SysUserGroup> => {
    const user = useAuthStore.getState().user;
    const compId = user?.compId ?? "";
    const { data } = await apiClient.post<SysUserGroupDto>(
      "/SysUserGroup",
      {
        code: payload.code,
        compID: compId,
        siteID: payload.siteId,
        active: payload.active,
        lastModifiedBy: user?.userName ?? "",
        authRoleId: payload.authRoleId,
        userGroupName: payload.userGroupName,
        allowedCompany: payload.allowedCompany || null,
      },
      { headers: { CompID: compId } },
    );
    return toUserGroup(data);
  },

  update: async (code: string, payload: SysUserGroupFormValues): Promise<SysUserGroup> => {
    const user = useAuthStore.getState().user;
    const compId = user?.compId ?? "";
    const { data } = await apiClient.put<SysUserGroupDto>(
      `/SysUserGroup/${code}`,
      {
        active: payload.active,
        lastModifiedBy: user?.userName ?? "",
        authRoleId: payload.authRoleId,
        userGroupName: payload.userGroupName,
        allowedCompany: payload.allowedCompany || null,
      },
      { headers: { CompID: compId } },
    );
    return toUserGroup(data);
  },

  remove: async (code: string): Promise<void> => {
    const compId = useAuthStore.getState().user?.compId ?? "";
    const userName = useAuthStore.getState().user?.userName ?? "";
    await apiClient.delete(`/SysUserGroup/${compId}/${code}`, { params: { user: userName } });
  },
};

export const authRoleService = {
  list: async (): Promise<AuthRoleLookup[]> => {
    const { data } = await apiClient.get<AuthRoleLookup[]>("/Account/roles");
    return data;
  },
};
