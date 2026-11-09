"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { giftVoucherMasterService } from "@/lib/api/services/gift-voucher-master-service";
import { useCurrencyStore } from "@/stores/currency-store";
import { giftVoucherStatusBadgeVariant } from "@/lib/gift-voucher-status";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDateTime, formatMoney } from "@/lib/utils";

// Admin screen for the standalone GiftVoucherMaster catalog — List/Search
// only here; row click opens the dedicated /gift-vouchers/[id] detail page
// (Cancel/Block/Unblock, edit recipient info, transaction history) and
// "New" opens /gift-vouchers/new (an explicit admin-initiated Issue, see
// that page's doc comment). Deliberately NOT built on CrudDataGridPage:
// that component always offers a free-form "Add New" dialog with whatever
// fields the caller lists, and a gift voucher's balance must only ever
// come from GiftVoucherService.IssueAsync's ledgered creation, never a
// raw entity form bound directly to OriginalAmount/CurrentBalance.
export default function GiftVoucherMasterPage() {
  const t = useTranslations("giftVoucher");
  const tc = useTranslations("common");
  const locale = useLocale();
  const router = useRouter();
  const currency = useCurrencyStore((s) => s.currencyCode);
  const [search, setSearch] = useState("");

  const { data } = useQuery({
    queryKey: ["gift-voucher-master"],
    queryFn: () => giftVoucherMasterService.list(),
  });

  const items = (data?.items ?? []).filter(
    (v) =>
      !search ||
      v.giftVoucherNo.toLowerCase().includes(search.toLowerCase()) ||
      (v.recipientName ?? "").toLowerCase().includes(search.toLowerCase()) ||
      (v.customerCode ?? "").toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="space-y-4 overflow-y-auto p-4">
      <PageHeader
        title={t("giftVoucherMaster")}
        actions={
          <Button size="sm" className="gap-1.5" onClick={() => router.push("/gift-vouchers/new")}>
            <Plus className="h-3.5 w-3.5" />
            {tc("add")}
          </Button>
        }
      />

      <Card>
        <CardContent className="p-4">
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={tc("search")} className="max-w-sm" />
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("giftVoucherNo")}</TableHead>
                <TableHead>{t("customer")}</TableHead>
                <TableHead className="text-end">{t("originalAmount")}</TableHead>
                <TableHead className="text-end">{t("currentBalance")}</TableHead>
                <TableHead>{t("issueDate")}</TableHead>
                <TableHead>{t("expiryDate")}</TableHead>
                <TableHead>{tc("status")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="py-8 text-center text-sm text-muted-foreground">
                    {tc("noData")}
                  </TableCell>
                </TableRow>
              )}
              {items.map((v) => (
                <TableRow
                  key={v.giftVoucherNo}
                  className="cursor-pointer hover:bg-accent"
                  onClick={() => router.push(`/gift-vouchers/${encodeURIComponent(v.giftVoucherNo)}`)}
                >
                  <TableCell className="font-medium">{v.giftVoucherNo}</TableCell>
                  <TableCell>{v.customerCode ?? "-"}</TableCell>
                  <TableCell className="text-end tabular-nums">{formatMoney(v.originalAmount, currency, locale)}</TableCell>
                  <TableCell className="text-end tabular-nums">{formatMoney(v.currentBalance, currency, locale)}</TableCell>
                  <TableCell>{formatDateTime(v.issueDate, locale)}</TableCell>
                  <TableCell>{v.expiryDate ? formatDateTime(v.expiryDate, locale) : "-"}</TableCell>
                  <TableCell>
                    <Badge variant={giftVoucherStatusBadgeVariant[v.status]}>{v.status}</Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
