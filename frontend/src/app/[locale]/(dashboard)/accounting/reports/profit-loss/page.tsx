"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useQuery } from "@tanstack/react-query";
import { Printer } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { financialStatementsService } from "@/lib/api/services/financial-statements-service";
import { useAuthStore } from "@/stores/auth-store";
import { PageHeader } from "@/components/shared/page-header";
import { BranchSelect } from "@/components/accounting/branch-select";
import { StatementSectionBlock, StatementTotal } from "@/components/accounting/statement-parts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { StatementSection } from "@/types/financial-statements";

function firstDayOfMonth() {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).toLocaleDateString("en-CA");
}

export default function ProfitLossPage() {
  const t = useTranslations();
  const compId = useAuthStore((s) => s.user?.compId ?? "");
  const [siteId, setSiteId] = useState("ALL");
  const [fromDate, setFromDate] = useState(firstDayOfMonth());
  const [toDate, setToDate] = useState(new Date().toLocaleDateString("en-CA"));

  const { data, isLoading } = useQuery({
    queryKey: ["profit-loss", compId, siteId, fromDate, toDate],
    queryFn: () => financialStatementsService.profitLoss(compId, fromDate, toDate, siteId),
    enabled: !!compId && !!fromDate && !!toDate,
  });

  const section = (key: StatementSection["key"]) => data?.sections.find((s) => s.key === key);
  const isEmpty = !!data && data.sections.every((s) => s.groups.length === 0);
  const block = (key: StatementSection["key"]) => {
    const s = section(key);
    // Optional sections stay out of the statement when they have nothing in them.
    if (!s || (s.groups.length === 0 && (key === "otherIncome" || key === "financeCharges"))) return null;
    return <StatementSectionBlock section={s} title={t(`accounting.sections.${key}`)} />;
  };

  return (
    <div className="flex h-full flex-col gap-4">
      <PageHeader
        title={t("accounting.profitLossTitle")}
        actions={
          <div className="flex flex-wrap items-end gap-2">
            <BranchSelect value={siteId} onChange={setSiteId} />
            <div className="flex flex-col gap-1">
              <Label className="text-xs">{t("accounting.from")}</Label>
              <Input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className="w-40" />
            </div>
            <div className="flex flex-col gap-1">
              <Label className="text-xs">{t("accounting.to")}</Label>
              <Input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} className="w-40" />
            </div>
            <Button variant="outline" onClick={() => window.print()} disabled={!data}>
              <Printer className="me-2 h-4 w-4" />
              {t("accounting.print")}
            </Button>
          </div>
        }
      />

      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="statement-print-area mx-auto w-full max-w-3xl space-y-4 rounded-md border bg-card p-4">
          <div className="text-center">
            <h2 className="text-lg font-semibold">{t("accounting.profitLossTitle")}</h2>
            <p className="text-sm text-muted-foreground">
              {fromDate} — {toDate}
            </p>
          </div>

          {isLoading && <p className="py-8 text-center text-sm text-muted-foreground">{t("common.loading")}</p>}

          {isEmpty && (
            <div className="space-y-2 py-8 text-center text-sm text-muted-foreground">
              <p>{t("accounting.noEntries")}</p>
              <Link href="/accounting/chart-of-accounts" className="text-primary underline print:hidden">
                {t("accounting.setUpChart")}
              </Link>
            </div>
          )}

          {data && !isEmpty && (
            <>
              {block("revenue")}
              {block("costOfSales")}
              <StatementTotal label={t("accounting.grossProfit")} value={data.grossProfit} negativeIsBad />
              {block("otherIncome")}
              {block("expenses")}
              {block("financeCharges")}
              <StatementTotal label={t("accounting.netProfit")} value={data.netProfit} emphasis negativeIsBad />
            </>
          )}
        </div>
      </div>
    </div>
  );
}
