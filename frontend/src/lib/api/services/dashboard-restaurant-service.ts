import { apiClient } from "../axios-client";

export interface RestaurantKpis {
  sales: number;
  bills: number;
  averageBill: number;
  guests: number;
  spendPerGuest: number;
  discounts: number;
}

export interface RestaurantDashboardData {
  isRestaurant: true;
  from: string;
  to: string;
  days: number;
  previousFrom: string;
  previousTo: string;
  kpis: RestaurantKpis;
  /** The period of the same length immediately before `from`. */
  previous: RestaurantKpis;
  daily: { date: string; sales: number; bills: number }[];
  hourly: { hour: number; sales: number; bills: number }[];
  items: { code: string; name: string; category?: string | null; qty: number; amount: number }[];
  categories: { code: string; name?: string | null; qty: number; amount: number }[];
  paymentMix: { mode: string; count: number; amount: number }[];
  channels: { channel: string; bills: number; sales: number }[];
  waiters: { code: string; name?: string | null; bills: number; sales: number; guests: number; averageBill: number }[];
  leakage: {
    cancelledItems: number;
    cancelledQty: number;
    cancelledValue: number;
    voidedBills: number;
    voidedValue: number;
    returns: number;
    returnedValue: number;
    discounts: number;
    topReasons: { reason: string; count: number }[];
  };
  live: {
    tables: number;
    occupied: number;
    openOrders: number;
    itemsInKitchen: number;
    readyToServe: number;
    longestWaitMinutes: number;
    averagePrepMinutes?: number | null;
    prepSamples: number;
  };
}

// BCorDFWebApi DashboardRestaurantController — management roles of companies licensed for the RESTAURANT module only.
export const dashboardRestaurantService = {
  get: async (compId: string, from: string, to: string): Promise<RestaurantDashboardData | { isRestaurant: false }> => {
    const { data } = await apiClient.get<RestaurantDashboardData | { isRestaurant: false }>(`/DashboardRestaurant/${compId}`, {
      params: { from, to },
    });
    return data;
  },
};
