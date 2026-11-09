"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useMutation, useQuery } from "@tanstack/react-query";
import { isAxiosError } from "axios";
import { reportService, type ReportRequest, type ReportResult } from "@/lib/api/services/dashboard-service";
import { posLookupService } from "@/lib/api/services/pos-lookup-service";
import { customerMasterService } from "@/lib/api/services/customer-master-service";
import { itemMasterService } from "@/lib/api/services/item-master-service";
import { useCurrentBranch } from "@/hooks/use-current-branch";
import { promotionMasterService } from "@/lib/api/services/promotion-master-service";
import { couponMasterService } from "@/lib/api/services/coupon-master-service";
import { GIFT_VOUCHER_STATUSES } from "@/types/gift-voucher";
import { PERMISSIONS, type PermissionKey } from "@/lib/auth/permissions";
import { usePermission } from "@/hooks/use-permission";
import { useAuthStore } from "@/stores/auth-store";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/components/ui/use-toast";
import { Download, Eye, Printer } from "lucide-react";
import { ReportPrint } from "@/components/reports/report-print";
import { reportToCsv, downloadCsv } from "@/lib/reports/export-csv";

// Report columns are server-driven, arbitrary keys (custom report builder,
// see 07-api-structure.md). We translate the ones we recognize via the
// "reportColumns" dictionary and fall back to the raw key for anything a
// tenant-defined report introduces that isn't in that dictionary yet.
function columnLabel(t: ReturnType<typeof useTranslations>, column: string): string {
  try {
    return t(`reportColumns.${column}` as never);
  } catch {
    return column;
  }
}

const REPORT_OPTIONS: { value: ReportRequest["reportKey"]; labelKey: string; requiredPermission?: PermissionKey }[] = [
  { value: "sales-summary", labelKey: "reports.salesSummary" },
  { value: "sales-detailed", labelKey: "reports.salesDetailed" },
  { value: "staff-commission", labelKey: "reports.staffCommission" },
  { value: "customer-history", labelKey: "reports.customerHistory" },
  { value: "inventory-valuation", labelKey: "reports.inventoryValuation" },
  { value: "financial-summary", labelKey: "reports.financialSummary" },
  { value: "branch-comparison", labelKey: "reports.branchComparison" },
  { value: "promotion-usage-report", labelKey: "reports.promotionUsageReport", requiredPermission: PERMISSIONS.PROMOTION_MANAGE },
  { value: "promotion-discount-report", labelKey: "reports.promotionDiscountReport", requiredPermission: PERMISSIONS.PROMOTION_MANAGE },
  { value: "combo-sales-report", labelKey: "reports.comboSalesReport", requiredPermission: PERMISSIONS.COMBO_MANAGE },
  { value: "combo-item-consumption-report", labelKey: "reports.comboItemConsumptionReport", requiredPermission: PERMISSIONS.COMBO_MANAGE },
  { value: "coupon-usage-report", labelKey: "reports.couponUsageReport", requiredPermission: PERMISSIONS.COUPON_MANAGE },
  { value: "coupon-discount-report", labelKey: "reports.couponDiscountReport", requiredPermission: PERMISSIONS.COUPON_MANAGE },
  { value: "unused-coupon-report", labelKey: "reports.unusedCouponReport", requiredPermission: PERMISSIONS.COUPON_MANAGE },
  { value: "gift-voucher-issue-report", labelKey: "reports.giftVoucherIssueReport", requiredPermission: PERMISSIONS.GIFT_VOUCHER_MANAGE },
  { value: "gift-voucher-redemption-report", labelKey: "reports.giftVoucherRedemptionReport", requiredPermission: PERMISSIONS.GIFT_VOUCHER_MANAGE },
  { value: "gift-voucher-balance-report", labelKey: "reports.giftVoucherBalanceReport", requiredPermission: PERMISSIONS.GIFT_VOUCHER_MANAGE },
  { value: "gift-voucher-expiry-report", labelKey: "reports.giftVoucherExpiryReport", requiredPermission: PERMISSIONS.GIFT_VOUCHER_MANAGE },
  { value: "gift-voucher-transaction-history", labelKey: "reports.giftVoucherTransactionHistory", requiredPermission: PERMISSIONS.GIFT_VOUCHER_MANAGE },
  { value: "set-menu-sales-report", labelKey: "reports.setMenuSalesReport", requiredPermission: PERMISSIONS.SET_MENU_MANAGE },
  { value: "set-menu-selection-report", labelKey: "reports.setMenuSelectionReport", requiredPermission: PERMISSIONS.SET_MENU_MANAGE },
  { value: "bar-sales-report", labelKey: "reports.barSalesReport", requiredPermission: PERMISSIONS.BAR_COUNTER_MANAGE },
  { value: "bar-pending-orders-report", labelKey: "reports.barPendingOrdersReport", requiredPermission: PERMISSIONS.BAR_COUNTER_MANAGE },
  { value: "bar-stock-consumption-report", labelKey: "reports.barStockConsumptionReport", requiredPermission: PERMISSIONS.BAR_COUNTER_MANAGE },
  { value: "open-tab-report", labelKey: "reports.openTabReport", requiredPermission: PERMISSIONS.BAR_COUNTER_MANAGE },
  { value: "loyalty-redemption-report", labelKey: "reports.loyaltyRedemptionReport", requiredPermission: PERMISSIONS.LOYALTY_VIEW_REPORTS },
  { value: "loyalty-points-report", labelKey: "reports.loyaltyPointsReport", requiredPermission: PERMISSIONS.LOYALTY_VIEW_REPORTS },
  { value: "stock-ledger-report", labelKey: "reports.stockLedgerReport", requiredPermission: PERMISSIONS.INVENTORY_MANAGE_ITEMS },
];

// Which of the 5 new filters (+ whether the date range even applies) show
// for a given report — kept exhaustive over the full reportKey union so a
// future 13th key can't silently fall through with no entry here. The 7
// pre-existing keys all get "nothing extra, dates apply" (unchanged
// behavior). "status" picks which option set the Status <Select> renders:
// "pos" = PosHdr.Status (Held|Completed|Voided|Returned), "gift-voucher" =
// GiftVoucherMaster.Status, "coupon-active" = CouponMaster.Active.
interface ReportFilterVisibility {
  dateRange?: boolean; // default true — only unused-coupon-report/gift-voucher-balance-report set this false
  customer?: boolean;
  promotion?: boolean;
  coupon?: boolean;
  voucher?: boolean;
  item?: boolean; // inventory item picker (stock ledger)
  status?: "pos" | "gift-voucher" | "coupon-active";
}

const REPORT_FILTER_VISIBILITY: Record<ReportRequest["reportKey"], ReportFilterVisibility> = {
  "sales-summary": {},
  "sales-detailed": {},
  "staff-commission": {},
  "customer-history": {},
  "inventory-valuation": {},
  "financial-summary": {},
  "branch-comparison": {},
  "promotion-usage-report": { customer: true, promotion: true, status: "pos" },
  "promotion-discount-report": { customer: true, promotion: true, status: "pos" },
  "combo-sales-report": { customer: true, status: "pos" },
  "combo-item-consumption-report": { customer: true, status: "pos" },
  "coupon-usage-report": { customer: true, coupon: true, status: "pos" },
  "coupon-discount-report": { customer: true, coupon: true, status: "pos" },
  "unused-coupon-report": { customer: true, coupon: true, status: "coupon-active", dateRange: false },
  "gift-voucher-issue-report": { customer: true, voucher: true, status: "gift-voucher" },
  "gift-voucher-redemption-report": { customer: true, voucher: true, status: "gift-voucher" },
  "gift-voucher-balance-report": { customer: true, voucher: true, status: "gift-voucher", dateRange: false },
  "gift-voucher-expiry-report": { customer: true, voucher: true, status: "gift-voucher" },
  "gift-voucher-transaction-history": { customer: true, voucher: true, status: "gift-voucher" },
  "set-menu-sales-report": { customer: true, status: "pos" },
  "set-menu-selection-report": { customer: true, status: "pos" },
  "bar-sales-report": { customer: true, status: "pos" },
  "bar-pending-orders-report": { dateRange: false },
  "bar-stock-consumption-report": {},
  "open-tab-report": { dateRange: false },
  "loyalty-redemption-report": { customer: true },
  "loyalty-points-report": { customer: true },
  "stock-ledger-report": { item: true },
};

export default function ReportsPage() {
  const t = useTranslations();
  const { toast } = useToast();
  const { can } = usePermission();
  const compId = useAuthStore((s) => s.user?.compId ?? "");
  const [reportKey, setReportKeyState] = useState<ReportRequest["reportKey"]>("sales-summary");
  const [fromDate, setFromDate] = useState(new Date().toISOString().slice(0, 10));
  const [toDate, setToDate] = useState(new Date().toISOString().slice(0, 10));
  const [branchId, setBranchId] = useState("");
  const [customerCode, setCustomerCode] = useState("");
  const [promotionCode, setPromotionCode] = useState("");
  const [couponCode, setCouponCode] = useState("");
  const [giftVoucherNo, setGiftVoucherNo] = useState("");
  const [status, setStatus] = useState("");
  const [itemCode, setItemCode] = useState("");
  const { siteId: currentBranchId } = useCurrentBranch();
  const [result, setResult] = useState<ReportResult | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);

  const visibility = REPORT_FILTER_VISIBILITY[reportKey];
  const visibleReportOptions = REPORT_OPTIONS.filter((o) => !o.requiredPermission || can(o.requiredPermission));

  // Switching report types never carries a stale filter into an unrelated
  // request — e.g. leaving "Coupon Usage Report"'s couponCode set when the
  // user picks "Sales Summary" next.
  function handleReportKeyChange(next: ReportRequest["reportKey"]) {
    setReportKeyState(next);
    setCustomerCode("");
    setPromotionCode("");
    setCouponCode("");
    setGiftVoucherNo("");
    setStatus("");
    setItemCode("");
    // Stock is per branch: open the Stock Ledger on the branch the user is working in.
    if (next === "stock-ledger-report" && !branchId) setBranchId(currentBranchId);
  }

  const { data: sites = [] } = useQuery({
    queryKey: ["sites-lookup", compId],
    queryFn: () => posLookupService.getSites(compId),
    enabled: !!compId,
  });
  const branchName = sites.length === 1 ? sites[0]?.siteName ?? "" : sites.map((s) => s.siteName).join(", ");

  const { data: customers = [] } = useQuery({
    queryKey: ["customers-lookup-reports"],
    queryFn: () => customerMasterService.list(),
    enabled: !!compId && !!visibility.customer,
    select: (d) => d.items,
  });
  const { data: stockItems = [] } = useQuery({
    queryKey: ["items-lookup-reports"],
    queryFn: () => itemMasterService.list(),
    enabled: !!compId && !!visibility.item,
    select: (d) => d.items,
  });
  const { data: promotions = [] } = useQuery({
    queryKey: ["promotions-lookup-reports"],
    queryFn: () => promotionMasterService.list(),
    enabled: !!compId && !!visibility.promotion,
    select: (d) => d.items,
  });
  const { data: coupons = [] } = useQuery({
    queryKey: ["coupons-lookup-reports"],
    queryFn: () => couponMasterService.list(),
    enabled: !!compId && !!visibility.coupon,
    select: (d) => d.items,
  });

  const generate = useMutation({
    mutationFn: () =>
      reportService.generate(compId, {
        reportKey,
        fromDate,
        toDate,
        branchId: branchId || undefined,
        customerCode: customerCode || undefined,
        promotionCode: promotionCode || undefined,
        couponCode: couponCode || undefined,
        giftVoucherNo: giftVoucherNo || undefined,
        status: status || undefined,
        itemCode: itemCode || undefined,
      }),
    onSuccess: setResult,
    onError: (err) => {
      setResult(null);
      const notImplemented = isAxiosError(err) && err.response?.status === 501;
      const notLicensed = isAxiosError(err) && err.response?.status === 403;
      toast({
        title: notImplemented ? t("reports.notAvailable") : notLicensed ? t("reports.notLicensed") : t("common.errorGeneric"),
        variant: "destructive",
      });
    },
  });

  const reportTitle = t(REPORT_OPTIONS.find((o) => o.value === reportKey)?.labelKey ?? "reports.title");

  function handleExportCsv() {
    if (!result) return;
    const columnLabels = Object.fromEntries(result.columns.map((c) => [c, columnLabel(t, c)]));
    const csv = reportToCsv(result, columnLabels, t("common.total"));
    downloadCsv(`${reportKey}-${fromDate}-to-${toDate}.csv`, csv);
  }

  function handleExportPdf() {
    // No PDF library in this project — the browser's own print dialog
    // ("Save as PDF") is the same mechanism every purchase document in this
    // app already relies on for its own print/PDF output (see
    // purchase-order-print.tsx and siblings). Preview first so what prints
    // is never a surprise.
    setPreviewOpen(true);
  }

  return (
    <div className="space-y-4">
      <PageHeader title={t("reports.title")} />

      <Card>
        <CardContent className="flex flex-wrap items-end gap-4 p-4">
          <div className="space-y-1">
            <Label>{t("reports.title")}</Label>
            <Select value={reportKey} onValueChange={(v) => handleReportKeyChange(v as ReportRequest["reportKey"])}>
              <SelectTrigger className="w-56">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {visibleReportOptions.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {t(opt.labelKey)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {sites.length > 1 && (
            <div className="space-y-1">
              <Label>{t("common.branch")}</Label>
              <Select value={branchId || "all"} onValueChange={(v) => setBranchId(v === "all" ? "" : v)}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("reports.allSites")}</SelectItem>
                  {sites.map((s) => (
                    <SelectItem key={s.siteID} value={s.siteID}>
                      {s.siteName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          {visibility.dateRange !== false && (
            <>
              <div className="space-y-1">
                <Label>{t("common.date")}</Label>
                <Input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label>&nbsp;</Label>
                <Input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
              </div>
            </>
          )}
          {visibility.item && (
            <div className="space-y-1">
              <Label>{t("reports.filterItem")}</Label>
              <Select value={itemCode || "all"} onValueChange={(v) => setItemCode(v === "all" ? "" : v)}>
                <SelectTrigger className="w-56">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("reports.allItems")}</SelectItem>
                  {stockItems.map((i) => (
                    <SelectItem key={i.code} value={i.code}>
                      {i.name} ({i.code})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          {visibility.customer && (
            <div className="space-y-1">
              <Label>{t("reports.filterCustomer")}</Label>
              <Select value={customerCode || "all"} onValueChange={(v) => setCustomerCode(v === "all" ? "" : v)}>
                <SelectTrigger className="w-44">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("reports.allCustomers")}</SelectItem>
                  {customers.map((c) => (
                    <SelectItem key={c.code} value={c.code}>
                      {c.custName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          {visibility.promotion && (
            <div className="space-y-1">
              <Label>{t("reports.filterPromotion")}</Label>
              <Select value={promotionCode || "all"} onValueChange={(v) => setPromotionCode(v === "all" ? "" : v)}>
                <SelectTrigger className="w-44">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("reports.allPromotions")}</SelectItem>
                  {promotions.map((p) => (
                    <SelectItem key={p.code} value={p.code}>
                      {p.promotionName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          {visibility.coupon && (
            <div className="space-y-1">
              <Label>{t("reports.filterCoupon")}</Label>
              <Select value={couponCode || "all"} onValueChange={(v) => setCouponCode(v === "all" ? "" : v)}>
                <SelectTrigger className="w-44">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("reports.allCoupons")}</SelectItem>
                  {coupons.map((c) => (
                    <SelectItem key={c.code} value={c.code}>
                      {c.couponName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          {visibility.voucher && (
            <div className="space-y-1">
              <Label>{t("reports.filterVoucher")}</Label>
              <Input
                className="w-40"
                placeholder="GV-000100"
                value={giftVoucherNo}
                onChange={(e) => setGiftVoucherNo(e.target.value)}
              />
            </div>
          )}
          {visibility.status && (
            <div className="space-y-1">
              <Label>{t("common.status")}</Label>
              <Select value={status || "all"} onValueChange={(v) => setStatus(v === "all" ? "" : v)}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("reports.allStatuses")}</SelectItem>
                  {visibility.status === "pos" && (
                    <>
                      <SelectItem value="Completed">{t("billLookup.statusCompleted")}</SelectItem>
                      <SelectItem value="Held">{t("billLookup.statusHeld")}</SelectItem>
                      <SelectItem value="Voided">{t("billLookup.statusVoided")}</SelectItem>
                      <SelectItem value="Returned">{t("billLookup.statusReturned")}</SelectItem>
                    </>
                  )}
                  {visibility.status === "coupon-active" && (
                    <>
                      <SelectItem value="ACTIVE">{t("common.active")}</SelectItem>
                      <SelectItem value="INACTIVE">{t("common.inactive")}</SelectItem>
                    </>
                  )}
                  {visibility.status === "gift-voucher" &&
                    GIFT_VOUCHER_STATUSES.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <Button onClick={() => generate.mutate()} disabled={generate.isPending || !compId}>
            {t("reports.generate")}
          </Button>
          {result && result.rows.length > 0 && (
            <>
              <Button variant="outline" onClick={() => setPreviewOpen(true)}>
                <Eye className="me-1 h-4 w-4" />
                {t("reports.preview")}
              </Button>
              <Button variant="outline" onClick={() => window.print()}>
                <Printer className="me-1 h-4 w-4" />
                {t("common.print")}
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline">
                    <Download className="me-1 h-4 w-4" />
                    {t("common.export")}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={handleExportCsv}>{t("reports.exportCsv")}</DropdownMenuItem>
                  <DropdownMenuItem onClick={handleExportPdf}>{t("reports.exportPdf")}</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          )}
        </CardContent>
      </Card>

      {result && result.rows.length === 0 && (
        <Card>
          <CardContent className="p-6 text-center text-sm text-muted-foreground">{t("reports.noData")}</CardContent>
        </Card>
      )}

      {result && result.rows.length > 0 && (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  {result.columns.map((col) => (
                    <TableHead key={col}>{columnLabel(t, col)}</TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {result.rows.map((row, idx) => (
                  <TableRow key={idx}>
                    {result.columns.map((col) => (
                      <TableCell key={col}>{row[col]}</TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
              {result.totals && (
                <TableFooter>
                  <TableRow>
                    {result.columns.map((col, i) => (
                      <TableCell key={col}>{i === 0 ? t("common.total") : (result.totals?.[col] ?? "")}</TableCell>
                    ))}
                  </TableRow>
                </TableFooter>
              )}
            </Table>
          </CardContent>
        </Card>
      )}

      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-6xl">
          <DialogHeader>
            <DialogTitle>{t("reports.preview")}</DialogTitle>
          </DialogHeader>
          <div className="max-h-[75vh] overflow-auto rounded-md border">
            {result && (
              <ReportPrint
                title={reportTitle}
                fromDate={fromDate}
                toDate={toDate}
                branchName={branchName}
                result={result}
                columnLabel={(col) => columnLabel(t, col)}
              />
            )}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setPreviewOpen(false)}>
              {t("common.close")}
            </Button>
            <Button type="button" onClick={() => window.print()}>
              <Printer className="me-1 h-4 w-4" />
              {t("common.print")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Print-only twin — globals.css's .doc-print-area hides it on screen
          and reveals only it on print, same mechanism every purchase
          document print component in this app already uses. Rendered
          whenever a report exists so both the page-level Print button and
          the Preview dialog's Print button target the same content.
          print-landscape switches the printed page to landscape (see
          globals.css) — reports can run to a dozen columns (Sales Report
          (Detailed)), which wrapped headers into each other and made the
          print output look nothing like the wide on-screen Preview when
          forced into a portrait page. */}
      {result && result.rows.length > 0 && (
        <div className="doc-print-area print-landscape">
          <ReportPrint
            title={reportTitle}
            fromDate={fromDate}
            toDate={toDate}
            branchName={branchName}
            result={result}
            columnLabel={(col) => columnLabel(t, col)}
          />
        </div>
      )}
    </div>
  );
}
