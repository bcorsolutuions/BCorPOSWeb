import { z } from "zod";

// Reseller/Super Admin "Create License" form — mirrors CreateClientLicenseDto
// (BCorDFWebApi Dto/License/LicenseActionDtos.cs). ModuleCodes is a plain
// string[] here rather than going through EntityFormField/FieldConfig (which
// has no multi-checkbox field type) — the reseller/licenses page renders it
// with its own checkbox group bound via react-hook-form's Controller.
export const createLicenseSchema = z.object({
  compID: z.string().min(1, "validation.required"),
  siteID: z.string().min(1, "validation.required"),
  siteName: z.string().optional(),
  licenseName: z.string().min(1, "validation.required"),
  productCode: z.string().min(1, "validation.required").default("SPOS"),
  customerCode: z.string().optional(),
  customerName: z.string().optional(),
  editionCode: z.string().min(1, "validation.required"),
  validFrom: z.string().min(1, "validation.required"),
  validTo: z.string().optional(),
  maximumUsers: z.coerce.number().min(0, "validation.mustBeZeroOrMore").optional(),
  maximumSites: z.coerce.number().min(0, "validation.mustBeZeroOrMore").optional(),
  maximumDevices: z.coerce.number().min(0, "validation.mustBeZeroOrMore").optional(),
  allowOfflineUse: z.boolean().default(true),
  offlineGraceDays: z.coerce.number().min(0, "validation.mustBeZeroOrMore").default(7),
  autoRenew: z.boolean().default(false),
  requireDeviceBinding: z.boolean().default(false),
  moduleCodes: z.array(z.string()).default([]),
  businessTypeCodes: z.array(z.string()).default([]),
});
export type CreateLicenseFormValues = z.infer<typeof createLicenseSchema>;

export const renewLicenseSchema = z.object({
  newValidTo: z.string().min(1, "validation.required"),
  remarks: z.string().optional(),
});
export type RenewLicenseFormValues = z.infer<typeof renewLicenseSchema>;

export const transferLicenseSchema = z.object({
  newCompID: z.string().min(1, "validation.required"),
  newCustomerCode: z.string().optional(),
  newCustomerName: z.string().optional(),
});
export type TransferLicenseFormValues = z.infer<typeof transferLicenseSchema>;
