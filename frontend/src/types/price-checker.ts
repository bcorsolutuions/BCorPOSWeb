// Mirrors BCorApi's Dto/Documents/PriceCheckerDto.cs — deliberately narrow,
// never exposes cost/margin/supplier/GL fields.

export type PriceCheckerStatus = "OK" | "NOT_FOUND" | "INACTIVE" | "NO_PRICE";
export type StockStatus = "IN_STOCK" | "LOW_STOCK" | "OUT_OF_STOCK";

export interface PriceCheckerResultDto {
  status: PriceCheckerStatus;
  barcode: string;
  inventoryCode?: string | null;
  itemName?: string | null;
  itemNameArb?: string | null;
  unitCode?: string | null;
  unitName?: string | null;
  imageUrl?: string | null;
  regularPrice?: number | null;
  currentPrice?: number | null;
  hasPromotion: boolean;
  promotionText?: string | null;
  promotionTextArb?: string | null;
  savingsAmount?: number | null;
  savingsPercentage?: number | null;
  taxIncluded: boolean;
  stockStatus?: StockStatus | null;
  exactStockQty?: number | null;
  isActive?: boolean | null;
  staffMessage?: string | null;
}

export interface PriceCheckerKioskConfigDto {
  resetSeconds: number;
  allowCamera: boolean;
  allowAddToCart: boolean;
  defaultLanguage: string;
}
