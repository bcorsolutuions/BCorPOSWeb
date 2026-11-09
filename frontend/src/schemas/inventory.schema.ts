import { z } from "zod";

export const stockTransferSchema = z.object({
  fromBranchId: z.string().min(1, "validation.required"),
  toBranchId: z.string().min(1, "validation.required"),
  transferDate: z.string().min(1, "validation.required"),
  lines: z
    .array(
      z.object({
        itemId: z.string().min(1, "validation.required"),
        quantity: z.coerce.number().positive("validation.mustBePositive"),
      }),
    )
    .min(1, "validation.atLeastOneLine"),
});
export type StockTransferFormValues = z.infer<typeof stockTransferSchema>;

export const stockAdjustmentSchema = z.object({
  warehouseId: z.string().min(1, "validation.required"),
  adjustmentDate: z.string().min(1, "validation.required"),
  reason: z.enum(["PhysicalCount", "Damage", "Expiry", "Theft", "Correction"]),
  lines: z
    .array(
      z.object({
        itemId: z.string().min(1, "validation.required"),
        systemQty: z.coerce.number(),
        actualQty: z.coerce.number(),
      }),
    )
    .min(1, "validation.atLeastOneLine"),
});
export type StockAdjustmentFormValues = z.infer<typeof stockAdjustmentSchema>;
