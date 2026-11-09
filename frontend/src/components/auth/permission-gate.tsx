"use client";

import { ReactNode } from "react";
import { usePermission } from "@/hooks/use-permission";
import type { PermissionKey } from "@/lib/auth/permissions";

interface PermissionGateProps {
  permission?: PermissionKey | string;
  anyOf?: (PermissionKey | string)[];
  role?: string;
  fallback?: ReactNode;
  children: ReactNode;
}

export function PermissionGate({ permission, anyOf, role, fallback = null, children }: PermissionGateProps) {
  const { can, canAny, isRole } = usePermission();

  const allowed =
    (permission ? can(permission) : true) &&
    (anyOf ? canAny(anyOf) : true) &&
    (role ? isRole(role) : true);

  return allowed ? <>{children}</> : <>{fallback}</>;
}
