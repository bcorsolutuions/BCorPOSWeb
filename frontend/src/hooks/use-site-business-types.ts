"use client";

import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/axios-client";
import { useAuthStore } from "@/stores/auth-store";
import { usePosSessionStore } from "@/stores/pos-session-store";

interface SiteBusinessTypeDto {
  id: string;
  compID: string;
  siteID: string;
  businessTypeCode: string;
  isPrimary: boolean;
  active: boolean;
}

/**
 * The current POS session's site business types (see SiteBusinessTypeController —
 * existing backend endpoint, not consumed by any frontend screen before this).
 * Gates the POS sale screen's browse layout by the site's configured business
 * type, a narrower, more specific check than the app's usual license-module
 * gating:
 * - `hasSalon`: "When Site Business Type contains SAL, POS should support
 *   both SERVICES and PRODUCTS" (spec §3) — shows the tile grid plus the
 *   salon service/staff-picker flow.
 * - `isSupermarket`: "SUP" sites get a barcode-first layout (no tiles, no
 *   category tabs) suited to a large, fast-moving SKU catalog — see
 *   SupermarketScanPanel.
 */
export function useSiteBusinessTypes() {
  const compId = useAuthStore((s) => s.user?.compId ?? "");
  const siteId = usePosSessionStore((s) => s.siteId);

  const { data, isLoading } = useQuery({
    queryKey: ["site-business-types", compId, siteId],
    queryFn: async () => {
      const { data } = await apiClient.get<SiteBusinessTypeDto[]>(`/SiteBusinessType/${compId}/${siteId}`);
      return data;
    },
    enabled: !!compId && !!siteId,
  });

  const businessTypeCodes = (data ?? []).filter((r) => r.active).map((r) => r.businessTypeCode);

  return {
    businessTypeCodes,
    hasSalon: businessTypeCodes.includes("SAL"),
    isSupermarket: businessTypeCodes.includes("SUP"),
    /** Trading / wholesale branch (TRD, WHL). */
    isTrading: businessTypeCodes.includes("TRD") || businessTypeCodes.includes("WHL"),
    /** Tea shop (TEA): plain tile counter POS for tea and snacks — no tables, no services. */
    isTeaShop: businessTypeCodes.includes("TEA"),
    /** A retail till: supermarket, trading/wholesale or tea shop (and not also a salon, which has its own flow). */
    isRetail:
      (businessTypeCodes.includes("SUP") ||
        businessTypeCodes.includes("TRD") ||
        businessTypeCodes.includes("WHL") ||
        businessTypeCodes.includes("TEA")) &&
      !businessTypeCodes.includes("SAL"),
    isLoading,
  };
}
