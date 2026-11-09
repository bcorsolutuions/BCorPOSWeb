// Wire-format types for BCorDFWebApi's PromotionEngineController (see
// D:\Works\BCorApi\PowerDFWebApi\Dto\Documents\PromotionEngineDto.cs) —
// camelCase, same convention as types/pos.ts.

export interface PromotionEvalLine {
  lineId: string;
  itemCode: string;
  unitCode?: string | null;
  categoryCode?: string | null;
  brandCode?: string | null;
  quantity: number;
  unitPrice: number;
  existingDiscountAmt: number;
}

export interface PromotionEvaluationRequest {
  dateTime: string;
  customerCode?: string | null;
  customerCategoryCode?: string | null;
  paymentModeCode?: string | null;
  lines: PromotionEvalLine[];
  appliedCouponCodes: string[];
}

export interface PromotionLineResult {
  lineId: string;
  promotionCode?: string | null;
  promotionName?: string | null;
  originalPrice: number;
  promotionDiscountAmount: number;
  finalPrice: number;
  isFreeItemLine: boolean;
  freeItemCode?: string | null;
  freeItemQuantity?: number | null;
  resolvedUnitPrice?: number | null;
}

export interface PromotionBillResult {
  promotionCode: string;
  promotionName: string;
  promotionDiscountAmount: number;
}

export interface PromotionEvaluationResult {
  lineResults: PromotionLineResult[];
  billResult?: PromotionBillResult | null;
  totalPromotionDiscount: number;
}
