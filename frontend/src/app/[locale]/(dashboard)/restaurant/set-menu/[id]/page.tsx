"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { setMenuService, type SetMenu } from "@/lib/api/services/set-menu-service";
import { setMenuSchema, type SetMenuFormValues } from "@/schemas/set-menu.schema";
import { SetMenuActiveField, SetMenuGeneralFields } from "@/components/masters/set-menu-general-fields";
import { SetMenuGroupEditor } from "@/components/masters/set-menu-group-editor";
import { PageHeader } from "@/components/shared/page-header";
import { Form } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { apiErrorMessage } from "@/lib/api-error";
import { enterMovesToNextField } from "@/lib/prevent-enter-submit";

function toFormValues(s: SetMenu): SetMenuFormValues {
  return {
    code: s.code,
    siteId: s.siteID,
    setMenuName: s.setMenuName,
    setMenuNameArb: s.setMenuNameArb ?? "",
    description: s.description ?? "",
    menuCode: s.menuCode ?? "",
    sellingPrice: s.sellingPrice,
    taxCode: s.taxCode ?? "",
    taxPercent: s.taxPercent ?? undefined,
    validFrom: s.validFrom ?? "",
    validTo: s.validTo ?? "",
    startTime: s.startTime ?? "",
    endTime: s.endTime ?? "",
    availableDays: s.availableDays ?? "",
    allowDiscount: s.allowDiscount,
    remarks: s.remarks ?? "",
    active: s.active,
    groups: s.groups.map((g) => ({
      id: g.id,
      groupCode: g.groupCode,
      groupName: g.groupName,
      groupNameArb: g.groupNameArb ?? "",
      sequence: g.sequence,
      minSelection: g.minSelection,
      maxSelection: g.maxSelection,
      isRequired: g.isRequired,
      displayOrder: g.displayOrder,
      active: g.active,
      items: g.items.map((i) => ({
        id: i.id,
        menuCode: i.menuCode,
        unitCode: i.unitCode ?? "",
        additionalPrice: i.additionalPrice,
        isDefault: i.isDefault,
        displayOrder: i.displayOrder,
        active: i.active,
      })),
    })),
  };
}

export default function EditSetMenuPage() {
  const params = useParams<{ id: string }>();
  const code = decodeURIComponent(params.id);
  const t = useTranslations();
  const ts = useTranslations("setMenu");
  const router = useRouter();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: setMenu } = useQuery({
    queryKey: ["set-menu-master", code],
    queryFn: () => setMenuService.get(code),
  });

  const form = useForm<SetMenuFormValues>({
    resolver: zodResolver(setMenuSchema),
    defaultValues: {
      code,
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
    },
  });

  useEffect(() => {
    if (setMenu) form.reset(toFormValues(setMenu));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [setMenu]);

  const updateMutation = useMutation({
    mutationFn: (values: SetMenuFormValues) => setMenuService.update(code, values),
    onSuccess: () => {
      toast({ title: t("common.saveSuccess") });
      queryClient.invalidateQueries({ queryKey: ["set-menu-master"] });
    },
    onError: (err: unknown) => {
      const message = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast({ title: message || t("common.errorGeneric"), variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => setMenuService.remove(code),
    onSuccess: () => {
      toast({ title: t("common.saveSuccess") });
      queryClient.invalidateQueries({ queryKey: ["set-menu-master"] });
      router.push("/restaurant/set-menu");
    },
    onError: (err) => toast({ title: apiErrorMessage(err, t("common.errorGeneric")), variant: "destructive" }),
  });

  if (!setMenu) {
    return (
      <div className="space-y-4 p-4">
        <Button variant="ghost" size="sm" className="gap-1.5" onClick={() => router.push("/restaurant/set-menu")}>
          <ArrowLeft className="h-3.5 w-3.5" />
          {t("common.back")}
        </Button>
        <p className="text-sm text-muted-foreground">{t("common.loading")}</p>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col gap-4 overflow-y-auto p-4">
      <Button variant="ghost" size="sm" className="w-fit gap-1.5" onClick={() => router.push("/restaurant/set-menu")}>
        <ArrowLeft className="h-3.5 w-3.5" />
        {t("common.back")}
      </Button>
      <PageHeader title={setMenu.setMenuName} />
      <Form {...form}>
        <form onKeyDown={enterMovesToNextField} className="max-w-3xl space-y-6" onSubmit={form.handleSubmit((values) => updateMutation.mutate(values))}>
          <SetMenuGeneralFields form={form} codeReadOnly />
          <SetMenuGroupEditor form={form} />
          <SetMenuActiveField form={form} />
          <div className="flex justify-between gap-2">
            <Button type="button" variant="destructive" onClick={() => deleteMutation.mutate()} disabled={deleteMutation.isPending}>
              {t("common.delete")}
            </Button>
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={() => router.push("/restaurant/set-menu")}>
                {t("common.cancel")}
              </Button>
              <Button type="submit" disabled={updateMutation.isPending}>
                {t("common.save")}
              </Button>
            </div>
          </div>
        </form>
      </Form>
    </div>
  );
}
