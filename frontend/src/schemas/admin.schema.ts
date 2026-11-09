import { z } from "zod";

export const userSchema = z.object({
  // Create-only (login name and branch can't be changed afterwards).
  userName: z.string().optional(),
  fullName: z.string().min(1, "validation.required"),
  email: z.string().email("validation.invalidEmail"),
  // Required when creating (checked in userAdminService.create); left blank when editing = unchanged.
  password: z.string().optional(),
  // The role NAME (e.g. "Cashier") — Account/register takes the name, not the id.
  roleId: z.string().min(1, "validation.required"),
  siteId: z.string().optional(),
  status: z.enum(["Active", "Inactive"]).default("Active"),
});
export type UserFormValues = z.infer<typeof userSchema>;

export const companySettingsSchema = z.object({
  companyName: z.string().min(1, "validation.required"),
  companyAddress: z.string().optional(),
  taxRegistrationNo: z.string().optional(),
  active: z.boolean().default(true),
});
export type CompanySettingsFormValues = z.infer<typeof companySettingsSchema>;

export const integrationConfigSchema = z.object({
  enabled: z.boolean(),
  apiKey: z.string().optional(),
  endpoint: z.string().url("validation.invalidUrl").optional().or(z.literal("")),
});
export type IntegrationConfigFormValues = z.infer<typeof integrationConfigSchema>;

export const sysUserGroupSchema = z.object({
  code: z.string().min(1, "validation.required"),
  userGroupName: z.string().min(1, "validation.required"),
  authRoleId: z.string().min(1, "validation.required"),
  allowedCompany: z.string().optional(),
  siteId: z.string().min(1, "validation.required"),
  active: z.boolean().default(true),
});
export type SysUserGroupFormValues = z.infer<typeof sysUserGroupSchema>;
