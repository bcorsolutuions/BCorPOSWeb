// Real BCorDFWebApi GRNController — a DocumentServiceNDetails<> header+
// details document, same compId+siteId+docNo+userName shape as
// purchaseOrderService (see types/purchase.ts). Prepared against a real
// Purchase Order: each line carries PO-reference fields (poRefCode/
// refRowID/poQty) back to the source PO line it was received against.
// Add-on-cost breakdown (AddOnCostDetails/AdditionalAddOnCostDetails) is
// out of scope for this basic flow — always sent empty.

export interface GRNLine {
  id?: string;
  rowID?: number;
  itemCode: string;
  itemName?: string | null;
  unitCode: string;
  orderedQty: number;
  qty: number;
  rate: number;
  amount?: number | null;
  discountPercentage?: number | null;
  discountAmount?: number | null;
  poRefCode: string;
  refRowID: number;
}

export interface GoodsReceipt {
  id: string;
  compID: string;
  siteID: string;
  docNo: number;
  docDt: string;
  refNo?: string | null;
  vendorCode: string;
  inventorySiteID: string;
  vendorDNRefNo?: string | null;
  lpoReference?: string | null;
  remarks?: string | null;
  currencyCode?: string | null;
  currencyRate?: number | null;
  totalAmount?: number | null;
  lastModifiedBy: string;
  lastModifiedOn?: string | null;
  details: GRNLine[];
}

export interface CreateGoodsReceiptInput {
  docDt: string;
  vendorCode: string;
  inventorySiteID: string;
  vendorDNRefNo?: string;
  lpoReference: string;
  remarks?: string;
  currencyCode: string;
  currencyRate: number;
  totalAmount: number;
  details: {
    itemCode: string;
    itemName?: string;
    unitCode: string;
    qty: number;
    rate: number;
    amount: number;
    discountAmount: number;
    additionalAddOnCost: number;
    refType: string;
    poRefCode: string;
    poRef: string;
    refRowID: number;
    poQty: number;
    poPendingQty: number;
  }[];
}
