import { apiClient } from "../axios-client";
import type {
  PurchaseInvoice,
  PurchaseInvoiceDetail,
  PurchaseOrder,
  CreatePurchaseOrderInput,
  CreatePurchaseInvoiceInput,
  CreatePurchaseInvoiceDetailInput,
} from "@/types/purchase";
import type { GoodsReceipt, CreateGoodsReceiptInput } from "@/types/grn";

// Real BCorDFWebApi PurchaseOrderController — same compId+siteId+docNo+
// userName document shape as kot-service.ts/pos-service.ts. compId/siteId/
// userName are explicit params, not pulled from a store, for the same
// reason documented in kot-service.ts (the backend doesn't resolve tenant
// scoping from JWT claims).
export const purchaseOrderService = {
  get: async (compId: string, siteId: string, docNo: number): Promise<PurchaseOrder> => {
    const { data } = await apiClient.get<PurchaseOrder>(`/PurchaseOrder/${compId}/${siteId}/${docNo}`);
    return data;
  },

  getAll: async (compId: string, siteId: string): Promise<PurchaseOrder[]> => {
    const { data } = await apiClient.get<PurchaseOrder[]>(`/PurchaseOrder/${compId}/${siteId}`);
    return data;
  },

  create: async (
    compId: string,
    siteId: string,
    userName: string,
    dto: CreatePurchaseOrderInput,
  ): Promise<PurchaseOrder> => {
    const { data } = await apiClient.post<PurchaseOrder>("/PurchaseOrder", dto, {
      params: { compId, siteId, userName },
    });
    return data;
  },
};

// Real BCorDFWebApi GRNController — prepared against a real PurchaseOrder
// (see purchase/grn/page.tsx: selecting a PO fetches it via
// purchaseOrderService.get and copies its details[] into the GRN's lines).
// Same compId+siteId+docNo+userName shape as purchaseOrderService.
export const goodsReceiptService = {
  get: async (compId: string, siteId: string, docNo: number): Promise<GoodsReceipt> => {
    const { data } = await apiClient.get<GoodsReceipt>(`/GRN/${compId}/${siteId}/${docNo}`);
    return data;
  },

  getAll: async (compId: string, siteId: string): Promise<GoodsReceipt[]> => {
    const { data } = await apiClient.get<GoodsReceipt[]>(`/GRN/${compId}/${siteId}`);
    return data;
  },

  create: async (
    compId: string,
    siteId: string,
    userName: string,
    dto: CreateGoodsReceiptInput,
  ): Promise<GoodsReceipt> => {
    const { data } = await apiClient.post<GoodsReceipt>(
      "/GRN",
      { ...dto, addOnCostDetails: [], additionalAddOnCostDetails: [] },
      { params: { compId, siteId, userName } },
    );
    return data;
  },
};

// Real BCorDFWebApi PurchaseInvoiceController — same compId+siteId+docNo+
// userName document shape as purchaseOrderService/goodsReceiptService.
//
// The real PurchaseInvoiceHdr/PurchaseInvoiceDet tables mark nearly every
// costing/GL column NOT NULL at the SQL level even though the C# DTOs type
// them as nullable (`decimal?`) — confirmed against
// INFORMATION_SCHEMA.COLUMNS, not just the model file, since the two
// disagree here. A bare `undefined` on any of these fails the insert with
// "Cannot insert the value NULL into column ...". `withHeaderDefaults`/
// `withDetailDefaults` below fill every one of them with a fixed technical
// 0/""/false — this minimal screen has no GL-account or landed-cost feature
// to source real values from — while leaving the fields the UI actually
// collects (vendorCode, docDt, qty, rate, discount%, tax%, ...) untouched.
// RefType/GLCode/AccCompID/BillDets follow the same reasoning: no GL-account
// master is wired up on this screen, so empty string / this tenant's own
// CompID / an empty array are the simplest safe values (BillDets mirrors
// PO's consignmentCharges/GRN's addOnCostDetails, also always sent empty).
function withHeaderDefaults(dto: CreatePurchaseInvoiceInput) {
  return {
    ...dto,
    vendorBillNo: dto.vendorBillNo ?? "",
    vendorBillDate: dto.vendorBillDate || dto.docDt,
    currencyRate: 1,
    type: "",
    totalValueBaseAmount: 0,
    totalVolBaseAmount: 0,
    itemCostFactorAmount: 0,
    additionalExpense: 0,
    additionalDiscount: 0,
    exchangeDifference: 0,
    itemwiseBillRef: false,
  };
}

function withDetailDefaults(d: CreatePurchaseInvoiceDetailInput, compId: string) {
  // The real CreatePurchaseInvoiceDetDto has no `qty`/`rate` fields at all —
  // they're `invQty`/`price` (see D:/Works/BCorApi/PowerDFWebApi/Dto/Documents/
  // PurchaseInvoiceDto.cs). Renaming here, not in the UI-facing type, keeps
  // the form/type layer using the plain names every other screen uses.
  const { qty, rate, ...rest } = d;
  return {
    ...rest,
    invQty: qty,
    price: rate,
    discountPercentage: d.discountPercentage ?? 0,
    discountAmount: d.discountAmount ?? 0,
    taxPercentage: d.taxPercentage ?? 0,
    taxAmount: d.taxAmount ?? 0,
    grvQty: 0,
    adjQty: 0,
    tDiscount: d.discountAmount ?? 0,
    // A line built freehand has none of these — "" / this tenant's own
    // CompID are the safe defaults. A line copied in from a GRN ("create
    // against GRN") sets refType/poRefCode/refRowID/etc. itself, which must
    // survive here, not get clobbered back to the freehand defaults.
    refType: d.refType ?? "",
    poRefCode: d.poRefCode,
    refRowID: d.refRowID,
    refDocNo: d.refDocNo,
    refDocCd: d.refDocCd,
    refCompID: d.refCompID,
    refSiteID: d.refSiteID,
    glCode: "",
    accCompID: compId,
  };
}

// Read-side mirror of withDetailDefaults' rename: the API returns
// invQty/price, not qty/rate — map every detail row back to the plain names
// the form/type layer uses before handing the record to the page.
function toPurchaseInvoiceDetail(raw: Record<string, unknown>): PurchaseInvoiceDetail {
  return {
    id: raw.id as string | undefined,
    rowID: raw.rowID as number | undefined,
    itemCode: raw.itemCode as string,
    itemName: raw.itemName as string | null | undefined,
    unitCode: raw.unitCode as string | null | undefined,
    qty: raw.invQty as number,
    rate: raw.price as number,
    discountPercentage: raw.discountPercentage as number | null | undefined,
    discountAmount: raw.discountAmount as number | null | undefined,
    amount: raw.amount as number | null | undefined,
    taxPercentage: raw.taxPercentage as number | null | undefined,
    taxAmount: raw.taxAmount as number | null | undefined,
    refType: (raw.refType as string | null | undefined)?.trim() || null,
    refDocNo: raw.refDocNo as number | null | undefined,
    refDocCd: raw.refDocCd as number | null | undefined,
    poRefCode: raw.poRefCode as string | null | undefined,
    refRowID: raw.refRowID as number | null | undefined,
    refCompID: raw.refCompID as string | null | undefined,
    refSiteID: raw.refSiteID as string | null | undefined,
  };
}

function toPurchaseInvoice(raw: Record<string, unknown>): PurchaseInvoice {
  const details = ((raw.details as Record<string, unknown>[]) ?? []).map(toPurchaseInvoiceDetail);
  return { ...raw, details } as unknown as PurchaseInvoice;
}

export const purchaseInvoiceService = {
  get: async (compId: string, siteId: string, docNo: number): Promise<PurchaseInvoice> => {
    const { data } = await apiClient.get<Record<string, unknown>>(`/PurchaseInvoice/${compId}/${siteId}/${docNo}`);
    return toPurchaseInvoice(data);
  },

  getAll: async (compId: string, siteId: string): Promise<PurchaseInvoice[]> => {
    const { data } = await apiClient.get<Record<string, unknown>[]>(`/PurchaseInvoice/${compId}/${siteId}`);
    return data.map(toPurchaseInvoice);
  },

  create: async (
    compId: string,
    siteId: string,
    userName: string,
    dto: CreatePurchaseInvoiceInput,
  ): Promise<PurchaseInvoice> => {
    const { data } = await apiClient.post<PurchaseInvoice>(
      "/PurchaseInvoice",
      {
        ...withHeaderDefaults(dto),
        details: dto.details.map((d) => withDetailDefaults(d, compId)),
        billDets: [],
      },
      { params: { compId, siteId, userName } },
    );
    return data;
  },

  update: async (
    compId: string,
    siteId: string,
    docNo: number,
    userName: string,
    dto: CreatePurchaseInvoiceInput,
  ): Promise<PurchaseInvoice> => {
    const { data } = await apiClient.put<PurchaseInvoice>(
      `/PurchaseInvoice/${docNo}`,
      {
        ...withHeaderDefaults(dto),
        details: dto.details.map((d) => withDetailDefaults(d, compId)),
        billDets: [],
      },
      { params: { compId, siteId, userName } },
    );
    return data;
  },

  remove: async (compId: string, siteId: string, docNo: number, userName: string): Promise<void> => {
    await apiClient.delete(`/PurchaseInvoice/${docNo}`, { params: { compId, siteId, userName } });
  },
};
