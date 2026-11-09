import { apiClient } from "../axios-client";

export interface DashboardInsights {
  insight: string;
  stats: {
    totalSales: number;
    transactionCount: number;
    topItems: { name: string; qty: number }[];
  };
}

// BCorDFWebApi's new DashboardInsightsController — computes today's real
// sales stats from PosHdr/PosDet and asks IOpenAiChatService to write a
// short narrative summary. Company-wide (all sites), not tied to a POS
// terminal session.
export const dashboardInsightsService = {
  getInsights: async (compId: string): Promise<DashboardInsights> => {
    const { data } = await apiClient.get<DashboardInsights>(`/DashboardInsights/${compId}`);
    return data;
  },
};
