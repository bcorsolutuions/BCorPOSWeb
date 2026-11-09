export type StockLocationType = "STORE" | "BAR" | "COUNTER" | "KITCHEN" | "OTHER";

export interface StockLocationDto {
  code: string;
  compID: string;
  siteID: string;
  active: boolean;
  locationName: string;
  locationNameArb?: string | null;
  locationType: StockLocationType;
  displayOrder: number;
  remarks?: string | null;
}
