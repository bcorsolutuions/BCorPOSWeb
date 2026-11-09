"use client";

import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useQuery } from "@tanstack/react-query";
import { generalLedgerService } from "@/lib/api/services/general-ledger-service";
import { glMasterService } from "@/lib/api/services/gl-master-service";
import { posLookupService } from "@/lib/api/services/pos-lookup-service";
import { useAuthStore } from "@/stores/auth-store";
import { useCurrencyStore } from "@/stores/currency-store";
import { PageHeader } from "@/components/shared/page-header";
import { DataGridWrapper } from "@/components/shared/data-grid-wrapper";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatMoney } from "@/lib/utils";
import type { GeneralLedgerRow } from "@/types/general-ledger";

function firstDayOfMonth() {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10);
}

export default function GeneralLedgerPage() {
  const t = useTranslations();
  const locale = useLocale();
  const currency = useCurrencyStore((s) => s.currencyCode);
  const user = useAuthStore((s) => s.user);
  const compId = user?.compId ?? "";

  const [siteId, setSiteId] = useState("ALL");
  const [glCode, setGlCode] = useState("");
  const [fromDate, setFromDate] = useState(firstDayOfMonth());
  const [toDate, setToDate] = useState(new Date().toISOString().slice(0, 10));

  const { data: sites = [] } = useQuery({
    queryKey: ["sites-lookup", compId],
    queryFn: () => posLookupService.getSites(compId),
    enabled: !!compId,
  });
  const { data: glAccounts } = useQuery({ queryKey: ["gl-master"], queryFn: () => glMasterService.list() });
  const glOptions = glAccounts?.items ?? [];
  useEffect(() => {
    if (!glCode && glOptions[0]) setGlCode(glOptions[0].code);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [glOptions]);

  const { data: ledger, isLoading } = useQuery({
    queryKey: ["general-ledger", compId, siteId, glCode, fromDate, toDate],
    queryFn: () => generalLedgerService.get(compId, siteId, glCode, fromDate, toDate),
    enabled: !!compId && !!siteId && !!glCode,
  });

  const rowsWithId = (ledger?.rows ?? []).map((r, i) => ({ ...r, id: `${r.docCd}-${r.siteID}-${r.docNo}-${i}` }));
  const totalDebit = (ledger?.rows ?? []).reduce((sum, r) => sum + r.debit, 0);
  const totalCredit = (ledger?.rows ?? []).reduce((sum, r) => sum + r.credit, 0);

  return (
    <div className="flex h-full flex-col gap-4">
      <PageHeader
        title={t("jv.generalLedger")}
        actions={
          <div className="flex flex-wrap items-end gap-2">
            <div className="flex flex-col gap-1">
              <Label className="text-xs">{t("common.branch")}</Label>
              <Select value={siteId} onValueChange={setSiteId}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder={t("pos.setupSite")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">{t("gl.allBranches")}</SelectItem>
                  {sites.map((s) => (
                    <SelectItem key={s.siteID} value={s.siteID}>
                      {s.siteName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1">
              <Label className="text-xs">{t("gl.account")}</Label>
              <Select value={glCode} onValueChange={setGlCode}>
                <SelectTrigger className="w-56">
                  <SelectValue placeholder={t("gl.account")} />
                </SelectTrigger>
                <SelectContent>
                  {glOptions.map((g) => (
                    <SelectItem key={g.code} value={g.code}>
                      {g.code} - {g.glName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1">
              <Label className="text-xs">{t("reports.dateRange")}</Label>
              <Input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className="w-40" />
            </div>
            <div className="flex flex-col gap-1">
              <Label className="text-xs">&nbsp;</Label>
              <Input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} className="w-40" />
            </div>
          </div>
        }
      />

      {ledger && (
        <div className="flex items-center justify-between rounded-md border bg-muted/40 px-3 py-2 text-sm">
          <span className="font-medium">
            {ledger.glCode} - {ledger.glName}
          </span>
          <span>
            {t("gl.openingBalance")}: <span className="font-medium tabular-nums">{formatMoney(ledger.openingBalance, currency, locale)}</span>
          </span>
        </div>
      )}

      <div className="min-h-0 flex-1">
        <DataGridWrapper<GeneralLedgerRow & { id: string }>
          keyExpr="id"
          dataSource={rowsWithId}
          loading={isLoading}
          columns={[
            { dataField: "docDt", captionKey: "common.date", dataType: "date", width: 110 },
            { dataField: "source", captionKey: "gl.sourceDoc", width: 150 },
            { dataField: "jvRef", captionKey: "jv.reference", width: 140 },
            { dataField: "narration", captionKey: "jv.narration" },
            { dataField: "remarks", captionKey: "gl.remarks", width: 200 },
            { dataField: "billRef", captionKey: "jv.billRef", width: 140 },
            {
              dataField: "debit",
              captionKey: "jv.debit",
              dataType: "number",
              width: 120,
              cellRender: (cell) => <span>{formatMoney(Number(cell.data.debit), currency, locale)}</span>,
            },
            {
              dataField: "credit",
              captionKey: "jv.credit",
              dataType: "number",
              width: 120,
              cellRender: (cell) => <span>{formatMoney(Number(cell.data.credit), currency, locale)}</span>,
            },
            {
              dataField: "balance",
              captionKey: "gl.runningBalance",
              dataType: "number",
              width: 130,
              cellRender: (cell) => <span>{formatMoney(Number(cell.data.balance), currency, locale)}</span>,
            },
          ]}
        />
      </div>

      <div className="flex items-center justify-end gap-6 border-t pt-3 text-sm font-medium">
        <span>
          {t("jv.totalDebit")}: {formatMoney(totalDebit, currency, locale)}
        </span>
        <span>
          {t("jv.totalCredit")}: {formatMoney(totalCredit, currency, locale)}
        </span>
        <span>
          {t("gl.closingBalance")}: {formatMoney(ledger?.closingBalance ?? 0, currency, locale)}
        </span>
      </div>
    </div>
  );
}
