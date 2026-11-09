"use client";

import { useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Save, Wand2 } from "lucide-react";
import { glMasterService } from "@/lib/api/services/gl-master-service";
import { posPostingSetupService, type PosPostingSetting } from "@/lib/api/services/pos-posting-setup-service";
import { apiErrorMessage } from "@/lib/api-error";
import { useAuthStore } from "@/stores/auth-store";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";

const NONE = "__none__";

// Which side of the mapping each setting uses, and what the account is called on this screen. The cost of sales / inventory pair
// share one record: cost of sales is its debit side, inventory its credit side.
type Slot = { field: "debitGLCode" | "creditGLCode"; labelKey: string; accountTypes: number[] };
const SLOTS: Record<string, Slot[]> = {
  "POS-CASH": [{ field: "debitGLCode", labelKey: "slotCollection", accountTypes: [1, 2] }],
  "POS-CARD": [{ field: "debitGLCode", labelKey: "slotCollection", accountTypes: [1, 2] }],
  "POS-BENEFIT": [{ field: "debitGLCode", labelKey: "slotCollection", accountTypes: [1, 2] }],
  "POS-GIFTV": [{ field: "debitGLCode", labelKey: "slotCollection", accountTypes: [1, 2] }],
  "POS-OTHER": [{ field: "debitGLCode", labelKey: "slotCollection", accountTypes: [1, 2] }],
  "POS-BANK": [{ field: "debitGLCode", labelKey: "slotBank", accountTypes: [1] }],
  "POS-VAT": [{ field: "creditGLCode", labelKey: "slotLiability", accountTypes: [2] }],
  "POS-DISC": [{ field: "debitGLCode", labelKey: "slotExpense", accountTypes: [3, 4] }],
  "POS-ROUND": [{ field: "debitGLCode", labelKey: "slotExpense", accountTypes: [3, 4] }],
  "POS-OVSH": [{ field: "debitGLCode", labelKey: "slotExpense", accountTypes: [3, 4] }],
  "POS-SALES": [{ field: "creditGLCode", labelKey: "slotIncome", accountTypes: [3] }],
  "POS-GVSALE": [{ field: "creditGLCode", labelKey: "slotLiability", accountTypes: [2] }],
  "POS-COGS": [
    { field: "debitGLCode", labelKey: "slotCostOfSales", accountTypes: [4] },
    { field: "creditGLCode", labelKey: "slotInventory", accountTypes: [1] },
  ],
};

export default function PosPostingAccountsPage() {
  const t = useTranslations();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const compId = useAuthStore((s) => s.user?.compId ?? "");

  const { data: setup } = useQuery({
    queryKey: ["pos-posting-setup", compId],
    queryFn: () => posPostingSetupService.get(compId),
    enabled: !!compId,
  });
  const { data: accounts = [] } = useQuery({
    queryKey: ["gl-master", "pos-posting", compId],
    queryFn: async () => (await glMasterService.list()).items,
    enabled: !!compId,
    select: (all) => all.filter((a) => a.active),
  });

  const [draft, setDraft] = useState<PosPostingSetting[]>([]);
  useEffect(() => {
    if (setup) setDraft(setup.settings);
  }, [setup]);

  const options = (types: number[]) => [
    { value: NONE, label: "—" },
    ...accounts.filter((a) => types.includes(a.accountType)).map((a) => ({ value: a.code, label: `${a.code} — ${a.glName}` })),
  ];

  const dirty = useMemo(() => JSON.stringify(draft) !== JSON.stringify(setup?.settings ?? []), [draft, setup]);
  const missing = draft.filter((s) => (SLOTS[s.code] ?? []).some((slot) => !s[slot.field]));

  const saveMutation = useMutation({
    mutationFn: () => posPostingSetupService.save(compId, draft),
    onSuccess: () => {
      toast({ title: t("common.saveSuccess") });
      queryClient.invalidateQueries({ queryKey: ["pos-posting-setup"] });
    },
    onError: (err) => toast({ title: apiErrorMessage(err, t("common.errorGeneric")), variant: "destructive" }),
  });
  const defaultsMutation = useMutation({
    mutationFn: () => posPostingSetupService.fillDefaults(compId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["pos-posting-setup"] }),
    onError: (err) => toast({ title: apiErrorMessage(err, t("common.errorGeneric")), variant: "destructive" }),
  });

  function change(code: string, field: Slot["field"], value: string) {
    setDraft((rows) => rows.map((r) => (r.code === code ? { ...r, [field]: value === NONE ? null : value } : r)));
  }

  const name = (s: PosPostingSetting) => (t.has(`accounting.posting.${s.code}`) ? t(`accounting.posting.${s.code}`) : s.name);

  return (
    <div className="flex h-full flex-col gap-4">
      <PageHeader
        title={t("accounting.postingTitle")}
        description={t("accounting.postingIntro")}
        actions={
          setup?.canManage ? (
            <>
              <Button variant="outline" onClick={() => defaultsMutation.mutate()} disabled={defaultsMutation.isPending}>
                <Wand2 className="me-2 h-4 w-4" />
                {t("accounting.postingDefaults")}
              </Button>
              <Button onClick={() => saveMutation.mutate()} disabled={!dirty || saveMutation.isPending}>
                <Save className="me-2 h-4 w-4" />
                {t("common.save")}
              </Button>
            </>
          ) : undefined
        }
      />

      {setup && (
        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto">
          {missing.length > 0 && (
            <Card className="border-amber-500/50 bg-amber-50 p-3 text-sm dark:bg-amber-950/20">
              {t("accounting.postingMissing", { count: missing.length })}
            </Card>
          )}
          {!setup.canManage && <p className="text-sm text-muted-foreground">{t("accounting.adminOnly")}</p>}

          <div className="grid gap-3 md:grid-cols-2">
            {draft.map((s) => (
              <Card key={s.code} className="space-y-2 p-3">
                <p className="text-sm font-semibold">{name(s)}</p>
                {(SLOTS[s.code] ?? []).map((slot) => (
                  <div key={slot.field} className="space-y-1">
                    <Label className="text-xs text-muted-foreground">{t(`accounting.${slot.labelKey}`)}</Label>
                    <Select value={s[slot.field] ?? NONE} onValueChange={(v) => change(s.code, slot.field, v)} disabled={!setup.canManage}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {options(slot.accountTypes).map((o) => (
                          <SelectItem key={o.value} value={o.value}>
                            {o.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ))}
              </Card>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">{t("accounting.postingCategoryNote")}</p>
        </div>
      )}
    </div>
  );
}
