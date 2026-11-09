import { apiClient } from "../axios-client";
import type { MyTableEntry, WaiterProfileDto } from "@/types/waiter-mobile";

// WaiterMobileController.cs — the handful of endpoints the mobile PWA needs
// beyond what's already reused verbatim (login, floor-status, KOT create/
// update, transfer/split table, Open Item).
export const waiterMobileService = {
  /** Is this login a waiter (for any branch), and which branch? Quiet: answers isWaiter=false for everyone else. */
  whoAmI: async (
    compId: string,
    userName: string,
  ): Promise<{ isWaiter: boolean; siteId?: string; waiterCode?: string; waiterName?: string }> => {
    const { data } = await apiClient.get<{ isWaiter: boolean; siteId?: string; waiterCode?: string; waiterName?: string }>(
      `/WaiterMobile/${compId}/me`,
      { params: { userName } },
    );
    return data;
  },

  getMyProfile: async (compId: string, siteId: string, userName: string): Promise<WaiterProfileDto> => {
    const { data } = await apiClient.get<WaiterProfileDto>(`/WaiterMobile/${compId}/${siteId}/my-profile`, {
      params: { userName },
    });
    return data;
  },

  getMyTables: async (compId: string, siteId: string, userName: string): Promise<MyTableEntry[]> => {
    const { data } = await apiClient.get<MyTableEntry[]>(`/WaiterMobile/${compId}/${siteId}/my-tables`, {
      params: { userName },
    });
    return data;
  },

  requestBill: async (compId: string, siteId: string, tableCode: string, userName: string): Promise<{ message: string }> => {
    const { data } = await apiClient.post<{ message: string }>(`/WaiterMobile/${compId}/${siteId}/request-bill`, {
      tableCode,
      userName,
    });
    return data;
  },
};
