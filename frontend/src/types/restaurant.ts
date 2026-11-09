// Restaurant module types — camelCase, matching BCorDFWebApi's real
// Newtonsoft-serialized output (same "leading capital run only" rule as
// types/pos.ts: CompID -> compID, FloorCode -> floorCode). These replace the
// earlier placeholder types that targeted a fictional /restaurant/* API —
// see D:\Works\BCorApi\PowerDFWebApi\Models\Masters\* and
// \Models\Documents\KOT*.cs / RestaurantOperationsController.cs for the
// source of truth.

// ─── Status vocabularies ────────────────────────────────────────────────────
// Plain nvarchar columns server-side (no CHECK constraint / enum) — these are
// the values the frontend and RestaurantOperationsController/KOT updates
// agree on.

export type TableStatus = "AVAILABLE" | "OCCUPIED" | "RESERVED" | "DIRTY";
export type KotStatus = "OPEN" | "PREPARING" | "READY" | "SERVED" | "CLOSED" | "CANCELLED";
export type KotItemStatus = "OPEN" | "PREPARING" | "READY" | "SERVED" | "CANCELLED";

// ─── Masters ─────────────────────────────────────────────────────────────

export interface FloorDto {
  code: string;
  compID: string;
  siteID: string;
  active: boolean;
  floorName: string;
  floorNameArb?: string | null;
  displayOrder: number;
  floorColor?: string | null;
  remarks?: string | null;
}

export interface TableSectionDto {
  code: string;
  compID: string;
  siteID: string;
  active: boolean;
  sectionName: string;
  sectionNameArb?: string | null;
  floorCode: string;
  displayOrder: number;
  sectionColor?: string | null;
  remarks?: string | null;
}

export interface RestaurantTableDto {
  code: string;
  compID: string;
  siteID: string;
  active: boolean;
  tableName: string;
  tableNameArb?: string | null;
  floorCode: string;
  sectionCode?: string | null;
  tableNo?: number | null;
  capacity: number;
  minimumCapacity?: number | null;
  tableType?: string | null;
  shapeType?: string | null;
  positionX?: number | null;
  positionY?: number | null;
  width?: number | null;
  height?: number | null;
  rotation?: number | null;
  colorCode?: string | null;
  iconName?: string | null;
  currentStatus: TableStatus;
  isVIP: boolean;
  isSmoking: boolean;
  isOutdoor: boolean;
  isReservable: boolean;
  isMergeAllowed: boolean;
  isTakeAwayTable: boolean;
  isDeliveryTable: boolean;
  displayOrder: number;
  remarks?: string | null;
}

/** KITCHEN / BAR / COFFEE / JUICE / DESSERT / GRILL / BAKERY / OTHER — Bar Counter Management's Preparation Station type. */
export type StationType = "KITCHEN" | "BAR" | "COFFEE" | "JUICE" | "DESSERT" | "GRILL" | "BAKERY" | "OTHER";
/** Whether this station's tickets are printed, shown on a station screen, or both. */
export type StationDisplayMode = "PRINT_ONLY" | "DISPLAY_ONLY" | "PRINT_AND_DISPLAY";

export interface KitchenDto {
  code: string;
  compID: string;
  siteID: string;
  active: boolean;
  kitchenName: string;
  kitchenNameArb?: string | null;
  /** Bar Counter Management — the StockLocationMaster.Code this station's consumption/wastage posts against. */
  warehouseCode?: string | null;
  preparationMinutes?: number | null;
  displayOrder: number;
  enableKDS: boolean;
  kdsipAddress?: string | null;
  stationType: StationType;
  displayMode: StationDisplayMode;
  remarks?: string | null;
}

export interface MenuCategoryDto {
  code: string;
  compID: string;
  siteID: string;
  active: boolean;
  categoryName: string;
  categoryNameArb?: string | null;
  kitchenCode?: string | null;
  imagePath?: string | null;
  buttonColor?: string | null;
  textColor?: string | null;
  displayOrder: number;
  showInPOS: boolean;
  showInKiosk: boolean;
  showInOnlineOrder: boolean;
  remarks?: string | null;
}

export interface MenuSubCategoryDto {
  code: string;
  compID: string;
  siteID: string;
  active: boolean;
  subCategoryName: string;
  subCategoryNameArb?: string | null;
  categoryCode: string;
  kitchenCode?: string | null;
  imagePath?: string | null;
  buttonColor?: string | null;
  textColor?: string | null;
  displayOrder: number;
  showInPOS: boolean;
  showInKiosk: boolean;
  showInOnlineOrder: boolean;
  remarks?: string | null;
}

export interface MenuItemDto {
  code: string;
  compID: string;
  siteID: string;
  active: boolean;
  menuName: string;
  menuNameArb?: string | null;
  inventoryCode?: string | null;
  categoryCode: string;
  subCategoryCode?: string | null;
  kitchenCode?: string | null;
  unitCode?: string | null;
  barcode?: string | null;
  description?: string | null;
  descriptionArb?: string | null;
  sellingPrice: number;
  takeAwayPrice?: number | null;
  deliveryPrice?: number | null;
  costPrice?: number | null;
  taxCode?: string | null;
  taxPercent?: number | null;
  serviceChargeCode?: string | null;
  preparationMinutes?: number | null;
  calories?: number | null;
  imagePath?: string | null;
  buttonColor?: string | null;
  textColor?: string | null;
  displayOrder: number;
  isRecipeItem: boolean;
  isOpenItem: boolean;
  isPriceEditable: boolean;
  isWeightItem: boolean;
  isModifierRequired: boolean;
  isComboItem: boolean;
  isSetMenuItem: boolean;
  isVegetarian: boolean;
  isVegan: boolean;
  isSpicy: boolean;
  showInPOS: boolean;
  showInKiosk: boolean;
  showInOnlineOrder: boolean;
  allowDiscount: boolean;
  // Temporary 86'd/sold-out toggle (§20 of the QR ordering spec) — distinct
  // from `active`, which is permanent. See MenuMaster.cs.
  isSoldOut: boolean;
  remarks?: string | null;
}

export interface ModifierGroupDto {
  code: string;
  compID: string;
  siteID: string;
  active: boolean;
  modifierGroupName: string;
  modifierGroupNameArb?: string | null;
  minimumSelection: number;
  maximumSelection: number;
  isRequired: boolean;
  allowMultipleQty: boolean;
  displayOrder: number;
  remarks?: string | null;
}

export interface ModifierDto {
  code: string;
  compID: string;
  siteID: string;
  active: boolean;
  modifierName: string;
  modifierNameArb?: string | null;
  modifierGroupCode: string;
  inventoryCode?: string | null;
  unitCode?: string | null;
  additionalPrice: number;
  additionalCost?: number | null;
  consumptionQty?: number | null;
  kitchenCode?: string | null;
  imagePath?: string | null;
  displayOrder: number;
  isDefault: boolean;
  printInKitchen: boolean;
  remarks?: string | null;
}

export interface WaiterDto {
  code: string;
  compID: string;
  active: boolean;
  waiterName: string;
  waiterNameArb?: string | null;
  employeeCode?: string | null;
  defaultFloorCode?: string | null;
  defaultSectionCode?: string | null;
  canTakeOrder: boolean;
  canSettleBill: boolean;
  canGiveDiscount: boolean;
  maximumDiscountPercent?: number | null;
}

export interface CaptainDto {
  code: string;
  compID: string;
  active: boolean;
  captainName: string;
  captainNameArb?: string | null;
  employeeCode?: string | null;
  canAssignWaiter: boolean;
  canTransferTable: boolean;
  canMergeTable: boolean;
  canSettleBill: boolean;
  canGiveDiscount: boolean;
  maximumDiscountPercent?: number | null;
}

export interface OrderTypeDto {
  code: string;
  compID: string;
  siteID?: string;
  active: boolean;
  orderTypeName: string;
  orderTypeNameArb?: string | null;
  diningTypeCode?: string | null;
  requiresTable: boolean;
  requiresCustomer: boolean;
  requiresAddress: boolean;
  requiresWaiter: boolean;
  requiresDriver: boolean;
  allowScheduledOrder: boolean;
  allowOnlineOrder: boolean;
  displayOrder: number;
}

export interface DiningTypeDto {
  code: string;
  compID: string;
  siteID?: string;
  active: boolean;
  diningTypeName: string;
  diningTypeNameArb?: string | null;
  requiresTable: boolean;
  requiresCustomer: boolean;
  requiresWaiter: boolean;
  allowReservation: boolean;
  displayOrder: number;
}

// ─── KOT (Kitchen Order Ticket) ─────────────────────────────────────────────

/** Snapshot shape stored in KOTDetails.ModifiersJson — see KOTDetails.cs. */
export interface SelectedModifier {
  code: string;
  name: string;
  price: number;
}

export interface KotDetailDto {
  id: string;
  hdrID: string;
  rowID: number;
  menuCode: string;
  inventoryCode?: string | null;
  menuName?: string | null;
  menuNameArb?: string | null;
  unitCode?: string | null;
  qty: number;
  rate: number;
  grossAmount: number;
  modifierAmount: number;
  discountAmount: number;
  taxAmount: number;
  netAmount: number;
  kitchenCode?: string | null;
  printerCode?: string | null;
  itemStatus: KotItemStatus;
  preparationNotes?: string | null;
  courseNo?: number | null;
  courseName?: string | null;
  modifiersJson?: string | null;
  comboInstanceId?: string | null;
  comboCode?: string | null;
  comboComponentsJson?: string | null;
  setMenuInstanceId?: string | null;
  setMenuCode?: string | null;
  setMenuComponentsJson?: string | null;
  setMenuGroupCode?: string | null;
  setMenuGroupSequence?: number | null;
  isOpenItem?: boolean;
  openItemDescription?: string | null;
  openItemRemarks?: string | null;
  approvedBy?: string | null;
  approvedOn?: string | null;
  isComplimentary: boolean;
  isTakeAway: boolean;
  cancelled: boolean;
  cancelledBy?: string | null;
  cancellationReason?: string | null;
  remarks?: string | null;
}

export interface KotDto {
  id: string;
  compID: string;
  siteID: string;
  docNo: number;
  docDt: string;
  refNo: string;
  lastModifiedBy: string;
  orderTypeCode?: string | null;
  diningTypeCode?: string | null;
  floorCode?: string | null;
  sectionCode?: string | null;
  tableCode?: string | null;
  /** Bar Counter Management — Open Tab. Set instead of tableCode for a walk-in/counter order. */
  tabCode?: string | null;
  customerCode?: string | null;
  customerName?: string | null;
  waiterCode?: string | null;
  captainCode?: string | null;
  terminalCode?: string | null;
  shiftNo?: number | null;
  guestCount?: number | null;
  kotStatus: KotStatus;
  /** POS|WAITER_MOBILE|QR|BAR|DELIVERY|TAKEAWAY|PHONE_ORDER — see KOTHeader.OrderSource's own doc comment. */
  orderSource: string;
  orderTime?: string | null;
  remarks?: string | null;
  details: KotDetailDto[];
}

export interface CreateKotDetailInput {
  menuCode: string;
  inventoryCode?: string | null;
  menuName?: string | null;
  menuNameArb?: string | null;
  unitCode?: string | null;
  qty: number;
  rate: number;
  grossAmount: number;
  modifierAmount: number;
  discountAmount: number;
  taxAmount: number;
  netAmount: number;
  kitchenCode?: string | null;
  printerCode?: string | null;
  preparationNotes?: string | null;
  courseNo?: number | null;
  courseName?: string | null;
  modifiersJson?: string | null;
  comboInstanceId?: string | null;
  comboCode?: string | null;
  comboComponentsJson?: string | null;
  setMenuInstanceId?: string | null;
  setMenuCode?: string | null;
  setMenuComponentsJson?: string | null;
  setMenuGroupCode?: string | null;
  setMenuGroupSequence?: number | null;
  isOpenItem?: boolean;
  openItemDescription?: string | null;
  openItemRemarks?: string | null;
  approvedBy?: string | null;
  approvedOn?: string | null;
  isComplimentary?: boolean;
  isTakeAway?: boolean;
}

export interface CreateKotInput {
  docDt: string;
  orderTypeCode?: string | null;
  diningTypeCode?: string | null;
  floorCode?: string | null;
  sectionCode?: string | null;
  tableCode?: string | null;
  tabCode?: string | null;
  customerCode?: string | null;
  customerName?: string | null;
  waiterCode?: string | null;
  captainCode?: string | null;
  terminalCode?: string | null;
  shiftNo?: number | null;
  guestCount?: number | null;
  remarks?: string | null;
  // Waiter Mobile Ordering §19 — POS|WAITER_MOBILE|QR|DELIVERY|TAKEAWAY.
  // Omitted by every other caller, which leaves the backend's "POS" default.
  orderSource?: string | null;
  // Waiter Mobile Ordering §38 — client-generated, unique per (compId,
  // siteId). A retried/double-tapped SEND ORDER with the same key returns
  // the KOT already created instead of a duplicate. Omitted by every other
  // caller (desktop table/bar-counter screens never set this).
  idempotencyKey?: string | null;
  details: CreateKotDetailInput[];
}

export interface UpdateKotDetailInput {
  id?: string | null;
  rowID?: number | null;
  menuCode: string;
  inventoryCode?: string | null;
  menuName?: string | null;
  menuNameArb?: string | null;
  unitCode?: string | null;
  qty: number;
  rate: number;
  grossAmount: number;
  modifierAmount: number;
  discountAmount: number;
  taxAmount: number;
  netAmount: number;
  kitchenCode?: string | null;
  printerCode?: string | null;
  itemStatus: KotItemStatus;
  preparationNotes?: string | null;
  courseNo?: number | null;
  courseName?: string | null;
  modifiersJson?: string | null;
  comboInstanceId?: string | null;
  comboCode?: string | null;
  comboComponentsJson?: string | null;
  setMenuInstanceId?: string | null;
  setMenuCode?: string | null;
  setMenuComponentsJson?: string | null;
  setMenuGroupCode?: string | null;
  setMenuGroupSequence?: number | null;
  isOpenItem?: boolean;
  openItemDescription?: string | null;
  openItemRemarks?: string | null;
  approvedBy?: string | null;
  approvedOn?: string | null;
  isComplimentary: boolean;
  isTakeAway: boolean;
  cancelled: boolean;
  cancellationReason?: string | null;
  remarks?: string | null;
}

/** Full-replace body for PUT /api/kot/{docNo} — the generic document engine's contract (see kot-service.ts). */
export interface UpdateKotInput {
  docDt: string;
  orderTypeCode?: string | null;
  diningTypeCode?: string | null;
  floorCode?: string | null;
  sectionCode?: string | null;
  tableCode?: string | null;
  tabCode?: string | null;
  customerCode?: string | null;
  customerName?: string | null;
  waiterCode?: string | null;
  captainCode?: string | null;
  terminalCode?: string | null;
  shiftNo?: number | null;
  guestCount?: number | null;
  kotStatus: KotStatus;
  remarks?: string | null;
  details: UpdateKotDetailInput[];
}

/** Drops the read-only/server-set fields from a fetched KotDto so it can be re-sent as an UpdateKotInput. */
export function kotDtoToUpdateInput(kot: KotDto): UpdateKotInput {
  return {
    docDt: kot.docDt,
    orderTypeCode: kot.orderTypeCode,
    diningTypeCode: kot.diningTypeCode,
    floorCode: kot.floorCode,
    sectionCode: kot.sectionCode,
    tableCode: kot.tableCode,
    tabCode: kot.tabCode,
    customerCode: kot.customerCode,
    customerName: kot.customerName,
    waiterCode: kot.waiterCode,
    captainCode: kot.captainCode,
    terminalCode: kot.terminalCode,
    shiftNo: kot.shiftNo,
    guestCount: kot.guestCount,
    kotStatus: kot.kotStatus,
    remarks: kot.remarks,
    details: kot.details.map((d) => ({
      id: d.id,
      rowID: d.rowID,
      menuCode: d.menuCode,
      inventoryCode: d.inventoryCode,
      menuName: d.menuName,
      menuNameArb: d.menuNameArb,
      unitCode: d.unitCode,
      qty: d.qty,
      rate: d.rate,
      grossAmount: d.grossAmount,
      modifierAmount: d.modifierAmount,
      discountAmount: d.discountAmount,
      taxAmount: d.taxAmount,
      netAmount: d.netAmount,
      kitchenCode: d.kitchenCode,
      printerCode: d.printerCode,
      itemStatus: d.itemStatus,
      preparationNotes: d.preparationNotes,
      courseNo: d.courseNo,
      courseName: d.courseName,
      modifiersJson: d.modifiersJson,
      comboInstanceId: d.comboInstanceId,
      comboCode: d.comboCode,
      comboComponentsJson: d.comboComponentsJson,
      setMenuInstanceId: d.setMenuInstanceId,
      setMenuCode: d.setMenuCode,
      setMenuComponentsJson: d.setMenuComponentsJson,
      setMenuGroupCode: d.setMenuGroupCode,
      setMenuGroupSequence: d.setMenuGroupSequence,
      isOpenItem: d.isOpenItem,
      openItemDescription: d.openItemDescription,
      openItemRemarks: d.openItemRemarks,
      approvedBy: d.approvedBy,
      isComplimentary: d.isComplimentary,
      isTakeAway: d.isTakeAway,
      cancelled: d.cancelled,
      cancellationReason: d.cancellationReason,
      remarks: d.remarks,
    })),
  };
}

// ─── Workflow (RestaurantOperationsController) ──────────────────────────────

export interface FloorStatusEntry {
  table: RestaurantTableDto;
  openKotDocNo?: number | null;
  heldBillDocNo?: number | null;
}

// ─── Recipe Management (RecipeMasterController) ─────────────────────────────
// Mirrors BCorApi's Dto/Masters/RecipeMasterDto.cs — a RecipeMaster header
// (one per MenuMaster.IsRecipeItem item, costed/timed/versioned) plus its
// RecipeDetail ingredient lines, consumed against InventoryMaster stock at
// bill-settle time by InventoryLedgerService.consumeRecipe.

export interface RecipeDetailDto {
  id: string;
  masterID: string;
  rowID: number;
  siteID: string;
  inventoryCode: string;
  unitCode?: string | null;
  requiredQty: number;
  wastagePercent: number;
  netRequiredQty?: number | null;
  unitCost?: number | null;
  totalCost?: number | null;
  isOptional: boolean;
  remarks?: string | null;
}

export interface RecipeMasterDto {
  code: string;
  compID: string;
  siteID: string;
  active: boolean;
  lastModifiedBy: string;
  lastModifiedOn?: string | null;

  recipeName: string;
  recipeNameArb?: string | null;
  menuCode: string;
  yieldQty: number;
  yieldUnitCode?: string | null;
  standardCost?: number | null;
  preparationMinutes?: number | null;
  cookingMinutes?: number | null;
  instructions?: string | null;
  instructionsArb?: string | null;
  versionNo: number;
  effectiveFrom?: string | null;
  effectiveTo?: string | null;
  isDefault: boolean;
  remarks?: string | null;

  details: RecipeDetailDto[];
}
