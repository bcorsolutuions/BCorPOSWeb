import { apiClient } from "../axios-client";
import type { MenuCategoryDto, MenuItemDto, MenuSubCategoryDto, ModifierDto, ModifierGroupDto } from "@/types/restaurant";
import type { ComboMasterDto } from "@/types/combo";

export interface QrMenuResponse {
  categories: MenuCategoryDto[];
  /** Absent from servers older than the main-category / sub-category drill-down. */
  subCategories?: MenuSubCategoryDto[];
  items: MenuItemDto[];
  combos: ComboMasterDto[];
  modifierGroups: ModifierGroupDto[];
  modifiers: ModifierDto[];
}
import type {
  PlaceQrOrderRequestDto,
  QROrderHdrDto,
  QrOrderStatusDto,
  QrSessionResultDto,
  QrServiceRequestType,
  QrTableInfoDto,
  StartQrSessionRequestDto,
} from "@/types/qr-order";

// BCorDFWebApi's QrMenuController — deliberately public, no auth token
// attached (apiClient omits the Authorization header when none is set).
// Every call is keyed by the opaque {token} from the scanned QR's URL, never
// a raw compId/siteId/tableCode — see QrTableTokenHelper.cs / RestaurantTableQR.cs.
export const qrMenuService = {
  getTable: async (token: string): Promise<QrTableInfoDto> => {
    const { data } = await apiClient.get<QrTableInfoDto>(`/QrMenu/${token}/table`);
    return data;
  },

  getMenu: async (token: string): Promise<QrMenuResponse> => {
    const { data } = await apiClient.get<QrMenuResponse>(`/QrMenu/${token}/menu`);
    return data;
  },

  startSession: async (token: string, payload: StartQrSessionRequestDto = {}): Promise<QrSessionResultDto> => {
    const { data } = await apiClient.post<QrSessionResultDto>(`/QrMenu/${token}/session/start`, payload);
    return data;
  },

  placeOrder: async (token: string, payload: PlaceQrOrderRequestDto): Promise<QROrderHdrDto> => {
    const { data } = await apiClient.post<QROrderHdrDto>(`/QrMenu/${token}/order`, payload);
    return data;
  },

  getOrderStatus: async (token: string, docNo: number): Promise<QrOrderStatusDto> => {
    const { data } = await apiClient.get<QrOrderStatusDto>(`/QrMenu/${token}/order-status/${docNo}`);
    return data;
  },

  requestService: async (token: string, requestType: QrServiceRequestType): Promise<{ message: string }> => {
    const { data } = await apiClient.post<{ message: string }>(`/QrMenu/${token}/service-request`, { requestType });
    return data;
  },
};
