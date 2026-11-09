import { z } from "zod";

// One choice inside a course (e.g. "Beef Steak" inside "MAIN COURSE").
// menuCode stays plain text for v1 — same "ship the flat editor first"
// precedent as combo-master.schema.ts's componentCode.
export const setMenuGroupItemRowSchema = z.object({
  id: z.string().optional(),
  menuCode: z.string().min(1, "validation.required"),
  unitCode: z.string().optional(),
  additionalPrice: z.coerce.number().min(0, "validation.mustBeZeroOrMore").default(0),
  isDefault: z.boolean().default(false),
  displayOrder: z.coerce.number().min(0, "validation.mustBeZeroOrMore").default(0),
  active: z.boolean().default(true),
});
export type SetMenuGroupItemRowFormValues = z.infer<typeof setMenuGroupItemRowSchema>;

// One course/selection-step (e.g. "STARTER" — choose 1).
export const setMenuGroupRowSchema = z.object({
  id: z.string().optional(),
  groupCode: z.string().min(1, "validation.required"),
  groupName: z.string().min(1, "validation.required"),
  groupNameArb: z.string().optional(),
  sequence: z.coerce.number().min(0, "validation.mustBeZeroOrMore").default(1),
  minSelection: z.coerce.number().min(0, "validation.mustBeZeroOrMore").default(1),
  maxSelection: z.coerce.number().min(0, "validation.mustBeZeroOrMore").default(1),
  isRequired: z.boolean().default(true),
  displayOrder: z.coerce.number().min(0, "validation.mustBeZeroOrMore").default(0),
  active: z.boolean().default(true),
  items: z.array(setMenuGroupItemRowSchema).default([]),
});
export type SetMenuGroupRowFormValues = z.infer<typeof setMenuGroupRowSchema>;

// Real SetMenuMaster form — backs restaurant/set-menu/new and .../[id]
// against BCorDFWebApi's actual SetMenuMasterController (see
// types/set-menu.ts's SetMenuMasterDto for the full field list this mirrors).
export const setMenuSchema = z.object({
  code: z.string().min(1, "validation.required"),
  siteId: z.string().min(1, "validation.required"),
  setMenuName: z.string().min(1, "validation.required"),
  setMenuNameArb: z.string().optional(),
  description: z.string().optional(),
  menuCode: z.string().optional(),
  sellingPrice: z.coerce.number().min(0, "validation.mustBeZeroOrMore").default(0),
  taxCode: z.string().optional(),
  taxPercent: z.coerce.number().min(0, "validation.mustBeZeroOrMore").optional(),
  validFrom: z.string().optional(),
  validTo: z.string().optional(),
  startTime: z.string().optional(),
  endTime: z.string().optional(),
  // CSV of 3-letter day codes ("SUN,MON,...") — a multi-select day picker
  // in the UI joins/splits this string, not a free-text field.
  availableDays: z.string().optional(),
  allowDiscount: z.boolean().default(true),
  remarks: z.string().optional(),
  active: z.boolean().default(true),
  groups: z.array(setMenuGroupRowSchema).default([]),
});
export type SetMenuFormValues = z.infer<typeof setMenuSchema>;
