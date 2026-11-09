"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { promotionMasterService } from "@/lib/api/services/promotion-master-service";
import { usePromotionFields } from "@/hooks/use-promotion-fields";
import { promotionSchema, type PromotionFormValues } from "@/schemas/salon-master.schema";
import { PromotionDetailEditor } from "@/components/masters/promotion-detail-editor";
import { PageHeader } from "@/components/shared/page-header";
import { Form } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { EntityFormField } from "@/components/shared/entity-form-field";
import { useToast } from "@/components/ui/use-toast";
import { enterMovesToNextField } from "@/lib/prevent-enter-submit";

const DEFAULT_VALUES: PromotionFormValues = {
  code: "",
  siteId: "",
  promotionName: "",
  promotionNameArb: "",
  promotionType: "PERCENTAGE",
  validFrom: new Date().toISOString().slice(0, 10),
  validTo: new Date().toISOString().slice(0, 10),
  startTime: "",
  endTime: "",
  minimumBillAmount: 0,
  minimumQty: 0,
  discountPercent: undefined,
  discountAmount: undefined,
  maximumDiscountAmount: undefined,
  buyQty: undefined,
  getQty: undefined,
  freeItemCode: "",
  customerCategoryCode: "",
  priorityNo: 0,
  allowWithOtherPromo: false,
  autoApply: false,
  couponRequired: false,
  couponCode: "",
  remarks: "",
  active: true,
  details: [],
};

/** Standalone create page — /promotions still owns edit (row-click opens its existing dialog); this page only ever creates. Reuses the exact same fields/schema/detail-editor as the list page's dialog (usePromotionFields, promotionSchema, PromotionDetailEditor) so the two never drift apart. */
export default function NewPromotionPage() {
  const t = useTranslations();
  const router = useRouter();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const fields = usePromotionFields();

  const form = useForm<PromotionFormValues>({
    resolver: zodResolver(promotionSchema),
    defaultValues: DEFAULT_VALUES,
  });

  const saveMutation = useMutation({
    mutationFn: (values: PromotionFormValues) => promotionMasterService.create(values),
    onSuccess: () => {
      toast({ title: t("common.saveSuccess") });
      queryClient.invalidateQueries({ queryKey: ["promotion-master"] });
      router.push("/promotions");
    },
    onError: (err: unknown) => {
      const message = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast({ title: message || t("common.errorGeneric"), variant: "destructive" });
    },
  });

  return (
    <div className="flex h-full flex-col gap-4 overflow-y-auto p-4">
      <PageHeader title={t("salon.promotionMaster")} />
      <Form {...form}>
        <form onKeyDown={enterMovesToNextField} className="max-w-2xl space-y-4" onSubmit={form.handleSubmit((values) => saveMutation.mutate(values))}>
          {fields
            .filter((field) => field.name !== "active")
            .map((field) => (
              <EntityFormField key={String(field.name)} control={form.control} field={field} />
            ))}
          <PromotionDetailEditor form={form} />
          {/* Active is always the last field on a master form. */}
          {fields
            .filter((field) => field.name === "active")
            .map((field) => (
              <EntityFormField key={String(field.name)} control={form.control} field={field} />
            ))}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => router.push("/promotions")}>
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
