import { z } from "zod";

// Real Floor/TableSection/RestaurantTable/Kitchen/MenuCategory/MenuMaster
// admin forms — back masters/floors, masters/table-sections, masters/tables,
// masters/kitchens, masters/menu-categories, masters/menu-items against
// BCorDFWebApi's actual Masters controllers (see types/restaurant.ts).

export const floorSchema = z.object({
  code: z.string().min(1, "validation.required"),
  floorName: z.string().min(1, "validation.required"),
  floorNameArb: z.string().optional(),
  floorColor: z.string().optional(),
  displayOrder: z.coerce.number().min(0, "validation.mustBeZeroOrMore").default(0),
  siteId: z.string().min(1, "validation.required"),
  active: z.boolean().default(true),
});
export type FloorFormValues = z.infer<typeof floorSchema>;

export const tableSectionSchema = z.object({
  code: z.string().min(1, "validation.required"),
  sectionName: z.string().min(1, "validation.required"),
  sectionNameArb: z.string().optional(),
  floorCode: z.string().min(1, "validation.required"),
  sectionColor: z.string().optional(),
  displayOrder: z.coerce.number().min(0, "validation.mustBeZeroOrMore").default(0),
  siteId: z.string().min(1, "validation.required"),
  active: z.boolean().default(true),
});
export type TableSectionFormValues = z.infer<typeof tableSectionSchema>;

export const restaurantTableSchema = z.object({
  code: z.string().min(1, "validation.required"),
  tableName: z.string().min(1, "validation.required"),
  tableNameArb: z.string().optional(),
  floorCode: z.string().min(1, "validation.required"),
  sectionCode: z.string().optional(),
  capacity: z.coerce.number().min(1, "validation.required").default(4),
  shapeType: z.string().optional(),
  currentStatus: z.enum(["AVAILABLE", "OCCUPIED", "RESERVED", "DIRTY"]).default("AVAILABLE"),
  isVIP: z.boolean().default(false),
  isOutdoor: z.boolean().default(false),
  isReservable: z.boolean().default(true),
  isMergeAllowed: z.boolean().default(true),
  displayOrder: z.coerce.number().min(0, "validation.mustBeZeroOrMore").default(0),
  siteId: z.string().min(1, "validation.required"),
  active: z.boolean().default(true),
});
export type RestaurantTableFormValues = z.infer<typeof restaurantTableSchema>;

export const kitchenSchema = z.object({
  code: z.string().min(1, "validation.required"),
  kitchenName: z.string().min(1, "validation.required"),
  kitchenNameArb: z.string().optional(),
  preparationMinutes: z.coerce.number().min(0, "validation.mustBeZeroOrMore").optional(),
  enableKDS: z.boolean().default(true),
  // Bar Counter Management — generic Preparation Station fields.
  stationType: z.enum(["KITCHEN", "BAR", "COFFEE", "JUICE", "DESSERT", "GRILL", "BAKERY", "OTHER"]).default("KITCHEN"),
  displayMode: z.enum(["PRINT_ONLY", "DISPLAY_ONLY", "PRINT_AND_DISPLAY"]).default("PRINT_AND_DISPLAY"),
  warehouseCode: z.string().max(10).optional(),
  displayOrder: z.coerce.number().min(0, "validation.mustBeZeroOrMore").default(0),
  siteId: z.string().min(1, "validation.required"),
  active: z.boolean().default(true),
});
export type KitchenFormValues = z.infer<typeof kitchenSchema>;

// Kitchen Printer Master — one NETWORK (raw TCP, usually port 9100) ticket printer per kitchen/bar station.
// KitchenPrintService only prints to active NETWORK printers that have both an IP address and a port.
export const kitchenPrinterSchema = z.object({
  code: z.string().min(1, "validation.required").max(20),
  printerName: z.string().min(1, "validation.required"),
  kitchenCode: z.string().min(1, "validation.required"),
  siteId: z.string().min(1, "validation.required"),
  ipAddress: z.string().trim().min(1, "validation.required"),
  portNo: z.coerce.number().int().min(1, "validation.required").max(65535).default(9100),
  paperWidth: z.coerce.number().int().min(0).default(80),
  noOfCopies: z.coerce.number().int().min(1, "validation.required").default(1),
  autoCut: z.boolean().default(true),
  printArabic: z.boolean().default(false),
  printCancelledItems: z.boolean().default(true),
  printModifiedItems: z.boolean().default(true),
  remarks: z.string().optional(),
  active: z.boolean().default(true),
});
export type KitchenPrinterFormValues = z.infer<typeof kitchenPrinterSchema>;

export const menuCategorySchema = z.object({
  code: z.string().min(1, "validation.required"),
  categoryName: z.string().min(1, "validation.required"),
  categoryNameArb: z.string().optional(),
  kitchenCode: z.string().optional(),
  displayOrder: z.coerce.number().min(0, "validation.mustBeZeroOrMore").default(0),
  showInPOS: z.boolean().default(true),
  showInKiosk: z.boolean().default(true),
  showInOnlineOrder: z.boolean().default(true),
  siteId: z.string().min(1, "validation.required"),
  active: z.boolean().default(true),
});
export type MenuCategoryFormValues = z.infer<typeof menuCategorySchema>;

export const menuSubCategorySchema = z.object({
  code: z.string().min(1, "validation.required"),
  subCategoryName: z.string().min(1, "validation.required"),
  subCategoryNameArb: z.string().optional(),
  categoryCode: z.string().min(1, "validation.required"),
  kitchenCode: z.string().optional(),
  displayOrder: z.coerce.number().min(0, "validation.mustBeZeroOrMore").default(0),
  showInPOS: z.boolean().default(true),
  showInKiosk: z.boolean().default(true),
  showInOnlineOrder: z.boolean().default(true),
  siteId: z.string().min(1, "validation.required"),
  active: z.boolean().default(true),
});
export type MenuSubCategoryFormValues = z.infer<typeof menuSubCategorySchema>;

export const menuItemSchema = z.object({
  code: z.string().min(1, "validation.required"),
  menuName: z.string().min(1, "validation.required"),
  menuNameArb: z.string().optional(),
  categoryCode: z.string().min(1, "validation.required"),
  subCategoryCode: z.string().optional(),
  kitchenCode: z.string().optional(),
  unitCode: z.string().optional(),
  barcode: z.string().optional(),
  description: z.string().optional(),
  sellingPrice: z.coerce.number().min(0, "validation.mustBeZeroOrMore").default(0),
  // Optional take-away price. Stored on the item; the POS does not apply it yet.
  takeAwayPrice: z.preprocess(
    (v) => (v === "" || v === null || v === undefined || Number.isNaN(v) ? undefined : v),
    z.coerce.number().min(0, "validation.mustBeZeroOrMore").optional(),
  ),
  taxCode: z.string().optional(),
  taxPercent: z.coerce.number().min(0, "validation.mustBeZeroOrMore").optional(),
  preparationMinutes: z.coerce.number().min(0, "validation.mustBeZeroOrMore").optional(),
  isRecipeItem: z.boolean().default(false),
  isVegetarian: z.boolean().default(false),
  isSpicy: z.boolean().default(false),
  showInOnlineOrder: z.boolean().default(true),
  siteId: z.string().min(1, "validation.required"),
  active: z.boolean().default(true),
});
export type MenuItemFormValues = z.infer<typeof menuItemSchema>;

export const modifierGroupSchema = z.object({
  code: z.string().min(1, "validation.required"),
  modifierGroupName: z.string().min(1, "validation.required"),
  modifierGroupNameArb: z.string().optional(),
  minimumSelection: z.coerce.number().min(0, "validation.mustBeZeroOrMore").default(0),
  maximumSelection: z.coerce.number().min(1, "validation.required").default(1),
  isRequired: z.boolean().default(false),
  allowMultipleQty: z.boolean().default(false),
  displayOrder: z.coerce.number().min(0, "validation.mustBeZeroOrMore").default(0),
  siteId: z.string().min(1, "validation.required"),
  active: z.boolean().default(true),
});
export type ModifierGroupFormValues = z.infer<typeof modifierGroupSchema>;

export const modifierSchema = z.object({
  code: z.string().min(1, "validation.required"),
  modifierName: z.string().min(1, "validation.required"),
  modifierNameArb: z.string().optional(),
  modifierGroupCode: z.string().min(1, "validation.required"),
  unitCode: z.string().optional(),
  additionalPrice: z.coerce.number().min(0, "validation.mustBeZeroOrMore").default(0),
  kitchenCode: z.string().optional(),
  displayOrder: z.coerce.number().min(0, "validation.mustBeZeroOrMore").default(0),
  isDefault: z.boolean().default(false),
  printInKitchen: z.boolean().default(true),
  siteId: z.string().min(1, "validation.required"),
  active: z.boolean().default(true),
});
export type ModifierFormValues = z.infer<typeof modifierSchema>;

export const orderTypeSchema = z.object({
  code: z.string().min(1, "validation.required").max(10),
  orderTypeName: z.string().min(1, "validation.required"),
  orderTypeNameArb: z.string().optional(),
  siteId: z.string().min(1, "validation.required"),
  diningTypeCode: z.string().optional(),
  requiresTable: z.boolean().default(false),
  requiresCustomer: z.boolean().default(false),
  requiresAddress: z.boolean().default(false),
  requiresWaiter: z.boolean().default(false),
  requiresDriver: z.boolean().default(false),
  allowScheduledOrder: z.boolean().default(false),
  allowOnlineOrder: z.boolean().default(false),
  displayOrder: z.coerce.number().min(0, "validation.mustBeZeroOrMore").default(0),
  active: z.boolean().default(true),
});
export type OrderTypeFormValues = z.infer<typeof orderTypeSchema>;
