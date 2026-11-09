// Wire-format types for the QR Table Ordering feature — see
// D:\Works\BCorApi\PowerDFWebApi\Dto\Masters\RestaurantTableQRDto.cs,
// RestaurantQrSiteSettingsDto.cs, Dto\Documents\QROrderDto.cs, and
// Dto\Public\QrMenuDto.cs. Field casing is camelCase (ASP.NET Core default),
// same convention as types/restaurant.ts / types/combo.ts.

// ── Staff-side (authenticated) ──────────────────────────────────────────────

export interface RestaurantTableQRDto {
  id: string;
  tableCode: string;
  tableName?: string | null;
  floorCode?: string | null;
  floorName?: string | null;
  sectionCode?: string | null;
  capacity: number;
  hasQR: boolean;
  enabled: boolean;
  allowSelfOrdering: boolean;
  requireOrderApproval: boolean;
  allowCallWaiter: boolean;
  allowRequestBill: boolean;
  generatedOn?: string | null;
  regeneratedOn?: string | null;
  lastUsedOn?: string | null;
}

/** Returned once, only from Generate/Regenerate — the raw token is never retrievable again afterward. */
export interface GenerateQrResultDto {
  tableCode: string;
  rawToken: string;
  generatedOn: string;
}

export interface UpdateRestaurantTableQRSettingsDto {
  allowSelfOrdering: boolean;
  requireOrderApproval: boolean;
  allowCallWaiter: boolean;
  allowRequestBill: boolean;
}

export type QrOrderMode = "DIRECT_KOT" | "WAITER_APPROVAL";
export type QrMisuseMode = "SIMPLE" | "ACTIVE_TABLE" | "PIN" | "WAITER_APPROVAL_FIRST";

export interface RestaurantQrSiteSettingsDto {
  compID: string;
  siteID: string;
  active: boolean;
  lastModifiedBy: string;
  lastModifiedOn?: string | null;
  qrOrderMode: QrOrderMode;
  misuseMode: QrMisuseMode;
  allowGuestOrdering: boolean;
  askCustomerName: boolean;
  askMobileNumber: boolean;
  allowCallWaiter: boolean;
  allowRequestWater: boolean;
  allowRequestBill: boolean;
  allowCoupon: boolean;
  allowPromotion: boolean;
  allowOrderTracking: boolean;
}

export type UpdateRestaurantQrSiteSettingsDto = Omit<RestaurantQrSiteSettingsDto, "compID" | "siteID" | "active" | "lastModifiedOn">;

export interface QROrderDetDto {
  id: string;
  hdrID: string;
  rowID: number;
  menuCode: string;
  menuName?: string | null;
  menuNameArb?: string | null;
  unitCode?: string | null;
  qty: number;
  rate: number;
  grossAmount: number;
  discountAmount: number;
  taxAmount: number;
  netAmount: number;
  modifiersJson?: string | null;
  comboCode?: string | null;
  comboComponentsJson?: string | null;
  specialInstructions?: string | null;
  kitchenCode?: string | null;
  status: "PENDING" | "CONVERTED" | "REJECTED";
}

export interface QROrderHdrDto {
  id: string;
  compID: string;
  siteID: string;
  docNo: number;
  docDt: string;
  refNo?: string | null;
  tableCode: string;
  floorCode?: string | null;
  sessionID: string;
  orderSource: string;
  customerName?: string | null;
  customerMobile?: string | null;
  orderStatus: "PENDING" | "CONVERTED" | "REJECTED";
  kotDocNo?: number | null;
  remarks?: string | null;
  createdOn: string;
  details: QROrderDetDto[];
}

// ── Public (unauthenticated /q/{token}) ─────────────────────────────────────

export interface QrTableInfoDto {
  tableCode: string;
  tableName?: string | null;
  floorCode?: string | null;
  floorName?: string | null;
  sectionCode?: string | null;
  capacity: number;
  allowSelfOrdering: boolean;
  allowCallWaiter: boolean;
  allowRequestBill: boolean;
  allowRequestWater: boolean;
  allowOrderTracking: boolean;
  askCustomerName: boolean;
  askMobileNumber: boolean;
  allowCoupon: boolean;
  requiresPin: boolean;
  hasActiveSession: boolean;
}

export interface StartQrSessionRequestDto {
  pinCode?: string;
}

export interface QrSessionResultDto {
  sessionId: string;
  status: string;
}

export interface SelectedModifierRequestDto {
  code: string;
}

export interface SelectedComboComponentRequestDto {
  groupNo: number;
  code: string;
  selected: boolean;
}

export interface PlaceQrOrderLineRequestDto {
  menuCode?: string;
  comboCode?: string;
  qty: number;
  modifiers?: SelectedModifierRequestDto[];
  comboComponents?: SelectedComboComponentRequestDto[];
  specialInstructions?: string;
}

export interface PlaceQrOrderRequestDto {
  sessionId: string;
  customerName?: string;
  customerMobile?: string;
  couponCode?: string;
  remarks?: string;
  lines: PlaceQrOrderLineRequestDto[];
  idempotencyKey: string;
}

export type QrCustomerStatus = "RECEIVED" | "ACCEPTED" | "PREPARING" | "READY" | "SERVED" | "REJECTED";

export interface QrOrderStatusDto {
  docNo: number;
  customerStatus: QrCustomerStatus;
  createdOn: string;
}

export type QrServiceRequestType = "CALL_WAITER" | "WATER" | "REQUEST_BILL" | "OTHER";

export interface RestaurantServiceRequestDto {
  id: string;
  siteID: string;
  tableCode: string;
  sessionID?: string | null;
  requestType: QrServiceRequestType;
  status: "NEW" | "ACKNOWLEDGED" | "COMPLETED";
  requestedOn: string;
  /** Waiter Mobile Ordering §28 — set when raised from a waiter's phone rather than the customer QR flow. */
  requestedBy?: string | null;
  acknowledgedOn?: string | null;
  acknowledgedBy?: string | null;
  completedOn?: string | null;
  completedBy?: string | null;
}

// ── Client-side cart line (not a wire type) ─────────────────────────────────
// Built while browsing, converted to PlaceQrOrderLineRequestDto[] at
// checkout. unitPrice is a display-only estimate (base price + modifier/
// combo extras) — the server always reloads and recomputes the real price
// (§10 — "never trust price supplied by browser"). `modifiers` carries
// name+price too (unlike SelectedModifierRequestDto) purely for the cart's
// own on-screen summary — only the `code` values are ever sent to the server.
export interface QrCartLine {
  draftId: string;
  menuCode?: string;
  comboCode?: string;
  name: string;
  qty: number;
  unitPrice: number;
  modifiers?: { code: string; name: string; price: number }[];
  comboComponents?: SelectedComboComponentRequestDto[];
  specialInstructions?: string;
}
