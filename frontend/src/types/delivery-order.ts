// Real Delivery Order types — camelCase, matching BCorDFWebApi's
// DeliveryOrderController/DeliveryOrderDto, itself mapped onto the
// pre-existing dbo.DeliveryOrderHdr table (see
// D:\Works\BCorApi\PowerDFWebApi\Models\Documents\DeliveryOrderHdr.cs).
export const DELIVERY_ORDER_STATUSES = [
  "Pending",
  "Assigned",
  "Preparing",
  "Ready",
  "OutForDelivery",
  "Delivered",
  "Cancelled",
] as const;
export type DeliveryOrderStatus = (typeof DELIVERY_ORDER_STATUSES)[number];

export interface DeliveryOrderDto {
  id: string;
  compID: string;
  siteID: string;
  docNo: number;
  docDt: string;
  refNo?: string | null;
  lastModifiedBy: string;
  lastModifiedOn?: string | null;
  posted?: boolean | null;
  deleted?: boolean | null;
  posRefNo: string;
  customerName: string;
  customerPhone: string;
  address?: string | null;
  deliveryZoneCode?: string | null;
  riderCode?: string | null;
  riderName?: string | null;
  riderPhone?: string | null;
  status: DeliveryOrderStatus;
  assignedOn?: string | null;
  deliveredOn?: string | null;
  remarks?: string | null;
}

export interface CreateDeliveryOrderInput {
  docDt: string;
  posRefNo: string;
  customerName: string;
  customerPhone: string;
  address?: string | null;
  deliveryZoneCode?: string | null;
  remarks?: string | null;
}
