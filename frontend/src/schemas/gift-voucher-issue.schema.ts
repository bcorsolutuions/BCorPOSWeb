import { z } from "zod";

// Admin "Issue Voucher" form (/gift-vouchers/new) — a promotional/comped
// voucher not tied to any POS sale. Posts to GiftVoucherMasterController's
// Issue action (Service/Documents/GiftVoucherService.cs's IssueAsync),
// the same ledgered creation path a POS sale itself uses.
export const giftVoucherIssueSchema = z.object({
  amount: z.coerce.number().gt(0, "validation.mustBePositive"),
  customerCode: z.string().optional(),
  purchaserName: z.string().optional(),
  recipientName: z.string().optional(),
  recipientMobile: z.string().optional(),
  expiryDate: z.string().optional(),
});
export type GiftVoucherIssueFormValues = z.infer<typeof giftVoucherIssueSchema>;
