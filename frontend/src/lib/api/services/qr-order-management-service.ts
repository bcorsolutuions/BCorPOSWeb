import { apiClient } from "../axios-client";
import { useAuthStore } from "@/stores/auth-store";
import type { QROrderHdrDto, RestaurantServiceRequestDto } from "@/types/qr-order";

// BCorDFWebApi's QrOrderManagementController — staff-only Accept/Reject for
// held QR orders and the waiter/water/bill request queue. userName is
// stamped from the session, same convention as license-service.ts.
function currentUserName(): string {
  return useAuthStore.getState().user?.userName ?? "";
}

export const qrOrderManagementService = {
  getPending: async (compId: string, siteId: string): Promise<QROrderHdrDto[]> => {
    const { data } = await apiClient.get<QROrderHdrDto[]>(`/QrOrderManagement/${compId}/${siteId}/pending`);
    return data;
  },

  accept: async (compId: string, siteId: string, docNo: number): Promise<QROrderHdrDto> => {
    const { data } = await apiClient.post<QROrderHdrDto>(
      `/QrOrderManagement/${compId}/${siteId}/${docNo}/accept`,
      null,
      { params: { userName: currentUserName() } },
    );
    return data;
  },

  reject: async (compId: string, siteId: string, docNo: number, reason?: string): Promise<QROrderHdrDto> => {
    const { data } = await apiClient.post<QROrderHdrDto>(
      `/QrOrderManagement/${compId}/${siteId}/${docNo}/reject`,
      null,
      { params: { userName: currentUserName(), reason } },
    );
    return data;
  },

  getServiceRequests: async (compId: string, siteId: string): Promise<RestaurantServiceRequestDto[]> => {
    const { data } = await apiClient.get<RestaurantServiceRequestDto[]>(
      `/QrOrderManagement/${compId}/${siteId}/service-requests`,
    );
    return data;
  },

  updateServiceRequestStatus: async (
    compId: string,
    siteId: string,
    id: string,
    status: "ACKNOWLEDGED" | "COMPLETED",
  ): Promise<void> => {
    await apiClient.put(`/QrOrderManagement/${compId}/${siteId}/service-requests/${id}/status`, {
      status,
      updatedBy: currentUserName(),
    });
  },
};
