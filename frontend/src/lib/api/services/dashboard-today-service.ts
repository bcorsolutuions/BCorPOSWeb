import { apiClient } from "../axios-client";

export type TodayBillStatus = "Completed" | "InService" | "ServiceDone" | "Held" | "Returned" | "Voided";

export interface DashboardToday {
  isSalon: true;
  date: string;
  /** "mine" = a cashier's own bills only; "all" = every bill of the company (supervisor/admin). */
  scope: "mine" | "all";
  summary: {
    billCount: number;
    completedCount: number;
    salesTotal: number;
    averageBill: number;
    pendingCount: number;
    pendingAmount: number;
  };
  orderStatus: { status: TodayBillStatus; count: number; amount: number }[];
  collections: {
    total: number;
    refunds: number;
    net: number;
    byMode: { mode: string; count: number; amount: number }[];
  };
  bills: {
    docNo: number;
    siteId: string;
    time: string;
    customer?: string | null;
    terminalId: string;
    status: TodayBillStatus;
    netTotal: number;
    paidAmount: number;
    cashier?: string | null;
  }[];
}

// BCorDFWebApi DashboardTodayController — today's bills / status counts / collections, straight from PosHdr.
// Salon branches only: a company without a salon branch gets { isSalon: false } and the dashboard shows nothing.
export const dashboardTodayService = {
  get: async (compId: string, siteId?: string): Promise<DashboardToday | { isSalon: false }> => {
    const { data } = await apiClient.get<DashboardToday | { isSalon: false }>(`/DashboardToday/${compId}`, { params: { siteId } });
    return data;
  },
};
