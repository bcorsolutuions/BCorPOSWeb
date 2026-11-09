import { z } from "zod";
import { COMBO_COMPONENT_TYPES } from "@/types/combo";

// One combo component row. `componentCode` is a single UI-facing field that
// combo-master-service.ts's buildDetailsPayload fans out into the backend's
// menuCode/inventoryCode/serviceCode based on componentType — the admin
// screen never needs three parallel code inputs.
export const comboDetailRowSchema = z.object({
  id: z.string().optional(),
  groupNo: z.coerce.number().min(0, "validation.mustBeZeroOrMore").default(1),
  groupName: z.string().optional(),
  componentType: z.enum(COMBO_COMPONENT_TYPES),
  componentCode: z.string().min(1, "validation.required"),
  unitCode: z.string().optional(),
  isOptional: z.boolean().default(false),
  quantity: z.coerce.number().gt(0, "validation.mustBePositive").default(1),
  minimumSelection: z.coerce.number().min(0, "validation.mustBeZeroOrMore").default(0),
  maximumSelection: z.coerce.number().min(0, "validation.mustBeZeroOrMore").default(1),
  additionalPrice: z.coerce.number().min(0, "validation.mustBeZeroOrMore").default(0),
  isDefault: z.boolean().default(false),
  displayOrder: z.coerce.number().min(0, "validation.mustBeZeroOrMore").default(0),
});
export type ComboDetailRowFormValues = z.infer<typeof comboDetailRowSchema>;

// Real ComboMaster form — backs masters/combos/page.tsx against
// BCorDFWebApi's actual ComboMasterController (see types/combo.ts's
// ComboMasterDto for the full field list this mirrors).
export const comboSchema = z.object({
  code: z.string().min(1, "validation.required"),
  siteId: z.string().min(1, "validation.required"),
  comboName: z.string().min(1, "validation.required"),
  comboNameArb: z.string().optional(),
  menuCode: z.string().optional(),
  categoryCode: z.string().optional(),
  sellingPrice: z.coerce.number().min(0, "validation.mustBeZeroOrMore").default(0),
  taxCode: z.string().optional(),
  taxPercent: z.coerce.number().min(0, "validation.mustBeZeroOrMore").optional(),
  validFrom: z.string().optional(),
  validTo: z.string().optional(),
  allowDiscount: z.boolean().default(true),
  allowItemSubstitution: z.boolean().default(false),
  remarks: z.string().optional(),
  active: z.boolean().default(true),
  details: z.array(comboDetailRowSchema).default([]),
});
export type ComboFormValues = z.infer<typeof comboSchema>;
