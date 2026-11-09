import { apiClient } from "../axios-client";
import type { PosDto, PosSearchResult } from "@/types/pos";

// PosOperationsController.cs — held-bill recall, the shift-status
// pre-flight check, and the no-sale cash-drawer-open audit log.
export interface ShiftStatus {
  terminalId: string;
  shiftNo: number;
  isShiftOpen: boolean;
  lastDayCloseAt: string | null;
}

// X report / Shift Close (PosOperationsController): figures of the terminal's open shift, always computed by the server.
export interface ShiftPaymentLine {
  type: string;
  count: number;
  /** What was kept: cash is net of change handed back, returns are negative. */
  amount: number;
}

export interface ShiftReport {
  terminalId: string;
  shiftNo: number;
  generatedAt: string;
  alreadyClosed: boolean;
  salesCount: number;
  grossSales: number;
  discounts: number;
  tax: number;
  rounding: number;
  netSales: number;
  returnsCount: number;
  /** Negative: money handed back. */
  returnsValue: number;
  voidCount: number;
  voidValue: number;
  heldBills: number;
  netTakings: number;
  payments: ShiftPaymentLine[];
  totalPayments: number;
  cashNet: number;
  openingFloat: number;
  expectedCash: number;
  minDocNo?: number | null;
  maxDocNo?: number | null;
  firstBillAt?: string | null;
  lastBillAt?: string | null;
}

/** What happened to the general ledger posting of a closed shift (it never blocks the close). */
export interface GlPosting {
  status: "Posted" | "AlreadyPosted" | "Skipped" | "Failed" | "NotApplicable";
  message: string;
  jvDocNo?: number | null;
  jvRef?: string | null;
  totalDebit: number;
  /** Bills that were missing from the stock ledger and were posted there now. */
  stockBillsPosted: number;
  warnings: string[];
  lines: { glCode: string; glName: string; debit: number; credit: number; remarks?: string | null }[];
}

export interface ShiftCloseResult {
  glPosting?: GlPosting | null;
  report: ShiftReport;
  docNo: number;
  refNo?: string | null;
  openingCash: number;
  countedCash: number;
  expectedCash: number;
  /** Counted minus expected: positive = excess, negative = short. */
  overShort: number;
  bankDeposit: number;
  closedBy: string;
  closedAt: string;
}

export interface VoidBillResult {
  docNo: number;
  refNo?: string | null;
  status: string;
  voidedBy: string;
  approvedBy: string;
  voidedOn: string;
  stockMovementsReversed: number;
}

export const posOperationsService = {
  /**
   * Void a paid bill (PosOperationsController). A supervisor / admin voids directly; anyone else sends a supervisor's username and password
   * so the server can check them. The server refuses once the bill's shift is closed.
   */
  voidBill: async (
    compId: string,
    siteId: string,
    docNo: number,
    payload: { reason: string; supervisorUsername?: string; supervisorPassword?: string },
  ): Promise<VoidBillResult> => {
    const { data } = await apiClient.post<VoidBillResult>(`/PosOperations/${compId}/${siteId}/${docNo}/void`, payload);
    return data;
  },

  /** Posts a closed shift to the general ledger (again) - for a shift whose posting was skipped or failed. Safe to repeat. */
  postShiftToGl: async (compId: string, siteId: string, dayCloseDocNo: number): Promise<GlPosting> => {
    const { data } = await apiClient.post<GlPosting>(`/PosOperations/${compId}/${siteId}/shift-close/${dayCloseDocNo}/post-gl`);
    return data;
  },

  getXReport: async (compId: string, siteId: string, terminalId: string, shiftNo: number): Promise<ShiftReport> => {
    const { data } = await apiClient.get<ShiftReport>(`/PosOperations/${compId}/${siteId}/x-report`, {
      params: { terminalId, shiftNo },
    });
    return data;
  },

  closeShift: async (
    compId: string,
    siteId: string,
    payload: { terminalId: string; shiftNo: number; openingCash: number; countedCash: number; bankDeposit?: number },
  ): Promise<ShiftCloseResult> => {
    const { data } = await apiClient.post<ShiftCloseResult>(`/PosOperations/${compId}/${siteId}/shift-close`, payload);
    return data;
  },

  getHeldBills: async (compId: string, siteId: string, terminalId?: string): Promise<PosDto[]> => {
    const { data } = await apiClient.get<PosDto[]>(`/PosOperations/${compId}/${siteId}/held-bills`, {
      params: terminalId ? { terminalId } : undefined,
    });
    return data;
  },

  getShiftStatus: async (
    compId: string,
    siteId: string,
    terminalId: string,
    shiftNo: number,
  ): Promise<ShiftStatus> => {
    const { data } = await apiClient.get<ShiftStatus>(`/PosOperations/${compId}/${siteId}/shift-status`, {
      params: { terminalId, shiftNo },
    });
    return data;
  },

  /** Bill lookup/reprint history search — summary rows only; fetch the full bill via posService.get(docNo) once one is picked. */
  searchBills: async (
    compId: string,
    siteId: string,
    filters: {
      fromDate?: string;
      toDate?: string;
      tableCode?: string;
      docNo?: number;
      status?: string;
      custName?: string;
    },
  ): Promise<PosSearchResult[]> => {
    const { data } = await apiClient.get<PosSearchResult[]>(`/PosOperations/${compId}/${siteId}/search`, {
      params: filters,
    });
    return data;
  },

  logCashDrawerOpen: async (payload: {
    compId: string;
    siteId: string;
    terminalId: string;
    userName: string;
    reason: string;
  }): Promise<void> => {
    await apiClient.post("/PosOperations/cash-drawer-open", {
      compID: payload.compId,
      siteID: payload.siteId,
      terminalID: payload.terminalId,
      userName: payload.userName,
      reason: payload.reason,
    });
  },
};
