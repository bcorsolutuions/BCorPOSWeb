import { apiClient } from "../axios-client";
import { useAuthStore } from "@/stores/auth-store";
import type { GiftVoucherMasterDto, GiftVoucherStatus, GiftVoucherTransactionDto, UpdateGiftVoucherMasterDto } from "@/types/gift-voucher";
import type { GiftVoucherIssueFormValues } from "@/schemas/gift-voucher-issue.schema";

// Real BCorDFWebApi GiftVoucherMasterController — List/Search + narrow row
// actions, plus the explicit admin `issue` action (see /gift-vouchers/new)
// for a promotional/comped voucher not tied to a POS sale. Both paths go
// through GiftVoucherService.IssueAsync's same ledgered creation — there is
// still no generic/free-form `create` that could fabricate a balance
// outside the GiftVoucherTransaction ledger. See gift-voucher-service.ts
// for the separate live-validate/redeem engine.
export interface GiftVoucher extends GiftVoucherMasterDto {
  id: string;
}

function toGiftVoucher(dto: GiftVoucherMasterDto): GiftVoucher {
  return { ...dto, id: dto.giftVoucherNo };
}

function update(
  giftVoucherNo: string,
  payload: Partial<Pick<UpdateGiftVoucherMasterDto, "recipientName" | "recipientMobile" | "remarks" | "status" | "active">>,
  current: GiftVoucherMasterDto,
): Promise<void> {
  const user = useAuthStore.getState().user;
  const compId = user?.compId ?? "";
  const body: UpdateGiftVoucherMasterDto = {
    active: payload.active ?? current.active,
    lastModifiedBy: user?.userName ?? "",
    recipientName: payload.recipientName ?? current.recipientName,
    recipientMobile: payload.recipientMobile ?? current.recipientMobile,
    remarks: payload.remarks ?? current.remarks,
    status: payload.status ?? current.status,
  };
  return apiClient.put(`/GiftVoucherMaster/${giftVoucherNo}`, body, { headers: { CompID: compId } }).then(() => undefined);
}

export const giftVoucherMasterService = {
  list: async (): Promise<{ items: GiftVoucher[]; total: number }> => {
    const compId = useAuthStore.getState().user?.compId ?? "";
    const { data } = await apiClient.get<GiftVoucherMasterDto[]>(`/GiftVoucherMaster/${compId}`);
    const items = data.map(toGiftVoucher);
    return { items, total: items.length };
  },

  get: async (giftVoucherNo: string): Promise<GiftVoucher | null> => {
    const compId = useAuthStore.getState().user?.compId ?? "";
    const { data } = await apiClient.get<GiftVoucherMasterDto | null>(`/GiftVoucherMaster/${compId}/${giftVoucherNo}`);
    return data ? toGiftVoucher(data) : null;
  },

  getTransactions: async (giftVoucherNo: string): Promise<GiftVoucherTransactionDto[]> => {
    const compId = useAuthStore.getState().user?.compId ?? "";
    const { data } = await apiClient.get<GiftVoucherTransactionDto[]>(`/GiftVoucherMaster/${compId}/${giftVoucherNo}/transactions`);
    return data;
  },

  issue: async (payload: GiftVoucherIssueFormValues): Promise<GiftVoucher> => {
    const user = useAuthStore.getState().user;
    const compId = user?.compId ?? "";
    const { data } = await apiClient.post<GiftVoucherMasterDto>(
      `/GiftVoucherMaster/${compId}/issue`,
      {
        amount: payload.amount,
        customerCode: payload.customerCode || null,
        purchaserName: payload.purchaserName || null,
        recipientName: payload.recipientName || null,
        recipientMobile: payload.recipientMobile || null,
        expiryDate: payload.expiryDate || null,
      },
      { params: { userName: user?.userName ?? "" } },
    );
    return toGiftVoucher(data);
  },

  cancel: (voucher: GiftVoucherMasterDto) => update(voucher.giftVoucherNo, { status: "CANCELLED" as GiftVoucherStatus }, voucher),
  block: (voucher: GiftVoucherMasterDto) => update(voucher.giftVoucherNo, { status: "BLOCKED" as GiftVoucherStatus }, voucher),
  unblock: (voucher: GiftVoucherMasterDto) => update(voucher.giftVoucherNo, { status: "ACTIVE" as GiftVoucherStatus }, voucher),
  updateDetails: (
    voucher: GiftVoucherMasterDto,
    fields: { recipientName?: string | null; recipientMobile?: string | null; remarks?: string | null },
  ) => update(voucher.giftVoucherNo, fields, voucher),
};
