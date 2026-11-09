// `Module.Action` permission keys, mirroring the backend's data-driven
// RolePermissions table (see 04-user-roles.md / 11-security-plan.md).
// These constants exist only to prevent typos in UI checks — the actual
// entitlement decision always happens server-side.
export const PERMISSIONS = {
  POS_SELL: "POS.Sell",
  POS_VOID_BILL: "POS.VoidBill",
  POS_OVERRIDE_DISCOUNT: "POS.OverrideDiscount",
  // Supermarket / trading till: interim till report and end-of-shift cash-up. Server-enforced by
  // PosOperationsController (Filters/UserPermissionHelper.cs lists the same strings) - keep both in sync.
  POS_XREPORT: "Pos.XReport",
  POS_SHIFT_CLOSE: "Pos.ShiftClose",
  RESTAURANT_MANAGE_TABLES: "Restaurant.ManageTables",
  // Operational floor-map/table-ordering flow (/pos/tables) — distinct from
  // POS_SELL (which just gates the till itself) so a non-restaurant business
  // type (e.g. SAL) that's only licensed for POS doesn't also see the
  // "Restaurant" table-service nav item. See PERMISSION_MODULE_MAP.
  RESTAURANT_TABLE_SERVICE: "Restaurant.TableService",
  KDS_VIEW: "Kds.View",
  INVENTORY_MANAGE_ITEMS: "Inventory.ManageItems",
  INVENTORY_ADJUST_STOCK: "Inventory.AdjustStock",
  INVENTORY_TRANSFER_BRANCH: "Inventory.TransferBranch",
  PURCHASE_CREATE_PO: "Purchase.CreatePO",
  PURCHASE_APPROVE_PO: "Purchase.ApprovePO",
  PURCHASE_RECEIVE_GOODS: "Purchase.ReceiveGoods",
  PURCHASE_MANAGE_INVOICES: "Purchase.ManageInvoices",
  SALES_MANAGE_INVOICES: "Sales.ManageInvoices",
  CRM_MANAGE_CUSTOMERS: "Crm.ManageCustomers",
  SUPPLIER_MANAGE: "Purchase.ManageSuppliers",
  REPORTS_VIEW_FINANCIAL: "Reports.ViewFinancial",
  REPORTS_VIEW: "Reports.View",
  LICENSE_MANAGE: "License.Manage",
  LICENSE_RESELLER_MANAGE: "License.ResellerManage",
  LICENSE_SUPERADMIN_MANAGE: "License.SuperAdminManage",
  SYSADMIN_COMPANY_SETTINGS: "SysAdmin.CompanySettings",
  SYSADMIN_MANAGE_USERS: "SysAdmin.ManageUsers",
  SYSADMIN_MANAGE_ROLES: "SysAdmin.ManageRoles",
  SYSADMIN_INTEGRATIONS: "SysAdmin.ManageIntegrations",
  ACCOUNTING_MANAGE_GL: "Accounting.ManageGL",
  SALON_MANAGE: "Salon.Manage",
  // Each gets its own key (like every other module) instead of reusing
  // INVENTORY_MANAGE_ITEMS — a license with INVENTORY but not e.g. COUPON
  // was previously still showing the Coupon nav item. See
  // PERMISSION_MODULE_MAP and RequireLicenseModuleAttribute (backend).
  PROMOTION_MANAGE: "Promotion.Manage",
  COMBO_MANAGE: "Combo.Manage",
  SET_MENU_MANAGE: "SetMenu.Manage",
  COUPON_MANAGE: "Coupon.Manage",
  GIFT_VOUCHER_MANAGE: "GiftVoucher.Manage",
  // QR Table Ordering / Self Ordering admin screens (Table QR Codes, QR
  // Settings) — same "own permission per licensable module" reasoning as
  // Promotion/Combo/Coupon/Gift Voucher above.
  QR_TABLE_ORDERING_MANAGE: "QrTableOrdering.Manage",
  // Day-to-day handling on the POS floor (accept/reject QR orders, acknowledge
  // waiter/bill requests) — separate from _MANAGE so cashiers/waiters get the
  // notification bell without the QR admin screens.
  QR_TABLE_ORDERING_SERVICE: "QrTableOrdering.Service",
  // Bar Counter Management — same _MANAGE/_SERVICE split as QR Table
  // Ordering above (admin/stock/tab operations vs. day-to-day station
  // screen use). Mirrored server-side by Filters/RequireUserPermissionAttribute.cs —
  // the first module in this app with real backend permission enforcement,
  // not just frontend nav-hiding, so keep the string values in sync there.
  BAR_COUNTER_MANAGE: "BarCounter.Manage",
  BAR_COUNTER_SERVICE: "BarCounter.Service",
  // Open Item Billing — mirrored server-side by
  // Filters/UserPermissionHelper.cs's RolePermissions; keep both in sync.
  OPEN_ITEM_VIEW: "OpenItem.View",
  OPEN_ITEM_ADD: "OpenItem.Add",
  OPEN_ITEM_PRICE_ENTRY: "OpenItem.PriceEntry",
  OPEN_ITEM_TAX_CHANGE: "OpenItem.TaxChange",
  OPEN_ITEM_KOT: "OpenItem.Kot",
  OPEN_ITEM_APPROVE: "OpenItem.Approve",
  // Waiter Mobile Ordering — mirrored server-side by
  // Filters/UserPermissionHelper.cs's RolePermissions; keep both in sync.
  WAITER_MOBILE_VIEW_TABLES: "WaiterMobile.ViewTables",
  WAITER_MOBILE_OPEN_TABLE: "WaiterMobile.OpenTable",
  WAITER_MOBILE_TAKE_ORDER: "WaiterMobile.TakeOrder",
  WAITER_MOBILE_SEND_ORDER: "WaiterMobile.SendOrder",
  WAITER_MOBILE_VIEW_OTHER_TABLES: "WaiterMobile.ViewOtherTables",
  WAITER_MOBILE_CANCEL_ITEM: "WaiterMobile.CancelItem",
  WAITER_MOBILE_TRANSFER_TABLE: "WaiterMobile.TransferTable",
  WAITER_MOBILE_SPLIT_TABLE: "WaiterMobile.SplitTable",
  WAITER_MOBILE_VIEW_BILL: "WaiterMobile.ViewBill",
  WAITER_MOBILE_REQUEST_BILL: "WaiterMobile.RequestBill",
  WAITER_MOBILE_CLOSE_TABLE: "WaiterMobile.CloseTable",
  // Restaurant Order Management — mirrored server-side by
  // Filters/UserPermissionHelper.cs's RolePermissions; keep both in sync.
  ORDER_MANAGEMENT_VIEW: "OrderManagement.View",
  ORDER_MANAGEMENT_VIEW_OTHER_WAITER_ORDERS: "OrderManagement.ViewOtherWaiterOrders",
  ORDER_MANAGEMENT_CANCEL_ITEM: "OrderManagement.CancelItem",
  ORDER_MANAGEMENT_CANCEL_ORDER: "OrderManagement.CancelOrder",
  ORDER_MANAGEMENT_REPRINT_KOT: "OrderManagement.ReprintKot",
  ORDER_MANAGEMENT_TAKE_PAYMENT: "OrderManagement.TakePayment",
  ORDER_MANAGEMENT_CLOSE_ORDER: "OrderManagement.CloseOrder",
  // Stock Lookup — mirrored server-side by Filters/UserPermissionHelper.cs's
  // RolePermissions; keep both in sync.
  STOCK_LOOKUP_VIEW: "StockLookup.View",
  STOCK_LOOKUP_VIEW_OTHER_SITES: "StockLookup.ViewOtherSites",
  STOCK_LOOKUP_VIEW_STOCK_VALUE: "StockLookup.ViewStockValue",
  // Customer Loyalty Management — mirrored server-side by
  // Filters/UserPermissionHelper.cs's RolePermissions; keep both in sync.
  LOYALTY_VIEW: "Loyalty.View",
  LOYALTY_ENROLL: "Loyalty.Enroll",
  LOYALTY_REDEEM: "Loyalty.Redeem",
  LOYALTY_MANUAL_ADJUSTMENT: "Loyalty.ManualAdjustment",
  LOYALTY_APPROVE_ADJUSTMENT: "Loyalty.ApproveAdjustment",
  LOYALTY_VIEW_REPORTS: "Loyalty.ViewReports",
  LOYALTY_CONFIGURE: "Loyalty.Configure",
} as const;

export type PermissionKey = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];
