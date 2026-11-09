"use client";

import { useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useQuery } from "@tanstack/react-query";
import { trialBalanceService } from "@/lib/api/services/trial-balance-service";
import { GL_ACCOUNT_TYPES } from "@/types/gl-master";
import { useAuthStore } from "@/stores/auth-store";
import { useCurrencyStore } from "@/stores/currency-store";
import { PageHeader } from "@/components/shared/page-header";
import { DataGridWrapper } from "@/components/shared/data-grid-wrapper";
import { BranchSelect } from "@/components/accounting/branch-select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatMoney } from "@/lib/utils";
import type { TrialBalanceRow } from "@/types/trial-balance";

const accountTypeLabel = Object.fromEntries(GL_ACCOUNT_TYPES.map((t) => [t.value, t.label]));

function firstDayOfMonth() {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).toLocaleDateString("en-CA");
}

// A signed balance (debit positive) shown in the debit or the credit column.
const dr = (n: number) => (n > 0 ? n : 0);
const cr = (n: number) => (n < 0 ? -n : 0);

export default function TrialBalancePage() {
  const t = useTranslations();
  const locale = useLocale();
  const currency = useCurrencyStore((s) => s.currencyCode);
  const user = useAuthStore((s) => s.user);
  const compId = user?.compId ?? "";

  const [siteId, setSiteId] = useState("ALL");
  const [fromDate, setFromDate] = useState(firstDayOfMonth());
  const [toDate, setToDate] = useState(new Date().toLocaleDateString("en-CA"));

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["trial-balance", compId, siteId, fromDate, toDate],
    queryFn: () => trialBalanceService.get(compId, siteId, fromDate, toDate),
    enabled: !!compId,
  });

  const sum = (pick: (r: TrialBalanceRow) => number) => rows.reduce((total, r) => total + pick(r), 0);
  const totalDebit = sum((r) => r.debit);
  const totalCredit = sum((r) => r.credit);
  const closingDebit = sum((r) => dr(r.closingBalance));
  const closingCredit = sum((r) => cr(r.closingBalance));
  const isBalanced = Math.abs(totalDebit - totalCredit) < 0.001 && Math.abs(closingDebit - closingCredit) < 0.001;

  const dataWithId = useMemo(
    () =>
      rows.map((r) => ({
        ...r,
        id: r.glCode,
        openingDebit: dr(r.openingBalance),
        openingCredit: cr(r.openingBalance),
        closingDebit: dr(r.closingBalance),
        closingCredit: cr(r.closingBalance),
      })),
    [rows],
  );
  const money = (n: number) => <span>{n === 0 ? "" : formatMoney(n, currency, locale)}</span>;

  return (
    <div className="flex h-full flex-col gap-4">
      <PageHeader
        title={t("jv.trialBalance")}
        actions={
          <div className="flex items-end gap-2">
            <BranchSelect value={siteId} onChange={setSiteId} />
            <div className="flex flex-col gap-1">
              <Label className="text-xs">{t("accounting.from")}</Label>
              <Input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className="w-40" />
            </div>
            <div className="flex flex-col gap-1">
              <Label className="text-xs">{t("accounting.to")}</Label>
              <Input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} className="w-40" />
            </div>
          </div>
        }
      />

      <div className="min-h-0 flex-1">
        <DataGridWrapper<TrialBalanceRow & { id: string; openingDebit: number; openingCredit: number; closingDebit: number; closingCredit: number }>
          keyExpr="id"
          dataSource={dataWithId}
          loading={isLoading}
          columns={[
            { dataField: "glCode", captionKey: "gl.code", width: 100 },
            { dataField: "glName", captionKey: "gl.name" },
            { dataField: "glGroupName", captionKey: "gl.group" },
            {
              dataField: "accountType",
              captionKey: "gl.accountType",
              width: 110,
              cellRender: (cell) => <span>{accountTypeLabel[String(cell.data.accountType)] ?? ""}</span>,
            },
            {
              dataField: "openingDebit",
              captionKey: "accounting.openingDebit",
              dataType: "number",
              width: 130,
              cellRender: (cell) => money(Number(cell.data.openingDebit)),
            },
            {
              dataField: "openingCredit",
              captionKey: "accounting.openingCredit",
              dataType: "number",
              width: 130,
              cellRender: (cell) => money(Number(cell.data.openingCredit)),
            },
            {
              dataField: "debit",
              captionKey: "jv.totalDebit",
              dataType: "number",
              width: 130,
              cellRender: (cell) => money(Number(cell.data.debit)),
            },
            {
              dataField: "credit",
              captionKey: "jv.totalCredit",
              dataType: "number",
              width: 130,
              cellRender: (cell) => money(Number(cell.data.credit)),
            },
            {
              dataField: "closingDebit",
              captionKey: "accounting.closingDebit",
              dataType: "number",
              width: 130,
              cellRender: (cell) => money(Number(cell.data.closingDebit)),
            },
            {
              dataField: "closingCredit",
              captionKey: "accounting.closingCredit",
              dataType: "number",
              width: 130,
              cellRender: (cell) => money(Number(cell.data.closingCredit)),
            },
          ]}
        />
      </div>

      <div className="flex flex-wrap items-center justify-end gap-x-6 gap-y-1 border-t pt-3 text-sm font-medium">
        <span>
          {t("jv.totalDebit")}: {formatMoney(totalDebit, currency, locale)}
        </span>
        <span>
          {t("jv.totalCredit")}: {formatMoney(totalCredit, currency, locale)}
        </span>
        <span>
          {t("accounting.closingDebit")}: {formatMoney(closingDebit, currency, locale)}
        </span>
        <span>
          {t("accounting.closingCredit")}: {formatMoney(closingCredit, currency, locale)}
        </span>
        <span className={isBalanced ? "text-green-600" : "text-destructive"}>
          {isBalanced ? t("jv.balanced") : t("jv.unbalanced")}
        </span>
      </div>
    </div>
  );
}
