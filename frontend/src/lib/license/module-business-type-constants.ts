// Mirrors LicenseConstants.cs's LicenseModuleCodes.All / BusinessTypeCodes.All.
// Shared by the reseller and superadmin "Create License" screens so both
// checkbox groups stay in sync — previously duplicated inline in each page.
export const MODULE_CODES = [
  "POS",
  "RESTAURANT",
  "INVENTORY",
  "PURCHASE",
  "SALES",
  "CRM",
  "REPORTS",
  "HR",
  "ACCOUNTING",
  "SALON",
  "APPOINTMENT",
  "SERVICE",
  "STAFF",
  "STAFF_COMMISSION",
  "CUSTOMER_HISTORY",
  "PACKAGE",
  "MEMBERSHIP",
  "RESOURCE",
  "CUSTOMER",
  "LOYALTY",
  "PROMOTION",
  "DASHBOARD",
  // Add-on feature modules (see LicenseModuleCodes.All) — each gates its own screens/endpoints.
  "COMBO",
  "COUPON",
  "GIFT_VOUCHER",
  "QR_TABLE_ORDERING",
  "SET_MENU",
  "BAR",
  "WAITER_MOBILE",
  "PRICE_CHECKER",
] as const;

// Modules hidden from the "Add New License" module checkboxes (reseller +
// superadmin Create License dialogs) — not yet ready to be sold/assigned via
// that flow. Left in MODULE_CODES itself so the value stays valid everywhere
// else (already-issued licenses that carry one of these still display/behave
// normally, and LicenseConstants.cs on the backend is untouched).
const CREATE_LICENSE_HIDDEN_MODULE_CODES = new Set(["STAFF", "HR", "RESOURCE", "CRM"]);

export const CREATE_LICENSE_MODULE_CODES = MODULE_CODES.filter(
  (code) => !CREATE_LICENSE_HIDDEN_MODULE_CODES.has(code),
);

// "MIX" is offered here as a convenience checkbox meaning "every type below"
// — LicenseWorkflowService expands it server-side into concrete rows, it's
// never stored literally.
export const BUSINESS_TYPE_CODES = [
  "TRD",
  "RST",
  "BAR",
  "BAK",
  "CST",
  "SUP",
  "CAF",
  "QSR",
  "WHL",
  "SRV",
  "SAL",
  "TEA",
] as const;
