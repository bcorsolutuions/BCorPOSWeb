import { apiClient } from "../axios-client";
import { useAuthStore } from "@/stores/auth-store";
import type { RestaurantQrSiteSettingsDto, UpdateRestaurantQrSiteSettingsDto } from "@/types/qr-order";

// BCorDFWebApi's RestaurantQrSiteSettingsController — MasterController<>
// generic CRUD, keyed by (compId, code) where code == siteId (see the
// entity's own doc comment for why). Backs the Restaurant QR Settings panel.
function currentUserName(): string {
  return useAuthStore.getState().user?.userName ?? "";
}

export const restaurantQrSiteSettingsService = {
  /** Fetches this site's settings, creating a row with recommended defaults on first access. */
  getOrCreateBySite: async (compId: string, siteId: string): Promise<RestaurantQrSiteSettingsDto> => {
    const { data } = await apiClient.get<RestaurantQrSiteSettingsDto>(
      `/RestaurantQrSiteSettings/${compId}/site/${siteId}`,
      { params: { userName: currentUserName() } },
    );
    return data;
  },

  update: async (compId: string, siteId: string, dto: UpdateRestaurantQrSiteSettingsDto): Promise<void> => {
    await apiClient.put(`/RestaurantQrSiteSettings/${siteId}`, dto, { headers: { CompID: compId } });
  },
};
