// Real BCorDFWebApi JVController — a DocumentServiceNDetails<JVHdr,...>
// header+details document, same shape as PurchaseOrder (see types/purchase.ts):
// query-string compId/siteId/userName on create, backend-assigned docNo.

export interface JVDetail {
  id?: string;
  hdrID?: string;
  rowID?: number;
  accCompId?: string | null;
  glCode: string;
  currentBalance?: number | null;
  debitAmt: number;
  creditAmt: number;
  currencyAmount?: number | null;
  currencyRate?: number | null;
  costCenterCode?: string | null;
  projectCode?: string | null;
  referenceNo?: string | null;
  remarks?: string | null;
  /** customer / supplier account lines: 1 = New bill, 2 = Against an existing bill */
  billType?: number | null;
  billRef?: string | null;
}

export interface JournalVoucher {
  id: string;
  compID: string;
  siteID: string;
  docNo: number;
  docDt: string;
  jvRef: string;
  company: string;
  currency: string;
  currencyRate: number;
  narration?: string | null;
  totalAmt: number;
  remarks?: string | null;
  posted?: boolean | null;
  active: boolean;
  deleted?: boolean | null;
  lastModifiedBy: string;
  lastModifiedOn?: string | null;
  details: JVDetail[];
}

/** PUT /JV/{docNo}: the whole voucher again. Existing lines carry their id + rowID; lines left out are deleted, lines without an id are added. */
export interface UpdateJournalVoucherInput extends Omit<CreateJournalVoucherInput, "details"> {
  details: (CreateJournalVoucherInput["details"][number] & { id?: string | null; rowID?: number | null })[];
}

export interface CreateJournalVoucherInput {
  docDt: string;
  jvRef: string;
  company: string;
  currency: string;
  currencyRate: number;
  narration?: string;
  totalAmt: number;
  remarks?: string;
  active: boolean;
  details: {
    accCompId?: string | null;
    glCode: string;
    currentBalance?: number | null;
    debitAmt: number;
    creditAmt: number;
    currencyAmount?: number | null;
    currencyRate?: number | null;
    costCenterCode?: string | null;
    projectCode?: string | null;
    referenceNo?: string | null;
    remarks?: string | null;
    billType?: number | null;
    billRef?: string | null;
  }[];
}
