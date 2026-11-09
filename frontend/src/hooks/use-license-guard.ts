"use client";

import { useEffect, useState, useCallback } from "react";
import { useAuthStore } from "@/stores/auth-store";
import { licenseService } from "@/lib/api/services/license-service";
import { getOrCreateDeviceId } from "@/lib/license-device-id";
import { getCachedLicenseStatus, cacheLicenseStatus, isCacheWithinGrace } from "@/lib/offline/license-cache";

const RECHECK_INTERVAL_MS = 4 * 60 * 60 * 1000; // ~4h, per the plan's validation-flow design

export type LicenseGuardState =
  | { kind: "skipped" }
  | { kind: "loading" }
  | { kind: "ok"; daysRemaining: number | null }
  | { kind: "warning"; daysRemaining: number | null }
  | { kind: "blocked"; message: string };

/**
 * SuperAdmin/ResellerAdmin aren't gated by a single tenant license (see
 * plan's validation-flow step 1) — only TenantAdmin/Admin users, whose
 * CompId *is* the tenant being licensed, go through this check.
 */
function isGatedRole(roles: string[]): boolean {
  return !roles.includes("SuperAdmin") && !roles.includes("ResellerAdmin");
}

export function useLicenseGuard(): LicenseGuardState {
  const user = useAuthStore((s) => s.user);
  const [state, setState] = useState<LicenseGuardState>({ kind: "loading" });

  const check = useCallback(async (compId: string) => {
    try {
      const result = await licenseService.validate(compId, getOrCreateDeviceId());
      cacheLicenseStatus({
        compId,
        isValid: result.isValid,
        licenseStatus: result.licenseStatus ?? null,
        validTo: result.validTo ?? null,
        daysRemaining: result.daysRemaining ?? null,
        offlineGraceDays: result.offlineGraceDays,
        message: result.message ?? null,
        checkedAt: new Date().toISOString(),
      });

      if (!result.isValid) {
        setState({ kind: "blocked", message: result.message ?? "License is not valid." });
      } else if (result.daysRemaining != null && result.daysRemaining <= 30) {
        setState({ kind: "warning", daysRemaining: result.daysRemaining });
      } else {
        setState({ kind: "ok", daysRemaining: result.daysRemaining ?? null });
      }
    } catch {
      // Online check failed (network down, backend unreachable) — fall back
      // to the last known-good result for up to its own OfflineGraceDays.
      const cached = getCachedLicenseStatus(compId);
      if (!cached) {
        // Never successfully validated yet — fail open rather than block a
        // legitimate session on a single transient request failure.
        setState({ kind: "ok", daysRemaining: null });
        return;
      }
      if (!isCacheWithinGrace(cached)) {
        setState({ kind: "blocked", message: "Unable to verify license and offline grace period has expired." });
        return;
      }
      if (!cached.isValid) {
        setState({ kind: "blocked", message: cached.message ?? "License is not valid." });
      } else if (cached.daysRemaining != null && cached.daysRemaining <= 30) {
        setState({ kind: "warning", daysRemaining: cached.daysRemaining });
      } else {
        setState({ kind: "ok", daysRemaining: cached.daysRemaining });
      }
    }
  }, []);

  useEffect(() => {
    if (!user) return;
    if (!isGatedRole(user.roles)) {
      setState({ kind: "skipped" });
      return;
    }

    const compId = user.compId;
    check(compId);

    const interval = setInterval(() => check(compId), RECHECK_INTERVAL_MS);
    const onFocus = () => check(compId);
    window.addEventListener("focus", onFocus);

    return () => {
      clearInterval(interval);
      window.removeEventListener("focus", onFocus);
    };
  }, [user, check]);

  return state;
}
