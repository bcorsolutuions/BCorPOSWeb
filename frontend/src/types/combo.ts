// Wire-format types for BCorDFWebApi's ComboMaster/ComboDetail (see
// D:\Works\BCorApi\PowerDFWebApi\Dto\Masters\ComboMasterDto.cs). Field
// casing is camelCase, same convention as types/pos.ts.
//
// ComboDetail is polymorphic — exactly one of menuCode/inventoryCode/
// serviceCode is populated, per componentType. GroupNo/GroupName double as
// the "substitute group": rows sharing a groupNo are the substitutable set
// (e.g. Fries vs Salad) when the header's allowItemSubstitution is true;
// isDefault marks which one bills/preps by default.

export const COMBO_COMPONENT_TYPES = ["Inventory", "Menu", "Service"] as const;
export type ComboComponentType = (typeof COMBO_COMPONENT_TYPES)[number];

export interface ComboDetailDto {
  id: string;
  masterID: string;
  rowID: number;
  groupNo: number;
  groupName?: string | null;
  componentType: ComboComponentType;
  menuCode?: string | null;
  inventoryCode?: string | null;
  serviceCode?: string | null;
  unitCode?: string | null;
  isOptional: boolean;
  quantity: number;
  minimumSelection: number;
  maximumSelection: number;
  additionalPrice: number;
  isDefault: boolean;
  displayOrder: number;
  remarks?: string | null;
}

export interface ComboMasterDto {
  code: string;
  compID: string;
  siteID: string;
  active: boolean;
  lastModifiedBy: string;
  lastModifiedOn?: string | null;

  comboName: string;
  comboNameArb?: string | null;
  menuCode?: string | null;
  categoryCode?: string | null;
  sellingPrice: number;
  takeAwayPrice?: number | null;
  deliveryPrice?: number | null;
  taxCode?: string | null;
  taxPercent?: number | null;
  validFrom?: string | null;
  validTo?: string | null;
  availableFromTime?: string | null;
  availableToTime?: string | null;
  imagePath?: string | null;
  displayOrder: number;
  showInPOS: boolean;
  showInKiosk: boolean;
  showInOnlineOrder: boolean;
  allowDiscount: boolean;
  allowItemSubstitution: boolean;
  remarks?: string | null;

  details: ComboDetailDto[];
}

export interface CreateComboDetailDto {
  id?: string;
  groupNo: number;
  groupName?: string | null;
  componentType: ComboComponentType;
  menuCode?: string | null;
  inventoryCode?: string | null;
  serviceCode?: string | null;
  unitCode?: string | null;
  isOptional: boolean;
  quantity: number;
  minimumSelection: number;
  maximumSelection: number;
  additionalPrice: number;
  isDefault: boolean;
  displayOrder: number;
  remarks?: string | null;
}

export interface CreateComboMasterDto {
  code: string;
  siteID: string;
  active: boolean;
  comboName: string;
  comboNameArb?: string | null;
  menuCode?: string | null;
  categoryCode?: string | null;
  sellingPrice: number;
  takeAwayPrice?: number | null;
  deliveryPrice?: number | null;
  taxCode?: string | null;
  taxPercent?: number | null;
  validFrom?: string | null;
  validTo?: string | null;
  availableFromTime?: string | null;
  availableToTime?: string | null;
  imagePath?: string | null;
  displayOrder: number;
  showInPOS: boolean;
  showInKiosk: boolean;
  showInOnlineOrder: boolean;
  allowDiscount: boolean;
  allowItemSubstitution: boolean;
  remarks?: string | null;
  details: CreateComboDetailDto[];
}

export type UpdateComboMasterDto = Omit<CreateComboMasterDto, "code" | "siteID">;

// ── Resolved "as sold" component (client-side + serialized to PosDet/
// KOTDetails' ComboComponentsJson snapshot) ─────────────────────────────
export interface ResolvedComboComponent {
  componentType: ComboComponentType;
  code: string;
  name: string;
  unitCode?: string | null;
  qty: number;
  additionalPrice: number;
  isOptional: boolean;
  selected: boolean;
  kitchenCode?: string | null;
  groupNo: number;
}
