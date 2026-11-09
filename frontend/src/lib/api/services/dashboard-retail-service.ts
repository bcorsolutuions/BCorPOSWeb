import { apiClient } from "../axios-client";

export interface RetailKpis {
  sales: number;
  bills: number;
  averageBasket: number;
  units: number;
  itemsPerBasket: number;
  discounts: number;
  grossProfit: number;
  /** null when no sold item has a known cost. */
  marginPct: number | null;
  /** Share of the period's revenue whose cost is known. */
  costCoveragePct: number;
}

export interface RetailDashboardData {
  isRetail: true;
  /** True when a branch is a trading / wholesale one (shows the invoicing, purchasing and collections section). */
  isTrading: boolean;
  from: string;
  to: string;
  days: number;
  previousFrom: string;
  previousTo: string;
  kpis: RetailKpis;
  previous: RetailKpis;
  daily: { date: string; sales: number; bills: number }[];
  hourly: { hour: number; sales: number; bills: number }[];
  /** Weekday (0 = Sunday) x hour, averaged per occurrence of that weekday in the range. */
  heat: { dow: number; hour: number; sales: number; bills: number }[];
  items: { code: string; name: string; category?: string | null; qty: number; amount: number; profit?: number | null }[];
  profitItems: { code: string; name: string; category?: string | null; qty: number; amount: number; profit?: number | null }[];
  categories: { code: string; name?: string | null; qty: number; amount: number; marginPct?: number | null }[];
  paymentMix: { mode: string; count: number; amount: number }[];
  cashiers: { code: string; bills: number; sales: number; averageBasket: number; discounts: number }[];
  terminals: { code: string; bills: number; sales: number }[];
  leakage: {
    voidedBills: number;
    voidedValue: number;
    returns: number;
    returnedValue: number;
    discounts: number;
    priceOverrides: number;
    priceOverrideValue: number;
    wastageEntries: number;
    wastageValue: number;
    topWastageReason?: string | null;
  };
  stock: {
    trackedItems: number;
    stockValue: number;
    costedItems: number;
    outOfStock: number;
    outOfStockTopSellers: number;
    outOfStockSamples: string[];
    lowStock: number;
    negativeStock: number;
    negativeSamples: { code: string; name: string; onHand: number }[];
    atRiskTotal: number;
    atRisk: { code: string; name: string; category?: string | null; onHand: number; perDay: number; coverDays: number }[];
    deadItems: number;
    deadValue: number;
    deadSamples: { code: string; name: string; category?: string | null; onHand: number; value: number }[];
    deadDays: number;
    coverDays: number;
  };
  trading: {
    current: TradingTotals;
    previous: TradingTotals;
    flow: { date: string; invoiced: number; purchased: number }[];
    topCustomers: { code: string; name: string; invoices: number; total: number }[];
    topSuppliers: { code: string; name: string; bills: number; total: number }[];
    openPurchaseOrders: number;
    openPurchaseOrderValue: number;
  };
}

export interface TradingTotals {
  invoices: number;
  invoiced: number;
  purchaseBills: number;
  purchased: number;
  receipts: number;
  collected: number;
}

// BCorDFWebApi DashboardRetailController — management roles of companies with a supermarket / trading / wholesale branch only.
export const dashboardRetailService = {
  get: async (compId: string, from: string, to: string): Promise<RetailDashboardData | { isRetail: false }> => {
    const { data } = await apiClient.get<RetailDashboardData | { isRetail: false }>(`/DashboardRetail/${compId}`, {
      params: { from, to },
      timeout: 60_000,
    });
    return data;
  },
};
