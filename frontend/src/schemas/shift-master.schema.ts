import { z } from "zod";

// Mirrors ShiftMasterDto (BCorDFWebApi). Times are "HH:mm" in the form.
export const shiftSchema = z.object({
  code: z.string().min(1, "validation.required").max(10),
  shiftName: z.string().min(1, "validation.required"),
  shiftNameArb: z.string().optional(),
  siteId: z.string().min(1, "validation.required"),
  startTime: z.string().min(1, "validation.required"),
  endTime: z.string().min(1, "validation.required"),
  graceMinutes: z.coerce.number().min(0, "validation.mustBeZeroOrMore").default(0),
  openingCashRequired: z.boolean().default(false),
  closingCashRequired: z.boolean().default(false),
  allowMultipleCashiers: z.boolean().default(false),
  allowOverlappingShift: z.boolean().default(false),
  autoCloseShift: z.boolean().default(false),
  autoCloseAfterMinutes: z.coerce.number().min(0, "validation.mustBeZeroOrMore").optional(),
  displayOrder: z.coerce.number().min(0, "validation.mustBeZeroOrMore").default(0),
  remarks: z.string().optional(),
  active: z.boolean().default(true),
});
export type ShiftFormValues = z.infer<typeof shiftSchema>;
