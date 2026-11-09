import { apiClient } from "../axios-client";
import type { CustomerLookup, ItemSearchResult, SalesmanLookup, ShiftLookup, SiteLookup } from "@/types/pos-lookups";

// POS product search — backed by BCorDFWebApi's InventoryMasterController.Search
// (mirrors the untouched ItemsController.Search, see
// D:\Works\BCorApi\PowerDFWebApi\Controllers\Masters\InventoryMasterController.cs),
// reused as the real item catalog per item-master-service.ts's header comment.
interface InventoryMasterSearchDto {
  id: string;
  code: string;
  inventoryName: string;
  inventoryCatCode?: string | null;
  brandCode?: string | null;
  unitCode?: string | null;
  barCode?: string | null;
  imageUrl?: string | null;
  retailPrice?: number | null;
  taxCode?: string | null;
  taxRate?: number | null;
  active: boolean;
  isWeighted: boolean;
  pluCode?: string | null;
}

function toItemSearchResult(dto: InventoryMasterSearchDto): ItemSearchResult {
  return {
    id: dto.id,
    code: dto.code,
    name: dto.inventoryName,
    categoryCode: dto.inventoryCatCode,
    brandCode: dto.brandCode,
    unitCode: dto.unitCode,
    barCode: dto.barCode,
    imagePath: dto.imageUrl,
    price: dto.retailPrice,
    taxCode: dto.taxCode,
    taxRate: dto.taxRate,
    active: dto.active,
    isWeighted: dto.isWeighted,
    pluCode: dto.pluCode,
  };
}

export const posLookupService = {
  searchItems: async (
    compId: string,
    query?: string,
    barcode?: string,
    plu?: string,
    siteId?: string,
  ): Promise<ItemSearchResult[]> => {
    const { data } = await apiClient.get<InventoryMasterSearchDto[]>(`/InventoryMaster/${compId}/search`, {
      params: { query, barcode, plu, siteId },
    });
    return data.map(toItemSearchResult);
  },

  getCustomers: async (compId: string): Promise<CustomerLookup[]> => {
    const { data } = await apiClient.get<CustomerLookup[]>(`/CustomerMaster/${compId}`);
    return data;
  },

  getSalesmen: async (compId: string): Promise<SalesmanLookup[]> => {
    const { data } = await apiClient.get<SalesmanLookup[]>(`/EmployeeMaster/${compId}`);
    return data;
  },

  getShifts: async (compId: string): Promise<ShiftLookup[]> => {
    const { data } = await apiClient.get<ShiftLookup[]>(`/ShiftMaster/${compId}`);
    return data;
  },

  /** SysSiteMastController.GetAll takes CompId as a header, not a route/query param — see Controllers/SysSiteMastController.cs. */
  getSites: async (compId: string): Promise<SiteLookup[]> => {
    const { data } = await apiClient.get<SiteLookup[]>("/SysSiteMast", { headers: { compid: compId } });
    return data;
  },
};
