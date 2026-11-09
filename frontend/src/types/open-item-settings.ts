export interface OpenItemSettingsDto {
  compID: string;
  siteID: string;
  active: boolean;
  lastModifiedBy: string;
  lastModifiedOn?: string | null;

  enableOpenItem: boolean;
  openItemInventoryCode: string;
  allowOpenItemPriceEntry: boolean;
  allowOpenItemTaxChange: boolean;
  openItemRemarksRequired: boolean;
  openItemManagerApproval: boolean;
  openItemApprovalAboveAmount: number;
  openItemMinPrice: number;
  openItemMaxPrice: number;
  openItemAllowDiscount: boolean;
  openItemAllowPromotion: boolean;
  openItemAllowKOT: boolean;
}
