import { z } from "zod";

// Real JV (Journal Voucher) entry form — backs accounting/vouchers/page.tsx
// against BCorDFWebApi's real JVController (see types/jv.ts). Double-entry
// bookkeeping requires total debits === total credits; enforced with
// .refine() below rather than trusting the (currently unwired) backend
// validation SP hook.

const jvLineSchema = z.object({
  glCode: z.string().min(1, "validation.required"),
  debitAmt: z.coerce.number().min(0, "validation.mustBeZeroOrMore").default(0),
  creditAmt: z.coerce.number().min(0, "validation.mustBeZeroOrMore").default(0),
  referenceNo: z.string().optional(), // no longer entered; an edited voucher keeps what its lines already hold
  remarks: z.string().optional(),
  // the saved line this row is (an edit); empty for a new line
  detailId: z.string().optional(),
  rowId: z.number().optional(),
  // customer / supplier account lines only: "1" New bill, "2" Against; the bill reference
  billType: z.string().optional(),
  billRef: z.string().optional(),
});

export const jvSchema = z
  .object({
    docDt: z.string().min(1, "validation.required"),
    jvRef: z.string().min(1, "validation.required"),
    narration: z.string().optional(),
    remarks: z.string().optional(),
    lines: z.array(jvLineSchema).min(2, "validation.required"),
  })
  .refine(
    (v) => {
      const totalDebit = v.lines.reduce((sum, l) => sum + l.debitAmt, 0);
      const totalCredit = v.lines.reduce((sum, l) => sum + l.creditAmt, 0);
      return totalDebit > 0 && Math.abs(totalDebit - totalCredit) < 0.001;
    },
    { message: "jv.unbalanced", path: ["lines"] },
  );

export type JVFormValues = z.infer<typeof jvSchema>;
