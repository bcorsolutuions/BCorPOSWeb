"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useQuery } from "@tanstack/react-query";
import { Printer } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { financialStatementsService } from "@/lib/api/services/financial-statements-service";
import { useAuthStore } from "@/stores/auth-store";
import { useCurrencyStore } from "@/stores/currency-store";
import { formatMoney } from "@/lib/utils";
import { PageHeader } from "@/components/shared/page-header";
import { BranchSelect } from "@/components/accounting/branch-select";
import { StatementSectionBlock, StatementTotal } from "@/components/accounting/statement-parts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { StatementSection } from "@/types/financial-statements";

export default function BalanceSheetPage() {
  const t = useTranslations();
  const locale = useLocale();
  const currency = useCurrencyStore((s) => s.currencyCode);
  const compId = useAuthStore((s) => s.user?.compId ?? "");
  const [siteId, setSiteId] = useState("ALL");
  const [asOfDate, setAsOfDate] = useState(new Date().toLocaleDateString("en-CA"));

  const { data, isLoading } = useQuery({
    queryKey: ["balance-sheet", compId, siteId, asOfDate],
    queryFn: () => financialStatementsService.balanceSheet(compId, asOfDate, siteId),
    enabled: !!compId && !!asOfDate,
  });

  const section = (key: StatementSection["key"]) => data?.sections.find((s) => s.key === key);
  const isEmpty = !!data && data.sections.every((s) => s.groups.length === 0);
  const block = (key: StatementSection["key"], totalLabelKey: string) => {
    const s = section(key);
    return s ? <StatementSectionBlock section={s} title={t(`accounting.sections.${key}`)} totalLabel={t(totalLabelKey)} /> : null;
  };

  return (
    <div className="flex h-full flex-col gap-4">
      <PageHeader
        title={t("accounting.balanceSheetTitle")}
        actions={
          <div className="flex flex-wrap items-end gap-2">
            <BranchSelect value={siteId} onChange={setSiteId} />
            <div className="flex flex-col gap-1">
              <Label className="text-xs">{t("accounting.asOf")}</Label>
              <Input type="date" value={asOfDate} onChange={(e) => setAsOfDate(e.target.value)} className="w-40" />
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
            <h2 className="text-lg font-semibold">{t("accounting.balanceSheetTitle")}</h2>
            <p className="text-sm text-muted-foreground">
              {t("accounting.asOf")} {asOfDate}
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
              {block("assets", "accounting.totalAssets")}
              {block("liabilities", "accounting.totalLiabilities")}
              {block("equity", "accounting.totalEquity")}
              <StatementTotal label={t("accounting.totalLiabilitiesEquity")} value={data.totalLiabilitiesAndEquity} emphasis />
              <p className={data.isBalanced ? "text-center text-sm text-green-600" : "text-center text-sm font-medium text-destructive"}>
                {data.isBalanced
                  ? t("accounting.balanced")
                  : t("accounting.outOfBalance", { amount: formatMoney(Math.abs(data.difference), currency, locale) })}
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
