import type { AuditFields } from "./common";

export type StockTransferStatus = "Draft" | "InTransit" | "Received" | "Cancelled";

export interface StockTransferLine {
  id?: string;
  itemId: string;
  itemName?: string;
  quantity: number;
  receivedQuantity?: number;
}

export interface StockTransfer extends AuditFields {
  id: string;
  transferNumber: string;
  fromBranchId: string;
  fromBranchName?: string;
  toBranchId: string;
  toBranchName?: string;
  transferDate: string;
  status: StockTransferStatus;
  lines: StockTransferLine[];
}

export type StockAdjustmentReason =
  | "PhysicalCount"
  | "Damage"
  | "Expiry"
  | "Theft"
  | "Correction";

export interface StockAdjustmentLine {
  id?: string;
  itemId: string;
  itemName?: string;
  systemQty: number;
  actualQty: number;
  variance: number;
}

export interface StockAdjustment extends AuditFields {
  id: string;
  adjustmentNumber: string;
  warehouseId: string;
  warehouseName?: string;
  adjustmentDate: string;
  reason: StockAdjustmentReason;
  lines: StockAdjustmentLine[];
}
