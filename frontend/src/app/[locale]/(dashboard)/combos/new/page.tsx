"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { comboMasterService } from "@/lib/api/services/combo-master-service";
import { useComboFields } from "@/hooks/use-combo-fields";
import { ComboDetailEditor } from "@/components/masters/combo-detail-editor";
import { comboSchema, type ComboFormValues } from "@/schemas/combo-master.schema";
import { PageHeader } from "@/components/shared/page-header";
import { Form } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { EntityFormField } from "@/components/shared/entity-form-field";
import { useToast } from "@/components/ui/use-toast";
import { enterMovesToNextField } from "@/lib/prevent-enter-submit";

const DEFAULT_VALUES: ComboFormValues = {
  code: "",
  siteId: "",
  comboName: "",
  comboNameArb: "",
  menuCode: "",
  categoryCode: "",
  sellingPrice: 0,
  taxCode: "",
  taxPercent: undefined,
  validFrom: "",
  validTo: "",
  allowDiscount: true,
  allowItemSubstitution: false,
  remarks: "",
  active: true,
  details: [],
};

/** Standalone create page — /combos still owns edit (row-click opens its existing dialog); this page only ever creates. Reuses the exact same fields/schema/detail-editor as the list page's dialog. */
export default function NewComboPage() {
  const t = useTranslations();
  const router = useRouter();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const fields = useComboFields();

  const form = useForm<ComboFormValues>({
    resolver: zodResolver(comboSchema),
    defaultValues: DEFAULT_VALUES,
  });

  const saveMutation = useMutation({
    mutationFn: (values: ComboFormValues) => comboMasterService.create(values),
    onSuccess: () => {
      toast({ title: t("common.saveSuccess") });
      queryClient.invalidateQueries({ queryKey: ["combo-master"] });
      router.push("/combos");
    },
    onError: (err: unknown) => {
      const message = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast({ title: message || t("common.errorGeneric"), variant: "destructive" });
    },
  });

  return (
    <div className="flex h-full flex-col gap-4 overflow-y-auto p-4">
      <PageHeader title={t("combo.comboMaster")} />
      <Form {...form}>
        <form onKeyDown={enterMovesToNextField} className="max-w-2xl space-y-4" onSubmit={form.handleSubmit((values) => saveMutation.mutate(values))}>
          {fields
            .filter((field) => field.name !== "active")
            .map((field) => (
              <EntityFormField key={String(field.name)} control={form.control} field={field} />
            ))}
          <ComboDetailEditor form={form} />
          {/* Active is always the last field on a master form. */}
          {fields
            .filter((field) => field.name === "active")
            .map((field) => (
              <EntityFormField key={String(field.name)} control={form.control} field={field} />
            ))}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => router.push("/combos")}>
              {t("common.cancel")}
            </Button>
            <Button type="submit" disabled={saveMutation.isPending}>
              {t("common.save")}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
