// Mirrors BCorApi's Dto/Documents/LoyaltyEngineDto.cs — the actual points
// posting/balance math stays server-side (spec RULE 3); these types are
// preview/read shapes only.

export interface LoyaltyLookupResultDto {
  found: boolean;
  reason?: string | null;
  customerCode?: string | null;
  customerName?: string | null;
  localId?: string | null;
  loyaltyNo?: string | null;
  loyaltyCode?: string | null;
  currentPoints: number;
  redemptionValue: number;
  status?: string | null;
}

export interface LoyaltyEnrollResultDto {
  success: boolean;
  reason?: string | null;
  loyaltyNo?: string | null;
  currentPoints: number;
}

export interface LoyaltyQuickRegisterResultDto {
  success: boolean;
  reason?: string | null;
  customerCode?: string | null;
  customerName?: string | null;
  loyaltyNo?: string | null;
  currentPoints: number;
}

export interface LoyaltySiteSettingsDto {
  compID: string;
  siteID: string;
  active: boolean;
  enableCustomerLoyalty: boolean;
  defaultLoyaltyCode?: string | null;
  showLoyaltyOnReceipt: boolean;
  showLoyaltyValueOnPOS: boolean;
  requireRedemptionVerification: string;
  allowNegativeLoyaltyBalance: boolean;
}

export interface LoyaltyCalcLineDto {
  itemCode: string;
  categoryCode?: string | null;
  quantity: number;
  grossAmount: number;
  lineDiscountAmount: number;
  linePromotionDiscountAmount: number;
  hasPromotion: boolean;
  hasDiscount: boolean;
}

export interface LoyaltyCalculateRequestDto {
  customerCode?: string | null;
  loyaltyCode?: string | null;
  lines: LoyaltyCalcLineDto[];
  subTotal: number;
  discountAmount: number;
  netTotal: number;
  redeemedAmount: number;
}

export interface LoyaltyCalculateResultDto {
  eligible: boolean;
  reason?: string | null;
  eligibleAmount: number;
  pointsToEarn: number;
  currentPoints: number;
  minimumRedeemPoints: number;
  maximumRedeemPoints?: number | null;
  maximumRedeemableValue: number;
}

export interface LoyaltyRedeemValidateRequestDto {
  loyaltyNo: string;
  billNetTotal: number;
  requestedValue: number;
}

export interface LoyaltyRedeemValidateResultDto {
  valid: boolean;
  reason?: string | null;
  pointsToRedeem: number;
  redemptionValue: number;
  currentPoints: number;
}

export interface LoyaltyAdjustmentRequestDto {
  loyaltyNo: string;
  points: number;
  reason: string;
  approverUserName?: string | null;
  approverPassword?: string | null;
}

export interface LoyaltyAdjustmentResultDto {
  success: boolean;
  reason?: string | null;
  balanceAfter: number;
}

export type LoyaltyTransType =
  | "EARN"
  | "REDEEM"
  | "RETURN_REVERSAL"
  | "REDEMPTION_REVERSAL"
  | "EXPIRE"
  | "MANUAL_ADJUSTMENT"
  | "BONUS"
  | "OPENING_BALANCE";

export interface LoyaltyLedgerDto {
  id: string;
  loyaltyAccountID: string;
  compID: string;
  siteID: string;
  transType: LoyaltyTransType;
  transactionDate: string;
  docNo?: number | null;
  refNo?: string | null;
  earnedPoints: number;
  redeemedPoints: number;
  expiredPoints: number;
  adjustmentPoints: number;
  balancePoints: number;
  eligibleAmount?: number | null;
  expiryDate?: string | null;
  remarks?: string | null;
  approvedBy?: string | null;
}
