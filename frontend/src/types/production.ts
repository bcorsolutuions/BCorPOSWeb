// Mirrors BCorApi's Dto/Documents/ProductionDtos.cs — the real, pre-existing
// precast/concrete-manufacturing Production feature (PlantCode/MixRefNo/
// MouldNo), not a generic bakery/recipe engine.

export interface ProductionFinishedGoodsDetDto {
  id: string;
  hdrID: string;
  rowID: number;
  fgInventoryCode: string;
  itemRemarks?: string | null;
  unitCode?: string | null;
  expQty?: number | null;
  prodQty?: number | null;
  wasteQty?: number | null;
  cost: number;
  amount?: number | null;
  refCode?: string | null;
  projCode?: string | null;
  mouldNo?: string | null;
  vol?: number | null;
  remarks?: string | null;
}

export interface ProductionConsumptionDetDto {
  id: string;
  hdrID: string;
  rowID: number;
  fgInventoryCode: string;
  bomInventoryCode: string;
  itemRemarks?: string | null;
  unitCode?: string | null;
  expQty?: number | null;
  actualQty: number;
  cost: number;
  amount?: number | null;
  refCode?: string | null;
  projCode?: string | null;
  mouldNo?: string | null;
  mixRefNo?: string | null;
  remarks?: string | null;
}

export interface ProductionHdrDto {
  id: string;
  compID: string;
  siteID: string;
  docNo: number;
  docDt: string;
  refNo?: string | null;
  prodType?: string | null;
  plantCode?: string | null;
  plantOperatorEmpCode?: string | null;
  prodStartDateTime?: string | null;
  prodEndDateTime?: string | null;
  prodName?: string | null;
  mixRefNo?: string | null;
  labourCostPer?: number | null;
  labourCost?: number | null;
  machineCostPer?: number | null;
  machineCost?: number | null;
  otherOHPer?: number | null;
  otherOH?: number | null;
  remarks?: string | null;
  posted?: boolean | null;
  deleted?: boolean | null;
  lastModifiedBy: string;
  lastModifiedOn?: string | null;
  finishedGoods: ProductionFinishedGoodsDetDto[];
  consumption: ProductionConsumptionDetDto[];
}

export interface CreateProductionFinishedGoodsDetInput {
  fgInventoryCode: string;
  itemRemarks?: string | null;
  unitCode?: string | null;
  expQty?: number | null;
  prodQty?: number | null;
  wasteQty?: number | null;
  cost: number;
  amount?: number | null;
  refCode?: string | null;
  projCode?: string | null;
  mouldNo?: string | null;
  vol?: number | null;
  remarks?: string | null;
}

export interface CreateProductionConsumptionDetInput {
  fgInventoryCode: string;
  bomInventoryCode: string;
  itemRemarks?: string | null;
  unitCode?: string | null;
  expQty?: number | null;
  actualQty: number;
  cost: number;
  amount?: number | null;
  refCode?: string | null;
  projCode?: string | null;
  mouldNo?: string | null;
  mixRefNo?: string | null;
  remarks?: string | null;
}

export interface CreateProductionHdrInput {
  docDt: string;
  prodType?: string | null;
  plantCode?: string | null;
  plantOperatorEmpCode?: string | null;
  prodStartDateTime?: string | null;
  prodEndDateTime?: string | null;
  prodName?: string | null;
  mixRefNo?: string | null;
  labourCostPer?: number | null;
  labourCost?: number | null;
  machineCostPer?: number | null;
  machineCost?: number | null;
  otherOHPer?: number | null;
  otherOH?: number | null;
  remarks?: string | null;
  finishedGoods: CreateProductionFinishedGoodsDetInput[];
  consumption: CreateProductionConsumptionDetInput[];
}
