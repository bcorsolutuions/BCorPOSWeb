import type { AuditFields } from "./common";

// Real BCorDFWebApi PurchaseOrderController shape (compId+siteId+docNo
// scoped document, DocumentServiceNDetails<> engine — see kot-service.ts for
// the identical pattern). POStatus is a raw, untouched byte column on the
// backend — no enum/workflow exists there, so it's kept as a plain number
// here rather than a fabricated status union.
export interface PurchaseOrderDetail {
  id?: string;
  rowID?: number;
  itemType?: string | null;
  itemCode: string;
  itemName?: string | null;
  itemRemarks?: string | null;
  unitCode: string;
  qty: number;
  rate: number;
  discountPercentage?: number | null;
  discountAmount?: number | null;
  amount?: number | null;
  taxCode?: string | null;
  taxPercentage?: number | null;
  taxAmount?: number | null;
}

export interface PurchaseOrder {
  id: string;
  compID: string;
  siteID: string;
  docNo: number;
  docDt: string;
  refNo?: string | null;
  lastModifiedBy: string;
  lastModifiedOn?: string | null;
  vendorCode: string;
  currencyCode: string;
  remarks?: string | null;
  totalAmount?: number | null;
  itemTotal?: number | null;
  poStatus: number;
  details: PurchaseOrderDetail[];
}

export interface CreatePurchaseOrderDetailInput {
  itemCode: string;
  itemName?: string;
  unitCode: string;
  qty: number;
  rate: number;
  amount?: number;
  discountPercentage?: number;
  discountAmount?: number;
  taxPercentage?: number;
  taxAmount?: number;
}

export interface CreatePurchaseOrderInput {
  docDt: string;
  vendorCode: string;
  currencyCode: string;
  remarks?: string;
  itemTotal?: number;
  totalAmount?: number;
  totalDiscAmount?: number;
  details: CreatePurchaseOrderDetailInput[];
  consignmentCharges: [];
}

export interface GoodsReceiptLine {
  id?: string;
  itemId: string;
  itemName?: string;
  orderedQty: number;
  receivedQty: number;
  batchNo?: string;
  expiryDate?: string;
}

export interface GoodsReceipt extends AuditFields {
  id: string;
  grnNumber: string;
  poId: string;
  poNumber?: string;
  supplierId: string;
  supplierName?: string;
  receivedDate: string;
  lines: GoodsReceiptLine[];
}

// Real BCorDFWebApi PurchaseInvoiceController shape — same compId+siteId+
// docNo+userName document pattern as PurchaseOrder/GRN (DocumentServiceNDetails<>
// engine). The real detail DTO carries a lot of GL/costing fields
// (RefType/GLCode/AccCompID/PORefCode/...) this minimal screen never shows —
// those are sent with fixed technical defaults by purchase-service.ts, not
// surfaced in the UI (see PurchaseInvoiceDetDto in
// D:/Works/BCorApi/PowerDFWebApi/Dto/Documents/PurchaseInvoiceDto.cs).
// `Qty` on screen maps to the backend's `InvQty` (invoiced quantity) — the
// natural single quantity for a direct invoice not tied to a GRN; `Rate` maps
// to `Price`. Header has no separate tax total field, only `TotalDiscAmount`
// — the tax total shown on screen is a client-side sum of each line's
// `TaxAmount`, recomputed from `details[]` whenever a saved invoice is
// reopened, not persisted as its own header column.
export interface PurchaseInvoiceDetail {
  id?: string;
  rowID?: number;
  itemCode: string;
  itemName?: string | null;
  unitCode?: string | null;
  qty: number;
  rate: number;
  discountPercentage?: number | null;
  discountAmount?: number | null;
  amount?: number | null;
  taxPercentage?: number | null;
  taxAmount?: number | null;
  // What the line was raised against: refType "G" = a goods receipt, with that
  // receipt's document number in refDocNo (see purchase/invoices/page.tsx).
  refType?: string | null;
  refDocNo?: number | null;
  refDocCd?: number | null;
  poRefCode?: string | null;
  refRowID?: number | null;
  refCompID?: string | null;
  refSiteID?: string | null;
}

export interface PurchaseInvoice {
  id: string;
  compID: string;
  siteID: string;
  docNo: number;
  docDt: string;
  refNo?: string | null;
  posted?: boolean | null;
  lastModifiedBy: string;
  lastModifiedOn?: string | null;
  vendorCode: string;
  vendorBillNo?: string | null;
  vendorBillDate?: string | null;
  currencyCode?: string | null;
  remarks?: string | null;
  totalAmount?: number | null;
  totalDiscAmount?: number | null;
  details: PurchaseInvoiceDetail[];
}

export interface CreatePurchaseInvoiceDetailInput {
  itemCode: string;
  itemName?: string;
  unitCode?: string;
  qty: number;
  rate: number;
  amount: number;
  discountPercentage?: number;
  discountAmount?: number;
  taxPercentage?: number;
  taxAmount?: number;
  // Set only when this line was copied in from a Goods Receipt ("create
  // against GRN") — traces the line back to its source GRN row, same
  // RefType/PORefCode/RefRowID convention purchase/grn/page.tsx already uses
  // to trace a GRN line back to its source PO row (RefType "P" there, "G"
  // here). RefDocNo/RefDocCd/RefCompID/RefSiteID are extra traceability
  // fields the invoice DTO has that GRN's own linkage doesn't use.
  refType?: string;
  poRefCode?: string;
  refRowID?: number;
  refDocNo?: number;
  refDocCd?: number;
  refCompID?: string;
  refSiteID?: string;
}

export interface CreatePurchaseInvoiceInput {
  docDt: string;
  vendorCode: string;
  vendorBillNo?: string;
  vendorBillDate?: string;
  currencyCode?: string;
  remarks?: string;
  totalAmount: number;
  totalDiscAmount: number;
  details: CreatePurchaseInvoiceDetailInput[];
}
