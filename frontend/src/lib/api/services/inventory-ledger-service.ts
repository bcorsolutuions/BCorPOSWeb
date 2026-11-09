import { apiClient } from "../axios-client";

// BCorDFWebApi's InventoryLedgerController — posts stock consumption against
// the pre-existing dbo.InventoryLedger table when a bill settles.
// componentType selects how itemCode is resolved server-side (defaults to
// "Menu" when omitted, matching the original recipe-only caller):
//   "Menu"      → a MenuMaster.Code; explodes into recipe ingredients when
//                 IsRecipeItem, otherwise skipped (unchanged pre-existing
//                 behavior for ordinary recipe/non-recipe menu lines).
//   "Inventory" → a plain InventoryMaster.Code (a Combo Items component that
//                 isn't a recipe item) — posts directly against it.
//   "Service"   → skipped; services never consume stock.
// Non-recipe/unresolvable lines are silently skipped server-side, so a whole
// bill's lines can be posted unfiltered.
export interface ConsumeLedgerLine {
  itemCode: string;
  quantity: number;
  componentType?: "Inventory" | "Menu" | "Service";
  unitCode?: string | null;
}

// One posted InventoryLedger row — Ingredient Consumption report. DocCd
// distinguishes a recipe explosion (40011) from a Combo Items direct
// component consumption (40012); see InventoryLedgerService.cs's constants.
export interface InventoryLedgerEntryDto {
  id: string;
  inventoryCode: string;
  unitCode?: string | null;
  qty?: number | null;
  rate?: number | null;
  amount?: number | null;
  docCd?: number | null;
  docNo: number;
  refNo?: string | null;
  docDt?: string | null;
  balQty?: number | null;
  lastModifiedBy?: string | null;
  lastModifiedOn?: string | null;
}

export interface GrnBackfillResult {
  grnsChecked: number;
  grnsPosted: number;
  movementsPosted: number;
}

export const inventoryLedgerService = {
  /** Posts the stock-in of every saved GRN that is not in the Stock Ledger yet (GRNs saved before purchases posted stock). Safe to repeat. */
  backfillGrns: async (compId: string): Promise<GrnBackfillResult> => {
    const { data } = await apiClient.post<GrnBackfillResult>(`/InventoryLedger/${compId}/backfill-grn`);
    return data;
  },

  consumeRecipe: async (
    compId: string,
    siteId: string,
    payload: { refDocNo: string; docNo: number; invSiteId?: string; lines: ConsumeLedgerLine[] },
  ): Promise<void> => {
    await apiClient.post(`/InventoryLedger/${compId}/${siteId}/consume`, payload);
  },

  getBalance: async (compId: string, siteId: string, itemCode: string): Promise<number> => {
    const { data } = await apiClient.get<{ itemCode: string; balance: number }>(
      `/InventoryLedger/${compId}/${siteId}/balance/${encodeURIComponent(itemCode)}`,
    );
    return data.balance;
  },

  getLedger: async (
    compId: string,
    siteId: string,
    params?: { itemCode?: string; take?: number },
  ): Promise<InventoryLedgerEntryDto[]> => {
    const { data } = await apiClient.get<InventoryLedgerEntryDto[]>(`/InventoryLedger/${compId}/${siteId}`, {
      params: { itemCode: params?.itemCode || undefined, take: params?.take },
    });
    return data;
  },
};
