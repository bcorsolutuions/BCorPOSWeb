import type { ResolvedComboComponent } from "@/types/combo";
import type { ResolvedSetMenuComponent } from "@/types/set-menu";

// Wire-format types for BCorDFWebApi's real Pos document (see
// D:\Works\BCorApi\PowerDFWebApi\Dto\Documents\PosDto.cs). Field casing is
// camelCase — verified live against the running API (Program.cs's
// `AddNewtonsoftJson()` uses the default CamelCasePropertyNamesContractResolver).
// Note the specific behavior for ID-suffixed names: Newtonsoft's camelCase
// algorithm only lowercases the *leading* capital run, so "CompID" becomes
// "compID" (not "compId"), "TerminalID" becomes "terminalID", etc. — this
// was confirmed against live /api/ShiftMaster and /api/EmployeeMaster
// responses, not guessed.
//
// A separate, ergonomic "view model" layer (PosCartLine, PosCart, etc.,
// below) is what the React/POS UI actually works with; lib/pos/mappers.ts
// converts between the two at the API boundary.

export type PosStatus = "Held" | "Completed" | "Voided" | "Returned";
export type PosBillType = "S" | "R"; // Sale | Return (PosHdr.BillType)
export type PosPaymentType = "Cash" | "Card" | "BenefitPay" | "Wallet" | "Credit" | "GiftVoucher" | "LoyaltyRedemption";

export interface PosPaymentDetDto {
  id: string;
  hdrID: string;
  rowID: number;
  compID: string;
  docNo: number;

  type: PosPaymentType;
  paymentModeCode?: string | null;
  denominationCode?: string | null;
  currencyCode?: string | null;
  curRate: number;
  amount: number;
  foreignAmount: number;
  refCode?: string | null;
  cardDetails?: string | null;
  cardType?: string | null;
  cardLastFourDigits?: string | null;
  authorizationCode?: string | null;
  bankCode?: string | null;
  chequeNo?: string | null;
  chequeDate?: string | null;
  remarks?: string | null;
}

export interface PosDetDto {
  id: string;
  hdrID: string;
  rowID: number;
  compID: string;
  docNo: number;

  itemCode: string;
  name?: string | null;
  barcode?: string | null;
  unitCode?: string | null;
  unitPrice: number;
  originalUnitPrice?: number | null;
  priceOverrideBy?: string | null;
  isOpenItem?: boolean;
  openItemDescription?: string | null;
  openItemRemarks?: string | null;
  approvedBy?: string | null;
  approvedOn?: string | null;
  quantity: number;
  weighingQuantity: number;
  grossAmount: number;
  discountPerc: number;
  discountAmt: number;
  promotionCode?: string | null;
  promotionDiscountAmount: number;
  // Set only when this line is a Combo Items sale — itemCode above is then
  // the ComboMaster.Code, unitPrice the combo's fixed price plus any
  // selected additional-price components. comboComponentsJson is a
  // denormalized snapshot of exactly what was sold/substituted for THIS
  // sale (see types/combo.ts's ResolvedComboComponent) — never re-derived
  // from ComboMaster.Details later.
  comboCode?: string | null;
  comboComponentsJson?: string | null;
  // Set Menu — same shape/rationale as comboCode/comboComponentsJson above.
  setMenuCode?: string | null;
  setMenuComponentsJson?: string | null;
  // Set only when this line sells a Gift Voucher — unitPrice is the
  // denomination the cashier entered. giftVoucherNo is assigned by the
  // server (PosController's IssueGiftVouchersIfNeededAsync) post-save; it
  // doesn't exist client-side at request time.
  isGiftVoucherSale?: boolean;
  giftVoucherNo?: string | null;
  amount: number;
  taxCode?: string | null;
  taxPercentage: number;
  taxAmount: number;
  netAmount: number;
  iac: number;
  costAmount: number;
  itemRemarks?: string | null;
  deliveryTime?: string | null;
  refDocNo?: number | null;
  refRowID?: number | null;
  kotDocNo?: number | null;
  kotRowID?: number | null;
}

// Salon service line — sibling detail collection to PosDetDto (see
// PosServiceDet.cs / PosService.BuildDefinition's third DetailCollectionHandler).
// Only present when Site Business Type includes SAL; a plain retail bill's
// serviceDetails array is always empty.
export interface PosServiceDetDto {
  id: string;
  hdrID: string;
  rowID: number;
  compID: string;
  docNo: number;

  serviceCode: string;
  serviceName?: string | null;
  staffCode?: string | null;
  staffName?: string | null;
  qty: number;
  rate: number;
  grossAmount: number;
  discountPerc: number;
  discountAmt: number;
  amount: number;
  taxCode?: string | null;
  taxPercentage: number;
  taxAmount: number;
  netAmount: number;
  commissionPercent?: number | null;
  commissionAmount: number;
  remarks?: string | null;
}

export interface PosDto {
  id: string;
  compID: string;
  siteID: string;
  docNo: number;
  docDt: string;
  refNo?: string | null;
  posted?: boolean | null;
  deleted?: boolean | null;
  lastModifiedBy: string;
  lastModifiedOn?: string | null;

  custCode?: string | null;
  custName?: string | null;
  salesManCode?: string | null;
  terminalID: string;
  shiftNo?: number | null;
  tableCode?: string | null;
  tabCode?: string | null;
  floorCode?: string | null;
  sectionCode?: string | null;
  orderTypeCode?: string | null;
  diningTypeCode?: string | null;
  waiterCode?: string | null;
  captainCode?: string | null;
  guestCount?: number | null;
  kotDocNo?: number | null;
  status: PosStatus;
  subTotal: number;
  discountPercentage: number;
  discountAmount: number;
  totalDiscAmountPer: number;
  taxAmount: number;
  additionalCharge: number;
  roundingAmount: number;
  netTotal: number;
  paidAmount: number;
  balanceAmount: number;
  changeAmount: number;
  promotionCode?: string | null;
  promotionDiscountAmount: number;
  // Standalone coupon (CouponMaster) — a genuinely separate mechanism from
  // the promotionCode/promotionDiscountAmount pair above (which is the
  // Promotion Engine's own bill-level result). Header-level only, at most
  // one coupon per bill. See lib/api/services/coupon-service.ts.
  couponCode?: string | null;
  couponDiscountAmount: number;
  isSO: boolean;
  salesReturn: boolean;
  billType: PosBillType;
  soRefNo?: string | null;
  remarks?: string | null;
  shiftClosed: boolean;
  voidReason?: string | null;
  voidedBy?: string | null;
  voidedOn?: string | null;
  voidApprovedBy?: string | null;
  createTime: string;
  importedTime?: string | null;

  // Computed/stamped on by PosController, not a real column — see
  // ReceiptTokenHelper.cs. Powers Receipt.tsx's QR code; absent on any
  // PosDto that didn't come from PosController itself.
  publicReceiptToken?: string | null;

  // Receipt heading — stamped on by PosController (AttachReceiptHeaderAsync)
  // from SysCompanyMast / SysSiteMast. Absent on a PosDto that didn't come
  // from PosController itself (the receipt then falls back to the app name).
  receiptCompanyName?: string | null;
  receiptTaxRegisterNo?: string | null;
  receiptBranchName?: string | null;
  receiptBranchNameArb?: string | null;
  receiptBranchAddress?: string | null;
  receiptBranchAddressArb?: string | null;
  receiptBranchPhone?: string | null;

  details: PosDetDto[];
  paymentDetails: PosPaymentDetDto[];
  serviceDetails: PosServiceDetDto[];
}

export interface CreatePosServiceDetDto {
  serviceCode: string;
  serviceName?: string | null;
  staffCode?: string | null;
  staffName?: string | null;
  qty: number;
  rate: number;
  grossAmount: number;
  discountPerc: number;
  discountAmt: number;
  amount: number;
  taxCode?: string | null;
  taxPercentage: number;
  taxAmount: number;
  netAmount: number;
  commissionPercent?: number | null;
  commissionAmount: number;
  remarks?: string | null;
}

export interface CreatePosDetDto {
  itemCode: string;
  name?: string | null;
  barcode?: string | null;
  unitCode?: string | null;
  unitPrice: number;
  originalUnitPrice?: number | null;
  priceOverrideBy?: string | null;
  isOpenItem?: boolean;
  openItemDescription?: string | null;
  openItemRemarks?: string | null;
  approvedBy?: string | null;
  approvedOn?: string | null;
  quantity: number;
  weighingQuantity: number;
  grossAmount: number;
  discountPerc: number;
  discountAmt: number;
  promotionCode?: string | null;
  promotionDiscountAmount: number;
  comboCode?: string | null;
  comboComponentsJson?: string | null;
  setMenuCode?: string | null;
  setMenuComponentsJson?: string | null;
  isGiftVoucherSale?: boolean;
  giftVoucherNo?: string | null;
  amount: number;
  taxCode?: string | null;
  taxPercentage: number;
  taxAmount: number;
  netAmount: number;
  iac: number;
  costAmount: number;
  itemRemarks?: string | null;
  refDocNo?: number | null;
  refRowID?: number | null;
  kotDocNo?: number | null;
  kotRowID?: number | null;
}

export interface CreatePosPaymentDetDto {
  type: PosPaymentType;
  paymentModeCode?: string | null;
  denominationCode?: string | null;
  currencyCode?: string | null;
  curRate: number;
  amount: number;
  foreignAmount: number;
  refCode?: string | null;
  cardDetails?: string | null;
  cardType?: string | null;
  cardLastFourDigits?: string | null;
  authorizationCode?: string | null;
  bankCode?: string | null;
  remarks?: string | null;
}

export interface CreatePosDto {
  docDt: string;
  custCode?: string | null;
  custName?: string | null;
  salesManCode?: string | null;
  terminalID: string;
  shiftNo?: number | null;
  tableCode?: string | null;
  tabCode?: string | null;
  floorCode?: string | null;
  sectionCode?: string | null;
  orderTypeCode?: string | null;
  diningTypeCode?: string | null;
  waiterCode?: string | null;
  captainCode?: string | null;
  guestCount?: number | null;
  kotDocNo?: number | null;
  status: PosStatus;
  subTotal: number;
  discountPercentage: number;
  discountAmount: number;
  totalDiscAmountPer: number;
  taxAmount: number;
  additionalCharge: number;
  roundingAmount: number;
  netTotal: number;
  paidAmount: number;
  balanceAmount: number;
  changeAmount: number;
  promotionCode?: string | null;
  promotionDiscountAmount: number;
  couponCode?: string | null;
  couponDiscountAmount: number;
  isSO: boolean;
  salesReturn: boolean;
  billType: PosBillType;
  soRefNo?: string | null;
  remarks?: string | null;
  details: CreatePosDetDto[];
  paymentDetails: CreatePosPaymentDetDto[];
  serviceDetails: CreatePosServiceDetDto[];
}

// UpdatePosDetDto/UpdatePosPaymentDetDto carry an optional id/rowID so the
// backend's DetailCollectionHandler.SyncForUpdate can match existing rows —
// omitting id on a row (as this app always does; see lib/pos/mappers.ts)
// makes the backend replace the whole detail set: delete every existing
// row not present in the incoming list, insert every incoming row as new.
// That is exactly "recall a held bill, edit freely, resave" — not a hack.
export interface UpdatePosDetDto extends CreatePosDetDto {
  id?: string | null;
  rowID?: number | null;
}

export interface UpdatePosPaymentDetDto extends CreatePosPaymentDetDto {
  id?: string | null;
  rowID?: number | null;
}

export interface UpdatePosServiceDetDto extends CreatePosServiceDetDto {
  id?: string | null;
  rowID?: number | null;
}

export interface UpdatePosDto extends Omit<CreatePosDto, "details" | "paymentDetails" | "serviceDetails"> {
  details: UpdatePosDetDto[];
  paymentDetails: UpdatePosPaymentDetDto[];
  serviceDetails: UpdatePosServiceDetDto[];
}

// ── UI-facing view model (camelCase, decoupled from the wire shape) ─────

export interface PosCartLine {
  lineId: string; // client-only key (React list key / line identity pre-save)
  /** Undefined/"Product" = existing inventory-sale path (PosDet); "Service" = salon service line (PosServiceDet); "Combo" = a Combo Items sale, also billed through PosDet; "SetMenu" = a Set Menu sale, also billed through PosDet; "GiftVoucherSale" = a sold Gift Voucher, also billed through PosDet. */
  lineType?: "Product" | "Service" | "Combo" | "SetMenu" | "GiftVoucherSale";
  itemCode: string;
  name: string;
  nameAr?: string;
  barcode?: string | null;
  unitCode?: string | null;
  unitPrice: number;
  originalUnitPrice?: number | null;
  priceOverrideBy?: string | null;
  isOpenItem?: boolean;
  openItemDescription?: string | null;
  openItemRemarks?: string | null;
  approvedBy?: string | null;
  approvedOn?: string | null;
  quantity: number;
  discountPerc: number;
  discountAmt: number;
  taxCode?: string | null;
  taxPercentage: number;
  costAmount: number;
  refDocNo?: number | null;
  refRowId?: number | null;

  // Category/brand — carried alongside the item's own fields purely so the
  // Promotion Engine can match ITEM_CATEGORY/BRAND-targeted promotions
  // without a second lookup (see hooks/use-promotion-evaluation.ts).
  categoryCode?: string | null;
  brandCode?: string | null;
  /** Item photo path, only so the supermarket item-details card can show a selected cart line. Never sent to the API. */
  imagePath?: string | null;

  // Promotion Engine result for this line — kept separate from discountAmt
  // (the manual/generic discount above), per PromotionEngineService.
  // promotionName is cart-only (never persisted; PosDet only stores the
  // code), so a recalled/held bill shows the code until re-evaluated.
  promotionCode?: string | null;
  promotionName?: string | null;
  promotionDiscountAmount?: number;
  // True for a "buy A get B free" bonus line the Promotion Engine's
  // evaluation hook auto-inserted — never set by the user directly. Lets
  // the hook find/re-quantify/remove it as the evaluation result changes.
  isPromotionFreeLine?: boolean;

  // Weighed items (produce/bakery/deli sold by kg, see lib/pos/weight-barcode.ts)
  // — still a plain "Product" line for tax/billing, just decoded from a
  // scale-printed barcode. `quantity` above IS the weight (kg); this flag only
  // changes entry/display (no +/- steppers, no merge-by-itemCode).
  isWeighted?: boolean;

  // Salon service line only (lineType === "Service") — carried alongside the
  // shared unitPrice/quantity/discountAmt/taxPercentage fields above so
  // calcLineTotals/calcBillTotals sum both line types with zero changes.
  serviceCode?: string;
  staffCode?: string | null;
  staffName?: string | null;
  commissionPercent?: number | null;
  commissionAmt?: number;

  // Combo Items line only (lineType === "Combo") — bills as ONE line at
  // unitPrice = ComboMaster.SellingPrice + selected AdditionalPrice
  // components (see stores/pos-cart-store.ts's addComboLine). comboComponents
  // is the resolved "as sold" breakdown (post substitution/opt-out),
  // serialized to comboComponentsJson at save time by lib/pos/mappers.ts.
  comboCode?: string | null;
  comboComponents?: ResolvedComboComponent[];

  // Set Menu line only (lineType === "SetMenu") — same shape/rationale as
  // comboCode/comboComponents above.
  setMenuCode?: string | null;
  setMenuComponents?: ResolvedSetMenuComponent[];

  // Gift Voucher sale line only (lineType === "GiftVoucherSale") — quantity
  // is always 1, unitPrice is the denomination the cashier entered.
  // giftVoucherNo is only known after save (server-generated) — shows blank
  // on the still-unsaved cart line, filled in for a recalled/printed bill.
  isGiftVoucherSale?: boolean;
  giftVoucherNo?: string | null;
}

export interface PosPayment {
  type: PosPaymentType;
  amount: number;
  cardLastFourDigits?: string;
  authorizationCode?: string;
  refCode?: string;
}

export interface PosLineTotals {
  gross: number;
  discount: number;
  /** gross - discount, pre-tax — matches the bill panel's tax-exclusive Subtotal. */
  taxable: number;
  tax: number;
  net: number;
}

export interface PosBillTotals {
  subTotal: number;
  discountAmount: number;
  taxAmount: number;
  netTotal: number;
}

// Lightweight summary row from PosOperationsController's /search endpoint —
// no details/paymentDetails, used to render the Bill Lookup results list
// before fetching the full PosDto (posService.get) for the picked row.
export interface PosSearchResult {
  docNo: number;
  refNo?: string | null;
  shiftClosed?: boolean;
  salesReturn?: boolean;
  voidReason?: string | null;
  docDt: string;
  tableCode?: string | null;
  custName?: string | null;
  status: PosStatus;
  netTotal: number;
  paidAmount: number;
  terminalID: string;
}
