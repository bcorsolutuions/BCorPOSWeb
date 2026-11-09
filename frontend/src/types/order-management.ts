import type { KotDto } from "@/types/restaurant";
import type { PosDto } from "@/types/pos";

export type OrderStatus =
  | "NEW"
  | "CONFIRMED"
  | "IN_PREPARATION"
  | "READY"
  | "SERVED"
  | "BILL_REQUESTED"
  | "COMPLETED"
  | "CANCELLED";

export interface OrderSummaryDto {
  docNo: number;
  compID: string;
  siteID: string;
  docDt: string;
  orderTime?: string | null;
  tableCode?: string | null;
  tableName?: string | null;
  tabCode?: string | null;
  floorCode?: string | null;
  waiterCode?: string | null;
  waiterName?: string | null;
  orderSource: string;
  orderTypeCode?: string | null;
  orderTypeName?: string | null;
  customerName?: string | null;
  itemCount: number;
  amount: number;
  status: OrderStatus;
  delayed: boolean;
  delayedMinutes?: number | null;
  stationBreakdown: Record<string, Record<string, number>>;
  posDocNo?: number | null;
  posStatus?: string | null;
  deliveryDocNo?: number | null;
  deliveryStatus?: string | null;
}

export interface OrdersPage {
  total: number;
  items: OrderSummaryDto[];
}

export interface OrderTimelineEventDto {
  at: string;
  event: string;
  actor?: string | null;
  detail?: string | null;
}

export interface DeliveryOrderDto {
  id: string;
  compID: string;
  siteID: string;
  docNo: number;
  docDt: string;
  refNo?: string | null;
  posRefNo: string;
  customerName: string;
  customerPhone: string;
  address?: string | null;
  deliveryZoneCode?: string | null;
  riderCode?: string | null;
  riderName?: string | null;
  riderPhone?: string | null;
  status: string;
  assignedOn?: string | null;
  deliveredOn?: string | null;
  remarks?: string | null;
}

export interface OrderDetailDto {
  kot: KotDto;
  status: OrderStatus;
  delayed: boolean;
  pos?: PosDto | null;
  delivery?: DeliveryOrderDto | null;
  timeline: OrderTimelineEventDto[];
}

export interface OrderDashboardDto {
  activeOrders: number;
  new: number;
  confirmed: number;
  preparing: number;
  ready: number;
  served: number;
  billRequested: number;
  delayed: number;
  dineIn: number;
  takeaway: number;
  delivery: number;
}

export interface OrderFilters {
  status?: string | null;
  source?: string | null;
  orderType?: string | null;
  floorCode?: string | null;
  tableCode?: string | null;
  waiterCode?: string | null;
  stationCode?: string | null;
  fromDate?: string | null;
  toDate?: string | null;
  search?: string | null;
  skip?: number;
  take?: number;
}

// OrderManagementSettingsController — admin CRUD shape.
export interface OrderManagementSettingsDto {
  compID: string;
  siteID: string;
  active: boolean;
  lastModifiedBy: string;
  lastModifiedOn?: string | null;
  enableOrderManagement: boolean;
  allowOrderEditAfterSend: boolean;
  allowOrderCancellation: boolean;
  requireCancelReason: boolean;
  requireCancelApproval: boolean;
  allowTransferTable: boolean;
  allowSplitTable: boolean;
  allowMergeTable: boolean;
  allowPaymentFromOrderManagement: boolean;
  showCompletedOrders: boolean;
  orderAutoRefreshSeconds: number;
  enableRealtimeOrderUpdates: boolean;
  delayedWarningMinutes: number;
  delayedCriticalMinutes: number;
}
