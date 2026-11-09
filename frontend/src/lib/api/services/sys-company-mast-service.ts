import { apiClient } from "../axios-client";
import { useAuthStore } from "@/stores/auth-store";
import type { SysCompanyMastDto } from "@/types/admin";
import type { CompanySettingsFormValues } from "@/schemas/admin.schema";

// Real BCorDFWebApi SysCompanyMastController. Rows are keyed by (CompId,
// LKey) — every row seeded in this app uses LKey "1", so the System
// Settings page always reads/writes that fixed language key.
const LKEY = "1";

export const settingsService = {
  getCompanySettings: async (): Promise<SysCompanyMastDto> => {
    const compId = useAuthStore.getState().user?.compId ?? "";
    const { data } = await apiClient.get<SysCompanyMastDto>("/SysCompanyMast/code", {
      params: { lkey: LKEY },
      headers: { compid: compId },
    });
    return data;
  },

  // PUT replaces every field on the row, so financial-period dates and GL
  // codes are fetched first and passed through unchanged alongside the
  // edited fields to avoid wiping them out.
  updateCompanySettings: async (payload: CompanySettingsFormValues): Promise<SysCompanyMastDto> => {
    const user = useAuthStore.getState().user;
    const compId = user?.compId ?? "";
    const { data: current } = await apiClient.get<SysCompanyMastDto>("/SysCompanyMast/code", {
      params: { lkey: LKEY },
      headers: { compid: compId },
    });

    const merged: SysCompanyMastDto = {
      ...current,
      companyName: payload.companyName,
      compAddress: payload.companyAddress || null,
      taxRegisterNo: payload.taxRegistrationNo || null,
      active: payload.active,
      lastModifiedBy: user?.userName ?? "",
    };

    // UpdateSysCompanyMastAsync returns 204 No Content, so the merged
    // object we already have is the source of truth for the caller.
    await apiClient.put(
      "/SysCompanyMast",
      merged,
      { params: { lkey: LKEY }, headers: { compid: compId } },
    );
    return merged;
  },
};
