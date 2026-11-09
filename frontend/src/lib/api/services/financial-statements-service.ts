import { apiClient } from "../axios-client";
import type { BalanceSheet, ChartApplyResult, ChartStatus, PartyGlStatus, PartyGlSyncResult, ProfitLoss } from "@/types/financial-statements";

/** siteId "ALL" (or empty) = every branch: the chart of accounts belongs to the company, not to one branch. */
export const financialStatementsService = {
  profitLoss: async (compId: string, fromDate: string, toDate: string, siteId: string): Promise<ProfitLoss> => {
    const { data } = await apiClient.get<ProfitLoss>(`/FinancialStatements/${compId}/profit-loss`, {
      params: { fromDate, toDate, siteId: siteId === "ALL" ? undefined : siteId },
    });
    return data;
  },

  balanceSheet: async (compId: string, asOfDate: string, siteId: string): Promise<BalanceSheet> => {
    const { data } = await apiClient.get<BalanceSheet>(`/FinancialStatements/${compId}/balance-sheet`, {
      params: { asOfDate, siteId: siteId === "ALL" ? undefined : siteId },
    });
    return data;
  },
};

export const partyGlAccountsService = {
  status: async (compId: string): Promise<PartyGlStatus> => {
    const { data } = await apiClient.get<PartyGlStatus>(`/PartyGlAccounts/${compId}`);
    return data;
  },

  /** Opens accounts for the customers and suppliers that have none. */
  sync: async (compId: string): Promise<PartyGlSyncResult> => {
    const { data } = await apiClient.post<PartyGlSyncResult>(`/PartyGlAccounts/${compId}/sync`);
    return data;
  },
};

export const chartOfAccountsService = {
  status: async (compId: string): Promise<ChartStatus> => {
    const { data } = await apiClient.get<ChartStatus>(`/ChartOfAccounts/${compId}/status`);
    return data;
  },

  apply: async (compId: string, templateCode: string, mode: "merge" | "replace"): Promise<ChartApplyResult> => {
    const { data } = await apiClient.post<ChartApplyResult>(`/ChartOfAccounts/${compId}/apply`, { templateCode, mode });
    return data;
  },
};
