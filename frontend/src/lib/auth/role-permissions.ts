import { PERMISSIONS } from "@/lib/auth/permissions";
import { PERMISSION_MODULE_MAP } from "@/lib/auth/permission-module-map";

// BCorDFWebApi's real Identity roles (see DataContext.OnModelCreating's role
// seed + Sql/SeedPosRoles.sql): Admin, User, Hr, Payroll, Accounts, Cashier,
// POSSupervisor. There are no granular permission claims on that backend —
// PermissionGate/usePermission() throughout this app expect a permissions
// array, so this maps each real role to the permission set it should behave
// as. Admin gets the wildcard; unmapped roles get the base Cashier set so a
// freshly-seeded user can at least reach the till.
const ROLE_PERMISSIONS: Record<string, string[]> = {
  Admin: ["*"],
  // SuperAdmin oversees the whole platform; TenantAdmin administers their
  // own company exactly like Admin already does (CompId-scoped by every
  // Master/Document endpoint) — the two are functionally equivalent inside
  // this app, "TenantAdmin" is just the SaaS-facing name for that role.
  SuperAdmin: ["*"],
  TenantAdmin: ["*"],
  ResellerAdmin: [PERMISSIONS.LICENSE_RESELLER_MANAGE, PERMISSIONS.REPORTS_VIEW],
  POSSupervisor: [
    PERMISSIONS.POS_SELL,
    PERMISSIONS.POS_VOID_BILL,
    PERMISSIONS.POS_OVERRIDE_DISCOUNT,
    PERMISSIONS.RESTAURANT_MANAGE_TABLES,
    PERMISSIONS.RESTAURANT_TABLE_SERVICE,
    PERMISSIONS.KDS_VIEW,
    PERMISSIONS.QR_TABLE_ORDERING_MANAGE,
    PERMISSIONS.QR_TABLE_ORDERING_SERVICE,
    PERMISSIONS.REPORTS_VIEW,
    // Mirrored server-side by Filters/UserPermissionHelper.cs's
    // RolePermissions — keep both lists in sync.
    PERMISSIONS.BAR_COUNTER_MANAGE,
    PERMISSIONS.BAR_COUNTER_SERVICE,
    PERMISSIONS.OPEN_ITEM_VIEW,
    PERMISSIONS.OPEN_ITEM_ADD,
    PERMISSIONS.OPEN_ITEM_PRICE_ENTRY,
    PERMISSIONS.OPEN_ITEM_TAX_CHANGE,
    PERMISSIONS.OPEN_ITEM_KOT,
    PERMISSIONS.OPEN_ITEM_APPROVE,
    PERMISSIONS.WAITER_MOBILE_VIEW_TABLES,
    PERMISSIONS.WAITER_MOBILE_OPEN_TABLE,
    PERMISSIONS.WAITER_MOBILE_TAKE_ORDER,
    PERMISSIONS.WAITER_MOBILE_SEND_ORDER,
    PERMISSIONS.WAITER_MOBILE_VIEW_OTHER_TABLES,
    PERMISSIONS.WAITER_MOBILE_CANCEL_ITEM,
    PERMISSIONS.WAITER_MOBILE_TRANSFER_TABLE,
    PERMISSIONS.WAITER_MOBILE_SPLIT_TABLE,
    PERMISSIONS.WAITER_MOBILE_VIEW_BILL,
    PERMISSIONS.WAITER_MOBILE_REQUEST_BILL,
    PERMISSIONS.WAITER_MOBILE_CLOSE_TABLE,
    PERMISSIONS.ORDER_MANAGEMENT_VIEW,
    PERMISSIONS.ORDER_MANAGEMENT_VIEW_OTHER_WAITER_ORDERS,
    PERMISSIONS.ORDER_MANAGEMENT_CANCEL_ITEM,
    PERMISSIONS.ORDER_MANAGEMENT_CANCEL_ORDER,
    PERMISSIONS.ORDER_MANAGEMENT_REPRINT_KOT,
    PERMISSIONS.ORDER_MANAGEMENT_TAKE_PAYMENT,
    PERMISSIONS.ORDER_MANAGEMENT_CLOSE_ORDER,
    PERMISSIONS.STOCK_LOOKUP_VIEW,
    PERMISSIONS.STOCK_LOOKUP_VIEW_OTHER_SITES,
    PERMISSIONS.STOCK_LOOKUP_VIEW_STOCK_VALUE,
    PERMISSIONS.LOYALTY_VIEW,
    PERMISSIONS.LOYALTY_ENROLL,
    PERMISSIONS.LOYALTY_REDEEM,
    PERMISSIONS.LOYALTY_MANUAL_ADJUSTMENT,
    PERMISSIONS.LOYALTY_APPROVE_ADJUSTMENT,
    PERMISSIONS.LOYALTY_VIEW_REPORTS,
    PERMISSIONS.LOYALTY_CONFIGURE,
    PERMISSIONS.POS_XREPORT,
    PERMISSIONS.POS_SHIFT_CLOSE,
  ],
  Cashier: [
    PERMISSIONS.POS_SELL,
    PERMISSIONS.POS_XREPORT,
    PERMISSIONS.POS_SHIFT_CLOSE,
    PERMISSIONS.RESTAURANT_TABLE_SERVICE,
    PERMISSIONS.KDS_VIEW,
    PERMISSIONS.QR_TABLE_ORDERING_SERVICE,
    PERMISSIONS.BAR_COUNTER_SERVICE,
    PERMISSIONS.OPEN_ITEM_VIEW,
    PERMISSIONS.OPEN_ITEM_ADD,
    PERMISSIONS.WAITER_MOBILE_VIEW_TABLES,
    PERMISSIONS.WAITER_MOBILE_OPEN_TABLE,
    PERMISSIONS.WAITER_MOBILE_TAKE_ORDER,
    PERMISSIONS.WAITER_MOBILE_SEND_ORDER,
    PERMISSIONS.WAITER_MOBILE_VIEW_BILL,
    PERMISSIONS.WAITER_MOBILE_REQUEST_BILL,
    PERMISSIONS.WAITER_MOBILE_CLOSE_TABLE,
    PERMISSIONS.ORDER_MANAGEMENT_VIEW,
    PERMISSIONS.ORDER_MANAGEMENT_REPRINT_KOT,
    PERMISSIONS.ORDER_MANAGEMENT_TAKE_PAYMENT,
    PERMISSIONS.ORDER_MANAGEMENT_CLOSE_ORDER,
    PERMISSIONS.STOCK_LOOKUP_VIEW,
    PERMISSIONS.LOYALTY_VIEW,
    PERMISSIONS.LOYALTY_ENROLL,
    PERMISSIONS.LOYALTY_REDEEM,
  ],
  Accounts: [PERMISSIONS.REPORTS_VIEW, PERMISSIONS.REPORTS_VIEW_FINANCIAL],
};

// Platform-exclusive permissions — never granted to a company-level
// Admin/TenantAdmin no matter how their wildcard is expanded. Without this,
// expanding "*" to every PERMISSIONS value would hand a single tenant's
// admin the Reseller and Super Admin nav sections too (nav.ts's own
// permission gates on those items are correct; the leak was here, in what
// "every permission" was allowed to include).
const PLATFORM_EXCLUSIVE_PERMISSIONS: string[] = [
  PERMISSIONS.LICENSE_RESELLER_MANAGE,
  PERMISSIONS.LICENSE_SUPERADMIN_MANAGE,
];

// A licensed module can functionally depend on another one — ticking "POS"
// on a license is useless without the Item/Customer/Supplier Master screens
// (nav.ts gates that whole "Masters" group on INVENTORY_MANAGE_ITEMS, which
// PERMISSION_MODULE_MAP maps to the "INVENTORY" module) to actually set up
// what POS sells. Rather than making the reseller remember to tick both
// boxes on every license, expand the licensed set with each module's
// dependencies before filtering — this applies retroactively to
// already-issued licenses too, not just new ones.
const MODULE_IMPLIES: Record<string, string[]> = {
  POS: ["INVENTORY"],
  // The Customer Master (and its categories) is the "CRM" module's screen. A licence that has the Customer module (the salon-style
  // customer features) or Sales (invoices are raised to customers) needs it too - without this such a company could not add customers.
  CUSTOMER: ["CRM"],
  SALES: ["CRM"],
};

function expandImpliedModules(licensedModules: string[]): Set<string> {
  const expanded = new Set(licensedModules);
  for (const moduleCode of licensedModules) {
    for (const implied of MODULE_IMPLIES[moduleCode] ?? []) {
      expanded.add(implied);
    }
  }
  return expanded;
}

// `licensedModules` is the company's active LicenseModule codes (see
// PERMISSION_MODULE_MAP / the Business Type & License architecture note).
// Omit it (or pass null) to skip module filtering entirely — used right at
// login, before the license's module list has had a chance to load, so a
// user isn't momentarily locked out of everything while that fetch is in
// flight.
//
// SuperAdmin is the one true platform bypass — always "*", never filtered.
// ResellerAdmin is NOT a wildcard role (it's deliberately scoped to just
// LICENSE_RESELLER_MANAGE/REPORTS_VIEW, see ROLE_PERMISSIONS below) — it's
// merely not tied to any single tenant's license, so it's exempt from
// module filtering (mirrors isGatedRole in use-license-guard.ts) without
// being granted every permission in the app.
export function permissionsForRoles(roles: string[], licensedModules?: string[] | null): string[] {
  if (roles.includes("SuperAdmin")) return ["*"];

  let merged: string[];
  if (roles.includes("Admin") || roles.includes("TenantAdmin")) {
    // "*" is a wildcard sentinel elsewhere (hasPermission), which would
    // slip straight past a module filter keyed on real permission strings —
    // expand it to the concrete permission list first so Admin/TenantAdmin
    // are genuinely bound by their own company's license too, not just
    // every other role. Platform-exclusive permissions are carved back out —
    // see PLATFORM_EXCLUSIVE_PERMISSIONS.
    merged = Object.values(PERMISSIONS).filter((p) => !PLATFORM_EXCLUSIVE_PERMISSIONS.includes(p));
  } else {
    const set = new Set<string>();
    for (const role of roles) {
      for (const permission of ROLE_PERMISSIONS[role] ?? [PERMISSIONS.POS_SELL]) {
        set.add(permission);
      }
    }
    merged = Array.from(set);
  }

  if (!licensedModules || roles.includes("ResellerAdmin")) return merged;

  const licensed = expandImpliedModules(licensedModules);
  return merged.filter((permission) => {
    const requiredModule = PERMISSION_MODULE_MAP[permission as keyof typeof PERMISSION_MODULE_MAP];
    return !requiredModule || licensed.has(requiredModule);
  });
}
