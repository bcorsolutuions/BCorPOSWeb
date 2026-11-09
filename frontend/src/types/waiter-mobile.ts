// WaiterMobileController.GetMyProfile — folds the logged-in user's
// WaiterMaster row (CanTakeOrder etc.) and the site's WaiterMobileSettings
// into one response so the mobile home screen needs a single call.
export interface WaiterProfileDto {
  isWaiter: boolean;
  waiterCode?: string | null;
  waiterName?: string | null;
  defaultFloorCode?: string | null;
  defaultSectionCode?: string | null;
  /** The captain this waiter normally works under — pre-selected when opening a table. */
  captainCode?: string | null;
  canTakeOrder: boolean;
  canSettleBill: boolean;
  canGiveDiscount: boolean;
  maximumDiscountPercent?: number | null;

  enableWaiterMobileOrdering: boolean;
  allowWaiterOpenTable: boolean;
  allowWaiterViewOtherTables: boolean;
  allowWaiterTransferTable: boolean;
  allowWaiterSplitTable: boolean;
  allowWaiterOpenItem: boolean;
  allowWaiterCancelSentItem: boolean;
  allowWaiterViewBill: boolean;
  allowWaiterRequestBill: boolean;
  enableKitchenReadyNotification: boolean;
  enableMobileOfflineCart: boolean;
}

export interface MyTableEntry {
  tableCode: string;
  tableName?: string | null;
  openKotDocNo: number;
  guestCount?: number | null;
  openedOn?: string | null;
  /** Lines on the open order (cancelled ones excluded). */
  itemCount?: number;
  /** Lines the kitchen has marked READY, waiting to be served. */
  readyCount?: number;
  totalAmount?: number;
  /** The guests asked for the bill and it hasn't been completed yet. */
  billRequested?: boolean;
}

// WaiterMobileSettingsController — admin CRUD shape, mirrors OpenItemSettingsDto.
export interface WaiterMobileSettingsDto {
  compID: string;
  siteID: string;
  active: boolean;
  lastModifiedBy: string;
  lastModifiedOn?: string | null;
  enableWaiterMobileOrdering: boolean;
  allowWaiterOpenTable: boolean;
  allowWaiterViewOtherTables: boolean;
  allowWaiterTransferTable: boolean;
  allowWaiterSplitTable: boolean;
  allowWaiterOpenItem: boolean;
  allowWaiterCancelSentItem: boolean;
  allowWaiterViewBill: boolean;
  allowWaiterRequestBill: boolean;
  enableKitchenReadyNotification: boolean;
  enableMobileOfflineCart: boolean;
}

export interface CreateWaiterMobileSettingsDto {
  compID: string;
  siteID: string;
  lastModifiedBy: string;
  enableWaiterMobileOrdering: boolean;
  allowWaiterOpenTable: boolean;
  allowWaiterViewOtherTables: boolean;
  allowWaiterTransferTable: boolean;
  allowWaiterSplitTable: boolean;
  allowWaiterOpenItem: boolean;
  allowWaiterCancelSentItem: boolean;
  allowWaiterViewBill: boolean;
  allowWaiterRequestBill: boolean;
  enableKitchenReadyNotification: boolean;
  enableMobileOfflineCart: boolean;
}

export type UpdateWaiterMobileSettingsDto = Omit<CreateWaiterMobileSettingsDto, "compID" | "siteID">;
