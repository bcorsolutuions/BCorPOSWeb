// Wire-format types for BCorDFWebApi's GiftVoucherMaster/GiftVoucherTransaction
// (see D:\Works\BCorApi\PowerDFWebApi\Dto\Masters\GiftVoucherMasterDto.cs and
// Dto\Documents\GiftVoucherEngineDto.cs) — camelCase, same convention as
// types/coupon.ts.
//
// A voucher's balance is never trusted from GiftVoucherMasterDto alone —
// GiftVoucherTransactionDto is the real audit trail (see
// lib/api/services/gift-voucher-service.ts's doc comment).

export const GIFT_VOUCHER_STATUSES = ["ACTIVE", "FULLY_USED", "EXPIRED", "CANCELLED", "BLOCKED"] as const;
export type GiftVoucherStatus = (typeof GIFT_VOUCHER_STATUSES)[number];

export interface GiftVoucherMasterDto {
  id: string;
  giftVoucherNo: string;
  compID: string;
  siteID: string;
  active: boolean;
  lastModifiedBy: string;
  lastModifiedOn?: string | null;

  giftVoucherBarcode?: string | null;
  issueDate: string;
  expiryDate?: string | null;
  originalAmount: number;
  currentBalance: number;
  customerCode?: string | null;
  purchaserName?: string | null;
  recipientName?: string | null;
  recipientMobile?: string | null;
  status: GiftVoucherStatus;
  remarks?: string | null;
}

// Narrow — only non-financial fields + status transitions (Cancel/Block).
// No "create" DTO on the frontend at all: a voucher is only ever created via
// a POS sale (PosController's IssueGiftVouchersIfNeededAsync).
export interface UpdateGiftVoucherMasterDto {
  active: boolean;
  lastModifiedBy: string;
  recipientName?: string | null;
  recipientMobile?: string | null;
  remarks?: string | null;
  status: GiftVoucherStatus;
}

export interface GiftVoucherTransactionDto {
  id: string;
  giftVoucherID: string;
  compID: string;
  siteID: string;
  transactionType: "ISSUE" | "REDEEM" | "REVERSAL" | "CANCEL" | "ADJUSTMENT";
  transactionDate: string;
  posRefNo?: string | null;
  docNo?: number | null;
  amount: number;
  balanceBefore: number;
  balanceAfter: number;
  remarks?: string | null;
  lastModifiedBy: string;
  lastModifiedOn?: string | null;
}

// ── GiftVoucherController (Service/Documents/GiftVoucherService.cs) ─────

export interface GiftVoucherValidationRequest {
  giftVoucherNo: string;
}

export interface GiftVoucherValidationResult {
  valid: boolean;
  reason?: string | null;
  giftVoucherNo?: string | null;
  balance: number;
  expiryDate?: string | null;
}
