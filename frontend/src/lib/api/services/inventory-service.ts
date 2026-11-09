import { createCrudService } from "../crud-service-factory";
import { apiClient } from "../axios-client";
import type { ApiEnvelope } from "@/types/common";
import type { StockTransfer, StockAdjustment } from "@/types/inventory";
import type { StockTransferFormValues, StockAdjustmentFormValues } from "@/schemas/inventory.schema";

export const stockTransferService = {
  ...createCrudService<StockTransfer, StockTransferFormValues>("/inventory/transfers"),
  confirmReceipt: async (id: string, receivedLines: { itemId: string; receivedQuantity: number }[]) => {
    const { data } = await apiClient.post<ApiEnvelope<StockTransfer>>(
      `/inventory/transfers/${id}/confirm-receipt`,
      { lines: receivedLines },
    );
    return data.data;
  },
};

export const stockAdjustmentService = createCrudService<StockAdjustment, StockAdjustmentFormValues>(
  "/inventory/counts",
);
