import { apiClient } from "../axios-client";
import { useAuthStore } from "@/stores/auth-store";
import type { UserFormValues } from "@/schemas/admin.schema";

// Real BCorDFWebApi AccountController: GET users?compId, POST register (role as a header), PUT/DELETE users/{userName}.
// (User Management used to call a /sysadmin/users endpoint that doesn't exist, so no user could ever be created.)
export interface ManagedUser {
  id: string; // = userName
  userName: string;
  fullName: string;
  email: string;
  roleName: string;
  status: "Active" | "Inactive";
}

interface UserListItemDto {
  userId: string;
  fullName?: string | null;
  email?: string | null;
  roles: string[];
  isActive: boolean;
}

function toManagedUser(dto: UserListItemDto): ManagedUser {
  return {
    id: dto.userId,
    userName: dto.userId,
    fullName: dto.fullName ?? "",
    email: dto.email ?? "",
    roleName: dto.roles.join(", "),
    status: dto.isActive ? "Active" : "Inactive",
  };
}

export const userAdminService = {
  list: async (): Promise<{ items: ManagedUser[]; total: number }> => {
    const compId = useAuthStore.getState().user?.compId ?? "";
    const { data } = await apiClient.get<UserListItemDto[]>("/Account/users", { params: { compId } });
    const items = data.map(toManagedUser);
    return { items, total: items.length };
  },

  create: async (payload: UserFormValues): Promise<ManagedUser> => {
    const compId = useAuthStore.getState().user?.compId ?? "";
    if (!payload.userName?.trim()) throw new Error("Username is required.");
    if (!payload.password) throw new Error("Password is required.");
    if (!payload.siteId) throw new Error("Branch is required.");
    await apiClient.post(
      "/Account/register",
      {
        username: payload.userName.trim(),
        email: payload.email,
        password: payload.password,
        compId,
        siteId: payload.siteId,
        fullName: payload.fullName,
      },
      { headers: { role: payload.roleId } },
    );
    return {
      id: payload.userName.trim(),
      userName: payload.userName.trim(),
      fullName: payload.fullName,
      email: payload.email,
      roleName: payload.roleId,
      status: "Active",
    };
  },

  update: async (id: string, payload: UserFormValues): Promise<ManagedUser> => {
    await apiClient.put(`/Account/users/${encodeURIComponent(id)}`, {
      fullName: payload.fullName,
      email: payload.email,
      role: payload.roleId,
      password: payload.password || null,
      isActive: payload.status === "Active",
    });
    return {
      id,
      userName: id,
      fullName: payload.fullName,
      email: payload.email,
      roleName: payload.roleId,
      status: payload.status,
    };
  },

  // Deactivates (the user can no longer sign in) — history keeps pointing at the user.
  remove: async (id: string): Promise<void> => {
    await apiClient.delete(`/Account/users/${encodeURIComponent(id)}`);
  },
};
