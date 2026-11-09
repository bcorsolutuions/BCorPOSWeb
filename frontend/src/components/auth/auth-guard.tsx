"use client";

import { ReactNode, useEffect } from "react";
import { useRouter, usePathname } from "@/i18n/navigation";
import { useAuthStore, useAuthHydrated } from "@/stores/auth-store";
import { usePosSessionStore } from "@/stores/pos-session-store";
import { waiterMobileService } from "@/lib/api/services/waiter-mobile-service";
import { isTokenExpired } from "@/lib/auth/jwt";
import { Skeleton } from "@/components/ui/skeleton";

const NOT_WAITER_KEY = "bcor-not-a-waiter";

function isPhone(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(max-width: 767px)").matches || /iPhone|iPod|Android.+Mobile/i.test(navigator.userAgent);
}

/**
 * Client-side gate for the (dashboard) and (pos) route groups. This is UX
 * only, not the security boundary — middleware.ts already redirects
 * unauthenticated requests before the page renders, and every API call is
 * independently re-validated server-side (defense in depth, see
 * 11-security-plan.md). This guard's job is just to avoid a flash of
 * protected content while the client store is rehydrating from storage —
 * which means it must actually wait for that rehydration (useAuthHydrated)
 * before deciding to redirect, or it bounces a genuinely logged-in user on
 * every reload/deep-link (see that hook's comment for why).
 */
export function AuthGuard({ children }: { children: ReactNode }) {
  const router = useRouter();
  const hydrated = useAuthHydrated();
  const { user, accessToken, clearSession } = useAuthStore();
  const pathname = usePathname();
  const setSiteId = usePosSessionStore((s) => s.setSiteId);

  // A waiter who signs in on a phone belongs in the waiter app, not on the desktop POS screens. Asked once per sign-in and
  // remembered for the tab, so a cashier / manager on a phone is never delayed or redirected.
  useEffect(() => {
    if (!hydrated || !accessToken || !user || isTokenExpired(accessToken)) return;
    if (pathname.startsWith("/mobile") || !isPhone()) return;
    try {
      if (window.sessionStorage.getItem(NOT_WAITER_KEY) === user.userName) return;
    } catch {
      /* storage blocked - just ask each time */
    }
    let cancelled = false;
    waiterMobileService
      .whoAmI(user.compId, user.userName)
      .then((me) => {
        if (cancelled) return;
        if (me.isWaiter) {
          if (me.siteId && !usePosSessionStore.getState().siteId) setSiteId(me.siteId);
          router.replace("/mobile");
        } else {
          try {
            window.sessionStorage.setItem(NOT_WAITER_KEY, user.userName);
          } catch {
            /* ignore */
          }
        }
      })
      .catch(() => {
        // Waiter ordering not licensed / API unreachable: stay where we are.
        try {
          window.sessionStorage.setItem(NOT_WAITER_KEY, user.userName);
        } catch {
          /* ignore */
        }
      });
    return () => {
      cancelled = true;
    };
  }, [hydrated, accessToken, user, pathname, router, setSiteId]);

  useEffect(() => {
    if (!hydrated) return;

    if (!accessToken || !user) {
      router.replace("/login");
      return;
    }
    if (isTokenExpired(accessToken)) {
      clearSession();
      router.replace("/login");
    }
  }, [hydrated, accessToken, user, router, clearSession]);

  if (!hydrated || !accessToken || !user) {
    return (
      <div className="flex h-screen flex-col gap-4 p-8">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-full w-full" />
      </div>
    );
  }

  return <>{children}</>;
}
