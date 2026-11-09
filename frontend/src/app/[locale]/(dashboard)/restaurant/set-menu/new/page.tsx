"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { setMenuService } from "@/lib/api/services/set-menu-service";
import { setMenuSchema, type SetMenuFormValues } from "@/schemas/set-menu.schema";
import { SetMenuActiveField, SetMenuGeneralFields } from "@/components/masters/set-menu-general-fields";
import { SetMenuGroupEditor } from "@/components/masters/set-menu-group-editor";
import { PageHeader } from "@/components/shared/page-header";
import { Form } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { enterMovesToNextField } from "@/lib/prevent-enter-submit";

const DEFAULT_VALUES: SetMenuFormValues = {
  code: "",
  siteId: "",
  setMenuName: "",
  setMenuNameArb: "",
  description: "",
  menuCode: "",
  sellingPrice: 0,
  taxCode: "",
  validFrom: "",
  validTo: "",
  startTime: "",
  endTime: "",
  availableDays: "",
  allowDiscount: true,
  remarks: "",
  active: true,
  groups: [],
};

export default function NewSetMenuPage() {
  const t = useTranslations();
  const ts = useTranslations("setMenu");
  const router = useRouter();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<SetMenuFormValues>({
    resolver: zodResolver(setMenuSchema),
    defaultValues: DEFAULT_VALUES,
  });

  const createMutation = useMutation({
    mutationFn: (values: SetMenuFormValues) => setMenuService.create(values),
    onSuccess: (setMenu) => {
      toast({ title: t("common.saveSuccess") });
      queryClient.invalidateQueries({ queryKey: ["set-menu-master"] });
      router.push(`/restaurant/set-menu/${encodeURIComponent(setMenu.code)}`);
    },
    onError: (err: unknown) => {
      const message = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast({ title: message || t("common.errorGeneric"), variant: "destructive" });
    },
  });

  return (
    <div className="flex h-full flex-col gap-4 overflow-y-auto p-4">
      <PageHeader title={ts("addNew")} />
      <Form {...form}>
        <form onKeyDown={enterMovesToNextField} className="max-w-3xl space-y-6" onSubmit={form.handleSubmit((values) => createMutation.mutate(values))}>
          <SetMenuGeneralFields form={form} />
          <SetMenuGroupEditor form={form} />
          <SetMenuActiveField form={form} />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => router.push("/restaurant/set-menu")}>
              {t("common.cancel")}
            </Button>
            <Button type="submit" disabled={createMutation.isPending}>
              {t("common.save")}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
