// Real BCorDFWebApi GeneralLedgerController — the chronological general
// ledger (GLTrans) history for one GL account, with a running balance (see
// types/trial-balance.ts for the per-account summary version of this same
// data). No opening-balance carry-forward exists in this system yet — the
// "opening balance" here is just the net of entries strictly before
// fromDate.

export interface GeneralLedgerRow {
  docNo: number;
  docCd: number;
  /** Where the entry came from: Journal Voucher, POS Shift Close ... */
  source: string;
  siteID: string;
  docDt: string;
  jvRef: string;
  narration?: string | null;
  referenceNo?: string | null;
  remarks?: string | null;
  /** customer / supplier accounts: 1 = New bill, 2 = Against */
  billType?: number | null;
  billRef?: string | null;
  debit: number;
  credit: number;
  balance: number;
}

export interface GeneralLedgerResult {
  glCode: string;
  glName: string;
  openingBalance: number;
  closingBalance: number;
  rows: GeneralLedgerRow[];
}
