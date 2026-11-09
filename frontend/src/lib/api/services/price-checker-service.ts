import { apiClient, skipAuthRedirect } from "../axios-client";
import type { PriceCheckerKioskConfigDto, PriceCheckerResultDto } from "@/types/price-checker";

// BCorDFWebApi's PriceCheckerController — read-only, safe DTO, no
// [Authorize] required (the public kiosk has no session); an authenticated
// staff caller automatically gets a couple of extra fields server-side.
// The public kiosk page (no session by design) passes anonymous: true so a
// stray 401 never bounces a customer's browser to the staff login screen.
export const priceCheckerService = {
  check: async (compId: string, siteId: string, barcode: string, anonymous = false): Promise<PriceCheckerResultDto> => {
    const config = anonymous ? skipAuthRedirect() : undefined;
    const { data } = await apiClient.get<PriceCheckerResultDto>(
      `/PriceChecker/${compId}/${siteId}/${encodeURIComponent(barcode)}`,
      config,
    );
    return data;
  },
  getKioskConfig: async (compId: string, siteId: string): Promise<PriceCheckerKioskConfigDto> => {
    const { data } = await apiClient.get<PriceCheckerKioskConfigDto>(
      `/PriceChecker/${compId}/${siteId}/config`,
      skipAuthRedirect(),
    );
    return data;
  },
};
