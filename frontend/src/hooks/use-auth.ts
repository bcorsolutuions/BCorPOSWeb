"use client";

import { useCallback } from "react";
import { useRouter } from "@/i18n/navigation";
import { useAuthStore } from "@/stores/auth-store";
import { authService } from "@/lib/api/services/auth-service";
import { licenseService } from "@/lib/api/services/license-service";
import { permissionsForRoles } from "@/lib/auth/role-permissions";
import type { AuthUser, LoginRequest } from "@/types/auth";

// SuperAdmin/ResellerAdmin are platform roles, not tied to a single tenant
// license — mirrors isGatedRole in use-license-guard.ts. Skipping the fetch
// for them isn't just an optimization: permissionsForRoles already returns
// "*" unconditionally for these roles regardless of licensedModules.
function isLicenseGatedRole(roles: string[]): boolean {
  return !roles.includes("SuperAdmin") && !roles.includes("ResellerAdmin");
}

export function useAuth() {
  const router = useRouter();
  const { user, accessToken, setSession, setPermissions, clearSession } = useAuthStore();

  const login = useCallback(
    async (payload: LoginRequest) => {
      const response = await authService.login(payload);
      const authUser: AuthUser = {
        userName: response.userName,
        email: response.email,
        compId: response.compId,
        fullName: response.fullName,
        resellerCode: response.resellerCode,
        roles: response.roles,
        // Unfiltered on first paint — narrowing to the company's actual
        // licensed modules happens right after, once that's known, so a
        // slow license lookup never blocks getting into the app at all.
        permissions: permissionsForRoles(response.roles),
      };
      setSession(authUser, response.token);

      if (isLicenseGatedRole(response.roles)) {
        void narrowPermissionsToLicense(response.compId, response.roles, setPermissions);
      }

      return authUser;
    },
    [setSession, setPermissions],
  );

  const logout = useCallback(() => {
    // BCorDFWebApi has no /logout endpoint (its tokens are stateless,
    // 1-day-lived) — signing out is purely a client-side session clear.
    clearSession();
    router.push("/login");
  }, [clearSession, router]);

  return {
    user,
    isAuthenticated: !!accessToken && !!user,
    login,
    logout,
  };
}

// Fetches the company's active license and re-derives permissions with its
// modules applied, then writes the narrower set back to the store. Fails
// silently (keeps the unfiltered permissions from login) on any error —
// a missing/unreachable license here shouldn't be what locks a user out;
// useLicenseGuard is the dedicated, user-visible surface for "this license
// isn't valid," not this best-effort narrowing pass.
async function narrowPermissionsToLicense(
  compId: string,
  roles: string[],
  setPermissions: (permissions: string[]) => void,
): Promise<void> {
  try {
    const licenses = await licenseService.list({ compId });
    const active = licenses.find((l) => l.licenseStatus === "ACTIVE") ?? licenses[0];
    if (!active) return;

    const detail = await licenseService.get(active.compID, active.code);
    const licensedModules = detail.modules.filter((m) => m.active).map((m) => m.moduleCode);
    setPermissions(permissionsForRoles(roles, licensedModules));
  } catch {
    // See comment above — intentionally not surfaced to the user.
  }
}
