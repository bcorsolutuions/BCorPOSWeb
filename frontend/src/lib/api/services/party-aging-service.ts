import { apiClient } from "../axios-client";

// PartyAgingController: accounts receivable (customers) / accounts payable (suppliers), aged by bill date.
export type PartyAgingKind = "receivable" | "payable";

export interface PartyAgingBill {
  billRef: string;
  billDate: string;
  /** the bill as first entered (positive = owed, negative = an advance) */
  amount: number;
  outstanding: number;
  ageDays: number;
  /** 0 = 0-30 days, 1 = 31-60, 2 = 61-90, 3 = over 90 */
  bucket: number;
}

export interface PartyAgingParty {
  /** the account code = the customer / supplier code */
  code: string;
  name: string;
  total: number;
  days0To30: number;
  days31To60: number;
  days61To90: number;
  over90: number;
  /** entries with no bill reference */
  noBill: number;
  bills: PartyAgingBill[];
}

export interface PartyAgingReport {
  kind: PartyAgingKind;
  asOf: string;
  siteID: string;
  total: number;
  days0To30: number;
  days31To60: number;
  days61To90: number;
  over90: number;
  noBill: number;
  openBills: number;
  parties: PartyAgingParty[];
}

export const partyAgingService = {
  /** siteId "ALL" = every branch. */
  get: async (compId: string, kind: PartyAgingKind, siteId: string, asOf?: string): Promise<PartyAgingReport> => {
    const { data } = await apiClient.get<PartyAgingReport>(`/PartyAging/${compId}/${kind}/${siteId}`, { params: { asOf } });
    return data;
  },
};
