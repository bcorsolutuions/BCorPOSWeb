"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { couponMasterService } from "@/lib/api/services/coupon-master-service";
import { CouponDetailEditor } from "@/components/masters/coupon-detail-editor";
import { couponSchema, type CouponFormValues } from "@/schemas/coupon-master.schema";
import { useCouponFields } from "@/hooks/use-coupon-fields";
import { PageHeader } from "@/components/shared/page-header";
import { Form } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { EntityFormField } from "@/components/shared/entity-form-field";
import { useToast } from "@/components/ui/use-toast";
import { enterMovesToNextField } from "@/lib/prevent-enter-submit";

const DEFAULT_VALUES: CouponFormValues = {
  code: "",
  couponName: "",
  couponType: "PERCENTAGE",
  validFrom: new Date().toISOString().slice(0, 10),
  validTo: new Date().toISOString().slice(0, 10),
  startTime: "",
  endTime: "",
  minimumBillAmount: 0,
  discountPercentage: undefined,
  discountAmount: undefined,
  maximumDiscountAmount: undefined,
  applicableBusinessType: "",
  customerCode: "",
  customerCategoryCode: "",
  usageLimit: 0,
  usageLimitPerCustomer: 0,
  oneTimeUse: false,
  allowWithPromotion: false,
  active: true,
  details: [],
};

/** Standalone create page — /coupons still owns edit (row-click opens its existing dialog); this page only ever creates. Reuses the exact same fields/schema/detail-editor as the list page's dialog. */
export default function NewCouponPage() {
  const t = useTranslations();
  const router = useRouter();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const fields = useCouponFields();

  const form = useForm<CouponFormValues>({
    resolver: zodResolver(couponSchema),
    defaultValues: DEFAULT_VALUES,
  });

  const saveMutation = useMutation({
    mutationFn: (values: CouponFormValues) => couponMasterService.create(values),
    onSuccess: () => {
      toast({ title: t("common.saveSuccess") });
      queryClient.invalidateQueries({ queryKey: ["coupon-master"] });
      router.push("/coupons");
    },
    onError: (err: unknown) => {
      const message = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast({ title: message || t("common.errorGeneric"), variant: "destructive" });
    },
  });

  return (
    <div className="flex h-full flex-col gap-4 overflow-y-auto p-4">
      <PageHeader title={t("coupon.couponMaster")} />
      <Form {...form}>
        <form onKeyDown={enterMovesToNextField} className="max-w-2xl space-y-4" onSubmit={form.handleSubmit((values) => saveMutation.mutate(values))}>
          {fields
            .filter((field) => field.name !== "active")
            .map((field) => (
              <EntityFormField key={String(field.name)} control={form.control} field={field} />
            ))}
          <CouponDetailEditor form={form} />
          {/* Active is always the last field on a master form. */}
          {fields
            .filter((field) => field.name === "active")
            .map((field) => (
              <EntityFormField key={String(field.name)} control={form.control} field={field} />
            ))}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => router.push("/coupons")}>
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
