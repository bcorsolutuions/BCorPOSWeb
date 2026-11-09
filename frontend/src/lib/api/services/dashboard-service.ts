import { apiClient } from "../axios-client";
import type { ApiEnvelope } from "@/types/common";

export interface DashboardSummary {
  todaySalesTotal: number;
  todaySalesChangePct: number;
  todayInvoiceCount: number;
  lowStockItemCount: number;
  pendingApprovalCount: number;
  topProducts: { name: string; qtySold: number; revenue: number }[];
  branchStatus: { branchName: string; salesTotal: number; isOnline: boolean }[];
  alerts: { id: string; severity: "info" | "warning" | "critical"; message: string }[];
}

export const dashboardService = {
  getSummary: async (): Promise<DashboardSummary> => {
    const { data } = await apiClient.get<ApiEnvelope<DashboardSummary>>("/dashboard/summary");
    return data.data;
  },
};

export interface ReportRequest {
  reportKey:
    | "sales-summary"
    | "sales-detailed"
    | "staff-commission"
    | "customer-history"
    | "inventory-valuation"
    | "financial-summary"
    | "branch-comparison"
    | "promotion-usage-report"
    | "promotion-discount-report"
    | "combo-sales-report"
    | "combo-item-consumption-report"
    | "coupon-usage-report"
    | "coupon-discount-report"
    | "unused-coupon-report"
    | "gift-voucher-issue-report"
    | "gift-voucher-redemption-report"
    | "gift-voucher-balance-report"
    | "gift-voucher-expiry-report"
    | "gift-voucher-transaction-history"
    | "set-menu-sales-report"
    | "set-menu-selection-report"
    | "bar-sales-report"
    | "bar-pending-orders-report"
    | "bar-stock-consumption-report"
    | "open-tab-report"
    | "loyalty-redemption-report"
    | "loyalty-points-report"
    | "stock-ledger-report";
  fromDate: string;
  toDate: string;
  branchId?: string;
  // Contextual per reportKey — see REPORT_FILTER_VISIBILITY in reports/page.tsx.
  customerCode?: string;
  promotionCode?: string;
  couponCode?: string;
  giftVoucherNo?: string;
  status?: string;
  /** Inventory item code — stock-ledger-report only (blank = every item). */
  itemCode?: string;
}

export interface ReportResult {
  columns: string[];
  rows: Record<string, string | number>[];
  // Keyed by the same column names as `columns` — a footer/summary row.
  // Not every column has an entry (non-numeric ones like date/branch don't).
  totals?: Record<string, string | number>;
}

// Real BCorDFWebApi ReportsController (Controllers/Documents/ReportsController.cs)
// — POST /api/Reports/custom, direct JSON in/out (no ApiEnvelope; that
// wrapper is a leftover-blueprint convention that was never backed by a
// real endpoint, same story as dashboardService.getSummary() above).
// sales-summary/branch-comparison are computed for real from PosHdr;
// inventory-valuation/financial-summary return 501 — not implemented yet.
export const reportService = {
  generate: async (compId: string, request: ReportRequest): Promise<ReportResult> => {
    const { data } = await apiClient.post<ReportResult>("/Reports/custom", {
      compId,
      siteId: request.branchId,
      reportKey: request.reportKey,
      fromDate: request.fromDate,
      toDate: request.toDate,
      customerCode: request.customerCode,
      promotionCode: request.promotionCode,
      couponCode: request.couponCode,
      giftVoucherNo: request.giftVoucherNo,
      status: request.status,
      itemCode: request.itemCode,
    });
    return data;
  },
};
