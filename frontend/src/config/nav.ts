import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  ShoppingCart,
  UtensilsCrossed,
  ChefHat,
  Martini,
  Package,
  Users,
  Truck,
  FileText,
  Receipt,
  ReceiptText,
  ArrowLeftRight,
  ClipboardList,
  BarChart3,
  KeyRound,
  UserCog,
  ShieldCheck,
  Settings,
  Plug,
  CalendarClock,
  Bike,
  History,
  LayoutGrid,
  Columns3,
  Grid2x2,
  ListTree,
  Cable,
  TrendingUp,
  SlidersHorizontal,
  Tags,
  Store,
  Crown,
  Building2,
  Landmark,
  FolderTree,
  BookOpen,
  NotebookPen,
  Scale,
  BookText,
  Scissors,
  Contact,
  Percent,
  Gift,
  Award,
  Layers,
  Ticket,
  QrCode,
  Settings2,
  Soup,
  FileUp,
  Printer,
  PackagePlus,
} from "lucide-react";
import { PERMISSIONS } from "@/lib/auth/permissions";

export interface NavLeaf {
  labelKey: string;
  href: string;
  icon: LucideIcon;
  permission?: string;
}

export interface NavGroup {
  labelKey: string;
  icon: LucideIcon;
  items: NavLeaf[];
  permission?: string;
}

export type NavEntry = NavLeaf | NavGroup;

export function isNavGroup(entry: NavEntry): entry is NavGroup {
  return "items" in entry;
}

export const navConfig: NavEntry[] = [
  { labelKey: "nav.dashboard", href: "/dashboard", icon: LayoutDashboard },
  { labelKey: "nav.pos", href: "/pos/sale", icon: ShoppingCart, permission: PERMISSIONS.POS_SELL },
  {
    // Everyday floor-map/ordering workflow — gated on the RESTAURANT module
    // (via RESTAURANT_TABLE_SERVICE), not just POS_SELL, so a non-restaurant
    // business type that's only licensed for POS (e.g. SAL) doesn't also see
    // this table-service nav item. RESTAURANT_MANAGE_TABLES (below) is the
    // separate admin-level table/menu configuration group.
    labelKey: "nav.restaurant",
    href: "/pos/tables",
    icon: UtensilsCrossed,
    permission: PERMISSIONS.RESTAURANT_TABLE_SERVICE,
  },
  { labelKey: "nav.kds", href: "/pos/kds", icon: ChefHat, permission: PERMISSIONS.KDS_VIEW },
  // Bar Counter Management — its own permission (not KDS_VIEW) since a
  // Cashier gets BAR_COUNTER_SERVICE but not necessarily KDS_VIEW's full
  // kitchen-wide board, and vice versa.
  { labelKey: "nav.barCounter", href: "/pos/stations", icon: Martini, permission: PERMISSIONS.BAR_COUNTER_SERVICE },
  { labelKey: "nav.orderManagement", href: "/pos/orders", icon: ClipboardList, permission: PERMISSIONS.ORDER_MANAGEMENT_VIEW },
  // Reservations (book/seat a restaurant table) and Deliveries (rider board) are restaurant
  // features — gated on the RESTAURANT module, not plain POS_SELL, so a salon/supermarket
  // tenant that's only licensed for POS doesn't see them. Same reasoning as nav.restaurant above.
  {
    labelKey: "nav.reservations",
    href: "/pos/reservations",
    icon: CalendarClock,
    permission: PERMISSIONS.RESTAURANT_TABLE_SERVICE,
  },
  {
    labelKey: "nav.deliveries",
    href: "/pos/deliveries",
    icon: Bike,
    permission: PERMISSIONS.RESTAURANT_TABLE_SERVICE,
  },
  {
    labelKey: "nav.billLookup",
    href: "/pos/bill-lookup",
    icon: History,
    permission: PERMISSIONS.POS_SELL,
  },
  {
    // Its own permission, not INVENTORY_TRANSFER_BRANCH (the Inventory
    // group below) — Stock Lookup is a broad, low-privilege, POS-floor
    // capability a plain Cashier should have, unlike Transfer/Adjustment.
    labelKey: "nav.stockLookup",
    href: "/inventory/stock-lookup",
    icon: Package,
    permission: PERMISSIONS.STOCK_LOOKUP_VIEW,
  },
  {
    labelKey: "nav.masters",
    icon: Package,
    permission: PERMISSIONS.INVENTORY_MANAGE_ITEMS,
    items: [
      { labelKey: "nav.itemMaster", href: "/masters/items", icon: Package },
      { labelKey: "nav.itemCategoryMaster", href: "/masters/item-categories", icon: Tags },
      { labelKey: "nav.importData", href: "/masters/import", icon: FileUp },
      { labelKey: "nav.taxMaster", href: "/masters/tax-codes", icon: Percent },
      { labelKey: "nav.unitMaster", href: "/masters/units", icon: Scale },
      { labelKey: "nav.customerCategoryMaster", href: "/masters/customer-categories", icon: Tags },
      { labelKey: "nav.customerMaster", href: "/masters/customers", icon: Users },
      { labelKey: "nav.supplierCategoryMaster", href: "/masters/supplier-categories", icon: Tags },
      { labelKey: "nav.supplierMaster", href: "/masters/suppliers", icon: Truck },
      // Promotion Engine (buy-X-get-Y, category/bill discounts, happy hour,
      // VIP customer-category discounts) applies to every business type, not
      // just Salon — moved out of the Salon Setup group below so a
      // non-Salon-licensed tenant (e.g. a plain supermarket) can still reach
      // it. Gated on the same permission as the rest of this group.
      // Dedicated top-level route (not /masters/promotions) — create moved
      // onto its own page (/promotions/new); this is still the Masters
      // nav group visually, only the URL relocated. Own permission
      // (PROMOTION_MANAGE) so a license without the PROMOTION module
      // doesn't show this item just because it has INVENTORY.
      { labelKey: "nav.promotionMaster", href: "/promotions", icon: Percent, permission: PERMISSIONS.PROMOTION_MANAGE },
      // Coupon Support — a standalone promotional-code catalog, separate
      // from Promotion Master's own CouponRequired/CouponCode gate. Same
      // "every business type" reasoning as Promotion/Combo above.
      { labelKey: "nav.couponMaster", href: "/coupons", icon: Ticket, permission: PERMISSIONS.COUPON_MANAGE },
      // Gift Voucher Management — sold/redeemed at POS, own catalog +
      // transaction ledger. Same "every business type" reasoning above.
      { labelKey: "nav.giftVoucherMaster", href: "/gift-vouchers", icon: Gift, permission: PERMISSIONS.GIFT_VOUCHER_MANAGE },
    ],
  },
  {
    labelKey: "nav.restaurantSetup",
    icon: UtensilsCrossed,
    permission: PERMISSIONS.RESTAURANT_MANAGE_TABLES,
    items: [
      { labelKey: "nav.floorMaster", href: "/masters/floors", icon: LayoutGrid },
      { labelKey: "nav.tableSectionMaster", href: "/masters/table-sections", icon: Columns3 },
      { labelKey: "nav.tableMaster", href: "/masters/tables", icon: Grid2x2 },
      { labelKey: "nav.orderTypeMaster", href: "/masters/order-types", icon: ListTree },
      { labelKey: "nav.kitchenMaster", href: "/masters/kitchens", icon: ChefHat },
      { labelKey: "nav.kitchenPrinterMaster", href: "/masters/kitchen-printers", icon: Printer },
      { labelKey: "nav.menuCategoryMaster", href: "/masters/menu-categories", icon: ListTree },
      { labelKey: "nav.menuSubCategoryMaster", href: "/masters/menu-sub-categories", icon: ListTree },
      { labelKey: "nav.menuItemMaster", href: "/masters/menu-items", icon: UtensilsCrossed },
      { labelKey: "nav.recipeMaster", href: "/masters/recipes", icon: NotebookPen },
      // Combo Items — moved here from the top-level Masters group; still its
      // own permission (COMBO_MANAGE) rather than inheriting this group's
      // RESTAURANT_MANAGE_TABLES gate, same "every item gets its own module
      // gate" reasoning as QR Table Ordering below (a non-restaurant tenant
      // with a Bakery/Salon combo but no restaurant module shouldn't lose
      // Combo Master just because it's grouped here visually).
      { labelKey: "nav.comboMaster", href: "/combos", icon: Layers, permission: PERMISSIONS.COMBO_MANAGE },
      // Set Menu — fixed-price bundle of courses (Starter/Main/Drink/
      // Dessert). Dedicated routes under /restaurant/... (list + /new +
      // /[id]) rather than /masters/..., since its nested Group->Item
      // editor doesn't fit the CrudDataGridPage dialog pattern every other
      // item in this group uses — see kind-crafting-hamming.md.
      { labelKey: "nav.setMenu", href: "/restaurant/set-menu", icon: Soup, permission: PERMISSIONS.SET_MENU_MANAGE },
      // Bar Counter Management — Counter Stock locations, own permission
      // (BAR_COUNTER_MANAGE) same reasoning as Combo/Set Menu above.
      { labelKey: "nav.stockLocations", href: "/masters/stock-locations", icon: Martini, permission: PERMISSIONS.BAR_COUNTER_MANAGE },
      { labelKey: "nav.stockWastage", href: "/masters/stock-wastage", icon: Martini, permission: PERMISSIONS.BAR_COUNTER_MANAGE },
      { labelKey: "nav.modifierGroupMaster", href: "/masters/modifier-groups", icon: SlidersHorizontal },
      { labelKey: "nav.modifierMaster", href: "/masters/modifiers", icon: Tags },
      // QR Table Ordering / Self Ordering — own permission (QR_TABLE_ORDERING_MANAGE)
      // so a license without the QR_TABLE_ORDERING module doesn't show these,
      // same "every item gets its own module gate" reasoning as Promotion/Combo/Coupon above.
      {
        labelKey: "nav.qrTableCodes",
        href: "/masters/qr-table-codes",
        icon: QrCode,
        permission: PERMISSIONS.QR_TABLE_ORDERING_MANAGE,
      },
      {
        labelKey: "nav.qrSettings",
        href: "/masters/qr-settings",
        icon: Settings2,
        permission: PERMISSIONS.QR_TABLE_ORDERING_MANAGE,
      },
    ],
  },
  {
    labelKey: "nav.salonSetup",
    icon: Scissors,
    permission: PERMISSIONS.SALON_MANAGE,
    items: [
      { labelKey: "nav.serviceMaster", href: "/masters/services", icon: Scissors },
      { labelKey: "nav.staffMaster", href: "/masters/staff", icon: Contact },
      { labelKey: "nav.membershipTierMaster", href: "/masters/membership-tiers", icon: Award },
    ],
  },
  {
    // Moved out of Salon Setup (was gated by SALON_MANAGE) — Customer
    // Loyalty is ONE central engine shared by every business type, not a
    // Salon-only feature, so it gets its own permission at the top level
    // like Stock Lookup above rather than inheriting an unrelated group's gate.
    labelKey: "nav.loyaltyMaster",
    href: "/masters/loyalty",
    icon: Gift,
    permission: PERMISSIONS.LOYALTY_CONFIGURE,
  },
  {
    labelKey: "nav.purchase",
    icon: FileText,
    permission: PERMISSIONS.PURCHASE_CREATE_PO,
    items: [
      { labelKey: "nav.purchaseOrder", href: "/purchase/orders", icon: FileText },
      { labelKey: "nav.goodsReceipt", href: "/purchase/grn", icon: Receipt },
      { labelKey: "nav.purchaseInvoice", href: "/purchase/invoices", icon: ReceiptText },
    ],
  },
  {
    labelKey: "nav.accounting",
    icon: Landmark,
    permission: PERMISSIONS.ACCOUNTING_MANAGE_GL,
    items: [
      { labelKey: "nav.glGroupMaster", href: "/masters/gl-groups", icon: FolderTree },
      { labelKey: "nav.glMaster", href: "/masters/gl-accounts", icon: BookOpen },
      { labelKey: "nav.chartOfAccounts", href: "/accounting/chart-of-accounts", icon: ListTree },
      { labelKey: "nav.posPostingAccounts", href: "/accounting/pos-posting-accounts", icon: Cable },
      { labelKey: "nav.journalVoucher", href: "/accounting/vouchers", icon: NotebookPen },
      { labelKey: "nav.trialBalance", href: "/accounting/reports/trial-balance", icon: Scale },
      { labelKey: "nav.profitLoss", href: "/accounting/reports/profit-loss", icon: TrendingUp },
      { labelKey: "nav.balanceSheet", href: "/accounting/reports/balance-sheet", icon: Landmark },
      { labelKey: "nav.generalLedger", href: "/accounting/reports/general-ledger", icon: BookText },
    ],
  },
  {
    labelKey: "nav.sales",
    icon: ReceiptText,
    permission: PERMISSIONS.SALES_MANAGE_INVOICES,
    items: [{ labelKey: "nav.salesInvoice", href: "/sales/invoices", icon: ReceiptText }],
  },
  {
    labelKey: "nav.inventory",
    icon: ArrowLeftRight,
    permission: PERMISSIONS.INVENTORY_TRANSFER_BRANCH,
    items: [
      { labelKey: "nav.inventoryOpening", href: "/inventory/opening", icon: PackagePlus, permission: PERMISSIONS.INVENTORY_ADJUST_STOCK },
      { labelKey: "nav.stockTransfer", href: "/inventory/stock-transfer", icon: ArrowLeftRight },
      { labelKey: "nav.stockAdjustment", href: "/inventory/stock-adjustment", icon: ClipboardList },
      { labelKey: "nav.ingredientConsumption", href: "/inventory/consumption", icon: NotebookPen },
      { labelKey: "nav.production", href: "/inventory/production", icon: Package },
    ],
  },
  {
    labelKey: "nav.reports",
    href: "/reports",
    icon: BarChart3,
    permission: PERMISSIONS.REPORTS_VIEW,
  },
  {
    labelKey: "nav.license",
    href: "/license",
    icon: KeyRound,
    permission: PERMISSIONS.LICENSE_MANAGE,
  },
  {
    labelKey: "nav.reseller",
    icon: Store,
    permission: PERMISSIONS.LICENSE_RESELLER_MANAGE,
    items: [
      { labelKey: "nav.resellerLicenses", href: "/reseller/licenses", icon: KeyRound },
      { labelKey: "nav.resellerDashboard", href: "/reseller/dashboard", icon: BarChart3 },
    ],
  },
  {
    labelKey: "nav.superAdmin",
    icon: Crown,
    permission: PERMISSIONS.LICENSE_SUPERADMIN_MANAGE,
    items: [
      { labelKey: "nav.superAdminResellers", href: "/superadmin/resellers", icon: Building2 },
      { labelKey: "nav.superAdminEditions", href: "/superadmin/editions", icon: Tags },
      { labelKey: "nav.superAdminLicenses", href: "/superadmin/licenses", icon: KeyRound },
      { labelKey: "nav.superAdminDashboard", href: "/superadmin/dashboard", icon: BarChart3 },
    ],
  },
  {
    labelKey: "nav.administration",
    icon: Settings,
    permission: PERMISSIONS.SYSADMIN_MANAGE_USERS,
    items: [
      { labelKey: "nav.userManagement", href: "/admin/users", icon: UserCog },
      { labelKey: "nav.rolePermission", href: "/admin/roles", icon: ShieldCheck },
      { labelKey: "nav.systemSettings", href: "/admin/settings", icon: Settings },
      { labelKey: "nav.shiftMaster", href: "/admin/shifts", icon: CalendarClock },
      { labelKey: "nav.integrationSettings", href: "/admin/integrations", icon: Plug },
    ],
  },
];
