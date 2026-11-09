import { apiClient } from "../axios-client";
import type { SalesInvoice, CreateSalesInvoiceInput } from "@/types/sales-invoice";

// Real BCorDFWebApi SalesInvoiceController — same compId+siteId+docNo+
// userName document shape as purchase-service.ts's purchaseOrderService.
// compId/siteId/userName are explicit params, not pulled from a store, for
// the same reason documented there (the backend doesn't resolve tenant
// scoping from JWT claims). "Basic invoice only" — no BillDetails (GL Dr/Cr
// distribution) is sent; the backend accepts an empty array for it.
export const salesInvoiceService = {
  get: async (compId: string, siteId: string, docNo: number): Promise<SalesInvoice> => {
    const { data } = await apiClient.get<SalesInvoice>(`/SalesInvoice/${compId}/${siteId}/${docNo}`);
    return data;
  },

  getAll: async (compId: string, siteId: string): Promise<SalesInvoice[]> => {
    const { data } = await apiClient.get<SalesInvoice[]>(`/SalesInvoice/${compId}/${siteId}`);
    return data;
  },

  create: async (
    compId: string,
    siteId: string,
    userName: string,
    dto: CreateSalesInvoiceInput,
  ): Promise<SalesInvoice> => {
    const { data } = await apiClient.post<SalesInvoice>("/SalesInvoice", { ...dto, billDetails: [] }, {
      params: { compId, siteId, userName },
    });
    return data;
  },
};
