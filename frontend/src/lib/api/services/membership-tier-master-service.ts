import { apiClient } from "../axios-client";
import { useAuthStore } from "@/stores/auth-store";
import type { MembershipTierDto } from "@/types/salon";
import type { MembershipTierFormValues } from "@/schemas/salon-master.schema";

// Real BCorDFWebApi MembershipTierMasterController — new master added
// alongside the Salon feature's Promotion/Loyalty screens; every field is
// exposed on this screen (no hidden richer schema to pad, unlike Promotion/
// Loyalty which reuse a pre-existing, larger master).
export interface MembershipTier extends MembershipTierDto {
  id: string;
}

function toMembershipTier(dto: MembershipTierDto): MembershipTier {
  return { ...dto, id: dto.code };
}

export const membershipTierMasterService = {
  list: async (): Promise<{ items: MembershipTier[]; total: number }> => {
    const compId = useAuthStore.getState().user?.compId ?? "";
    const { data } = await apiClient.get<MembershipTierDto[]>(`/MembershipTierMaster/${compId}`);
    const items = data.map(toMembershipTier);
    return { items, total: items.length };
  },

  create: async (payload: MembershipTierFormValues): Promise<MembershipTier> => {
    const user = useAuthStore.getState().user;
    const compId = user?.compId ?? "";
    const { data } = await apiClient.post<MembershipTierDto>(
      "/MembershipTierMaster",
      {
        code: payload.code,
        compID: compId,
        siteID: payload.siteId,
        active: payload.active,
        lastModifiedBy: user?.userName ?? "",
        tierName: payload.tierName,
        tierNameArb: payload.tierNameArb || null,
        minSpend: payload.minSpend,
        discountPercent: payload.discountPercent ?? null,
        remarks: payload.remarks || null,
      },
      { headers: { CompID: compId } },
    );
    return toMembershipTier(data);
  },

  update: async (code: string, payload: MembershipTierFormValues): Promise<MembershipTier> => {
    const user = useAuthStore.getState().user;
    const compId = user?.compId ?? "";
    const { data } = await apiClient.put<MembershipTierDto>(
      `/MembershipTierMaster/${code}`,
      {
        active: payload.active,
        lastModifiedBy: user?.userName ?? "",
        tierName: payload.tierName,
        tierNameArb: payload.tierNameArb || null,
        minSpend: payload.minSpend,
        discountPercent: payload.discountPercent ?? null,
        remarks: payload.remarks || null,
      },
      { headers: { CompID: compId } },
    );
    return toMembershipTier(data);
  },

  remove: async (code: string): Promise<void> => {
    const compId = useAuthStore.getState().user?.compId ?? "";
    const userName = useAuthStore.getState().user?.userName ?? "";
    await apiClient.delete(`/MembershipTierMaster/${compId}/${code}`, { params: { user: userName } });
  },
};
