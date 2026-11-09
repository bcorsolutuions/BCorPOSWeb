"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { giftVoucherMasterService } from "@/lib/api/services/gift-voucher-master-service";
import { useCurrencyStore } from "@/stores/currency-store";
import { giftVoucherStatusBadgeVariant } from "@/lib/gift-voucher-status";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/components/ui/use-toast";
import { apiErrorMessage } from "@/lib/api-error";
import { formatDateTime, formatMoney, formatMoneyPlain } from "@/lib/utils";
import type { GiftVoucherTransactionDto } from "@/types/gift-voucher";

/**
 * Gift voucher detail page — was a modal dialog on the list page, now its
 * own route (`[id]` is the GiftVoucherNo, e.g. "GV-000100") per the
 * dedicated-routes plan. Shows the full audit trail (spec: never derive a
 * balance from GiftVoucherMaster alone) via getTransactions, plus the same
 * Cancel/Block/Unblock/edit-recipient actions the modal had.
 */
export default function GiftVoucherDetailPage() {
  const params = useParams<{ id: string }>();
  const giftVoucherNo = decodeURIComponent(params.id);
  const t = useTranslations("giftVoucher");
  const tc = useTranslations("common");
  const locale = useLocale();
  const router = useRouter();
  const currency = useCurrencyStore((s) => s.currencyCode);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [recipientName, setRecipientName] = useState("");
  const [recipientMobile, setRecipientMobile] = useState("");
  const [remarks, setRemarks] = useState("");

  const { data: voucher } = useQuery({
    queryKey: ["gift-voucher-master", giftVoucherNo],
    queryFn: () => giftVoucherMasterService.get(giftVoucherNo),
  });

  const { data: transactions = [] } = useQuery<GiftVoucherTransactionDto[]>({
    queryKey: ["gift-voucher-transactions", giftVoucherNo],
    queryFn: () => giftVoucherMasterService.getTransactions(giftVoucherNo),
  });

  const actionMutation = useMutation({
    mutationFn: async (action: "cancel" | "block" | "unblock" | "save") => {
      if (!voucher) return;
      if (action === "cancel") return giftVoucherMasterService.cancel(voucher);
      if (action === "block") return giftVoucherMasterService.block(voucher);
      if (action === "unblock") return giftVoucherMasterService.unblock(voucher);
      return giftVoucherMasterService.updateDetails(voucher, { recipientName, recipientMobile, remarks });
    },
    onSuccess: () => {
      toast({ title: tc("saveSuccess") });
      queryClient.invalidateQueries({ queryKey: ["gift-voucher-master"] });
      queryClient.invalidateQueries({ queryKey: ["gift-voucher-master", giftVoucherNo] });
    },
    onError: (err) => toast({ title: apiErrorMessage(err, tc("errorGeneric")), variant: "destructive" }),
  });

  if (!voucher) {
    return (
      <div className="space-y-4 p-4">
        <Button variant="ghost" size="sm" className="gap-1.5" onClick={() => router.push("/gift-vouchers")}>
          <ArrowLeft className="h-3.5 w-3.5" />
          {tc("back")}
        </Button>
        <p className="text-sm text-muted-foreground">{tc("loading")}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 overflow-y-auto p-4">
      <Button variant="ghost" size="sm" className="w-fit gap-1.5" onClick={() => router.push("/gift-vouchers")}>
        <ArrowLeft className="h-3.5 w-3.5" />
        {tc("back")}
      </Button>

      <PageHeader
        title={voucher.giftVoucherNo}
        actions={<Badge variant={giftVoucherStatusBadgeVariant[voucher.status]}>{voucher.status}</Badge>}
      />

      <Card>
        <CardContent className="grid grid-cols-2 gap-3 p-4 text-sm sm:grid-cols-4">
          <div>
            <p className="text-muted-foreground">{t("giftVoucherNo")}</p>
            <p className="font-medium">{voucher.giftVoucherNo}</p>
          </div>
          <div>
            <p className="text-muted-foreground">{tc("status")}</p>
            <p className="font-medium">
              <Badge variant={giftVoucherStatusBadgeVariant[voucher.status]}>{voucher.status}</Badge>
            </p>
          </div>
          <div>
            <p className="text-muted-foreground">{t("issueDate")}</p>
            <p className="font-medium">{formatDateTime(voucher.issueDate, locale)}</p>
          </div>
          <div>
            <p className="text-muted-foreground">{t("expiryDate")}</p>
            <p className="font-medium">{voucher.expiryDate ? formatDateTime(voucher.expiryDate, locale) : "-"}</p>
          </div>
          <div>
            <p className="text-muted-foreground">{t("originalAmount")}</p>
            <p className="font-medium tabular-nums">{formatMoney(voucher.originalAmount, currency, locale)}</p>
          </div>
          <div>
            <p className="text-muted-foreground">{t("currentBalance")}</p>
            <p className="font-medium tabular-nums">{formatMoney(voucher.currentBalance, currency, locale)}</p>
          </div>
          <div>
            <p className="text-muted-foreground">{t("customer")}</p>
            <p className="font-medium">{voucher.customerCode ?? "-"}</p>
          </div>
          <div>
            <p className="text-muted-foreground">{t("recipient")}</p>
            <p className="font-medium">
              {voucher.recipientName
                ? voucher.recipientMobile
                  ? `${voucher.recipientName} (${voucher.recipientMobile})`
                  : voucher.recipientName
                : "-"}
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="max-w-md space-y-2 p-4">
          <div className="space-y-1">
            <Label>{t("recipientName")}</Label>
            <Input defaultValue={voucher.recipientName ?? ""} onChange={(e) => setRecipientName(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label>{t("recipientMobile")}</Label>
            <Input defaultValue={voucher.recipientMobile ?? ""} onChange={(e) => setRecipientMobile(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label>{tc("remarks")}</Label>
            <Textarea defaultValue={voucher.remarks ?? ""} onChange={(e) => setRemarks(e.target.value)} />
          </div>
          <Button size="sm" variant="outline" onClick={() => actionMutation.mutate("save")} disabled={actionMutation.isPending}>
            {tc("save")}
          </Button>
        </CardContent>
      </Card>

      <div className="flex flex-wrap gap-2">
        {voucher.status === "BLOCKED" ? (
          <Button size="sm" variant="outline" onClick={() => actionMutation.mutate("unblock")} disabled={actionMutation.isPending}>
            {t("unblock")}
          </Button>
        ) : (
          <Button size="sm" variant="outline" onClick={() => actionMutation.mutate("block")} disabled={actionMutation.isPending}>
            {t("block")}
          </Button>
        )}
        {voucher.status !== "CANCELLED" && (
          <Button size="sm" variant="destructive" onClick={() => actionMutation.mutate("cancel")} disabled={actionMutation.isPending}>
            {t("cancel")}
          </Button>
        )}
      </div>

      <Card>
        <CardContent className="space-y-1 p-4">
          <Label>{t("transactionHistory")}</Label>
          <div className="overflow-x-auto rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{tc("date")}</TableHead>
                  <TableHead>{t("transactionType")}</TableHead>
                  <TableHead>{t("reference")}</TableHead>
                  <TableHead className="text-end">{t("amount")}</TableHead>
                  <TableHead className="text-end">{t("balanceAfter")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transactions.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="py-6 text-center text-sm text-muted-foreground">
                      {tc("noData")}
                    </TableCell>
                  </TableRow>
                )}
                {transactions.map((tx) => {
                  // Amount is stored always-positive (direction implied by
                  // TransactionType — see GiftVoucherTransaction.cs's doc
                  // comment); the delta between BalanceBefore/After is the
                  // one value that's correctly signed for any type (+ISSUE/
                  // REVERSAL, -REDEEM), matching the spec's own example
                  // ("+50.000" / "-10.000").
                  const delta = tx.balanceAfter - tx.balanceBefore;
                  const sign = delta > 0 ? "+" : delta < 0 ? "-" : "";
                  return (
                    <TableRow key={tx.id}>
                      <TableCell>{formatDateTime(tx.transactionDate, locale)}</TableCell>
                      <TableCell>{tx.transactionType}</TableCell>
                      <TableCell>{tx.posRefNo || (tx.docNo ? String(tx.docNo) : "-")}</TableCell>
                      <TableCell className="text-end tabular-nums">
                        {sign}
                        {formatMoneyPlain(Math.abs(delta), currency, locale)}
                      </TableCell>
                      <TableCell className="text-end tabular-nums">{formatMoney(tx.balanceAfter, currency, locale)}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
