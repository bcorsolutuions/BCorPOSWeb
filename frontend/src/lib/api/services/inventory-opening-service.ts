import { apiClient } from "../axios-client";

// BCorDFWebApi InventoryOpeningController: the stock a location starts with. A draft is saved (every item code verified against Item
// Master), then Posted - which writes the quantities into the stock ledger and locks the entry.
export interface InventoryOpeningSummary {
  docNo: number;
  refNo?: string | null;
  docDt: string;
  location: string;
  remarks?: string | null;
  posted: boolean;
  lineCount: number;
  totalQty: number;
  totalAmount: number;
  lastModifiedBy: string;
  lastModifiedOn?: string | null;
}

export interface InventoryOpeningLine {
  id?: string;
  rowID?: number;
  inventoryCode: string;
  barCode?: string | null;
  unitCode?: string | null;
  qty: number;
  unitCost?: number | null;
  amount?: number | null;
  remarks?: string | null;
}

export interface InventoryOpening {
  docNo: number;
  refNo?: string | null;
  docDt: string;
  company: string;
  location: string;
  remarks?: string | null;
  posted?: boolean | null;
  lastModifiedBy: string;
  lastModifiedOn?: string | null;
  details: InventoryOpeningLine[];
}

export interface OpeningVerifyLineInput {
  row: number;
  inventoryCode?: string;
  unitCode?: string;
  qty?: number | null;
  unitCost?: number | null;
  remarks?: string;
}

export interface OpeningLineCheck {
  row: number;
  valid: boolean;
  inventoryCode: string;
  itemName?: string | null;
  barCode?: string | null;
  unitCode?: string | null;
  qty: number;
  unitCost?: number | null;
  amount?: number | null;
  remarks?: string | null;
  errors: string[];
  warnings: string[];
}

export interface OpeningVerifyResult {
  lines: OpeningLineCheck[];
  validCount: number;
  errorCount: number;
  locationError?: string | null;
}

/** The 400 body of a failed save/post: what is wrong, row by row (row = the line's position in what was sent). */
export interface OpeningValidationBody {
  message: string;
  locationError?: string | null;
  errorCount?: number;
  lines?: OpeningLineCheck[];
}

// A 5000-line file is verified / saved / posted in one request each; give them room.
const LONG = { timeout: 5 * 60 * 1000 };

export interface OpeningLocation {
  code: string;
  name: string;
}

export const inventoryOpeningService = {
  locations: async (compId: string, siteId: string): Promise<OpeningLocation[]> => {
    const { data } = await apiClient.get<OpeningLocation[]>(`/InventoryOpening/${compId}/${siteId}/locations`);
    return data;
  },

  list: async (compId: string, siteId: string): Promise<InventoryOpeningSummary[]> => {
    const { data } = await apiClient.get<InventoryOpeningSummary[]>(`/InventoryOpening/${compId}/${siteId}`);
    return data;
  },

  get: async (compId: string, siteId: string, docNo: number): Promise<InventoryOpening> => {
    const { data } = await apiClient.get<InventoryOpening>(`/InventoryOpening/${compId}/${siteId}/${docNo}`, LONG);
    return data;
  },

  verify: async (compId: string, siteId: string, location: string | undefined, lines: OpeningVerifyLineInput[]): Promise<OpeningVerifyResult> => {
    const { data } = await apiClient.post<OpeningVerifyResult>(`/InventoryOpening/${compId}/${siteId}/verify`, { location, lines }, LONG);
    return data;
  },

  create: async (
    compId: string,
    siteId: string,
    userName: string,
    dto: { docDt: string; location: string; remarks?: string; details: InventoryOpeningLine[] },
  ): Promise<InventoryOpening> => {
    const { data } = await apiClient.post<InventoryOpening>("/InventoryOpening", dto, { params: { compId, siteId, userName }, ...LONG });
    return data;
  },

  update: async (
    compId: string,
    siteId: string,
    userName: string,
    docNo: number,
    dto: { docDt: string; location: string; remarks?: string; details: InventoryOpeningLine[] },
  ): Promise<InventoryOpening> => {
    const { data } = await apiClient.put<InventoryOpening>(`/InventoryOpening/${docNo}`, dto, { params: { compId, siteId, userName }, ...LONG });
    return data;
  },

  post: async (compId: string, siteId: string, docNo: number): Promise<InventoryOpening> => {
    const { data } = await apiClient.post<InventoryOpening>(`/InventoryOpening/${compId}/${siteId}/${docNo}/post`, null, LONG);
    return data;
  },

  remove: async (compId: string, siteId: string, userName: string, docNo: number): Promise<void> => {
    await apiClient.delete(`/InventoryOpening/${docNo}`, { params: { compId, siteId, userName } });
  },
};
