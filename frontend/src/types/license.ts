// Mirrors BCorDFWebApi's real License Management DTOs (LicenseMasterDto,
// Dto/License/LicenseActionDtos.cs, ResellerDto, LicenseEditionMasterDto).
// Replaces the fictional License/LicenseEdition/LicenseStatus types that
// used to live in types/admin.ts.

export type LicenseEditionCode = "TRIAL" | "STANDARD" | "PREMIUM" | "ENTERPRISE";
export type LicenseStatusCode = "ACTIVE" | "INACTIVE" | "SUSPENDED" | "EXPIRED";
export type LicenseModuleCode =
  | "POS"
  | "RESTAURANT"
  | "INVENTORY"
  | "PURCHASE"
  | "SALES"
  | "CRM"
  | "REPORTS"
  | "HR"
  | "ACCOUNTING"
  | "SALON"
  | "APPOINTMENT"
  | "SERVICE"
  | "STAFF"
  | "STAFF_COMMISSION"
  | "CUSTOMER_HISTORY"
  | "PACKAGE"
  | "MEMBERSHIP"
  | "RESOURCE"
  | "CUSTOMER"
  | "LOYALTY"
  | "PROMOTION"
  | "DASHBOARD";

export interface LicenseMasterDto {
  id: string;
  code: string;
  compID: string;
  siteID: string;
  active: boolean;
  lastModifiedBy: string;
  lastModifiedOn?: string | null;
  licenseName: string;
  productCode: string;
  productName?: string | null;
  licenseType: string;
  editionCode?: string | null;
  licenseKey?: string | null;
  customerCode?: string | null;
  customerName?: string | null;
  issueDate: string;
  validFrom: string;
  validTo?: string | null;
  maximumCompanies?: number | null;
  maximumSites?: number | null;
  maximumPOS?: number | null;
  maximumUsers?: number | null;
  maximumDevices?: number | null;
  allowOfflineUse: boolean;
  offlineGraceDays?: number | null;
  isCloudLicense: boolean;
  autoRenew: boolean;
  licenseStatus: LicenseStatusCode;
  suspendedOn?: string | null;
  revokedOn?: string | null;
  remarks?: string | null;
  resellerCode?: string | null;
  requireDeviceBinding: boolean;
}

export interface LicenseModuleDto {
  moduleCode: string;
  moduleName: string;
  active: boolean;
}

export interface LicenseBusinessTypeDto {
  businessTypeCode: string;
  businessTypeName: string;
  active: boolean;
}

export interface LicenseDetailDto {
  license: LicenseMasterDto;
  modules: LicenseModuleDto[];
  businessTypes: LicenseBusinessTypeDto[];
}

export interface LicenseHistoryEntryDto {
  id: string;
  licenseCode: string;
  compID: string;
  eventType: string;
  eventDate: string;
  performedBy: string;
  oldValue?: string | null;
  newValue?: string | null;
  remarks?: string | null;
}

export interface LicenseActivationDto {
  id: string;
  code: string;
  compID: string;
  siteID: string;
  active: boolean;
  lastModifiedBy: string;
  lastModifiedOn?: string | null;
  licenseCode: string;
  terminalCode?: string | null;
  deviceID?: string | null;
  deviceName?: string | null;
  machineName?: string | null;
  macAddress?: string | null;
  ipAddress?: string | null;
  operatingSystem?: string | null;
  applicationVersion?: string | null;
  activationDate: string;
  lastValidationOn?: string | null;
  nextValidationOn?: string | null;
  deactivatedOn?: string | null;
  activationStatus: string;
  isPrimaryDevice: boolean;
  offlineAllowed: boolean;
  remarks?: string | null;
}

export interface LicenseDashboardStatsDto {
  totalLicenses: number;
  activeCount: number;
  expiringSoonCount: number;
  suspendedCount: number;
  expiredCount: number;
  totalResellers?: number | null;
}

export interface CreateClientLicenseDto {
  compID: string;
  siteID: string;
  licenseName: string;
  productCode: string;
  productName?: string;
  licenseType: string;
  editionCode: string;
  customerCode?: string;
  customerName?: string;
  validFrom: string;
  validTo?: string;
  maximumCompanies?: number;
  maximumSites?: number;
  maximumPOS?: number;
  maximumUsers?: number;
  maximumDevices?: number;
  allowOfflineUse: boolean;
  offlineGraceDays?: number;
  isCloudLicense: boolean;
  autoRenew: boolean;
  requireDeviceBinding: boolean;
  resellerCode?: string;
  moduleCodes: string[];
  // Real BusinessTypeCodes.All entries, or the single package value "MIX"
  // (expanded server-side into every real code at issuance — see
  // LicenseWorkflowService.CreateAsync / LicenseBusinessTypePackages).
  businessTypeCodes: string[];
  userName: string;
}

// "New Client" onboarding — creates the tenant (SysCompanyGroupMaster) + its
// first company (SysCompanyMast) + issues the first license in one call. See
// Dto/License/LicenseActionDtos.cs OnboardClientDto/OnboardClientResultDto
// and LicenseWorkflowService.OnboardClientAsync for the placeholder-then-
// backfill LKey sequencing (LKey IS LicenseMasterDto.licenseKey).
export interface OnboardClientDto {
  compGroupCode: string;
  compGroupName: string;
  compCode: string;
  companyName: string;
  siteID: string;
  licenseName: string;
  productCode: string;
  productName?: string;
  licenseType: string;
  editionCode: string;
  customerCode?: string;
  customerName?: string;
  validFrom: string;
  validTo?: string;
  maximumCompanies?: number;
  maximumSites?: number;
  maximumPOS?: number;
  maximumUsers?: number;
  maximumDevices?: number;
  allowOfflineUse: boolean;
  offlineGraceDays?: number;
  isCloudLicense: boolean;
  autoRenew: boolean;
  requireDeviceBinding: boolean;
  resellerCode?: string;
  moduleCodes: string[];
  businessTypeCodes: string[];
  userName: string;

  // Starter branch + tenant admin login, created alongside the tenant in the
  // same call. siteName defaults server-side to "{companyName} - Main Branch"
  // when omitted; adminPassword defaults to the platform's standard default
  // ("Welcome@123") when omitted.
  siteName?: string;
  adminUsername: string;
  adminEmail: string;
  adminFullName?: string;
  adminPassword?: string;
}

export interface OnboardClientResultDto {
  compGroupId: string;
  compId: string;
  license: LicenseMasterDto;
  siteID: string;
  adminUsername: string;
  adminPassword: string;
}

export interface ActivateLicenseDto {
  deviceID?: string;
  deviceName?: string;
  machineName?: string;
  macAddress?: string;
  ipAddress?: string;
  operatingSystem?: string;
  applicationVersion?: string;
  terminalCode?: string;
  userName: string;
}

export interface RenewLicenseDto {
  newValidTo: string;
  remarks?: string;
  userName: string;
}

export interface SuspendLicenseDto {
  reason?: string;
  userName: string;
}

export interface ReactivateLicenseDto {
  remarks?: string;
  userName: string;
}

// Adds module(s) to an already-issued license (see LicenseController's
// POST {compId}/{code}/modules) — codes not in the valid set, or already
// present on the license, are silently skipped server-side.
export interface AddLicenseModulesDto {
  moduleCodes: string[];
  userName: string;
}

export interface TransferLicenseDto {
  newCompID: string;
  newCustomerCode?: string;
  newCustomerName?: string;
  newResellerCode?: string;
  userName: string;
}

export interface ValidateLicenseRequestDto {
  compID: string;
  deviceID?: string;
}

export interface ValidateLicenseResponseDto {
  isValid: boolean;
  licenseCode?: string | null;
  licenseStatus?: string | null;
  validTo?: string | null;
  daysRemaining?: number | null;
  checksumOk: boolean;
  offlineGraceDays: number;
  message?: string | null;
}

export interface ResellerDto {
  id: string;
  resellerCode: string;
  resellerName: string;
  contactPerson?: string | null;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  country?: string | null;
  active: boolean;
  lastModifiedBy: string;
  lastModifiedOn?: string | null;
  // Only present on the response to a successful create — the ResellerAdmin
  // login this reseller can now sign in with, shown once (see
  // ResellerService.CreateAsync's own comment on the backend).
  loginUsername?: string | null;
  loginPassword?: string | null;
}

export interface LicenseEditionMasterDto {
  id: string;
  editionCode: string;
  editionName: string;
  defaultMaxUsers?: number | null;
  defaultMaxBranches?: number | null;
  defaultMaxDevices?: number | null;
  trialDays?: number | null;
  active: boolean;
  lastModifiedBy: string;
  lastModifiedOn?: string | null;
}
