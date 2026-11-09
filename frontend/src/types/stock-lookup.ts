// Mirrors BCorApi's Dto/Documents/StockLookupDto.cs.

export type StockLookupStatusCode = "OK" | "NOT_FOUND" | "INACTIVE";
export type StockStatus = "IN_STOCK" | "LOW_STOCK" | "OUT_OF_STOCK";

export interface StockLookupWarehouseDto {
  warehouseCode: string;
  warehouseName: string;
  onHandQty: number;
}

export interface StockLookupSiteDto {
  siteId: string;
  siteName: string;
  availableQty: number;
}

export interface StockLookupUnitDto {
  unitCode: string;
  unitName?: string | null;
  qty: number;
}

export interface StockLookupResultDto {
  status: StockLookupStatusCode;
  barcode?: string | null;
  inventoryCode?: string | null;
  inventoryName?: string | null;
  inventoryNameArb?: string | null;
  unitCode?: string | null;
  unitName?: string | null;
  siteId: string;
  siteName?: string | null;

  onHandQty: number;
  reservedQty: number;
  availableQty: number;
  stockStatus?: StockStatus | null;

  preferredBinCode?: string | null;

  warehouses: StockLookupWarehouseDto[];
  otherSites?: StockLookupSiteDto[] | null;
  unitConversions?: StockLookupUnitDto[] | null;

  sellingPrice?: number | null;
  unitCost?: number | null;
  stockValue?: number | null;
}

export interface StockLookupSearchItemDto {
  inventoryCode: string;
  inventoryName: string;
  inventoryNameArb?: string | null;
  barCode?: string | null;
  unitCode: string;
}
