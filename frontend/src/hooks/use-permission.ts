"use client";

import { useAuthStore } from "@/stores/auth-store";
import type { PermissionKey } from "@/lib/auth/permissions";

export function usePermission() {
  const hasPermission = useAuthStore((s) => s.hasPermission);
  const hasRole = useAuthStore((s) => s.hasRole);

  return {
    can: (permission: PermissionKey | string) => hasPermission(permission),
    canAny: (permissions: (PermissionKey | string)[]) => permissions.some(hasPermission),
    isRole: (role: string) => hasRole(role),
  };
}
