// FinancialStatementsController / ChartOfAccountsController. Amounts are on the natural side of each section
// (assets and expenses = debit balance; liabilities, equity and income = credit balance), so a negative figure is unusual
// (e.g. accumulated depreciation, sales returns).

export interface StatementRow {
  glCode: string;
  glName: string;
  amount: number;
}

export interface StatementGroup {
  code: string;
  name: string;
  rows: StatementRow[];
  total: number;
}

export interface StatementSection {
  key: "revenue" | "costOfSales" | "otherIncome" | "expenses" | "financeCharges" | "assets" | "liabilities" | "equity";
  title: string;
  groups: StatementGroup[];
  total: number;
}

export interface ProfitLoss {
  fromDate: string;
  toDate: string;
  siteId: string;
  sections: StatementSection[];
  revenue: number;
  costOfSales: number;
  grossProfit: number;
  otherIncome: number;
  operatingExpenses: number;
  financeCharges: number;
  netProfit: number;
}

export interface BalanceSheet {
  asOfDate: string;
  siteId: string;
  yearStart: string;
  sections: StatementSection[];
  totalAssets: number;
  totalLiabilities: number;
  totalEquity: number;
  totalLiabilitiesAndEquity: number;
  difference: number;
  isBalanced: boolean;
  profitBroughtForward: number;
  profitForYear: number;
}

export interface ChartTemplateInfo {
  code: "RETAIL" | "FNB" | "SERVICE" | "GENERAL";
  name: string;
  description: string;
  groups: number;
  accounts: number;
  sample: string[];
}

export interface ChartStatus {
  canManage: boolean;
  detectedTemplate: ChartTemplateInfo["code"];
  groups: number;
  accounts: number;
  journalLines: number;
  canReplace: boolean;
  templates: ChartTemplateInfo[];
}

export interface ChartApplyResult {
  templateCode: string;
  mode: "merge" | "replace";
  groupsAdded: number;
  accountsAdded: number;
  controlTypesAdded: number;
  groupsRemoved: number;
  accountsRemoved: number;
  /** template codes left out because the company already uses them for another account type */
  codeConflicts: number;
}

export interface PartyGlStatus {
  chartReady: boolean;
  canManage: boolean;
  customersWithoutAccount: number;
  suppliersWithoutAccount: number;
}

export interface PartyGlSyncResult {
  customersLinked: number;
  vendorsLinked: number;
  codeInUse: number;
  alreadyLinked: number;
}
