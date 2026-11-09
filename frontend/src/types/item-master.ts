// Real Item Master types — camelCase, matching BCorDFWebApi's actual
// ItemsController/ItemDto (see D:\Works\BCorApi\PowerDFWebApi\Dto\Masters\ItemDto.cs
// and Controllers\Masters\ItemController.cs). Deliberately separate from the
// fictional `Item`/`itemService` in types/masters.ts + masters-service.ts,
// which several other still-unmigrated pages (purchase orders, GRN, stock
// transfer/adjustment) depend on — this is the real backend's simple sellable
// item, matching the same shape already verified live for POS product search
// (see types/pos-lookups.ts's ItemSearchResult, which is a trimmed view of
// this same entity).
//
// Note: BCorApi also has a much larger, unrelated `InventoryMaster` — a
// building-materials/concrete-mix master (Grade, Cement, Aggregate, etc.)
// used by a different business line. `Items`/`ItemDto` (this file) is the
// correct, simple master for POS/retail items — don't confuse the two.

export interface ItemMaster {
  id: string;
  code: string;
  name: string;
  description?: string | null;
  categoryCode?: string | null;
  unitCode?: string | null;
  barCode?: string | null;
  imagePath?: string | null;
  /** Retail Price — InventoryMaster.RetailPrice, what POS bills at. */
  price?: number | null;
  /** Tag Price — InventoryMaster.TagPrice. */
  tagPrice?: number | null;
  /** Wholesale Price — InventoryMaster.RetailPrice2. */
  wholesalePrice?: number | null;
  /** Cost Price — InventoryMaster.UnitCost. */
  costPrice?: number | null;
  /** Brand — InventoryMaster.BrandCode (free text; there is no Brand master). */
  brandCode?: string | null;
  taxCode?: string | null;
  taxRate?: number | null;
  compID: string;
  siteID: string;
  lastModifiedBy: string;
  lastModifiedOn?: string | null;
  active: boolean;
  // Weighed items (produce/bakery/deli sold by kg) — see lib/pos/weight-barcode.ts
  // for the 13-digit scale-printed barcode scheme this feeds. pluCode is the
  // fixed lookup key printed on every sticker for this item, regardless of the
  // measured weight (which varies per sticker, unlike barCode).
  isWeighted: boolean;
  pluCode?: string | null;
  // Alternate selling/stocking units for this item (e.g. a "Box" that holds
  // 12 of the base Unit) — InventoryMaster's pre-existing UOMs child detail
  // collection, exposed on the API as `uoMs`. `unitCode` above is the base/
  // stocking unit; these are additional units with a factor relative to it.
  uoms: ItemUnitOfMeasure[];
  // Suppliers that sell this item (InventoryMaster's VendorDetails child
  // collection, `vendorDetails` on the API).
  vendors: ItemVendorDetail[];
}

export interface ItemVendorDetail {
  // Absent for a row not yet saved; present = update that existing row.
  id?: string;
  vendorCode: string;
  unitCode?: string | null;
  price?: number | null;
  vendorItemRef?: string | null;
  vendorItemName?: string | null;
  vendorItemNameArb?: string | null;
  remarks?: string | null;
  remarksArb?: string | null;
}

export interface ItemUnitOfMeasure {
  // Absent for a row not yet saved (added in the UI, not yet persisted) —
  // the backend's detail-collection sync treats a missing id as "insert",
  // a present one as "update this existing row".
  id?: string;
  unitCode: string;
  conversionFactor: number;
  unitName?: string | null;
  // This unit's own barcode (e.g. a "Box" sticker scans differently than a
  // single "Piece") — separate from InventoryMaster.barCode, which is the
  // Base Unit's barcode.
  barCode?: string | null;
  // This unit's own prices; null/absent = not set. wholesalePrice is
  // InventoryMasterUOM.RetailPrice2 on the API.
  tagPrice?: number | null;
  retailPrice?: number | null;
  wholesalePrice?: number | null;
}

// Real Unit Master — BCorDFWebApi's UnitMasterController (api/UnitMaster/{compId}),
// keyed by (CompID, Code) only, not site-scoped. `UnitCode` fields elsewhere
// (Item, MenuMaster, etc.) are unenforced free text by convention — this is
// the lookup used to browse/pick a valid one instead of hand-typing.
//
// Note: there's a second, separate "Units" entity (api/Units, Models/VanSales)
// left over from the van-sales module — its backing table doesn't even exist
// in the DB (confirmed live), so it's effectively dead. UnitMaster (this one,
// under Models/Masters) is the real, live one — verified via a working curl
// against api/UnitMaster/{compId}. Don't confuse the two.
export interface UnitMaster {
  code: string;
  unitName: string;
  abbreviation?: string | null;
  compID: string;
  siteID: string;
  lastModifiedBy: string;
  lastModifiedOn?: string | null;
  active: boolean;
}

// Real Item Category Master — BCorDFWebApi's ItemCategoriesController
// (api/ItemCategories/{compId}), keyed by (CompID, Code) only, not
// site-scoped. Lives under Models/VanSales (its file/class names are
// swapped with Unit.cs — the class named `ItemCategory` actually lives in
// VanSales/Unit.cs — but the live route is confirmed api/ItemCategories).
export interface ItemCategoryMaster {
  code: string;
  name: string;
  description?: string | null;
  /** Code of the main category this is a sub category of; null/absent = a main category. */
  parentCode?: string | null;
  /** Display name of parentCode — resolved client-side in item-category-service.list, not stored. */
  parentName?: string | null;
  /** GL accounts (GL Master codes) that items of this category post to. */
  inventoryGLCode?: string | null;
  costGLCode?: string | null;
  salesGLCode?: string | null;
  /** Other GL columns of the same record; not edited on this screen but sent back unchanged so saving does not blank them. */
  glCode?: string | null;
  salesGLCode2?: string | null;
  costGLCode2?: string | null;
  compID: string;
  siteID: string;
  lastModifiedBy: string;
  lastModifiedOn?: string | null;
  active: boolean;
}

// Real Tax Master — BCorDFWebApi's TaxMasterController (api/TaxMaster/{compId}),
// keyed by (CompID, Code) only, not site-scoped. Item Master's Tax Code field
// picks from this list instead of accepting a manually-typed Tax Rate % — the
// rate is resolved from here (see item-master-service.ts's resolveTaxRate)
// and snapshotted onto InventoryMaster.TaxRate whenever an item is saved.
export interface TaxMaster {
  code: string;
  taxName: string;
  taxRate: number;
  compID: string;
  siteID: string;
  lastModifiedBy: string;
  lastModifiedOn?: string | null;
  active: boolean;
}

// Read-only figures derived by the API (GET /InventoryMaster/{compId}/{code}/cost-stock):
// none are stored on the item. Null cost = the item was never received on a GRN.
export interface ItemCostStock {
  /** On-hand quantity at the requested branch. */
  stockQty: number;
  /** On-hand quantity across every branch. */
  stockQtyAllBranches: number;
  averageCost: number | null;
  lastPurchaseCost: number | null;
  lastPurchaseDate: string | null;
  lastPurchaseDocNo: number | null;
}
