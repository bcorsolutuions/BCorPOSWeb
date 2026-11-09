// Real BCorDFWebApi SalesInvoiceController — a DocumentServiceNDetails<>
// header+details document, same compId+siteId+docNo+userName shape as
// purchaseOrderService (see types/purchase.ts). "Basic invoice only" scope:
// no BillDetails (GL Dr/Cr distribution) and no payment/settlement fields —
// none exist on the real backend DTO anyway.

export interface SalesInvoiceLine {
  id?: string;
  itemCode: string;
  itemName?: string | null;
  unitCode?: string | null;
  quantity: number;
  unitCost: number;
  discountAmount?: number | null;
  glCode: string;
  amount?: number | null;
  netAmount?: number | null;
}

export interface SalesInvoice {
  id: string;
  compID: string;
  siteID: string;
  docNo: number;
  docDt: string;
  refNo?: string | null;
  custCode?: string | null;
  custName?: string | null;
  remarks?: string | null;
  currencyCode?: string | null;
  currencyRate?: number | null;
  subTotal?: number | null;
  discountAmount?: number | null;
  netTotal?: number | null;
  lastModifiedBy: string;
  lastModifiedOn?: string | null;
  details: SalesInvoiceLine[];
}

export interface CreateSalesInvoiceInput {
  docDt: string;
  type: string;
  custCode: string;
  remarks?: string;
  currencyCode: string;
  currencyRate: number;
  subTotal: number;
  discountAmount?: number;
  netTotal: number;
  details: {
    itemCode: string;
    unitCode?: string;
    quantity: number;
    unitCost: number;
    discountAmount?: number;
    glCode: string;
    amount: number;
    netAmount: number;
  }[];
}
