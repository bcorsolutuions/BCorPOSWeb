import { apiClient } from "../axios-client";
import type { CreateKotDetailInput, KotDto } from "@/types/restaurant";
import type {
  OrderDashboardDto,
  OrderDetailDto,
  OrderFilters,
  OrderManagementSettingsDto,
  OrdersPage,
} from "@/types/order-management";

// OrderManagementController.cs — read/coordination layer over the existing
// KOT/Pos/DeliveryOrder/RestaurantServiceRequest tables, not a new engine.
export const orderManagementService = {
  getOrders: async (compId: string, siteId: string, filters: OrderFilters = {}): Promise<OrdersPage> => {
    const { data } = await apiClient.get<OrdersPage>(`/OrderManagement/${compId}/${siteId}/orders`, {
      params: filters,
    });
    return data;
  },

  getOrderDetail: async (compId: string, siteId: string, docNo: number): Promise<OrderDetailDto> => {
    const { data } = await apiClient.get<OrderDetailDto>(`/OrderManagement/${compId}/${siteId}/orders/${docNo}`);
    return data;
  },

  getDashboard: async (compId: string, siteId: string): Promise<OrderDashboardDto> => {
    const { data } = await apiClient.get<OrderDashboardDto>(`/OrderManagement/${compId}/${siteId}/dashboard`);
    return data;
  },

  cancelItem: async (
    compId: string,
    siteId: string,
    docNo: number,
    payload: { rowId: string; reason?: string | null; approvedBy?: string | null; lastModifiedOn?: string | null; userName: string },
  ): Promise<KotDto> => {
    const { data } = await apiClient.post<KotDto>(`/OrderManagement/${compId}/${siteId}/orders/${docNo}/cancel-item`, payload);
    return data;
  },

  cancelOrder: async (
    compId: string,
    siteId: string,
    docNo: number,
    payload: { reason?: string | null; approvedBy?: string | null; lastModifiedOn?: string | null; userName: string },
  ): Promise<void> => {
    await apiClient.post(`/OrderManagement/${compId}/${siteId}/orders/${docNo}/cancel-order`, payload);
  },

  reprintKot: async (compId: string, siteId: string, docNo: number, reason: string | null, userName: string): Promise<KotDto> => {
    const { data } = await apiClient.post<KotDto>(`/OrderManagement/${compId}/${siteId}/orders/${docNo}/reprint-kot`, {
      reason,
      userName,
    });
    return data;
  },

  createStandaloneOrder: async (
    compId: string,
    siteId: string,
    payload: {
      orderTypeCode: string;
      diningTypeCode?: string | null;
      orderSource: "MAIN_POS" | "PHONE_ORDER";
      customerName?: string | null;
      customerMobile?: string | null;
      waiterCode?: string | null;
      terminalCode?: string | null;
      shiftNo?: number | null;
      idempotencyKey?: string | null;
      userName: string;
      details: CreateKotDetailInput[];
    },
  ): Promise<KotDto> => {
    const { data } = await apiClient.post<KotDto>(`/OrderManagement/${compId}/${siteId}/orders`, payload);
    return data;
  },
};

export const orderManagementSettingsService = {
  getBySite: async (compId: string, siteId: string): Promise<OrderManagementSettingsDto> => {
    const { data } = await apiClient.get<OrderManagementSettingsDto>(`/OrderManagementSettings/${compId}/site/${siteId}`);
    return data;
  },
};
