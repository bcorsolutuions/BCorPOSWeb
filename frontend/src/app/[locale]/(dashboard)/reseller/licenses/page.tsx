"use client";

import { useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Copy, Check } from "lucide-react";
import { licenseService } from "@/lib/api/services/license-service";
import { licenseEditionService } from "@/lib/api/services/license-edition-service";
import { businessTypeModuleService } from "@/lib/api/services/business-type-module-service";
import { CREATE_LICENSE_MODULE_CODES, BUSINESS_TYPE_CODES } from "@/lib/license/module-business-type-constants";
import { useAuthStore } from "@/stores/auth-store";
import { PageHeader } from "@/components/shared/page-header";
import { AddModulesPanel } from "@/components/license/add-modules-panel";
import { DataGridWrapper, type DataGridColumnDef } from "@/components/shared/data-grid-wrapper";
import { EntityFormField, type FieldConfig } from "@/components/shared/entity-form-field";
import { Form } from "@/components/ui/form";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { apiErrorMessage } from "@/lib/api-error";
import { formatDate } from "@/lib/utils";
import { createLicenseSchema, type CreateLicenseFormValues } from "@/schemas/license.schema";
import type { LicenseMasterDto, LicenseStatusCode, OnboardClientResultDto } from "@/types/license";
import { enterMovesToNextField } from "@/lib/prevent-enter-submit";

const statusVariant: Record<LicenseStatusCode, "success" | "warning" | "destructive" | "secondary"> = {
  ACTIVE: "success",
  INACTIVE: "secondary",
  SUSPENDED: "destructive",
  EXPIRED: "destructive",
};

const createDefaults: CreateLicenseFormValues = {
  compID: "",
  siteID: "S001",
  siteName: "",
  licenseName: "",
  productCode: "SPOS",
  customerCode: "",
  customerName: "",
  editionCode: "",
  validFrom: new Date().toISOString().slice(0, 10),
  validTo: "",
  maximumUsers: undefined,
  maximumSites: undefined,
  maximumDevices: undefined,
  allowOfflineUse: true,
  offlineGraceDays: 7,
  autoRenew: false,
  requireDeviceBinding: false,
  moduleCodes: [],
  businessTypeCodes: [],
};

export default function ResellerLicensesPage() {
  const t = useTranslations("reseller");
  const tc = useTranslations("common");
  const locale = useLocale();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const userName = useAuthStore((s) => s.user?.userName) ?? "";
  const resellerCode = useAuthStore((s) => s.user?.resellerCode) ?? undefined;

  const [createOpen, setCreateOpen] = useState(false);
  const [companyMode, setCompanyMode] = useState<"existing" | "new">("existing");
  const [newCompGroupCode, setNewCompGroupCode] = useState("");
  const [newCompGroupName, setNewCompGroupName] = useState("");
  const [newCompCode, setNewCompCode] = useState("");
  const [newCompanyName, setNewCompanyName] = useState("");
  const [newAdminUsername, setNewAdminUsername] = useState("");
  const [newAdminEmail, setNewAdminEmail] = useState("");
  const [onboardResult, setOnboardResult] = useState<OnboardClientResultDto | null>(null);
  const [manageCode, setManageCode] = useState<{ compId: string; code: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const [onboardCopied, setOnboardCopied] = useState(false);
  const [renewDate, setRenewDate] = useState("");
  const [transferOpen, setTransferOpen] = useState(false);
  const [transferCompId, setTransferCompId] = useState("");

  const { data: licenses, isLoading } = useQuery({
    queryKey: ["reseller-licenses", resellerCode],
    queryFn: () => licenseService.list({ resellerCode }),
  });

  const { data: editionsResult } = useQuery({
    queryKey: ["license-editions"],
    queryFn: licenseEditionService.list,
  });
  const editions = editionsResult?.items ?? [];

  // "Existing company" picker is derived from this reseller's own licenses
  // rather than a company-listing endpoint — SysCompanyMastController's
  // GetAll filters by an exact LKey match, and LKey is now each tenant's own
  // unique LicenseKey, so no single value could ever list "all my clients"
  // (see the spawn_task flagged for a proper role-scoped company endpoint).
  // A distinct CompID already seen on one of this reseller's licenses is
  // exactly "a client I've already onboarded" — everything this picker needs.
  const existingCompanies = useMemo(() => {
    const map = new Map<string, { compId: string; label: string }>();
    for (const lic of licenses ?? []) {
      if (!map.has(lic.compID)) {
        map.set(lic.compID, {
          compId: lic.compID,
          label: lic.customerName ? `${lic.customerName} (${lic.compID.slice(0, 8)})` : lic.compID,
        });
      }
    }
    return Array.from(map.values());
  }, [licenses]);

  const { data: manageDetail } = useQuery({
    queryKey: ["reseller-license-detail", manageCode?.compId, manageCode?.code],
    queryFn: () => licenseService.get(manageCode!.compId, manageCode!.code),
    enabled: !!manageCode,
  });

  const { data: manageHistory } = useQuery({
    queryKey: ["reseller-license-history", manageCode?.compId, manageCode?.code],
    queryFn: () => licenseService.history(manageCode!.compId, manageCode!.code),
    enabled: !!manageCode,
  });

  const form = useForm<CreateLicenseFormValues>({
    resolver: zodResolver(createLicenseSchema),
    defaultValues: createDefaults,
  });

  const editionOptions = useMemo(
    () => editions.map((e) => ({ value: e.editionCode, label: e.editionName })),
    [editions],
  );

  const fields: FieldConfig<CreateLicenseFormValues>[] = [
    { name: "siteID", labelKey: "reseller.siteId", type: "text" },
    { name: "siteName", labelKey: "reseller.branchName", type: "text" },
    { name: "licenseName", labelKey: "reseller.licenseName", type: "text" },
    { name: "customerCode", labelKey: "license.customer", type: "text" },
    { name: "customerName", labelKey: "reseller.customerName", type: "text" },
    { name: "editionCode", labelKey: "license.edition", type: "select", options: editionOptions },
    { name: "validFrom", labelKey: "license.validFrom", type: "date" },
    { name: "validTo", labelKey: "license.validTo", type: "date" },
    { name: "maximumUsers", labelKey: "license.maxUsers", type: "number" },
    { name: "maximumSites", labelKey: "license.maxBranches", type: "number" },
    { name: "maximumDevices", labelKey: "license.maxDevices", type: "number" },
    { name: "offlineGraceDays", labelKey: "license.offlineGraceDays", type: "number" },
    { name: "allowOfflineUse", labelKey: "reseller.allowOfflineUse", type: "checkbox" },
    { name: "autoRenew", labelKey: "license.autoRenew", type: "checkbox" },
    { name: "requireDeviceBinding", labelKey: "license.deviceBindingRequired", type: "checkbox" },
  ];

  const resetCompanyFields = () => {
    setCompanyMode("existing");
    setNewCompGroupCode("");
    setNewCompGroupName("");
    setNewCompCode("");
    setNewCompanyName("");
    setNewAdminUsername("");
    setNewAdminEmail("");
  };

  const createMutation = useMutation({
    mutationFn: (values: CreateLicenseFormValues) =>
      licenseService.createClient({
        ...values,
        licenseType: values.editionCode,
        customerCode: values.customerCode || undefined,
        customerName: values.customerName || undefined,
        validTo: values.validTo || undefined,
        isCloudLicense: true,
      }),
    onSuccess: () => {
      toast({ title: tc("saveSuccess") });
      queryClient.invalidateQueries({ queryKey: ["reseller-licenses", resellerCode] });
      setCreateOpen(false);
      form.reset(createDefaults);
      resetCompanyFields();
    },
    onError: (err: unknown) => {
      const message = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast({ title: message || tc("errorGeneric"), variant: "destructive" });
    },
  });

  // "New Client" — onboards a brand-new tenant (SysCompanyGroupMaster + its
  // first SysCompanyMast) and issues its first license in one atomic call.
  // See licenseService.onboardClient / LicenseWorkflowService.OnboardClientAsync
  // for the placeholder-then-backfill LKey sequencing.
  const onboardMutation = useMutation({
    mutationFn: (values: CreateLicenseFormValues) =>
      licenseService.onboardClient({
        compGroupCode: newCompGroupCode,
        compGroupName: newCompGroupName,
        compCode: newCompCode,
        companyName: newCompanyName,
        siteID: values.siteID,
        siteName: values.siteName || undefined,
        licenseName: values.licenseName,
        productCode: values.productCode,
        licenseType: values.editionCode,
        editionCode: values.editionCode,
        customerCode: values.customerCode || undefined,
        customerName: values.customerName || undefined,
        validFrom: values.validFrom,
        validTo: values.validTo || undefined,
        maximumUsers: values.maximumUsers,
        maximumSites: values.maximumSites,
        maximumDevices: values.maximumDevices,
        allowOfflineUse: values.allowOfflineUse,
        offlineGraceDays: values.offlineGraceDays,
        isCloudLicense: true,
        autoRenew: values.autoRenew,
        requireDeviceBinding: values.requireDeviceBinding,
        moduleCodes: values.moduleCodes,
        businessTypeCodes: values.businessTypeCodes,
        adminUsername: newAdminUsername,
        adminEmail: newAdminEmail,
      }),
    onSuccess: (result) => {
      toast({ title: tc("saveSuccess") });
      queryClient.invalidateQueries({ queryKey: ["reseller-licenses", resellerCode] });
      setCreateOpen(false);
      form.reset(createDefaults);
      resetCompanyFields();
      // Show the created login/branch once, right here — the password can't
      // be retrieved again after this response.
      setOnboardResult(result);
    },
    onError: (err: unknown) => {
      const message = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast({ title: message || tc("errorGeneric"), variant: "destructive" });
    },
  });

  const invalidateManage = () => {
    queryClient.invalidateQueries({ queryKey: ["reseller-licenses", resellerCode] });
    queryClient.invalidateQueries({ queryKey: ["reseller-license-detail", manageCode?.compId, manageCode?.code] });
    queryClient.invalidateQueries({ queryKey: ["reseller-license-history", manageCode?.compId, manageCode?.code] });
  };

  const suspendMutation = useMutation({
    mutationFn: () => licenseService.suspend(manageCode!.compId, manageCode!.code, {}),
    onSuccess: () => {
      toast({ title: t("suspendSuccess") });
      invalidateManage();
    },
    onError: (err) => toast({ title: apiErrorMessage(err, tc("errorGeneric")), variant: "destructive" }),
  });

  const reactivateMutation = useMutation({
    mutationFn: () => licenseService.reactivate(manageCode!.compId, manageCode!.code, {}),
    onSuccess: () => {
      toast({ title: t("reactivateSuccess") });
      invalidateManage();
    },
    onError: (err) => toast({ title: apiErrorMessage(err, tc("errorGeneric")), variant: "destructive" }),
  });

  const renewMutation = useMutation({
    mutationFn: () => licenseService.renew(manageCode!.compId, manageCode!.code, { newValidTo: renewDate }),
    onSuccess: () => {
      toast({ title: t("renewSuccess") });
      setRenewDate("");
      invalidateManage();
    },
    onError: (err) => toast({ title: apiErrorMessage(err, tc("errorGeneric")), variant: "destructive" }),
  });

  const generateKeyMutation = useMutation({
    mutationFn: () => licenseService.generateKey(manageCode!.compId, manageCode!.code),
    onSuccess: () => {
      toast({ title: t("keyRegenerated") });
      invalidateManage();
    },
    onError: (err) => toast({ title: apiErrorMessage(err, tc("errorGeneric")), variant: "destructive" }),
  });

  const transferMutation = useMutation({
    mutationFn: () => licenseService.transfer(manageCode!.compId, manageCode!.code, { newCompID: transferCompId }),
    onSuccess: () => {
      toast({ title: t("transferSuccess") });
      setTransferOpen(false);
      setTransferCompId("");
      setManageCode(null);
      queryClient.invalidateQueries({ queryKey: ["reseller-licenses", resellerCode] });
    },
    onError: (err) => toast({ title: apiErrorMessage(err, tc("errorGeneric")), variant: "destructive" }),
  });

  const copyKey = async () => {
    const key = manageDetail?.license.licenseKey;
    if (!key) return;
    await navigator.clipboard.writeText(key);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const copyOnboardCredentials = async () => {
    if (!onboardResult) return;
    await navigator.clipboard.writeText(
      `Username: ${onboardResult.adminUsername}\nPassword: ${onboardResult.adminPassword}`,
    );
    setOnboardCopied(true);
    setTimeout(() => setOnboardCopied(false), 1500);
  };

  const columns: DataGridColumnDef[] = [
    { dataField: "code", captionKey: "common.code", width: 140 },
    { dataField: "licenseName", captionKey: "reseller.licenseName" },
    { dataField: "customerName", captionKey: "reseller.customerName" },
    { dataField: "editionCode", captionKey: "license.edition", width: 120 },
    {
      dataField: "licenseStatus",
      captionKey: "license.status",
      width: 120,
      cellRender: (d) => {
        const status = d.data.licenseStatus as LicenseStatusCode;
        return <Badge variant={statusVariant[status]}>{status}</Badge>;
      },
    },
    {
      dataField: "validTo",
      captionKey: "license.validTo",
      width: 130,
      cellRender: (d) => (d.data.validTo ? formatDate(d.data.validTo as string, locale) : "-"),
    },
  ];

  return (
    <div className="flex h-full flex-col gap-4">
      <PageHeader title={t("licensesTitle")} description={t("licensesDescription")} />

      <div className="min-h-0 flex-1">
        <DataGridWrapper<LicenseMasterDto>
          dataSource={licenses ?? []}
          columns={columns}
          loading={isLoading}
          keyExpr="code"
          onRowClick={(row) => setManageCode({ compId: row.compID, code: row.code })}
          onAddNew={() => setCreateOpen(true)}
          addLabelKey="reseller.createLicense"
        />
      </div>

      {/* Create License dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t("createLicense")}</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form
              className="space-y-4"
              onKeyDown={enterMovesToNextField}
              onSubmit={form.handleSubmit((values) => {
                if (companyMode === "new") onboardMutation.mutate(values);
                else createMutation.mutate(values);
              })}
            >
              <div className="space-y-2">
                <Label>{t("company")}</Label>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant={companyMode === "existing" ? "default" : "outline"}
                    onClick={() => {
                      setCompanyMode("existing");
                      form.setValue("compID", "");
                    }}
                  >
                    {t("existingCompany")}
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant={companyMode === "new" ? "default" : "outline"}
                    onClick={() => {
                      setCompanyMode("new");
                      // OnboardClientDto has no compID field — the backend
                      // mints a fresh one. This just satisfies createLicenseSchema's
                      // shared `compID` requirement so the same form can submit
                      // either mutation.
                      form.setValue("compID", "NEW");
                    }}
                  >
                    <Plus className="mr-1 h-4 w-4" />
                    {t("newCompany")}
                  </Button>
                </div>

                {companyMode === "existing" ? (
                  <>
                    <Select
                      value={form.watch("compID")}
                      onValueChange={(value) => {
                        const company = existingCompanies.find((c) => c.compId === value);
                        form.setValue("compID", value);
                        const lic = licenses?.find((l) => l.compID === value);
                        if (lic?.customerName) form.setValue("customerName", lic.customerName);
                        if (!company) return;
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={t("selectCompany")} />
                      </SelectTrigger>
                      <SelectContent>
                        {existingCompanies.map((c) => (
                          <SelectItem key={c.compId} value={c.compId}>
                            {c.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {form.watch("compID") && form.watch("compID") !== "NEW" && (
                      <p className="text-xs text-muted-foreground">CompID: {form.watch("compID")}</p>
                    )}
                  </>
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <Label className="text-xs">{t("companyGroupCode")}</Label>
                      <Input value={newCompGroupCode} onChange={(e) => setNewCompGroupCode(e.target.value)} maxLength={5} />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">{t("companyGroupName")}</Label>
                      <Input value={newCompGroupName} onChange={(e) => setNewCompGroupName(e.target.value)} />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">{t("companyCode")}</Label>
                      <Input value={newCompCode} onChange={(e) => setNewCompCode(e.target.value)} maxLength={5} />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">{t("companyName")}</Label>
                      <Input value={newCompanyName} onChange={(e) => setNewCompanyName(e.target.value)} />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">{t("adminUsername")}</Label>
                      <Input value={newAdminUsername} onChange={(e) => setNewAdminUsername(e.target.value)} />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">{t("adminEmail")}</Label>
                      <Input type="email" value={newAdminEmail} onChange={(e) => setNewAdminEmail(e.target.value)} />
                    </div>
                    <p className="col-span-2 text-xs text-muted-foreground">{t("adminDefaultPasswordNote")}</p>
                  </div>
                )}
              </div>

              {fields
                // Branch Name only applies when a brand-new company is being onboarded
                // (the starter branch row is created with it); an existing company
                // already has its branches.
                .filter((field) => field.name !== "siteName" || companyMode === "new")
                .map((field) => (
                <EntityFormField key={String(field.name)} control={form.control} field={field} />
              ))}

              <div className="space-y-2">
                <Label>{t("modules")}</Label>
                <div className="grid grid-cols-2 gap-2">
                  {CREATE_LICENSE_MODULE_CODES.map((code) => {
                    const selected = form.watch("moduleCodes").includes(code);
                    return (
                      <div key={code} className="flex items-center gap-2">
                        <Checkbox
                          checked={selected}
                          onCheckedChange={(checked) => {
                            const current = form.getValues("moduleCodes");
                            form.setValue(
                              "moduleCodes",
                              checked ? [...current, code] : current.filter((c) => c !== code),
                            );
                          }}
                        />
                        <span className="text-sm">{code}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-2">
                <Label>{t("businessTypes")}</Label>
                <div className="grid grid-cols-2 gap-2">
                  {BUSINESS_TYPE_CODES.map((code) => {
                    const selected = form.watch("businessTypeCodes").includes(code);
                    return (
                      <div key={code} className="flex items-center gap-2">
                        <Checkbox
                          checked={selected}
                          onCheckedChange={(checked) => {
                            const current = form.getValues("businessTypeCodes");
                            form.setValue(
                              "businessTypeCodes",
                              checked ? [...current, code] : current.filter((c) => c !== code),
                            );
                            // Pre-check (not force) this business type's recommended
                            // modules — reseller can still amend the selection.
                            if (checked) {
                              businessTypeModuleService
                                .getRecommended(code)
                                .then((rows) => {
                                  const recommended = rows.filter((r) => r.isRecommended).map((r) => r.moduleCode);
                                  if (!recommended.length) return;
                                  const currentModules = form.getValues("moduleCodes");
                                  const merged = Array.from(new Set([...currentModules, ...recommended]));
                                  form.setValue("moduleCodes", merged);
                                })
                                .catch(() => {
                                  // Best-effort convenience — no recommendations is not an error.
                                });
                            }
                          }}
                        />
                        <span className="text-sm">{code}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setCreateOpen(false);
                    resetCompanyFields();
                  }}
                >
                  {tc("cancel")}
                </Button>
                <Button
                  type="submit"
                  disabled={
                    createMutation.isPending ||
                    onboardMutation.isPending ||
                    (companyMode === "new" &&
                      (!newCompGroupCode || !newCompGroupName || !newCompCode || !newCompanyName || !newAdminUsername || !newAdminEmail)) ||
                    (companyMode === "existing" && !form.watch("compID"))
                  }
                >
                  {tc("save")}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Manage License dialog */}
      <Dialog open={!!manageCode} onOpenChange={(open) => !open && setManageCode(null)}>
        <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{manageDetail?.license.licenseName ?? manageCode?.code}</DialogTitle>
          </DialogHeader>

          {manageDetail && (
            <div className="space-y-4 text-sm">
              <div className="flex items-center justify-between">
                <Badge variant={statusVariant[manageDetail.license.licenseStatus]}>
                  {manageDetail.license.licenseStatus}
                </Badge>
                <span className="text-muted-foreground">
                  {t("validTo")}: {manageDetail.license.validTo ? formatDate(manageDetail.license.validTo, locale) : "-"}
                </span>
              </div>

              <div className="flex flex-wrap gap-1.5">
                {manageDetail.modules.map((m) => (
                  <Badge key={m.moduleCode} variant="secondary">
                    {m.moduleCode}
                  </Badge>
                ))}
              </div>

              <AddModulesPanel
                compId={manageDetail.license.compID}
                code={manageDetail.license.code}
                grantedCodes={manageDetail.modules.map((m) => m.moduleCode)}
                onAdded={invalidateManage}
              />

              <div className="flex items-center gap-2">
                <code className="flex-1 break-all rounded bg-muted px-2 py-1 text-xs">
                  {manageDetail.license.licenseKey ?? "-"}
                </code>
                <Button variant="outline" size="sm" onClick={copyKey}>
                  {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>

              <div className="flex flex-wrap gap-2">
                {manageDetail.license.licenseStatus === "SUSPENDED" ? (
                  <Button size="sm" onClick={() => reactivateMutation.mutate()} disabled={reactivateMutation.isPending}>
                    {t("reactivate")}
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => suspendMutation.mutate()}
                    disabled={suspendMutation.isPending}
                  >
                    {t("suspend")}
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => generateKeyMutation.mutate()}
                  disabled={generateKeyMutation.isPending}
                >
                  {t("regenerateKey")}
                </Button>
                <Button size="sm" variant="outline" onClick={() => setTransferOpen((v) => !v)}>
                  {t("transfer")}
                </Button>
              </div>

              <div className="flex items-end gap-2 border-t pt-3">
                <div className="flex-1 space-y-1">
                  <Label>{t("newValidTo")}</Label>
                  <Input type="date" value={renewDate} onChange={(e) => setRenewDate(e.target.value)} />
                </div>
                <Button
                  size="sm"
                  onClick={() => renewMutation.mutate()}
                  disabled={!renewDate || renewMutation.isPending}
                >
                  {t("renew")}
                </Button>
              </div>

              {transferOpen && (
                <div className="flex items-end gap-2 border-t pt-3">
                  <div className="flex-1 space-y-1">
                    <Label>{t("newCompanyId")}</Label>
                    <Input value={transferCompId} onChange={(e) => setTransferCompId(e.target.value)} />
                  </div>
                  <Button
                    size="sm"
                    onClick={() => transferMutation.mutate()}
                    disabled={!transferCompId || transferMutation.isPending}
                  >
                    {t("confirmTransfer")}
                  </Button>
                </div>
              )}

              {manageHistory && manageHistory.length > 0 && (
                <div className="border-t pt-3">
                  <Label>{t("recentActivity")}</Label>
                  <div className="mt-2 max-h-32 space-y-1 overflow-y-auto text-xs text-muted-foreground">
                    {manageHistory.slice(0, 8).map((h) => (
                      <div key={h.id}>
                        {h.eventType} — {formatDate(h.eventDate, locale)}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* New Client success summary — the admin password can't be retrieved
          again after this, so it's shown here once for the reseller to copy
          and hand off. */}
      <Dialog open={!!onboardResult} onOpenChange={(open) => !open && setOnboardResult(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{t("clientCreated")}</DialogTitle>
          </DialogHeader>
          {onboardResult && (
            <div className="space-y-3 text-sm">
              <div>
                <Label className="text-xs text-muted-foreground">{t("startingBranch")}</Label>
                <p>{onboardResult.siteID}</p>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">{t("adminUsername")}</Label>
                <p className="font-mono">{onboardResult.adminUsername}</p>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">{t("adminPassword")}</Label>
                <p className="font-mono">{onboardResult.adminPassword}</p>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={copyOnboardCredentials}>
                  {onboardCopied ? <Check className="mr-1 h-4 w-4" /> : <Copy className="mr-1 h-4 w-4" />}
                  {tc("copy")}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">{t("adminDefaultPasswordNote")}</p>
            </div>
          )}
          <DialogFooter>
            <Button type="button" onClick={() => setOnboardResult(null)}>
              {tc("close")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
