"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useForm } from "react-hook-form";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Pencil, Plus } from "lucide-react";
import { useAuthStore } from "@/stores/auth-store";
import { tenantSetupService, type TenantBranchDto } from "@/lib/api/services/tenant-setup-service";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/components/ui/use-toast";
import { enterMovesToNextField } from "@/lib/prevent-enter-submit";

// Form state is all strings/booleans (HTML inputs); lat/long are converted
// on save.
interface BranchValues {
  siteID: string;
  siteName: string;
  siteNameArb: string;
  siteShortName: string;
  siteShortNameArb: string;
  siteAddress: string;
  siteAddressArb: string;
  building: string;
  road: string;
  block: string;
  area: string;
  city: string;
  countryCode: string;
  pinPOBox: string;
  contactNo: string;
  alternateContactNo: string;
  fax: string;
  email: string;
  webSite: string;
  siteOrder: string;
  isInvSite: boolean;
  isLoginSite: boolean;
  defGLCCCode: string;
  latitude: string;
  longitude: string;
  timeZoneCode: string;
  currencyCode: string;
  active: boolean;
}

const emptyBranch: BranchValues = {
  siteID: "",
  siteName: "",
  siteNameArb: "",
  siteShortName: "",
  siteShortNameArb: "",
  siteAddress: "",
  siteAddressArb: "",
  building: "",
  road: "",
  block: "",
  area: "",
  city: "",
  countryCode: "",
  pinPOBox: "",
  contactNo: "",
  alternateContactNo: "",
  fax: "",
  email: "",
  webSite: "",
  siteOrder: "1",
  isInvSite: true,
  isLoginSite: true,
  defGLCCCode: "",
  latitude: "",
  longitude: "",
  timeZoneCode: "",
  currencyCode: "",
  active: true,
};

function toValues(b: TenantBranchDto): BranchValues {
  return {
    siteID: b.siteID,
    siteName: b.siteName,
    siteNameArb: b.siteNameArb ?? "",
    siteShortName: b.siteShortName ?? "",
    siteShortNameArb: b.siteShortNameArb ?? "",
    siteAddress: b.siteAddress ?? "",
    siteAddressArb: b.siteAddressArb ?? "",
    building: b.building ?? "",
    road: b.road ?? "",
    block: b.block ?? "",
    area: b.area ?? "",
    city: b.city ?? "",
    countryCode: b.countryCode ?? "",
    pinPOBox: b.pinPOBox ?? "",
    contactNo: b.contactNo ?? "",
    alternateContactNo: b.alternateContactNo ?? "",
    fax: b.fax ?? "",
    email: b.email ?? "",
    webSite: b.webSite ?? "",
    siteOrder: String(b.siteOrder ?? 0),
    isInvSite: b.isInvSite,
    isLoginSite: b.isLoginSite,
    defGLCCCode: b.defGLCCCode ?? "",
    latitude: b.latitude == null ? "" : String(b.latitude),
    longitude: b.longitude == null ? "" : String(b.longitude),
    timeZoneCode: b.timeZoneCode ?? "",
    currencyCode: b.currencyCode ?? "",
    active: b.active,
  };
}

function toDto(v: BranchValues): TenantBranchDto {
  const text = (s: string) => (s.trim() ? s.trim() : null);
  const num = (s: string) => (s.trim() === "" || Number.isNaN(Number(s)) ? null : Number(s));
  return {
    siteID: v.siteID.trim(),
    siteName: v.siteName.trim(),
    siteNameArb: text(v.siteNameArb),
    siteShortName: text(v.siteShortName),
    siteShortNameArb: text(v.siteShortNameArb),
    siteAddress: text(v.siteAddress),
    siteAddressArb: text(v.siteAddressArb),
    building: text(v.building),
    road: text(v.road),
    block: text(v.block),
    area: text(v.area),
    city: text(v.city),
    countryCode: text(v.countryCode),
    pinPOBox: text(v.pinPOBox),
    contactNo: text(v.contactNo),
    alternateContactNo: text(v.alternateContactNo),
    fax: text(v.fax),
    email: text(v.email),
    webSite: text(v.webSite),
    siteOrder: Number(v.siteOrder) || 0,
    isInvSite: v.isInvSite,
    isLoginSite: v.isLoginSite,
    defGLCCCode: text(v.defGLCCCode),
    latitude: num(v.latitude),
    longitude: num(v.longitude),
    timeZoneCode: text(v.timeZoneCode),
    currencyCode: text(v.currencyCode),
    active: v.active,
  };
}

/** Branch (SysSiteMast) list + add/edit dialog with the full address/contact details. */
export function BranchSetupCard() {
  const t = useTranslations("settings");
  const tc = useTranslations("common");
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const compId = useAuthStore((s) => s.user?.compId ?? "");

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);

  const { data: branches = [] } = useQuery({
    queryKey: ["tenant-branches", compId],
    queryFn: () => tenantSetupService.getBranches(compId),
    enabled: !!compId,
  });

  const form = useForm<BranchValues>({ defaultValues: emptyBranch });
  const { register, handleSubmit, reset, watch, setValue, formState } = form;

  const openNew = () => {
    setEditing(null);
    reset({ ...emptyBranch, siteOrder: String(branches.length + 1) });
    setOpen(true);
  };
  const openEdit = (b: TenantBranchDto) => {
    setEditing(b.siteID);
    reset(toValues(b));
    setOpen(true);
  };

  const saveMutation = useMutation({
    mutationFn: (v: BranchValues) =>
      editing ? tenantSetupService.updateBranch(compId, toDto(v)) : tenantSetupService.createBranch(compId, toDto(v)),
    onSuccess: () => {
      toast({ title: tc("saveSuccess") });
      setOpen(false);
      queryClient.invalidateQueries({ queryKey: ["tenant-branches", compId] });
      // the branch pickers elsewhere (header switcher, POS till setup) read this list
      queryClient.invalidateQueries({ queryKey: ["sites", compId] });
    },
    onError: (err: unknown) => {
      const message = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast({ title: message || tc("errorGeneric"), variant: "destructive" });
    },
  });

  const field = (name: keyof BranchValues, label: string, opts?: { maxLength?: number; type?: string; dir?: "rtl" }) => (
    <div className="space-y-1.5">
      <Label className="text-xs">{label}</Label>
      <Input
        maxLength={opts?.maxLength}
        type={opts?.type}
        dir={opts?.dir}
        {...register(name as never)}
      />
    </div>
  );

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle className="text-base">{t("branches")}</CardTitle>
        <Button size="sm" onClick={openNew}>
          <Plus className="me-1 h-4 w-4" />
          {t("addBranch")}
        </Button>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("branchCode")}</TableHead>
              <TableHead>{t("branchName")}</TableHead>
              <TableHead>{t("city")}</TableHead>
              <TableHead>{t("contactNo")}</TableHead>
              <TableHead>{t("email")}</TableHead>
              <TableHead>{tc("status")}</TableHead>
              <TableHead className="w-12" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {branches.map((b) => (
              <TableRow key={b.siteID}>
                <TableCell className="font-medium">{b.siteID}</TableCell>
                <TableCell>{b.siteName}</TableCell>
                <TableCell>{b.city ?? "-"}</TableCell>
                <TableCell>{b.contactNo ?? "-"}</TableCell>
                <TableCell>{b.email ?? "-"}</TableCell>
                <TableCell>
                  <Badge variant={b.active ? "success" : "secondary"}>{b.active ? tc("active") : tc("inactive")}</Badge>
                </TableCell>
                <TableCell>
                  <Button variant="ghost" size="icon" aria-label={tc("edit")} onClick={() => openEdit(b)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {branches.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground">
                  {t("noSites")}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? t("editBranch") : t("addBranch")}</DialogTitle>
          </DialogHeader>
          <form
            className="space-y-5"
            onKeyDown={enterMovesToNextField}
            onSubmit={handleSubmit((v) => saveMutation.mutate(v))}
          >
            <section className="space-y-3">
              <h3 className="text-sm font-semibold">{t("sectionBasic")}</h3>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label className="text-xs">{t("branchCode")}</Label>
                  <Input
                    maxLength={10}
                    readOnly={!!editing}
                    disabled={!!editing}
                    {...register("siteID", { required: true })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">{t("branchName")}</Label>
                  <Input maxLength={100} {...register("siteName", { required: true })} />
                  {formState.errors.siteName && <p className="text-xs text-destructive">{tc("required")}</p>}
                </div>
                {field("siteNameArb", t("branchNameArb"), { maxLength: 100, dir: "rtl" })}
                {field("siteShortName", t("shortName"), { maxLength: 50 })}
                {field("siteShortNameArb", t("shortNameArb"), { maxLength: 50, dir: "rtl" })}
                {field("siteOrder", t("siteOrder"), { type: "number" })}
              </div>
              <div className="flex flex-wrap gap-6 pt-1">
                <label className="flex items-center gap-2 text-sm">
                  <Checkbox checked={watch("isInvSite")} onCheckedChange={(c) => setValue("isInvSite", c === true)} />
                  {t("isInvSite")}
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <Checkbox checked={watch("isLoginSite")} onCheckedChange={(c) => setValue("isLoginSite", c === true)} />
                  {t("isLoginSite")}
                </label>
              </div>
            </section>

            <section className="space-y-3">
              <h3 className="text-sm font-semibold">{t("sectionAddress")}</h3>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {field("siteAddress", t("address"), { maxLength: 250 })}
                {field("siteAddressArb", t("addressArb"), { maxLength: 250, dir: "rtl" })}
                {field("building", t("building"), { maxLength: 50 })}
                {field("road", t("road"), { maxLength: 50 })}
                {field("block", t("block"), { maxLength: 50 })}
                {field("area", t("area"), { maxLength: 100 })}
                {field("city", t("city"), { maxLength: 100 })}
                {field("countryCode", t("country"), { maxLength: 10 })}
                {field("pinPOBox", t("poBox"), { maxLength: 50 })}
              </div>
            </section>

            <section className="space-y-3">
              <h3 className="text-sm font-semibold">{t("sectionContact")}</h3>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {field("contactNo", t("contactNo"), { maxLength: 30 })}
                {field("alternateContactNo", t("altContactNo"), { maxLength: 30 })}
                {field("fax", t("fax"), { maxLength: 30 })}
                {field("email", t("email"), { maxLength: 150, type: "email" })}
                {field("webSite", t("website"), { maxLength: 250 })}
              </div>
            </section>

            <section className="space-y-3">
              <h3 className="text-sm font-semibold">{t("sectionOther")}</h3>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {field("currencyCode", t("currencyCode"), { maxLength: 5 })}
                {field("timeZoneCode", t("timeZone"), { maxLength: 50 })}
                {field("defGLCCCode", t("glCostCenter"), { maxLength: 20 })}
                <div />
                {field("latitude", t("latitude"), { type: "number" })}
                {field("longitude", t("longitude"), { type: "number" })}
              </div>
            </section>

            <label className="flex items-center gap-2 text-sm">
              <Checkbox checked={watch("active")} onCheckedChange={(c) => setValue("active", c === true)} />
              {tc("active")}
            </label>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                {tc("cancel")}
              </Button>
              <Button type="submit" disabled={saveMutation.isPending}>
                {tc("save")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
