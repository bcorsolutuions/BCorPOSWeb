import { z } from "zod";

// Real Sales Invoice entry form — backs sales/invoices/page.tsx against
// BCorDFWebApi's real SalesInvoiceController (see types/sales-invoice.ts).
// Basic invoice only: no payment/settlement fields (none exist on the
// backend DTO).

const salesInvoiceLineSchema = z.object({
  itemCode: z.string().min(1, "validation.required"),
  itemName: z.string().optional(),
  unitCode: z.string().optional(),
  quantity: z.coerce.number().positive("validation.required"),
  unitCost: z.coerce.number().min(0, "validation.mustBeZeroOrMore"),
  discountAmount: z.coerce.number().min(0, "validation.mustBeZeroOrMore").default(0),
  glCode: z.string().min(1, "validation.required"),
});

export const salesInvoiceSchema = z.object({
  custCode: z.string().min(1, "validation.required"),
  docDt: z.string().min(1, "validation.required"),
  remarks: z.string().optional(),
  lines: z.array(salesInvoiceLineSchema).min(1),
});

export type SalesInvoiceFormValues = z.infer<typeof salesInvoiceSchema>;
