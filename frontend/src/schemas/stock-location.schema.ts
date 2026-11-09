import { z } from "zod";

export const stockLocationSchema = z.object({
  code: z.string().min(1, "validation.required"),
  locationName: z.string().min(1, "validation.required"),
  locationNameArb: z.string().optional(),
  locationType: z.enum(["STORE", "BAR", "COUNTER", "KITCHEN", "OTHER"]).default("STORE"),
  displayOrder: z.coerce.number().min(0, "validation.mustBeZeroOrMore").default(0),
  siteId: z.string().min(1, "validation.required"),
  active: z.boolean().default(true),
});
export type StockLocationFormValues = z.infer<typeof stockLocationSchema>;
