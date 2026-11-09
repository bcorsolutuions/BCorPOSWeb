import { apiClient } from "../axios-client";
import { useAuthStore } from "@/stores/auth-store";
import type { CustomerMaster } from "@/types/customer-master";
import type { CustomerMasterFormValues } from "@/schemas/masters.schema";

// Real BCorDFWebApi CustomerMasterController — a MasterServiceWithDetails<...>
// (CompID+Code keyed, same generic MasterController route shape as ItemsController)
// but with 3 child detail collections (ContactsDetails, CreditDetails, OpBillsDets)
// that MasterDetailCollectionHandler.SyncForUpdate treats as authoritative: any
// existing detail row whose ID isn't present in the PUT body's arrays gets
// DELETED. This admin page only edits top-level scalar fields, so update()
// GETs the current full record first and passes its detail arrays + all
// untouched scalar fields straight through unchanged, to avoid silently
// wiping every customer's contacts/credit-history/opening-bills on every save.
type RawDto = Record<string, unknown>;

function toCustomerMaster(dto: RawDto): CustomerMaster {
  return {
    id: dto.code as string,
    code: dto.code as string,
    custName: dto.custName as string,
    custNameArabic: (dto.custNameArabic as string | null) ?? null,
    custCatCode: (dto.custCatCode as string | null) ?? null,
    mobile1: (dto.mobile1 as string | null) ?? null,
    telephone1: (dto.telephone1 as string | null) ?? null,
    email: (dto.email as string | null) ?? null,
    creditLimit: (dto.creditLimit as number | null) ?? null,
    compID: dto.compID as string,
    siteID: dto.siteID as string,
    lastModifiedBy: dto.lastModifiedBy as string,
    lastModifiedOn: (dto.lastModifiedOn as string | null) ?? null,
    active: dto.active as boolean,
  };
}

// Strips the server-assigned MasterID/RowID from a detail row's read shape —
// the Update DTOs don't accept them (the backend recomputes both), only ID
// (to match the row for update) plus the row's own fields.
function stripDetailRowMeta(row: RawDto): RawDto {
  const { masterID, rowID, ...rest } = row;
  return rest;
}

async function getCurrent(compId: string, code: string): Promise<RawDto> {
  const { data } = await apiClient.get<RawDto>(`/CustomerMaster/${compId}/${code}`);
  return data;
}

export const customerMasterService = {
  list: async (): Promise<{ items: CustomerMaster[]; total: number }> => {
    const compId = useAuthStore.getState().user?.compId ?? "";
    const { data } = await apiClient.get<RawDto[]>(`/CustomerMaster/${compId}`);
    const items = data.map(toCustomerMaster);
    return { items, total: items.length };
  },

  create: async (payload: CustomerMasterFormValues): Promise<CustomerMaster> => {
    const user = useAuthStore.getState().user;
    const compId = user?.compId ?? "";
    const { data } = await apiClient.post<RawDto>(
      "/CustomerMaster",
      {
        code: payload.code,
        compID: compId,
        siteID: payload.siteId,
        active: payload.active,
        lastModifiedBy: user?.userName ?? "",
        custName: payload.custName,
        custNameArabic: payload.custNameArabic || null,
        custCatCode: payload.custCatCode || "",
        mobile1: payload.mobile1 || null,
        email: payload.email || null,
        creditLimit: payload.creditLimit,
        blocked: false,
      },
      { headers: { CompID: compId } },
    );
    return toCustomerMaster(data);
  },

  update: async (code: string, payload: CustomerMasterFormValues): Promise<CustomerMaster> => {
    const user = useAuthStore.getState().user;
    const compId = user?.compId ?? "";
    const current = await getCurrent(compId, code);

    const contactsDetails = ((current.contactsDetails as RawDto[]) ?? []).map(stripDetailRowMeta);
    const creditDetails = ((current.creditDetails as RawDto[]) ?? []).map(stripDetailRowMeta);
    const opBillsDets = ((current.opBillsDets as RawDto[]) ?? []).map(stripDetailRowMeta);

    const { id, code: _code, compID, lastModifiedOn, ...rest } = current;
    void id;
    void _code;
    void compID;
    void lastModifiedOn;

    const { data } = await apiClient.put<RawDto>(
      `/CustomerMaster/${code}`,
      {
        ...rest,
        siteID: payload.siteId,
        active: payload.active,
        lastModifiedBy: user?.userName ?? "",
        custName: payload.custName,
        custNameArabic: payload.custNameArabic || null,
        custCatCode: payload.custCatCode || "",
        mobile1: payload.mobile1 || null,
        email: payload.email || null,
        creditLimit: payload.creditLimit,
        contactsDetails,
        creditDetails,
        opBillsDets,
      },
      { headers: { CompID: compId } },
    );
    return toCustomerMaster(data);
  },

  remove: async (code: string): Promise<void> => {
    const compId = useAuthStore.getState().user?.compId ?? "";
    const userName = useAuthStore.getState().user?.userName ?? "";
    await apiClient.delete(`/CustomerMaster/${compId}/${code}`, { params: { user: userName } });
  },
};
