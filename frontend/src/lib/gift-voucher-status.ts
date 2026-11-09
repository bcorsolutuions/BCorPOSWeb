import type { GiftVoucherStatus } from "@/types/gift-voucher";

// Shared by /gift-vouchers (list) and /gift-vouchers/[id] (detail) — a
// Next.js page.tsx file can't carry extra named exports, so this lives in
// its own module.
export const giftVoucherStatusBadgeVariant: Record<GiftVoucherStatus, "success" | "warning" | "destructive" | "secondary"> = {
  ACTIVE: "success",
  FULLY_USED: "secondary",
  EXPIRED: "warning",
  CANCELLED: "destructive",
  BLOCKED: "destructive",
};
