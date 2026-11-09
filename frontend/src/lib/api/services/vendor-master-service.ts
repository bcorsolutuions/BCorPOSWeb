import { apiClient } from "../axios-client";
import { useAuthStore } from "@/stores/auth-store";
import type { VendorMaster } from "@/types/vendor-master";
import type { VendorMasterFormValues } from "@/schemas/masters.schema";

// Real BCorDFWebApi VendorMasterController — a MasterServiceWithDetails<...>
// (CompID+Code keyed, same generic MasterController route shape as
// CustomerMasterController) with 3 child detail collections (OpBillsDets,
// PaymentDetails, ProductDetails) that MasterDetailCollectionHandler.SyncForUpdate
// treats as authoritative: any existing detail row missing from the PUT body
// gets deleted. This admin page only edits top-level scalar fields, so
// update() GETs the current full record first and passes its detail arrays +
// untouched fields straight through unchanged — see customer-master-service.ts
// for the identical pattern this mirrors.
type RawDto = Record<string, unknown>;

function toVendorMaster(dto: RawDto): VendorMaster {
  return {
    id: dto.code as string,
    code: dto.code as string,
    vendorName: dto.vendorName as string,
    vendorNameArb: (dto.vendorNameArb as string | null) ?? null,
    vendorCatCode: (dto.vendorCatCode as string | null) ?? null,
    mobile1: (dto.mobile1 as string | null) ?? null,
    email: (dto.email as string | null) ?? null,
    taxRegisterNo: (dto.taxRegisterNo as string | null) ?? null,
    creditPeriod: (dto.creditPeriod as number | null) ?? null,
    compID: dto.compID as string,
    siteID: dto.siteID as string,
    lastModifiedBy: dto.lastModifiedBy as string,
    lastModifiedOn: (dto.lastModifiedOn as string | null) ?? null,
    active: dto.active as boolean,
  };
}

function stripDetailRowMeta(row: RawDto): RawDto {
  const { masterID, rowID, ...rest } = row;
  return rest;
}

async function getCurrent(compId: string, code: string): Promise<RawDto> {
  const { data } = await apiClient.get<RawDto>(`/VendorMaster/${compId}/${code}`);
  return data;
}

export const vendorMasterService = {
  list: async (): Promise<{ items: VendorMaster[]; total: number }> => {
    const compId = useAuthStore.getState().user?.compId ?? "";
    const { data } = await apiClient.get<RawDto[]>(`/VendorMaster/${compId}`);
    const items = data.map(toVendorMaster);
    return { items, total: items.length };
  },

  // list() (and the generic single-record GET both) only ever return Active
  // vendors — MasterService<>.GetAllAsync/GetAsync both filter Active=true
  // server-side. Fine for a picker dropdown, but a document referencing an
  // older PO can point at a vendor deactivated since — hits the dedicated
  // .../any endpoint (VendorMasterController.GetAny) which deliberately
  // skips that filter, rather than silently falling back to a bare code
  // (see purchase/orders/page.tsx's print flow).
  get: async (compId: string, code: string): Promise<VendorMaster | null> => {
    try {
      const { data } = await apiClient.get<RawDto>(`/VendorMaster/${compId}/${code}/any`);
      return toVendorMaster(data);
    } catch {
      return null;
    }
  },

  create: async (payload: VendorMasterFormValues): Promise<VendorMaster> => {
    const user = useAuthStore.getState().user;
    const compId = user?.compId ?? "";
    const { data } = await apiClient.post<RawDto>(
      "/VendorMaster",
      {
        code: payload.code,
        compID: compId,
        siteID: payload.siteId,
        active: payload.active,
        lastModifiedBy: user?.userName ?? "",
        vendorName: payload.vendorName,
        vendorNameArb: payload.vendorNameArb || null,
        vendorCatCode: payload.vendorCatCode || "",
        mobile1: payload.mobile1 || null,
        email: payload.email || null,
        taxRegisterNo: payload.taxRegisterNo || null,
        creditPeriod: payload.creditPeriod,
        blocked: false,
        paymentBlocked: false,
      },
      { headers: { CompID: compId } },
    );
    return toVendorMaster(data);
  },

  update: async (code: string, payload: VendorMasterFormValues): Promise<VendorMaster> => {
    const user = useAuthStore.getState().user;
    const compId = user?.compId ?? "";
    const current = await getCurrent(compId, code);

    const opBillsDets = ((current.opBillsDets as RawDto[]) ?? []).map(stripDetailRowMeta);
    const paymentDetails = ((current.paymentDetails as RawDto[]) ?? []).map(stripDetailRowMeta);
    const productDetails = ((current.productDetails as RawDto[]) ?? []).map(stripDetailRowMeta);

    const { id, code: _code, compID, lastModifiedOn, ...rest } = current;
    void id;
    void _code;
    void compID;
    void lastModifiedOn;

    const { data } = await apiClient.put<RawDto>(
      `/VendorMaster/${code}`,
      {
        ...rest,
        siteID: payload.siteId,
        active: payload.active,
        lastModifiedBy: user?.userName ?? "",
        vendorName: payload.vendorName,
        vendorNameArb: payload.vendorNameArb || null,
        vendorCatCode: payload.vendorCatCode || "",
        mobile1: payload.mobile1 || null,
        email: payload.email || null,
        taxRegisterNo: payload.taxRegisterNo || null,
        creditPeriod: payload.creditPeriod,
        opBillsDets,
        paymentDetails,
        productDetails,
      },
      { headers: { CompID: compId } },
    );
    return toVendorMaster(data);
  },

  remove: async (code: string): Promise<void> => {
    const compId = useAuthStore.getState().user?.compId ?? "";
    const userName = useAuthStore.getState().user?.userName ?? "";
    await apiClient.delete(`/VendorMaster/${compId}/${code}`, { params: { user: userName } });
  },
};
