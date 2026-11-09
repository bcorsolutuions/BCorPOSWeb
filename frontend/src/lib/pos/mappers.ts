import { newUuid } from "@/lib/utils";
import { calcBillTotals, calcLineTotals, calcCommission } from "@/lib/pos/calc";
import type {
  CreatePosDetDto,
  CreatePosDto,
  CreatePosPaymentDetDto,
  CreatePosServiceDetDto,
  PosCartLine,
  PosDetDto,
  PosDto,
  PosPayment,
  PosServiceDetDto,
  PosStatus,
  UpdatePosDto,
} from "@/types/pos";
import type { ResolvedComboComponent } from "@/types/combo";

function newLineId(): string {
  return newUuid();
}

export interface BuildCreatePosDtoInput {
  lines: PosCartLine[];
  payments: PosPayment[];
  status: PosStatus;
  terminalId: string;
  shiftNo?: number | null;
  custCode?: string | null;
  custName?: string | null;
  salesManCode?: string | null;
  billDiscountAmount?: number;
  billPromotionCode?: string | null;
  billPromotionDiscountAmount?: number;
  couponCode?: string | null;
  couponDiscountAmount?: number;
  remarks?: string | null;
  isReturn?: boolean;
  /** Ref No of the original bill a return is against — required by the server for any return. */
  soRefNo?: string | null;
}

/**
 * Builds the exact wire payload BCorDFWebApi's PosController.Create expects.
 *
 * POS calculation pipeline (see PosController.cs's class-level doc comment
 * for the full 11-step order): this function assembles steps 1/3 (already
 * resolved on each PosCartLine before it ever reaches here — see
 * pos-cart-store.ts's addItem/addComboLine), 5 (manual discount),
 * 6-7 (tax/net, via calcBillTotals/calcLineTotals), and 8 (payments). Steps
 * 2/4 (promotion/coupon) are attached here as whatever the client's own
 * live preview last computed, then independently re-verified and
 * overwritten server-side — never trusted as final. Steps 9-11 (gift
 * voucher redemption, payment-total validation, save) happen entirely
 * server-side, after this payload is sent.
 */
export function buildCreatePosDto(input: BuildCreatePosDtoInput): CreatePosDto {
  const billPromotionDiscountAmount = input.billPromotionDiscountAmount ?? 0;
  const couponDiscountAmount = input.couponDiscountAmount ?? 0;
  const billTotals = calcBillTotals(input.lines, input.billDiscountAmount ?? 0, billPromotionDiscountAmount, couponDiscountAmount);
  const paidAmount = input.payments.reduce((sum, p) => sum + p.amount, 0);

  // Combo/Gift-Voucher-sale lines bill through PosDet exactly like a plain
  // product line — the special handling is metadata (comboCode/
  // comboComponentsJson, isGiftVoucherSale) on top of the same
  // itemCode/unitPrice/quantity/tax fields every other line uses.
  const productLines = input.lines.filter(
    (l) => (l.lineType ?? "Product") === "Product" || l.lineType === "Combo" || l.lineType === "GiftVoucherSale",
  );
  const serviceLines = input.lines.filter((l) => l.lineType === "Service");
  const sign = input.isReturn ? -1 : 1;

  const details: CreatePosDetDto[] = productLines.map((line) => {
    const t = calcLineTotals(line);
    return {
      itemCode: line.itemCode,
      name: line.name,
      barcode: line.barcode ?? null,
      unitCode: line.unitCode ?? null,
      unitPrice: line.unitPrice,
      originalUnitPrice: line.originalUnitPrice ?? null,
      priceOverrideBy: line.priceOverrideBy ?? null,
      quantity: sign * line.quantity,
      // Weighed items (produce/bakery/deli by kg, see lib/pos/weight-barcode.ts)
      // — quantity above IS the weight; this dormant field is repurposed
      // purely as a persisted "this line was weighed" snapshot flag so a
      // recalled/printed document can tell without a live item-master lookup.
      weighingQuantity: line.isWeighted ? sign * line.quantity : 0,
      grossAmount: sign * t.gross,
      discountPerc: line.discountPerc,
      // The manual/generic discount ONLY — t.discount (used below for
      // amount/tax/net) folds in promotionDiscountAmount too, but that must
      // stay out of this column or it double-counts: the server re-derives
      // ExistingDiscountAmt from this same field (PosController.cs) to
      // re-evaluate promotions, and a promo amount already baked in here
      // would shrink the gross basis a bill-level promo computes off.
      discountAmt: sign * line.discountAmt,
      promotionCode: line.promotionCode ?? null,
      promotionDiscountAmount: sign * (line.promotionDiscountAmount ?? 0),
      comboCode: line.comboCode ?? null,
      comboComponentsJson: line.comboComponents ? JSON.stringify(line.comboComponents) : null,
      isGiftVoucherSale: line.isGiftVoucherSale ?? false,
      amount: sign * (t.gross - t.discount),
      taxCode: line.taxCode ?? null,
      taxPercentage: line.taxPercentage,
      taxAmount: sign * t.tax,
      netAmount: sign * t.net,
      iac: 0,
      costAmount: line.costAmount,
      refDocNo: line.refDocNo ?? null,
      refRowID: line.refRowId ?? null,
    };
  });

  const serviceDetails: CreatePosServiceDetDto[] = serviceLines.map((line) => {
    const t = calcLineTotals(line);
    return {
      serviceCode: line.serviceCode ?? line.itemCode,
      serviceName: line.name,
      staffCode: line.staffCode ?? null,
      staffName: line.staffName ?? null,
      qty: sign * line.quantity,
      rate: line.unitPrice,
      grossAmount: sign * t.gross,
      discountPerc: line.discountPerc,
      discountAmt: sign * t.discount,
      amount: sign * (t.gross - t.discount),
      taxCode: line.taxCode ?? null,
      taxPercentage: line.taxPercentage,
      taxAmount: sign * t.tax,
      netAmount: sign * t.net,
      commissionPercent: line.commissionPercent ?? null,
      commissionAmount: sign * calcCommission(line),
      remarks: null,
    };
  });

  const paymentDetails: CreatePosPaymentDetDto[] = input.payments.map((p) => ({
    type: p.type,
    paymentModeCode: p.type.toUpperCase(),
    currencyCode: null,
    curRate: 1,
    amount: p.amount,
    foreignAmount: 0,
    refCode: p.refCode ?? null,
    cardType: p.type === "Card" ? "Card" : null,
    cardLastFourDigits: p.cardLastFourDigits ?? null,
    authorizationCode: p.authorizationCode ?? null,
  }));

  return {
    docDt: new Date().toISOString(),
    custCode: input.custCode ?? null,
    custName: input.custName ?? null,
    salesManCode: input.salesManCode ?? null,
    terminalID: input.terminalId,
    shiftNo: input.shiftNo ?? null,
    status: input.status,
    subTotal: billTotals.subTotal,
    discountPercentage: 0,
    discountAmount: billTotals.discountAmount,
    totalDiscAmountPer: billTotals.discountAmount,
    taxAmount: billTotals.taxAmount,
    additionalCharge: 0,
    roundingAmount: 0,
    netTotal: input.isReturn ? -billTotals.netTotal : billTotals.netTotal,
    paidAmount: input.isReturn ? -paidAmount : paidAmount,
    balanceAmount: 0,
    changeAmount: Math.max(0, paidAmount - billTotals.netTotal),
    promotionCode: input.billPromotionCode ?? null,
    promotionDiscountAmount: billPromotionDiscountAmount,
    // Server independently re-validates and overwrites these two at
    // save time when Status is "Completed" (PosController.
    // ApplyCouponIfCompletedAsync) — a "Held" bill is a draft, saved as
    // sent. See lib/api/services/coupon-service.ts.
    couponCode: input.couponCode ?? null,
    couponDiscountAmount: couponDiscountAmount,
    isSO: false,
    salesReturn: !!input.isReturn,
    billType: input.isReturn ? "R" : "S",
    soRefNo: input.isReturn ? input.soRefNo ?? null : null,
    remarks: input.remarks ?? null,
    details,
    paymentDetails,
    serviceDetails,
  };
}

/**
 * Same payload as buildCreatePosDto, reshaped for PUT /api/Pos/{docNo}.
 * Detail rows carry no id, so the backend's SyncForUpdate replaces the
 * whole line/payment set — see UpdatePosDetDto's doc comment in types/pos.ts.
 */
export function buildUpdatePosDto(input: BuildCreatePosDtoInput): UpdatePosDto {
  const created = buildCreatePosDto(input);
  return {
    ...created,
    details: created.details.map((d) => ({ ...d, id: null, rowID: null })),
    paymentDetails: created.paymentDetails.map((p) => ({ ...p, id: null, rowID: null })),
    serviceDetails: created.serviceDetails.map((s) => ({ ...s, id: null, rowID: null })),
  };
}

/** Recall: turn a saved PosDto (a held bill) back into cart lines for editing. */
export function posDetToCartLine(det: PosDetDto): PosCartLine {
  return {
    lineId: newLineId(),
    lineType: det.isGiftVoucherSale ? "GiftVoucherSale" : det.comboCode ? "Combo" : undefined,
    itemCode: det.itemCode,
    name: det.name ?? det.itemCode,
    barcode: det.barcode,
    unitCode: det.unitCode,
    unitPrice: det.unitPrice,
    originalUnitPrice: det.originalUnitPrice,
    priceOverrideBy: det.priceOverrideBy,
    quantity: Math.abs(det.quantity),
    discountPerc: det.discountPerc,
    discountAmt: Math.abs(det.discountAmt),
    // promotionName isn't persisted on PosDet (code only) — shows as the
    // code until use-promotion-evaluation.ts re-evaluates and fills it in.
    promotionCode: det.promotionCode ?? null,
    promotionDiscountAmount: Math.abs(det.promotionDiscountAmount ?? 0),
    comboCode: det.comboCode ?? null,
    comboComponents: parseComboComponentsJson(det.comboComponentsJson),
    isGiftVoucherSale: det.isGiftVoucherSale ?? false,
    giftVoucherNo: det.giftVoucherNo ?? null,
    taxCode: det.taxCode,
    taxPercentage: det.taxPercentage,
    costAmount: det.costAmount,
    refDocNo: det.refDocNo,
    refRowId: det.refRowID,
    isWeighted: Math.abs(det.weighingQuantity) > 0,
  };
}

function parseComboComponentsJson(json: string | null | undefined): ResolvedComboComponent[] | undefined {
  if (!json) return undefined;
  try {
    return JSON.parse(json) as ResolvedComboComponent[];
  } catch {
    return undefined;
  }
}

/** Recall: turn a saved PosServiceDetDto back into a cart line for editing. */
export function posServiceDetToCartLine(det: PosServiceDetDto): PosCartLine {
  return {
    lineId: newLineId(),
    lineType: "Service",
    itemCode: det.serviceCode,
    name: det.serviceName ?? det.serviceCode,
    unitPrice: det.rate,
    quantity: Math.abs(det.qty),
    discountPerc: det.discountPerc,
    discountAmt: Math.abs(det.discountAmt),
    taxCode: det.taxCode,
    taxPercentage: det.taxPercentage,
    costAmount: 0,
    serviceCode: det.serviceCode,
    staffCode: det.staffCode,
    staffName: det.staffName,
    commissionPercent: det.commissionPercent,
    commissionAmt: Math.abs(det.commissionAmount),
  };
}

export function posDtoToCartLines(pos: PosDto): PosCartLine[] {
  return [...pos.details.map(posDetToCartLine), ...pos.serviceDetails.map(posServiceDetToCartLine)];
}

/**
 * Offline sales get queued (see lib/offline/offline-queue.ts) rather than
 * posted immediately, so there's no server-assigned docNo/refNo yet to
 * print on the receipt. This fills a PosDto-shaped preview with a
 * client-only "OFFLINE-xxxx" reference so the receipt can render right
 * away; docNo becomes real once useOfflineSync replays the queue.
 */
export function buildOfflinePreviewPos(dto: CreatePosDto, compId: string, siteId: string, clientKey: string): PosDto {
  return {
    id: clientKey,
    compID: compId,
    siteID: siteId,
    docNo: 0,
    docDt: dto.docDt,
    refNo: `OFFLINE-${clientKey.slice(0, 8).toUpperCase()}`,
    posted: false,
    deleted: false,
    lastModifiedBy: "",
    lastModifiedOn: dto.docDt,
    custCode: dto.custCode,
    custName: dto.custName,
    salesManCode: dto.salesManCode,
    terminalID: dto.terminalID,
    shiftNo: dto.shiftNo,
    status: dto.status,
    subTotal: dto.subTotal,
    discountPercentage: dto.discountPercentage,
    discountAmount: dto.discountAmount,
    totalDiscAmountPer: dto.totalDiscAmountPer,
    taxAmount: dto.taxAmount,
    additionalCharge: dto.additionalCharge,
    roundingAmount: dto.roundingAmount,
    netTotal: dto.netTotal,
    paidAmount: dto.paidAmount,
    balanceAmount: dto.balanceAmount,
    changeAmount: dto.changeAmount,
    promotionCode: dto.promotionCode,
    promotionDiscountAmount: dto.promotionDiscountAmount,
    couponCode: dto.couponCode,
    couponDiscountAmount: dto.couponDiscountAmount,
    isSO: dto.isSO,
    salesReturn: dto.salesReturn,
    billType: dto.billType,
    soRefNo: dto.soRefNo,
    remarks: dto.remarks,
    shiftClosed: false,
    createTime: dto.docDt,
    importedTime: null,
    details: dto.details.map((d, idx) => ({ ...d, id: `${clientKey}-${idx}`, hdrID: clientKey, rowID: idx + 1, compID: compId, docNo: 0 })),
    paymentDetails: dto.paymentDetails.map((p, idx) => ({ ...p, id: `${clientKey}-p${idx}`, hdrID: clientKey, rowID: idx + 1, compID: compId, docNo: 0 })),
    serviceDetails: dto.serviceDetails.map((s, idx) => ({ ...s, id: `${clientKey}-s${idx}`, hdrID: clientKey, rowID: idx + 1, compID: compId, docNo: 0 })),
  };
}
