// Wire-format types for BCorDFWebApi's SetMenuMaster/SetMenuGroup/
// SetMenuGroupItem (see D:\Works\BCorApi\PowerDFWebApi\Dto\Masters\SetMenuMasterDto.cs).
// Field casing is camelCase, same convention as types/combo.ts.
//
// Genuinely 3 levels (Master -> Group/course -> GroupItem/choice), unlike
// Combo's flat GroupNo-bucketed-rows shape — see kind-crafting-hamming.md
// for why Set Menu needed its own dedicated tables rather than reusing
// ComboMaster/ComboDetail.

export interface SetMenuGroupItemDto {
  id: string;
  groupID: string;
  rowID: number;
  menuCode: string;
  unitCode?: string | null;
  additionalPrice: number;
  isDefault: boolean;
  displayOrder: number;
  active: boolean;
  remarks?: string | null;
}

export interface SetMenuGroupDto {
  id: string;
  masterID: string;
  rowID: number;
  groupCode: string;
  groupName: string;
  groupNameArb?: string | null;
  sequence: number;
  minSelection: number;
  maxSelection: number;
  isRequired: boolean;
  displayOrder: number;
  active: boolean;
  items: SetMenuGroupItemDto[];
}

export interface SetMenuMasterDto {
  code: string;
  compID: string;
  siteID: string;
  active: boolean;
  lastModifiedBy: string;
  lastModifiedOn?: string | null;

  setMenuName: string;
  setMenuNameArb?: string | null;
  description?: string | null;
  menuCode?: string | null;
  sellingPrice: number;
  taxCode?: string | null;
  taxPercent?: number | null;
  validFrom?: string | null;
  validTo?: string | null;
  startTime?: string | null;
  endTime?: string | null;
  availableDays?: string | null;
  imagePath?: string | null;
  displayOrder: number;
  showInPOS: boolean;
  showInKiosk: boolean;
  showInOnlineOrder: boolean;
  allowDiscount: boolean;
  remarks?: string | null;

  groups: SetMenuGroupDto[];
}

export interface CreateSetMenuGroupItemDto {
  menuCode: string;
  unitCode?: string | null;
  additionalPrice: number;
  isDefault: boolean;
  displayOrder: number;
  active: boolean;
  remarks?: string | null;
}

export interface CreateSetMenuGroupDto {
  groupCode: string;
  groupName: string;
  groupNameArb?: string | null;
  sequence: number;
  minSelection: number;
  maxSelection: number;
  isRequired: boolean;
  displayOrder: number;
  active: boolean;
  items: CreateSetMenuGroupItemDto[];
}

export interface CreateSetMenuMasterDto {
  code: string;
  compID: string;
  siteID: string;
  active: boolean;
  lastModifiedBy: string;

  setMenuName: string;
  setMenuNameArb?: string | null;
  description?: string | null;
  menuCode?: string | null;
  sellingPrice: number;
  taxCode?: string | null;
  taxPercent?: number | null;
  validFrom?: string | null;
  validTo?: string | null;
  startTime?: string | null;
  endTime?: string | null;
  availableDays?: string | null;
  imagePath?: string | null;
  displayOrder: number;
  showInPOS: boolean;
  showInKiosk: boolean;
  showInOnlineOrder: boolean;
  allowDiscount: boolean;
  remarks?: string | null;

  groups: CreateSetMenuGroupDto[];
}

export interface UpdateSetMenuGroupItemDto extends CreateSetMenuGroupItemDto {
  id?: string | null;
}

export interface UpdateSetMenuGroupDto extends Omit<CreateSetMenuGroupDto, "items"> {
  id?: string | null;
  items: UpdateSetMenuGroupItemDto[];
}

export type UpdateSetMenuMasterDto = Omit<CreateSetMenuMasterDto, "code" | "compID" | "siteID" | "groups"> & {
  groups: UpdateSetMenuGroupDto[];
};

// ── Resolved "as sold" component (client-side + serialized to PosDet/
// KOTDetails' SetMenuComponentsJson snapshot) — mirrors combo.ts's
// ResolvedComboComponent, plus the group identity fields a Set Menu
// selection needs that a Combo's own snapshot never carried (§9/§10 —
// kitchen ticket grouping and a course-firing-ready Sequence snapshot).
export interface ResolvedSetMenuComponent {
  componentType: "Menu";
  code: string;
  name: string;
  unitCode?: string | null;
  qty: number;
  additionalPrice: number;
  selected: boolean;
  kitchenCode?: string | null;
  groupCode: string;
  groupName: string;
  groupSequence: number;
}
