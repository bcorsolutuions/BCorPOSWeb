// Real BCorDFWebApi TrialBalanceController — aggregate over JVDet grouped by GLCode (see types/jv.ts): the period's debit and
// credit activity, plus the balance brought forward from before the period.

export interface TrialBalanceRow {
  glCode: string;
  glName: string;
  glGroupCode: string;
  glGroupName: string;
  accountType: number;
  debit: number;
  credit: number;
  /** Balance before the period, debit positive / credit negative. */
  openingBalance: number;
  /** openingBalance + debit - credit. */
  closingBalance: number;
}
