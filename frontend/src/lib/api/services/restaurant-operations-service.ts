import { apiClient } from "../axios-client";
import type { CreatePosDto, PosDto } from "@/types/pos";
import type { FloorStatusEntry, KotDto, RestaurantTableDto } from "@/types/restaurant";

export interface OpenTabEntry {
  tabCode: string;
  customerName?: string | null;
  openKotDocNo?: number | null;
  heldBillDocNo?: number | null;
  openedOn?: string | null;
  runningTotal: number;
}

export interface BarDashboard {
  newOrders: number;
  preparing: number;
  ready: number;
  delayedOrders: number;
  openTabs: number;
  todaysOrders: number;
  todaysSales: number;
  avgPreparationMinutes: number;
}

// RestaurantOperationsController.cs — table-session workflow: open/close a
// table, transfer/merge tables, split one table's order into several bills.
export const restaurantOperationsService = {
  getFloorStatus: async (compId: string, siteId: string): Promise<FloorStatusEntry[]> => {
    const { data } = await apiClient.get<FloorStatusEntry[]>(`/RestaurantOperations/${compId}/${siteId}/floor-status`);
    return data;
  },

  openTable: async (
    compId: string,
    siteId: string,
    tableCode: string,
    payload: {
      waiterCode?: string | null;
      captainCode?: string | null;
      guestCount: number;
      orderTypeCode?: string | null;
      diningTypeCode?: string | null;
      userName: string;
    },
  ): Promise<RestaurantTableDto> => {
    const { data } = await apiClient.post<RestaurantTableDto>(
      `/RestaurantOperations/${compId}/${siteId}/tables/${tableCode}/open`,
      {
        waiterCode: payload.waiterCode,
        captainCode: payload.captainCode,
        guestCount: payload.guestCount,
        orderTypeCode: payload.orderTypeCode,
        diningTypeCode: payload.diningTypeCode,
        userName: payload.userName,
      },
    );
    return data;
  },

  closeTable: async (compId: string, siteId: string, tableCode: string, userName: string): Promise<RestaurantTableDto> => {
    const { data } = await apiClient.post<RestaurantTableDto>(
      `/RestaurantOperations/${compId}/${siteId}/tables/${tableCode}/close`,
      { userName },
    );
    return data;
  },

  transferTable: async (
    compId: string,
    siteId: string,
    fromTableCode: string,
    toTableCode: string,
    userName: string,
  ): Promise<{ fromTable: RestaurantTableDto; toTable: RestaurantTableDto }> => {
    const { data } = await apiClient.post<{ fromTable: RestaurantTableDto; toTable: RestaurantTableDto }>(
      `/RestaurantOperations/${compId}/${siteId}/tables/${fromTableCode}/transfer`,
      { toTableCode, userName },
    );
    return data;
  },

  mergeTables: async (
    compId: string,
    siteId: string,
    sourceTableCodes: string[],
    targetTableCode: string,
    userName: string,
  ): Promise<RestaurantTableDto> => {
    const { data } = await apiClient.post<RestaurantTableDto>(`/RestaurantOperations/${compId}/${siteId}/tables/merge`, {
      sourceTableCodes,
      targetTableCode,
      userName,
    });
    return data;
  },

  splitTable: async (
    compId: string,
    siteId: string,
    fromTableCode: string,
    payload: {
      toTableCode: string;
      guestCount?: number | null;
      lines: { detailId: string; qty: number }[];
      userName: string;
    },
  ): Promise<{ fromTable: RestaurantTableDto; toTable: RestaurantTableDto; toKotDocNo: number }> => {
    const { data } = await apiClient.post<{ fromTable: RestaurantTableDto; toTable: RestaurantTableDto; toKotDocNo: number }>(
      `/RestaurantOperations/${compId}/${siteId}/tables/${fromTableCode}/split`,
      {
        toTableCode: payload.toTableCode,
        guestCount: payload.guestCount,
        lines: payload.lines.map((l) => ({ detailId: l.detailId, qty: l.qty })),
        userName: payload.userName,
      },
    );
    return data;
  },

  splitBill: async (
    compId: string,
    siteId: string,
    tableCode: string,
    splits: CreatePosDto[],
    userName: string,
  ): Promise<PosDto[]> => {
    const { data } = await apiClient.post<PosDto[]>(
      `/RestaurantOperations/${compId}/${siteId}/tables/${tableCode}/split-bill`,
      { splits, userName },
    );
    return data;
  },

  // Bar Counter Management (§11/§12) — Open Tab.
  openTab: async (
    compId: string,
    siteId: string,
    payload: {
      customerName?: string | null;
      waiterCode?: string | null;
      captainCode?: string | null;
      orderTypeCode?: string | null;
      diningTypeCode?: string | null;
      terminalCode?: string | null;
      shiftNo?: number | null;
      userName: string;
    },
  ): Promise<KotDto> => {
    const { data } = await apiClient.post<KotDto>(`/RestaurantOperations/${compId}/${siteId}/tabs/open`, payload);
    return data;
  },

  getOpenTabs: async (compId: string, siteId: string): Promise<OpenTabEntry[]> => {
    const { data } = await apiClient.get<OpenTabEntry[]>(`/RestaurantOperations/${compId}/${siteId}/tabs`);
    return data;
  },

  transferTabToTable: async (
    compId: string,
    siteId: string,
    tabCode: string,
    toTableCode: string,
    userName: string,
  ): Promise<{ toTable: RestaurantTableDto }> => {
    const { data } = await apiClient.post<{ toTable: RestaurantTableDto }>(
      `/RestaurantOperations/${compId}/${siteId}/tabs/${tabCode}/transfer-to-table`,
      { toTableCode, userName },
    );
    return data;
  },

  // Bar Counter Management (§30).
  getBarDashboard: async (compId: string, siteId: string, stationCode?: string): Promise<BarDashboard> => {
    const { data } = await apiClient.get<BarDashboard>(`/RestaurantOperations/${compId}/${siteId}/bar-dashboard`, {
      params: stationCode ? { stationCode } : undefined,
    });
    return data;
  },
};
