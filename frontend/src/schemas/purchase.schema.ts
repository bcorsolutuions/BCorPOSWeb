import { z } from "zod";

// Matches the real CreatePurchaseOrderDto/CreatePurchaseOrderDetailDto shape
// (see types/purchase.ts) — no expectedDate/branchId/supplierId, since the
// real create DTO has no expected-delivery-date field and site/vendor are
// addressed by siteId query param + vendorCode, not a supplierId/branchId.
const poLineItem = z.object({
  itemCode: z.string().min(1, "validation.required"),
  itemName: z.string().optional(),
  unitCode: z.string().min(1, "validation.required"),
  qty: z.coerce.number().positive("validation.mustBePositive"),
  rate: z.coerce.number().min(0, "validation.mustBeZeroOrMore"),
  discountPercentage: z.coerce.number().min(0).max(100).optional(),
  taxPercentage: z.coerce.number().min(0).optional(),
});

export const purchaseOrderSchema = z.object({
  vendorCode: z.string().min(1, "validation.required"),
  docDt: z.string().min(1, "validation.required"),
  currencyCode: z.string().min(1, "validation.required"),
  remarks: z.string().optional(),
  lines: z.array(poLineItem).min(1, "validation.atLeastOneLine"),
});
export type PurchaseOrderFormValues = z.infer<typeof purchaseOrderSchema>;

// Matches the real CreateGRNDto/CreateGRNDetDto shape (see types/grn.ts).
// GRN is prepared AGAINST a PO — poDocNo drives the item list (fetched via
// purchaseOrderService.get and copied into `lines`), so lines aren't picked
// freehand the way purchaseOrderSchema's are.
const grnLineItem = z.object({
  itemCode: z.string().min(1, "validation.required"),
  itemName: z.string().optional(),
  unitCode: z.string().min(1, "validation.required"),
  orderedQty: z.coerce.number(),
  qty: z.coerce.number().positive("validation.mustBePositive"),
  rate: z.coerce.number().min(0, "validation.mustBeZeroOrMore"),
  discountPercentage: z.coerce.number().min(0).max(100).optional(),
  poRefCode: z.string(),
  refRowID: z.coerce.number(),
});

export const goodsReceiptSchema = z.object({
  poDocNo: z.coerce.number().positive("validation.required"),
  vendorCode: z.string().min(1, "validation.required"),
  docDt: z.string().min(1, "validation.required"),
  vendorDNRefNo: z.string().optional(),
  remarks: z.string().optional(),
  lines: z.array(grnLineItem).min(1, "validation.atLeastOneLine"),
});
export type GoodsReceiptFormValues = z.infer<typeof goodsReceiptSchema>;

// Matches the real CreatePurchaseInvoiceDto/CreatePurchaseInvoiceDetDto shape
// (see types/purchase.ts) — vendorCode/docDt/vendorBillNo/vendorBillDate/
// remarks at header, discount%/tax% optional per line since the backend
// supports them but a minimal invoice doesn't require them.
const invoiceLineItem = z.object({
  itemCode: z.string().min(1, "validation.required"),
  itemName: z.string().optional(),
  unitCode: z.string().optional(),
  qty: z.coerce.number().positive("validation.mustBePositive"),
  rate: z.coerce.number().min(0, "validation.mustBeZeroOrMore"),
  discountPercentage: z.coerce.number().min(0).max(100).optional(),
  taxPercentage: z.coerce.number().min(0).optional(),
  // Set only when this line was copied in from a Goods Receipt ("create
  // against GRN" — see purchase/invoices/page.tsx's handleGrnSelect) — traced
  // through to CreatePurchaseInvoiceDetailInput unchanged. Never user-edited.
  refType: z.string().optional(),
  poRefCode: z.string().optional(),
  refRowID: z.coerce.number().optional(),
  refDocNo: z.coerce.number().optional(),
  refDocCd: z.coerce.number().optional(),
  refCompID: z.string().optional(),
  refSiteID: z.string().optional(),
});

export const purchaseInvoiceSchema = z.object({
  vendorCode: z.string().min(1, "validation.required"),
  docDt: z.string().min(1, "validation.required"),
  vendorBillNo: z.string().optional(),
  vendorBillDate: z.string().optional(),
  remarks: z.string().optional(),
  lines: z.array(invoiceLineItem).min(1, "validation.atLeastOneLine"),
});
export type PurchaseInvoiceFormValues = z.infer<typeof purchaseInvoiceSchema>;
