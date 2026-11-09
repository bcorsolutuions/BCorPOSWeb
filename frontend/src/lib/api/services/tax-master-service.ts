import { apiClient } from "../axios-client";
import { useAuthStore } from "@/stores/auth-store";
import type { TaxMaster } from "@/types/item-master";
import type { TaxMasterFormValues } from "@/schemas/masters.schema";

// Real BCorDFWebApi TaxMasterController — the single source of truth for tax
// rates. Item Master's Tax Code field picks from `getTaxCodes` instead of
// accepting a manually-typed Tax Rate % (see item-master-service.ts's
// resolveTaxRate, which looks the rate up from here at save time). `active`
// filtering is already applied server-side by MasterService.GetAllAsync.
interface TaxMasterDto {
  id: string;
  code: string;
  taxName: string;
  taxRate: number;
  compID: string;
  siteID: string;
  lastModifiedBy: string;
  lastModifiedOn?: string | null;
  active: boolean;
}

// `id` is set to the tax code (the real PUT/DELETE address), not a server
// Guid — same convention as every other master this session.
function toTaxMaster(dto: TaxMasterDto): TaxMaster & { id: string } {
  return {
    id: dto.code,
    code: dto.code,
    taxName: dto.taxName,
    taxRate: dto.taxRate,
    compID: dto.compID,
    siteID: dto.siteID,
    lastModifiedBy: dto.lastModifiedBy,
    lastModifiedOn: dto.lastModifiedOn,
    active: dto.active,
  };
}

function buildPayload(payload: TaxMasterFormValues, compId: string, userName: string) {
  return {
    code: payload.code,
    compID: compId,
    siteID: payload.siteId,
    active: payload.active,
    lastModifiedBy: userName,
    taxName: payload.taxName,
    taxRate: payload.taxRate,
  };
}

export const taxMasterService = {
  // Used by Item Master's Tax Code dropdown — a read-only lookup, same
  // pattern as itemCategoryService.getCategories/unitMasterService.getUnits.
  getTaxCodes: async (compId: string): Promise<TaxMaster[]> => {
    const { data } = await apiClient.get<TaxMasterDto[]>(`/TaxMaster/${compId}`);
    return data.map(toTaxMaster);
  },

  list: async (): Promise<{ items: (TaxMaster & { id: string })[]; total: number }> => {
    const compId = useAuthStore.getState().user?.compId ?? "";
    const { data } = await apiClient.get<TaxMasterDto[]>(`/TaxMaster/${compId}`);
    const items = data.map(toTaxMaster);
    return { items, total: items.length };
  },

  create: async (payload: TaxMasterFormValues): Promise<TaxMaster & { id: string }> => {
    const user = useAuthStore.getState().user;
    const compId = user?.compId ?? "";
    const { data } = await apiClient.post<TaxMasterDto>(
      "/TaxMaster",
      buildPayload(payload, compId, user?.userName ?? ""),
      { headers: { CompID: compId } },
    );
    return toTaxMaster(data);
  },

  update: async (code: string, payload: TaxMasterFormValues): Promise<TaxMaster & { id: string }> => {
    const user = useAuthStore.getState().user;
    const compId = user?.compId ?? "";
    const { data } = await apiClient.put<TaxMasterDto>(
      `/TaxMaster/${code}`,
      buildPayload(payload, compId, user?.userName ?? ""),
      { headers: { CompID: compId } },
    );
    return toTaxMaster(data);
  },

  remove: async (code: string): Promise<void> => {
    const compId = useAuthStore.getState().user?.compId ?? "";
    const userName = useAuthStore.getState().user?.userName ?? "";
    await apiClient.delete(`/TaxMaster/${compId}/${code}`, { params: { user: userName } });
  },
};
