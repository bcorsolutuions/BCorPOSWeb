import type { AuditFields, EntityStatus } from "./common";

export interface AppUser extends AuditFields {
  id: string;
  fullName: string;
  email: string;
  roleId: string;
  roleName?: string;
  branchIds: string[];
  status: EntityStatus;
  lastLoginAt?: string;
}

// Real BCorDFWebApi SysUserGroupController — a "user group" assigns a
// company/branch-scoped code to one of the fixed ASP.NET Core Identity
// roles (AuthRoleId) seeded in DataContext (Admin, User, Hr, Payroll,
// Accounts, Cashier, POSSupervisor). There is no separate per-permission
// grant table on the backend, so this page manages user-group-to-role
// mapping rather than a permission matrix.
export interface SysUserGroupDto {
  id: string;
  code: string;
  authRoleId: string;
  userGroupName: string;
  allowedCompany?: string | null;
  active: boolean;
  compID: string;
  siteID: string;
  lastModifiedBy: string;
  lastModifiedOn?: string | null;
}

export interface AuthRoleLookup {
  id: string;
  name: string;
}

// Real BCorDFWebApi SysCompanyMastController. One row per (CompId, LKey) —
// this app only ever uses LKey "1" — so there is no per-language name/locale
// field on the backend; the System Settings page edits companyName/
// compAddress/taxRegisterNo/active and passes every other field (financial
// period dates, GL codes, CompGroupId, ...) straight through unchanged on
// save (see settingsService.updateCompanySettings).
export interface SysCompanyMastDto {
  compId: string;
  compCode: string;
  companyName: string;
  compAddress?: string | null;
  finPeriodStart?: string | null;
  finperiodEnd?: string | null;
  active: boolean;
  finPeriodClosedDt?: string | null;
  finProvClosedDt?: string | null;
  finProvRights?: number | null;
  lastModifiedBy?: string | null;
  lastModifiedOn?: string | null;
  siteID?: string | null;
  compGroupId: string;
  interCoPGLCode?: string | null;
  interCoRGLCode?: string | null;
  vendorGLCode?: string | null;
  customerGLCode?: string | null;
  taxRegisterNo?: string | null;
  lKey: string;
}

export interface IntegrationConfig {
  key: "paymentGateway" | "sms" | "email" | "whatsapp" | "tally";
  label: string;
  enabled: boolean;
  apiKey?: string;
  endpoint?: string;
}
