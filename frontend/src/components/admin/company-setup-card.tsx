"use client";

import { useEffect } from "react";
import { useTranslations } from "next-intl";
import { useForm } from "react-hook-form";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "@/stores/auth-store";
import { tenantSetupService } from "@/lib/api/services/tenant-setup-service";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/components/ui/use-toast";
import { enterMovesToNextField } from "@/lib/prevent-enter-submit";

interface GroupValues {
  compGroupName: string;
  compAddress: string;
}

interface CompanyValues {
  companyName: string;
  compAddress: string;
  taxRegisterNo: string;
  finPeriodStart: string;
  finperiodEnd: string;
  active: boolean;
}

const dateOnly = (v?: string | null) => (v ? v.slice(0, 10) : "");

/**
 * Company Group + Company details of the logged-in tenant (SysCompanyGroupMaster /
 * SysCompanyMast). The codes are issued with the license and shown read-only.
 */
export function CompanySetupCard() {
  const t = useTranslations("settings");
  const tc = useTranslations("common");
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const compId = useAuthStore((s) => s.user?.compId ?? "");

  const { data } = useQuery({
    queryKey: ["tenant-setup", compId],
    queryFn: () => tenantSetupService.get(compId),
    enabled: !!compId,
  });

  const groupForm = useForm<GroupValues>({ defaultValues: { compGroupName: "", compAddress: "" } });
  const companyForm = useForm<CompanyValues>({
    defaultValues: { companyName: "", compAddress: "", taxRegisterNo: "", finPeriodStart: "", finperiodEnd: "", active: true },
  });

  useEffect(() => {
    if (!data) return;
    groupForm.reset({ compGroupName: data.group.compGroupName, compAddress: data.group.compAddress ?? "" });
    companyForm.reset({
      companyName: data.company.companyName,
      compAddress: data.company.compAddress ?? "",
      taxRegisterNo: data.company.taxRegisterNo ?? "",
      finPeriodStart: dateOnly(data.company.finPeriodStart),
      finperiodEnd: dateOnly(data.company.finperiodEnd),
      active: data.company.active,
    });
  }, [data, groupForm, companyForm]);

  const onSaved = () => {
    toast({ title: tc("saveSuccess") });
    queryClient.invalidateQueries({ queryKey: ["tenant-setup", compId] });
  };
  const onError = (err: unknown) => {
    const message = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
    toast({ title: message || tc("errorGeneric"), variant: "destructive" });
  };

  const saveGroup = useMutation({
    mutationFn: (v: GroupValues) =>
      tenantSetupService.updateGroup(compId, {
        ...data!.group,
        compGroupName: v.compGroupName,
        compAddress: v.compAddress || null,
      }),
    onSuccess: onSaved,
    onError,
  });

  const saveCompany = useMutation({
    mutationFn: (v: CompanyValues) =>
      tenantSetupService.updateCompany(compId, {
        ...data!.company,
        companyName: v.companyName,
        compAddress: v.compAddress || null,
        taxRegisterNo: v.taxRegisterNo || null,
        finPeriodStart: v.finPeriodStart || null,
        finperiodEnd: v.finperiodEnd || null,
        active: v.active,
      }),
    onSuccess: onSaved,
    onError,
  });

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("companyGroup")}</CardTitle>
        </CardHeader>
        <CardContent>
          <form onKeyDown={enterMovesToNextField} className="space-y-4" onSubmit={groupForm.handleSubmit((v) => saveGroup.mutate(v))}>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>{t("groupCode")}</Label>
                <Input value={data?.group.compGroupCode ?? ""} readOnly disabled />
              </div>
              <div className="space-y-2">
                <Label>{t("groupName")}</Label>
                <Input maxLength={50} {...groupForm.register("compGroupName", { required: true })} />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label>{t("companyAddress")}</Label>
                <Input maxLength={100} {...groupForm.register("compAddress")} />
              </div>
            </div>
            <Button type="submit" disabled={saveGroup.isPending || !data}>
              {tc("save")}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("companyDetails")}</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onKeyDown={enterMovesToNextField} onSubmit={companyForm.handleSubmit((v) => saveCompany.mutate(v))}>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>{t("companyCode")}</Label>
                <Input value={data?.company.compCode ?? ""} readOnly disabled />
              </div>
              <div className="space-y-2">
                <Label>{t("companyNameLabel")}</Label>
                <Input maxLength={50} {...companyForm.register("companyName", { required: true })} />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label>{t("companyAddress")}</Label>
                <Input maxLength={500} {...companyForm.register("compAddress")} />
              </div>
              <div className="space-y-2">
                <Label>{t("taxRegNo")}</Label>
                <Input maxLength={20} {...companyForm.register("taxRegisterNo")} />
              </div>
              <div />
              <div className="space-y-2">
                <Label>{t("finPeriodStart")}</Label>
                <Input type="date" {...companyForm.register("finPeriodStart")} />
              </div>
              <div className="space-y-2">
                <Label>{t("finPeriodEnd")}</Label>
                <Input type="date" {...companyForm.register("finperiodEnd")} />
              </div>
              <label className="flex items-center gap-2 text-sm sm:col-span-2">
                <Checkbox
                  checked={companyForm.watch("active")}
                  onCheckedChange={(c) => companyForm.setValue("active", c === true)}
                />
                {tc("active")}
              </label>
            </div>
            <Button type="submit" disabled={saveCompany.isPending || !data}>
              {tc("save")}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
