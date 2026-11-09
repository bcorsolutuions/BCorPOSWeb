import { apiClient } from "../axios-client";
import { useAuthStore } from "@/stores/auth-store";
import type { ShiftFormValues } from "@/schemas/shift-master.schema";

// Real BCorDFWebApi ShiftMasterController. A shift's code is unique per company
// (not per branch); Till Setup lists the shifts of the branch being set up.
export interface ShiftMasterDto {
  id: string;
  code: string;
  compID: string;
  siteID: string;
  active: boolean;
  lastModifiedBy: string;
  lastModifiedOn?: string | null;
  shiftName: string;
  shiftNameArb?: string | null;
  startTime: string; // "HH:mm:ss"
  endTime: string;
  graceMinutes: number;
  openingCashRequired: boolean;
  closingCashRequired: boolean;
  allowMultipleCashiers: boolean;
  allowOverlappingShift: boolean;
  autoCloseShift: boolean;
  autoCloseAfterMinutes?: number | null;
  displayOrder: number;
  remarks?: string | null;
}

export type ShiftMaster = ShiftMasterDto;

// <input type="time"> speaks "HH:mm", the API's TimeOnly wants "HH:mm:ss".
const toApiTime = (t: string) => (t.length === 5 ? `${t}:00` : t);

function body(payload: ShiftFormValues) {
  return {
    active: payload.active,
    shiftName: payload.shiftName,
    shiftNameArb: payload.shiftNameArb || null,
    startTime: toApiTime(payload.startTime),
    endTime: toApiTime(payload.endTime),
    graceMinutes: payload.graceMinutes,
    openingCashRequired: payload.openingCashRequired,
    closingCashRequired: payload.closingCashRequired,
    allowMultipleCashiers: payload.allowMultipleCashiers,
    allowOverlappingShift: payload.allowOverlappingShift,
    autoCloseShift: payload.autoCloseShift,
    autoCloseAfterMinutes: payload.autoCloseShift ? (payload.autoCloseAfterMinutes ?? null) : null,
    displayOrder: payload.displayOrder,
    remarks: payload.remarks || null,
  };
}

export const shiftMasterService = {
  list: async (): Promise<{ items: ShiftMaster[]; total: number }> => {
    const compId = useAuthStore.getState().user?.compId ?? "";
    const { data } = await apiClient.get<ShiftMasterDto[]>(`/ShiftMaster/${compId}`);
    const items = data.map((d) => ({ ...d, id: d.code }));
    return { items, total: items.length };
  },

  create: async (payload: ShiftFormValues): Promise<ShiftMaster> => {
    const user = useAuthStore.getState().user;
    const compId = user?.compId ?? "";
    const { data } = await apiClient.post<ShiftMasterDto>(
      "/ShiftMaster",
      { ...body(payload), code: payload.code, compID: compId, siteID: payload.siteId, lastModifiedBy: user?.userName ?? "" },
      { headers: { CompID: compId } },
    );
    return { ...data, id: data.code };
  },

  update: async (code: string, payload: ShiftFormValues): Promise<ShiftMaster> => {
    const user = useAuthStore.getState().user;
    const compId = user?.compId ?? "";
    await apiClient.put(
      `/ShiftMaster/${code}`,
      { ...body(payload), lastModifiedBy: user?.userName ?? "" },
      { headers: { CompID: compId } },
    );
    return { id: code, code, compID: compId, siteID: payload.siteId, lastModifiedBy: user?.userName ?? "", ...body(payload) } as ShiftMaster;
  },

  remove: async (code: string): Promise<void> => {
    const user = useAuthStore.getState().user;
    await apiClient.delete(`/ShiftMaster/${user?.compId ?? ""}/${code}`, { params: { user: user?.userName ?? "" } });
  },
};
