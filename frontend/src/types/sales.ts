import type { AuditFields } from "./common";

export type PaymentStatus = "Paid" | "Unpaid" | "Partial";
export type InvoiceStatus = "Draft" | "Held" | "Completed" | "Voided" | "Returned";

export interface SalesInvoiceLine {
  id?: string;
  itemId: string;
  itemName?: string;
  quantity: number;
  unitPrice: number;
  discountAmount: number;
  taxAmount: number;
  lineTotal: number;
}

export interface SalesInvoice extends AuditFields {
  id: string;
  invoiceNumber: string;
  branchId: string;
  customerId?: string;
  customerName?: string;
  orderType: "DineIn" | "Takeaway" | "Delivery" | "Retail";
  status: InvoiceStatus;
  paymentStatus: PaymentStatus;
  lines: SalesInvoiceLine[];
  subTotal: number;
  taxTotal: number;
  discountTotal: number;
  grandTotal: number;
}
