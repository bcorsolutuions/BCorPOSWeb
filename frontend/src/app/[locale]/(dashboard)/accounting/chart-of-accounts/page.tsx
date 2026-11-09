"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, ListPlus, RotateCcw, Users } from "lucide-react";
import { chartOfAccountsService, partyGlAccountsService } from "@/lib/api/services/financial-statements-service";
import { apiErrorMessage } from "@/lib/api-error";
import { useAuthStore } from "@/stores/auth-store";
import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/shared/page-header";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";
import type { ChartTemplateInfo } from "@/types/financial-statements";

export default function ChartOfAccountsPage() {
  const t = useTranslations();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const compId = useAuthStore((s) => s.user?.compId ?? "");

  const [selected, setSelected] = useState<ChartTemplateInfo["code"] | null>(null);
  const [confirm, setConfirm] = useState<"merge" | "replace" | null>(null);

  const { data: status } = useQuery({
    queryKey: ["chart-of-accounts-status", compId],
    queryFn: () => chartOfAccountsService.status(compId),
    enabled: !!compId,
  });

  const { data: party } = useQuery({
    queryKey: ["party-gl-status", compId],
    queryFn: () => partyGlAccountsService.status(compId),
    enabled: !!compId,
  });
  const partyMutation = useMutation({
    mutationFn: () => partyGlAccountsService.sync(compId),
    onSuccess: (r) => {
      toast({ title: t("accounting.partyDone", { customers: r.customersLinked, suppliers: r.vendorsLinked }) });
      if (r.codeInUse > 0) toast({ title: t("accounting.partyNoCode", { count: r.codeInUse }), variant: "destructive" });
      for (const key of ["party-gl-status", "chart-of-accounts-status", "gl-master", "gl-group-master"])
        queryClient.invalidateQueries({ queryKey: [key] });
    },
    onError: (err) => toast({ title: apiErrorMessage(err, t("common.errorGeneric")), variant: "destructive" }),
  });

  // Start on the chart that fits the company's business.
  useEffect(() => {
    if (status && !selected) setSelected(status.detectedTemplate);
  }, [status, selected]);

  const applyMutation = useMutation({
    mutationFn: (mode: "merge" | "replace") => chartOfAccountsService.apply(compId, selected!, mode),
    onSuccess: (result) => {
      toast({ title: t("accounting.applied", { accounts: result.accountsAdded, groups: result.groupsAdded }) });
      if (result.codeConflicts > 0) toast({ title: t("accounting.codeConflicts", { count: result.codeConflicts }), variant: "destructive" });
      setConfirm(null);
      for (const key of ["chart-of-accounts-status", "profit-loss", "balance-sheet", "trial-balance"])
        queryClient.invalidateQueries({ queryKey: [key] });
    },
    onError: (err) => {
      setConfirm(null);
      toast({ title: apiErrorMessage(err, t("common.errorGeneric")), variant: "destructive" });
    },
  });

  const templateName = (code: string, fallback: string) => (t.has(`accounting.templates.${code}.name`) ? t(`accounting.templates.${code}.name`) : fallback);
  const chosen = status?.templates.find((x) => x.code === selected);
  const hasChart = (status?.accounts ?? 0) > 0;

  return (
    <div className="flex h-full flex-col gap-4">
      <PageHeader title={t("accounting.chartTitle")} description={t("accounting.chartIntro")} />

      {status && (
        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto">
          <Card className="flex flex-wrap items-center gap-x-6 gap-y-1 p-4 text-sm">
            <span className="font-medium">{t("accounting.currentChart")}:</span>
            {hasChart ? (
              <>
                <span>{t("accounting.groupsCount", { count: status.groups })}</span>
                <span>{t("accounting.accountsCount", { count: status.accounts })}</span>
                <span>{t("accounting.journalLines", { count: status.journalLines })}</span>
              </>
            ) : (
              <span className="text-muted-foreground">{t("accounting.noChart")}</span>
            )}
          </Card>

          <div className="grid gap-3 md:grid-cols-2">
            {status.templates.map((tpl) => {
              const active = tpl.code === selected;
              return (
                <button
                  key={tpl.code}
                  type="button"
                  onClick={() => setSelected(tpl.code)}
                  className={cn(
                    "rounded-lg border p-4 text-start transition-colors hover:border-primary",
                    active && "border-primary bg-primary/5 ring-1 ring-primary",
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-semibold">{templateName(tpl.code, tpl.name)}</h3>
                    <div className="flex items-center gap-1">
                      {tpl.code === status.detectedTemplate && <Badge variant="secondary">{t("accounting.yourBusiness")}</Badge>}
                      {active && <CheckCircle2 className="h-4 w-4 text-primary" />}
                    </div>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {t.has(`accounting.templates.${tpl.code}.description`) ? t(`accounting.templates.${tpl.code}.description`) : tpl.description}
                  </p>
                  <p className="mt-2 text-xs text-muted-foreground">
                    {t("accounting.groupsCount", { count: tpl.groups })} · {t("accounting.accountsCount", { count: tpl.accounts })}
                  </p>
                  <p className="mt-2 text-xs">
                    <span className="font-medium">{t("accounting.includes")}: </span>
                    {tpl.sample.join(", ")}
                  </p>
                </button>
              );
            })}
          </div>

          {!status.canManage ? (
            <p className="text-sm text-muted-foreground">{t("accounting.adminOnly")}</p>
          ) : (
            <div className="space-y-2">
              <div className="flex flex-wrap gap-2">
                <Button onClick={() => setConfirm("merge")} disabled={!selected || applyMutation.isPending}>
                  <ListPlus className="me-2 h-4 w-4" />
                  {t("accounting.addMissing")}
                </Button>
                <Button
                  variant="outline"
                  className="border-destructive text-destructive hover:bg-destructive/10"
                  onClick={() => setConfirm("replace")}
                  disabled={!selected || !status.canReplace || applyMutation.isPending}
                >
                  <RotateCcw className="me-2 h-4 w-4" />
                  {t("accounting.resetChart")}
                </Button>
              </div>
              {!status.canReplace && <p className="text-sm text-muted-foreground">{t("accounting.resetBlocked")}</p>}
            </div>
          )}

          {party?.chartReady && (
            <Card className="space-y-2 p-4">
              <h3 className="flex items-center gap-2 font-semibold">
                <Users className="h-4 w-4" />
                {t("accounting.partyTitle")}
              </h3>
              <p className="text-sm text-muted-foreground">{t("accounting.partyIntro")}</p>
              {party.customersWithoutAccount + party.suppliersWithoutAccount > 0 ? (
                <p className="text-sm">
                  {t("accounting.partyPending", { customers: party.customersWithoutAccount, suppliers: party.suppliersWithoutAccount })}
                </p>
              ) : (
                <p className="text-sm text-muted-foreground">{t("accounting.partyAllDone")}</p>
              )}
              {party.canManage && party.customersWithoutAccount + party.suppliersWithoutAccount > 0 && (
                <Button variant="outline" onClick={() => partyMutation.mutate()} disabled={partyMutation.isPending}>
                  {t("accounting.partyCreate")}
                </Button>
              )}
            </Card>
          )}
        </div>
      )}

      <ConfirmDialog
        open={confirm !== null}
        onOpenChange={(open) => !open && setConfirm(null)}
        title={confirm === "replace" ? t("accounting.confirmResetTitle") : t("accounting.confirmAddTitle")}
        description={(confirm === "replace" ? t("accounting.confirmResetBody", { name: chosen ? templateName(chosen.code, chosen.name) : "" }) : t("accounting.confirmAddBody", { name: chosen ? templateName(chosen.code, chosen.name) : "" }))}
        confirmLabel={confirm === "replace" ? t("accounting.resetChart") : t("accounting.addMissing")}
        destructive={confirm === "replace"}
        loading={applyMutation.isPending}
        onConfirm={() => confirm && applyMutation.mutate(confirm)}
      />
    </div>
  );
}
