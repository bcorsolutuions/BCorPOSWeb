import { apiClient } from "../axios-client";
import { useAuthStore } from "@/stores/auth-store";
import type { ReservationMaster } from "@/types/reservation";
import type { ReservationFormValues } from "@/schemas/masters.schema";

// Real BCorDFWebApi ReservationMasterController — a thin MasterController<...>
// (CompID+Code keyed, same generic pattern as every other master this
// session) plus one custom `seat` action.
function toReservation(dto: Record<string, unknown>): ReservationMaster {
  return { ...dto, id: dto.code as string } as ReservationMaster;
}

export const reservationService = {
  list: async (): Promise<{ items: ReservationMaster[]; total: number }> => {
    const compId = useAuthStore.getState().user?.compId ?? "";
    const { data } = await apiClient.get<Record<string, unknown>[]>(`/ReservationMaster/${compId}`);
    const items = data.map(toReservation);
    return { items, total: items.length };
  },

  create: async (payload: ReservationFormValues): Promise<ReservationMaster> => {
    const user = useAuthStore.getState().user;
    const compId = user?.compId ?? "";
    const { data } = await apiClient.post<Record<string, unknown>>(
      "/ReservationMaster",
      {
        code: payload.code,
        compID: compId,
        siteID: payload.siteId,
        active: true,
        lastModifiedBy: user?.userName ?? "",
        customerName: payload.customerName,
        customerPhone: payload.customerPhone,
        partySize: payload.partySize,
        reservationDateTime: payload.reservationDateTime,
        durationMinutes: payload.durationMinutes,
        status: "Pending",
        remarks: payload.remarks || null,
      },
      { headers: { CompID: compId } },
    );
    return toReservation(data);
  },

  update: async (code: string, payload: ReservationFormValues): Promise<ReservationMaster> => {
    const user = useAuthStore.getState().user;
    const compId = user?.compId ?? "";
    const { data } = await apiClient.put<Record<string, unknown>>(
      `/ReservationMaster/${code}`,
      {
        active: true,
        lastModifiedBy: user?.userName ?? "",
        customerName: payload.customerName,
        customerPhone: payload.customerPhone,
        partySize: payload.partySize,
        reservationDateTime: payload.reservationDateTime,
        durationMinutes: payload.durationMinutes,
        status: payload.status,
        remarks: payload.remarks || null,
      },
      { headers: { CompID: compId } },
    );
    return toReservation(data);
  },

  remove: async (code: string): Promise<void> => {
    const compId = useAuthStore.getState().user?.compId ?? "";
    const userName = useAuthStore.getState().user?.userName ?? "";
    await apiClient.delete(`/ReservationMaster/${compId}/${code}`, { params: { user: userName } });
  },

  seat: async (code: string, tableCode: string): Promise<ReservationMaster> => {
    const compId = useAuthStore.getState().user?.compId ?? "";
    const userName = useAuthStore.getState().user?.userName ?? "";
    const { data } = await apiClient.post<Record<string, unknown>>(
      `/ReservationMaster/${compId}/${code}/seat`,
      null,
      { params: { tableCode, user: userName } },
    );
    return toReservation(data);
  },
};
