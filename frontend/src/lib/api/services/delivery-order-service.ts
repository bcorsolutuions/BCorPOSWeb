import { apiClient } from "../axios-client";
import type { CreateDeliveryOrderInput, DeliveryOrderDto, DeliveryOrderStatus } from "@/types/delivery-order";

// BCorDFWebApi's DeliveryOrderController — a DocumentServiceNDetails-backed
// document (auto DocNo/RefNo numbering) header-only, wrapping the
// pre-existing dbo.DeliveryOrderHdr table.
export const deliveryOrderService = {
  getActive: async (compId: string, siteId: string): Promise<DeliveryOrderDto[]> => {
    const { data } = await apiClient.get<DeliveryOrderDto[]>(`/DeliveryOrder/${compId}/${siteId}/active`);
    return data;
  },

  create: async (
    compId: string,
    siteId: string,
    userName: string,
    payload: CreateDeliveryOrderInput,
  ): Promise<DeliveryOrderDto> => {
    const { data } = await apiClient.post<DeliveryOrderDto>(
      `/DeliveryOrder?compId=${compId}&siteId=${siteId}&userName=${encodeURIComponent(userName)}`,
      payload,
    );
    return data;
  },

  updateStatus: async (
    compId: string,
    siteId: string,
    docNo: number,
    userName: string,
    payload: { status: DeliveryOrderStatus; riderCode?: string | null; riderName?: string | null; riderPhone?: string | null },
  ): Promise<DeliveryOrderDto> => {
    const { data } = await apiClient.post<DeliveryOrderDto>(
      `/DeliveryOrder/${compId}/${siteId}/${docNo}/status?userName=${encodeURIComponent(userName)}`,
      payload,
    );
    return data;
  },
};
