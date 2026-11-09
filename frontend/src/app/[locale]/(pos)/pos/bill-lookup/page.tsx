"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useMutation } from "@tanstack/react-query";
import { Ban, Search } from "lucide-react";
import { posOperationsService } from "@/lib/api/services/pos-operations-service";
import { posService } from "@/lib/api/services/pos-service";
import { useAuthStore } from "@/stores/auth-store";
import { usePosSessionStore } from "@/stores/pos-session-store";
import { useCurrencyStore } from "@/stores/currency-store";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ReceiptDialog } from "@/components/pos/receipt-dialog";
import { VoidBillDialog } from "@/components/pos/void-bill-dialog";
import { useToast } from "@/components/ui/use-toast";
import { formatDateTime, formatMoney } from "@/lib/utils";
import type { PosDto, PosSearchResult, PosStatus } from "@/types/pos";

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

const statusBadgeVariant: Record<PosStatus, "success" | "warning" | "destructive" | "secondary"> = {
  Completed: "success",
  Held: "warning",
  Voided: "destructive",
  Returned: "secondary",
};

export default function BillLookupPage() {
  const t = useTranslations("billLookup");
  const tp = useTranslations("pos");
  const locale = useLocale();
  const currency = useCurrencyStore((s) => s.currencyCode);
  const compId = useAuthStore((s) => s.user?.compId ?? "");
  const siteId = usePosSessionStore((s) => s.siteId ?? "");

  const [fromDate, setFromDate] = useState(todayIso());
  const [toDate, setToDate] = useState(todayIso());
  const [tableCode, setTableCode] = useState("");
  const [docNo, setDocNo] = useState("");
  const [status, setStatus] = useState<string>("");
  const [custName, setCustName] = useState("");
  const [results, setResults] = useState<PosSearchResult[] | null>(null);
  const [receiptPos, setReceiptPos] = useState<PosDto | null>(null);
  const [voidTarget, setVoidTarget] = useState<PosSearchResult | null>(null);
  const { toast } = useToast();

  const searchMutation = useMutation({
    mutationFn: () =>
      posOperationsService.searchBills(compId, siteId, {
        fromDate,
        toDate,
        tableCode: tableCode || undefined,
        docNo: docNo ? Number(docNo) : undefined,
        status: status || undefined,
        custName: custName || undefined,
      }),
    onSuccess: setResults,
  });

  const viewMutation = useMutation({
    mutationFn: (docNoToOpen: number) => posService.get(compId, siteId, docNoToOpen),
    onSuccess: setReceiptPos,
  });

  return (
    <div className="space-y-4 overflow-y-auto p-4">
      <PageHeader title={t("title")} />

      <Card>
        <CardContent className="flex flex-wrap items-end gap-4 p-4">
          <div className="space-y-1">
            <Label>{t("fromDate")}</Label>
            <Input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className="w-40" />
          </div>
          <div className="space-y-1">
            <Label>{t("toDate")}</Label>
            <Input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} className="w-40" />
          </div>
          <div className="space-y-1">
            <Label>{t("tableCode")}</Label>
            <Input
              value={tableCode}
              onChange={(e) => setTableCode(e.target.value)}
              placeholder={t("tableCode")}
              className="w-32"
            />
          </div>
          <div className="space-y-1">
            <Label>{t("docNo")}</Label>
            <Input
              value={docNo}
              onChange={(e) => setDocNo(e.target.value.replace(/[^0-9]/g, ""))}
              placeholder={t("docNo")}
              className="w-28"
            />
          </div>
          <div className="space-y-1">
            <Label>{t("customer")}</Label>
            <Input
              value={custName}
              onChange={(e) => setCustName(e.target.value)}
              placeholder={t("customer")}
              className="w-40"
            />
          </div>
          <div className="space-y-1">
            <Label>{t("status")}</Label>
            <Select value={status || "all"} onValueChange={(v) => setStatus(v === "all" ? "" : v)}>
              <SelectTrigger className="w-36">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("allStatuses")}</SelectItem>
                <SelectItem value="Completed">{t("statusCompleted")}</SelectItem>
                <SelectItem value="Held">{t("statusHeld")}</SelectItem>
                <SelectItem value="Voided">{t("statusVoided")}</SelectItem>
                <SelectItem value="Returned">{t("statusReturned")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button onClick={() => searchMutation.mutate()} disabled={searchMutation.isPending}>
            <Search className="me-1 h-4 w-4" />
            {t("search")}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("docNo")}</TableHead>
                <TableHead>{t("date")}</TableHead>
                <TableHead>{t("tableCode")}</TableHead>
                <TableHead>{t("customer")}</TableHead>
                <TableHead>{t("status")}</TableHead>
                <TableHead className="text-end">{t("netTotal")}</TableHead>
                <TableHead className="text-end">{t("paidAmount")}</TableHead>
                <TableHead className="w-28" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {results?.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="py-8 text-center text-sm text-muted-foreground">
                    {t("noResults")}
                  </TableCell>
                </TableRow>
              )}
              {results?.map((bill) => (
                <TableRow
                  key={bill.docNo}
                  className="cursor-pointer hover:bg-accent"
                  onClick={() => viewMutation.mutate(bill.docNo)}
                >
                  <TableCell className="font-medium">{bill.docNo}</TableCell>
                  <TableCell>{formatDateTime(bill.docDt, locale)}</TableCell>
                  <TableCell>{bill.tableCode ?? "-"}</TableCell>
                  <TableCell>{bill.custName ?? tp("customer")}</TableCell>
                  <TableCell>
                    <Badge variant={statusBadgeVariant[bill.status]}>{bill.status}</Badge>
                  </TableCell>
                  <TableCell className="text-end tabular-nums">{formatMoney(bill.netTotal, currency, locale)}</TableCell>
                  <TableCell className="text-end tabular-nums">{formatMoney(bill.paidAmount, currency, locale)}</TableCell>
                  <TableCell className="text-end">
                    {bill.status === "Completed" && !bill.salesReturn && !bill.shiftClosed && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-destructive"
                        onClick={(e) => {
                          e.stopPropagation();
                          setVoidTarget(bill);
                        }}
                      >
                        <Ban className="me-1 h-3.5 w-3.5" />
                        {t("void")}
                      </Button>
                    )}
                    {bill.status === "Voided" && bill.voidReason && (
                      <span className="text-xs text-muted-foreground" title={bill.voidReason}>
                        {t("voidedBecause", { reason: bill.voidReason })}
                      </span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <VoidBillDialog
        bill={voidTarget}
        open={!!voidTarget}
        onOpenChange={(open) => !open && setVoidTarget(null)}
        onVoided={() => {
          toast({ title: t("voidedToast") });
          searchMutation.mutate(); // refresh the list: the bill now reads Voided
        }}
      />

      <ReceiptDialog open={!!receiptPos} onOpenChange={(open) => !open && setReceiptPos(null)} pos={receiptPos} />
    </div>
  );
}
