import { apiClient } from "../axios-client";
import type { ComboMasterDto } from "@/types/combo";

// Read-only combo lookup for the POS tile grid — mirrors
// posLookupService/serviceLookupService's shape. GET /api/ComboMaster/{compId}
// already filters to Active (MasterServiceWithDetails.GetAllAsync); this
// narrows further to what's actually sellable right now at this site.
export const comboLookupService = {
  search: async (compId: string, siteId: string): Promise<ComboMasterDto[]> => {
    const { data } = await apiClient.get<ComboMasterDto[]>(`/ComboMaster/${compId}`);
    const today = new Date();
    return data.filter((c) => {
      if (!c.showInPOS) return false;
      if (c.siteID && c.siteID !== siteId && c.siteID !== "ALL") return false;
      if (c.validFrom && new Date(c.validFrom) > today) return false;
      if (c.validTo && new Date(c.validTo) < today) return false;
      return true;
    });
  },
};
