import { useEffect, useState } from "react";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { AuthUser } from "@/types/auth";

// Zustand `persist` keeps the session in localStorage for the SPA client;
// middleware.ts runs on the edge before any client JS, so it needs its own
// readable (non-httpOnly) cookie mirror purely as a route-gate signal.
// The cookie is NOT the security boundary — every API call still carries
// the bearer token and is re-validated server-side (see 11-security-plan.md).
function syncGateCookie(token: string | null) {
  if (typeof document === "undefined") return;
  if (token) {
    document.cookie = `bcor_access_token=${token}; path=/; SameSite=Lax; max-age=${60 * 60 * 24}`;
  } else {
    document.cookie = "bcor_access_token=; path=/; max-age=0";
  }
}

interface AuthState {
  user: AuthUser | null;
  accessToken: string | null;
  setSession: (user: AuthUser, accessToken: string) => void;
  clearSession: () => void;
  // Narrows an already-logged-in user's permission set once their company's
  // licensed modules are known (see useAuth's post-login effect) — a no-op
  // if the session has since been cleared (e.g. logged out mid-fetch).
  setPermissions: (permissions: string[]) => void;
  hasPermission: (permission: string) => boolean;
  hasRole: (role: string) => boolean;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      setSession: (user, accessToken) => {
        syncGateCookie(accessToken);
        set({ user, accessToken });
      },
      clearSession: () => {
        syncGateCookie(null);
        set({ user: null, accessToken: null });
      },
      setPermissions: (permissions) => {
        const { user } = get();
        if (!user) return;
        set({ user: { ...user, permissions } });
      },
      hasPermission: (permission) => {
        const { user } = get();
        if (!user) return false;
        return user.permissions.includes(permission) || user.permissions.includes("*");
      },
      hasRole: (role) => {
        const { user } = get();
        return !!user?.roles.includes(role);
      },
    }),
    {
      name: "bcor-auth",
      partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken,
      }),
    },
  ),
);

/**
 * `persist` reads localStorage asynchronously after the store is created —
 * on the very first client render, `user`/`accessToken` are still their
 * pre-hydration defaults (null), even for a genuinely logged-in user who
 * just reloaded the page. AuthGuard must wait for this before deciding
 * whether to redirect to login, or it bounces every deep-link/reload of a
 * protected route regardless of session state (a real bug this hook fixes).
 */
export function useAuthHydrated(): boolean {
  // `.persist` is attached by zustand's persist middleware only when a
  // storage backend resolves; during SSR `localStorage` doesn't exist, so
  // `createJSONStorage` silently fails and `.persist` is never set on the
  // server-evaluated module instance. Guard the SSR-reachable initializer;
  // the effect below only ever runs client-side, where `.persist` is real.
  // Starts false on purpose, even though localStorage hydrates synchronously on the client:
  // during React's hydration render zustand still serves the *initial* (logged-out) snapshot
  // (getServerSnapshot), so a `true` here would let AuthGuard's first effect run with
  // user/accessToken === null and bounce a genuinely logged-in user to /login on every full
  // page load or new window (e.g. the Customer Display popup). The effect below flips it
  // after hydration, in the same commit in which the real snapshot arrives.
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    if (useAuthStore.persist.hasHydrated()) {
      setHydrated(true);
      return;
    }
    return useAuthStore.persist.onFinishHydration(() => setHydrated(true));
  }, []);

  return hydrated;
}
