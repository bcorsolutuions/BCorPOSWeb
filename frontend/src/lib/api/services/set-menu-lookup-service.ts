import { apiClient } from "../axios-client";
import type { SetMenuMasterDto } from "@/types/set-menu";

// Read-only Set Menu lookup for the POS tile grid — mirrors
// combo-lookup-service.ts's shape exactly. Deliberately does NOT filter by
// today's day-of-week/time window here — the tile stays visible even
// outside its serving window (spec §5: "Do not rely only on UI hiding"),
// tapping it is what checks isSetMenuAvailableNow and blocks with a
// message; see tables/[tableCode]/page.tsx's handleSelectItem.
export const setMenuLookupService = {
  search: async (compId: string, siteId: string): Promise<SetMenuMasterDto[]> => {
    const { data } = await apiClient.get<SetMenuMasterDto[]>(`/SetMenuMaster/${compId}`);
    const today = new Date();
    return data.filter((s) => {
      if (!s.showInPOS) return false;
      if (s.siteID && s.siteID !== siteId && s.siteID !== "ALL") return false;
      if (s.validFrom && new Date(s.validFrom) > today) return false;
      if (s.validTo && new Date(s.validTo) < today) return false;
      return true;
    });
  },
};
