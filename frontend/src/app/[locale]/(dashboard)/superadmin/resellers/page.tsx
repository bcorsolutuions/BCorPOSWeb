"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { CrudDataGridPage } from "@/components/shared/crud-data-grid-page";
import { resellerService, type ResellerRow, type ResellerFormValues } from "@/lib/api/services/reseller-service";
import { PERMISSIONS } from "@/lib/auth/permissions";
import type { FieldConfig } from "@/components/shared/entity-form-field";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Copy, Check } from "lucide-react";
import { z } from "zod";

const resellerSchema = z.object({
  resellerCode: z.string().min(1, "validation.required"),
  resellerName: z.string().min(1, "validation.required"),
  contactPerson: z.string().optional(),
  email: z.string().optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
  country: z.string().optional(),
  active: z.boolean().default(true),
});

const fields: FieldConfig<ResellerFormValues>[] = [
  { name: "resellerCode", labelKey: "common.code", type: "text" },
  { name: "resellerName", labelKey: "superAdmin.resellerName", type: "text" },
  { name: "contactPerson", labelKey: "superAdmin.contactPerson", type: "text" },
  { name: "email", labelKey: "superAdmin.email", type: "text" },
  { name: "phone", labelKey: "superAdmin.phone", type: "text" },
  { name: "country", labelKey: "superAdmin.country", type: "text" },
  { name: "active", labelKey: "common.active", type: "checkbox" },
];

export default function SuperAdminResellersPage() {
  const tr = useTranslations("reseller");
  const tc = useTranslations("common");
  // Creating a reseller now auto-provisions its ResellerAdmin login (see
  // ResellerService.CreateAsync) — the generated password can't be
  // retrieved again afterward, so it's shown here once to copy and hand
  // off, same "shown once" pattern superadmin/licenses' own New Client
  // dialog uses for a freshly-onboarded tenant's admin password.
  const [loginResult, setLoginResult] = useState<{ username: string; password: string } | null>(null);
  const [copied, setCopied] = useState(false);

  const copyCredentials = async () => {
    if (!loginResult) return;
    await navigator.clipboard.writeText(`Username: ${loginResult.username}\nPassword: ${loginResult.password}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <>
      <CrudDataGridPage<ResellerRow, ResellerFormValues>
        queryKey="superadmin-resellers"
        titleKey="superAdmin.resellersTitle"
        service={resellerService}
        schema={resellerSchema}
        fields={fields}
        permission={PERMISSIONS.LICENSE_SUPERADMIN_MANAGE}
        defaultValues={{
          resellerCode: "",
          resellerName: "",
          contactPerson: "",
          email: "",
          phone: "",
          address: "",
          country: "",
          active: true,
        }}
        toFormValues={(entity) => ({
          resellerCode: entity.resellerCode,
          resellerName: entity.resellerName,
          contactPerson: entity.contactPerson ?? "",
          email: entity.email ?? "",
          phone: entity.phone ?? "",
          address: entity.address ?? "",
          country: entity.country ?? "",
          active: entity.active,
        })}
        onSaved={(entity) => {
          if (entity.loginUsername && entity.loginPassword) {
            setLoginResult({ username: entity.loginUsername, password: entity.loginPassword });
          }
        }}
        columns={[
          { dataField: "resellerCode", captionKey: "common.code", width: 120 },
          { dataField: "resellerName", captionKey: "superAdmin.resellerName" },
          { dataField: "contactPerson", captionKey: "superAdmin.contactPerson" },
          { dataField: "email", captionKey: "superAdmin.email" },
          { dataField: "active", captionKey: "common.status", width: 100 },
        ]}
      />

      <Dialog open={!!loginResult} onOpenChange={(open) => !open && setLoginResult(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{tr("resellerLoginCreated")}</DialogTitle>
          </DialogHeader>
          {loginResult && (
            <div className="space-y-3 text-sm">
              <div>
                <Label className="text-xs text-muted-foreground">{tr("loginUsername")}</Label>
                <p className="font-mono">{loginResult.username}</p>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">{tr("loginPassword")}</Label>
                <p className="font-mono">{loginResult.password}</p>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={copyCredentials}>
                  {copied ? <Check className="me-1 h-4 w-4" /> : <Copy className="me-1 h-4 w-4" />}
                  {tc("copy")}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">{tr("loginPasswordNote")}</p>
            </div>
          )}
          <DialogFooter>
            <Button type="button" onClick={() => setLoginResult(null)}>
              {tc("close")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
