"use client";

import { Fragment, useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useQuery } from "@tanstack/react-query";
import { ChevronDown, ChevronRight, ChevronsDownUp, ChevronsUpDown, Printer } from "lucide-react";
import { partyAgingService, type PartyAgingKind } from "@/lib/api/services/party-aging-service";
import { apiErrorMessage } from "@/lib/api-error";
import { useAuthStore } from "@/stores/auth-store";
import { useCurrencyStore } from "@/stores/currency-store";
import { PageHeader } from "@/components/shared/page-header";
import { BranchSelect } from "@/components/accounting/branch-select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { cn, formatMoney } from "@/lib/utils";

/**
 * Accounts receivable (customers) / accounts payable (suppliers): who owes what at a date, aged from the bill date.
 * One row per customer / supplier with its outstanding in 0-30 / 31-60 / 61-90 / over 90 days; open a row to see its bills.
 * "No bill" = entries on the account that carry no bill reference (made before bill-wise entry).
 */
export function PartyAgingReport({ kind }: { kind: PartyAgingKind }) {
  const t = useTranslations();
  const locale = useLocale();
  const currency = useCurrencyStore((s) => s.currencyCode);
  const compId = useAuthStore((s) => s.user?.compId ?? "");
  const receivable = kind === "receivable";

  const [siteId, setSiteId] = useState("ALL");
  const [asOf, setAsOf] = useState(new Date().toLocaleDateString("en-CA"));
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState<Set<string>>(new Set());

  const { data, isLoading, error } = useQuery({
    queryKey: ["party-aging", compId, kind, siteId, asOf],
    queryFn: () => partyAgingService.get(compId, kind, siteId, asOf),
    enabled: !!compId && !!asOf,
  });

  const parties = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (data?.parties ?? []).filter((p) => !q || p.name.toLowerCase().includes(q) || p.code.toLowerCase().includes(q));
  }, [data, search]);

  const sum = (pick: (p: (typeof parties)[number]) => number) => parties.reduce((total, p) => total + pick(p), 0);
  const money = (n: number) => (Math.abs(n) < 0.0005 ? "" : formatMoney(n, currency, locale));
  const title = t(receivable ? "accounting.receivableTitle" : "accounting.payableTitle");
  const partyWord = t(receivable ? "accounting.customer" : "accounting.supplier");

  function toggle(code: string) {
    setOpen((prev) => {
      const next = new Set(prev);
      if (!next.delete(code)) next.add(code);
      return next;
    });
  }

  const num = "text-end tabular-nums";

  return (
    <div className="flex h-full flex-col gap-4">
      <PageHeader
        title={title}
        description={t(receivable ? "accounting.receivableIntro" : "accounting.payableIntro")}
        actions={
          <div className="flex flex-wrap items-end gap-2 print:hidden">
            <BranchSelect value={siteId} onChange={setSiteId} />
            <div className="flex flex-col gap-1">
              <Label className="text-xs">{t("accounting.asOf")}</Label>
              <Input type="date" value={asOf} onChange={(e) => setAsOf(e.target.value)} className="w-40" />
            </div>
            <Button variant="outline" onClick={() => window.print()} disabled={!data}>
              <Printer className="me-2 h-4 w-4" />
              {t("accounting.print")}
            </Button>
          </div>
        }
      />

      <div className="flex flex-wrap items-center gap-2 print:hidden">
        <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t("common.search")} className="w-64" />
        <Button variant="outline" size="sm" onClick={() => setOpen(new Set(parties.filter((p) => p.bills.length > 0).map((p) => p.code)))}>
          <ChevronsUpDown className="me-2 h-4 w-4" />
          {t("gl.expandAll")}
        </Button>
        <Button variant="outline" size="sm" onClick={() => setOpen(new Set())}>
          <ChevronsDownUp className="me-2 h-4 w-4" />
          {t("gl.collapseAll")}
        </Button>
      </div>

      <div className="min-h-0 flex-1 overflow-auto">
        {isLoading ? (
          <Skeleton className="h-64 w-full" />
        ) : error ? (
          <p className="text-sm text-destructive">{apiErrorMessage(error, t("common.errorGeneric"))}</p>
        ) : (
          <div className="statement-print-area space-y-3 rounded-md border bg-card p-4">
            <div className="text-center">
              <h2 className="text-lg font-semibold">{title}</h2>
              <p className="text-sm text-muted-foreground">
                {t("accounting.asOf")} {asOf}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
              <div>
                <p className="text-xs text-muted-foreground">{t(receivable ? "accounting.totalReceivable" : "accounting.totalPayable")}</p>
                <p className="text-base font-semibold tabular-nums">{formatMoney(sum((p) => p.total), currency, locale)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{t(receivable ? "accounting.customers" : "accounting.suppliers")}</p>
                <p className="text-base font-semibold tabular-nums">{parties.length}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{t("accounting.openBills")}</p>
                <p className="text-base font-semibold tabular-nums">{parties.reduce((n, p) => n + p.bills.length, 0)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{t("accounting.over90")}</p>
                <p className="text-base font-semibold tabular-nums">{formatMoney(sum((p) => p.over90), currency, locale)}</p>
              </div>
            </div>

            {parties.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">{t(receivable ? "accounting.noReceivables" : "accounting.noPayables")}</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-xs text-muted-foreground">
                    <th className="w-8 py-2" />
                    <th className="py-2 text-start">{t("common.code")}</th>
                    <th className="py-2 text-start">{partyWord}</th>
                    <th className={cn("py-2", num)}>{t("accounting.days0to30")}</th>
                    <th className={cn("py-2", num)}>{t("accounting.days31to60")}</th>
                    <th className={cn("py-2", num)}>{t("accounting.days61to90")}</th>
                    <th className={cn("py-2", num)}>{t("accounting.over90")}</th>
                    <th className={cn("py-2", num)}>{t("accounting.noBill")}</th>
                    <th className={cn("py-2 font-semibold", num)}>{t("common.total")}</th>
                  </tr>
                </thead>
                <tbody>
                  {parties.map((p) => {
                    const isOpen = open.has(p.code);
                    return (
                      <Fragment key={p.code}>
                        <tr
                          className={cn("border-b hover:bg-muted/40", p.bills.length > 0 && "cursor-pointer")}
                          onClick={() => p.bills.length > 0 && toggle(p.code)}
                        >
                          <td className="py-1.5 text-muted-foreground print:hidden">
                            {p.bills.length > 0 && (isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4 rtl:rotate-180" />)}
                          </td>
                          <td className="py-1.5 tabular-nums text-muted-foreground">{p.code}</td>
                          <td className="py-1.5 font-medium">{p.name}</td>
                          <td className={cn("py-1.5", num)}>{money(p.days0To30)}</td>
                          <td className={cn("py-1.5", num)}>{money(p.days31To60)}</td>
                          <td className={cn("py-1.5", num)}>{money(p.days61To90)}</td>
                          <td className={cn("py-1.5", num, p.over90 > 0 && "text-destructive")}>{money(p.over90)}</td>
                          <td className={cn("py-1.5", num)}>{money(p.noBill)}</td>
                          <td className={cn("py-1.5 font-semibold", num)}>{formatMoney(p.total, currency, locale)}</td>
                        </tr>
                        {isOpen &&
                          p.bills.map((b) => (
                            <tr key={`${p.code}-${b.billRef}`} className="border-b bg-muted/20 text-xs">
                              <td />
                              <td />
                              <td className="py-1 ps-4">
                                {b.billRef} <span className="text-muted-foreground">· {b.billDate.slice(0, 10)}</span>
                              </td>
                              <td colSpan={4} className="py-1 text-muted-foreground">
                                {t("accounting.billAge", { days: b.ageDays })} · {t("accounting.billAmount")} {formatMoney(b.amount, currency, locale)}
                              </td>
                              <td />
                              <td className={cn("py-1", num)}>{formatMoney(b.outstanding, currency, locale)}</td>
                            </tr>
                          ))}
                      </Fragment>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 font-semibold">
                    <td />
                    <td />
                    <td className="py-2">{t("common.total")}</td>
                    <td className={cn("py-2", num)}>{money(sum((p) => p.days0To30))}</td>
                    <td className={cn("py-2", num)}>{money(sum((p) => p.days31To60))}</td>
                    <td className={cn("py-2", num)}>{money(sum((p) => p.days61To90))}</td>
                    <td className={cn("py-2", num)}>{money(sum((p) => p.over90))}</td>
                    <td className={cn("py-2", num)}>{money(sum((p) => p.noBill))}</td>
                    <td className={cn("py-2", num)}>{formatMoney(sum((p) => p.total), currency, locale)}</td>
                  </tr>
                </tfoot>
              </table>
            )}
            <p className="text-xs text-muted-foreground">{t("accounting.agingNote")}</p>
          </div>
        )}
      </div>
    </div>
  );
}
