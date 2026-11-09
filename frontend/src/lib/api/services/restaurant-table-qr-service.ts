import { apiClient } from "../axios-client";
import { useAuthStore } from "@/stores/auth-store";
import type { GenerateQrResultDto, RestaurantTableQRDto, UpdateRestaurantTableQRSettingsDto } from "@/types/qr-order";

// BCorDFWebApi's RestaurantTableQRController — staff-only, backs the
// Restaurant → Table QR Codes admin screen. Every write stamps `userName`
// from the current session rather than trusting a caller-supplied value,
// same convention as license-service.ts.
function currentUserName(): string {
  return useAuthStore.getState().user?.userName ?? "";
}

export const restaurantTableQRService = {
  getAllBySite: async (compId: string, siteId: string): Promise<RestaurantTableQRDto[]> => {
    const { data } = await apiClient.get<RestaurantTableQRDto[]>(`/RestaurantTableQR/${compId}/site/${siteId}`);
    return data;
  },

  generate: async (compId: string, siteId: string, tableCode: string): Promise<GenerateQrResultDto> => {
    const { data } = await apiClient.post<GenerateQrResultDto>(
      `/RestaurantTableQR/${compId}/${siteId}/${tableCode}/generate`,
      null,
      { params: { userName: currentUserName() } },
    );
    return data;
  },

  regenerate: async (compId: string, siteId: string, tableCode: string): Promise<GenerateQrResultDto> => {
    const { data } = await apiClient.post<GenerateQrResultDto>(
      `/RestaurantTableQR/${compId}/${siteId}/${tableCode}/regenerate`,
      null,
      { params: { userName: currentUserName() } },
    );
    return data;
  },

  generateAllMissing: async (compId: string, siteId: string): Promise<GenerateQrResultDto[]> => {
    const { data } = await apiClient.post<GenerateQrResultDto[]>(
      `/RestaurantTableQR/${compId}/${siteId}/generate-all-missing`,
      null,
      { params: { userName: currentUserName() } },
    );
    return data;
  },

  enable: async (compId: string, siteId: string, tableCode: string): Promise<void> => {
    await apiClient.post(`/RestaurantTableQR/${compId}/${siteId}/${tableCode}/enable`, null, {
      params: { userName: currentUserName() },
    });
  },

  disable: async (compId: string, siteId: string, tableCode: string): Promise<void> => {
    await apiClient.post(`/RestaurantTableQR/${compId}/${siteId}/${tableCode}/disable`, null, {
      params: { userName: currentUserName() },
    });
  },

  updateSettings: async (
    compId: string,
    siteId: string,
    tableCode: string,
    dto: UpdateRestaurantTableQRSettingsDto,
  ): Promise<RestaurantTableQRDto> => {
    const { data } = await apiClient.put<RestaurantTableQRDto>(
      `/RestaurantTableQR/${compId}/${siteId}/${tableCode}/settings`,
      dto,
      { params: { userName: currentUserName() } },
    );
    return data;
  },
};
