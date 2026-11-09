import { apiClient } from "../axios-client";
import { useAuthStore } from "@/stores/auth-store";
import type { KitchenPrinterFormValues } from "@/schemas/restaurant-master.schema";

// Real BCorDFWebApi KitchenPrinterMasterController (generic MasterController: GET /{compId}, POST, PUT /{code}, DELETE).
export interface KitchenPrinterDto {
  code: string;
  compID: string;
  siteID: string;
  active: boolean;
  printerName: string;
  kitchenCode: string;
  printerType: string;
  ipAddress?: string | null;
  portNo?: number | null;
  paperWidth?: number | null;
  noOfCopies: number;
  printArabic: boolean;
  autoCut: boolean;
  printCancelledItems: boolean;
  printModifiedItems: boolean;
  remarks?: string | null;
}

export interface KitchenPrinter extends KitchenPrinterDto {
  id: string;
}

const toPrinter = (dto: KitchenPrinterDto): KitchenPrinter => ({ ...dto, id: dto.code });

function body(payload: KitchenPrinterFormValues, userName: string) {
  return {
    active: payload.active,
    // KitchenPrinterMaster.LastModifiedBy is only 10 characters wide in the database.
    lastModifiedBy: userName.slice(0, 10),
    printerName: payload.printerName,
    kitchenCode: payload.kitchenCode,
    // Only NETWORK printers are printed to by the server today.
    printerType: "NETWORK",
    ipAddress: payload.ipAddress,
    portNo: payload.portNo,
    paperWidth: payload.paperWidth,
    noOfCopies: payload.noOfCopies,
    printArabic: payload.printArabic,
    autoCut: payload.autoCut,
    printCancelledItems: payload.printCancelledItems,
    printModifiedItems: payload.printModifiedItems,
    remarks: payload.remarks || null,
  };
}

export const kitchenPrinterService = {
  list: async (): Promise<{ items: KitchenPrinter[]; total: number }> => {
    const compId = useAuthStore.getState().user?.compId ?? "";
    const { data } = await apiClient.get<KitchenPrinterDto[]>(`/KitchenPrinterMaster/${compId}`);
    const items = data.map(toPrinter);
    return { items, total: items.length };
  },

  create: async (payload: KitchenPrinterFormValues): Promise<KitchenPrinter> => {
    const user = useAuthStore.getState().user;
    const compId = user?.compId ?? "";
    const { data } = await apiClient.post<KitchenPrinterDto>(
      "/KitchenPrinterMaster",
      { code: payload.code, compID: compId, siteID: payload.siteId, ...body(payload, user?.userName ?? "") },
      { headers: { CompID: compId } },
    );
    return toPrinter(data);
  },

  update: async (code: string, payload: KitchenPrinterFormValues): Promise<KitchenPrinter> => {
    const user = useAuthStore.getState().user;
    const compId = user?.compId ?? "";
    const { data } = await apiClient.put<KitchenPrinterDto>(
      `/KitchenPrinterMaster/${code}`,
      body(payload, user?.userName ?? ""),
      { headers: { CompID: compId } },
    );
    return toPrinter(data);
  },

  remove: async (code: string): Promise<void> => {
    const user = useAuthStore.getState().user;
    await apiClient.delete(`/KitchenPrinterMaster/${user?.compId ?? ""}/${code}`, { params: { user: user?.userName ?? "" } });
  },
};
