// Lookup DTOs consumed by the POS Billing screen, trimmed to the fields it
// actually uses — camelCase, matching BCorDFWebApi's real serialized output
// (verified live against /api/ShiftMaster and /api/EmployeeMaster; see
// types/pos.ts's header comment for the "ID stays ID" camelCase behavior).

export interface ItemSearchResult {
  id: string;
  code: string;
  name: string;
  categoryCode?: string | null;
  // Not shown anywhere on the POS screen itself — carried through purely so
  // Promotion Engine can match BRAND-targeted promotions (see
  // hooks/use-promotion-evaluation.ts).
  brandCode?: string | null;
  unitCode?: string | null;
  barCode?: string | null;
  imagePath?: string | null;
  price?: number | null;
  taxCode?: string | null;
  taxRate?: number | null;
  active: boolean;
  // Weighed items (produce/bakery/deli sold by kg) — see lib/pos/weight-barcode.ts.
  isWeighted: boolean;
  pluCode?: string | null;
}

export interface CustomerLookup {
  id: string;
  code: string;
  custName: string;
  custNameArabic?: string | null;
  // Not previously declared here even though the backend already returns it
  // — needed so Promotion Engine can match CUSTOMER_CATEGORY-scoped
  // promotions (e.g. "VIP 15% off") against the selected customer.
  custCatCode?: string | null;
  creditLimit?: number | null;
  mobile1?: string | null;
  blocked: boolean;
  active: boolean;
}

export interface SalesmanLookup {
  id: string;
  code: string;
  empName: string;
  empNameArb?: string | null;
  active: boolean;
}

export interface ShiftLookup {
  id: string;
  code: string;
  siteID?: string | null;
  shiftName: string;
  shiftNameArb?: string | null;
  startTime: string;
  endTime: string;
  active: boolean;
}

export interface SiteLookup {
  siteID: string;
  siteName: string;
  siteNameArb?: string | null;
  active: boolean;
}
