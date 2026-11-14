"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { useAuthStore } from "@/stores/auth-store";
import { useCurrentBranch } from "@/hooks/use-current-branch";
import { vendorMasterService } from "@/lib/api/services/vendor-master-service";
import { vendorCategoryService } from "@/lib/api/services/vendor-category-service";
import { apiErrorMessage } from "@/lib/api-error";
import { enterMovesToNextField } from "@/lib/prevent-enter-submit";
import type { VendorMaster } from "@/types/vendor-master";

/**
 * Add a supplier without leaving the purchase screen: only the essentials (code, name, category, mobile). The rest (email, tax number,
 * credit period, ...) is completed later in the Supplier Master. Rendered as a sibling of the purchase dialog, never inside its form,
 * so Enter / Save here can never submit the purchase document.
 */
export function QuickSupplierDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (vendor: VendorMaster) => void;
}) {
  const t = useTranslations();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const compId = useAuthStore((s) => s.user?.compId ?? "");
  const { siteId } = useCurrentBranch();

  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [mobile, setMobile] = useState("");

  const { data: categories = [] } = useQuery({
    queryKey: ["vendor-categories-lookup", compId],
    queryFn: () => vendorCategoryService.getCategories(compId),
    enabled: !!compId && open,
  });
  const activeCategories = categories.filter((c) => c.active);

  // Fresh form each time it opens; the API requires a category, so start on the first one.
  useEffect(() => {
    if (open) {
      setName("");
      setMobile("");
      setCategory("");
    }
  }, [open]);
  useEffect(() => {
    if (open && !category && activeCategories[0]) setCategory(activeCategories[0].code);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, categories, category]);

  const canSave = name.trim().length > 0 && !!category && !!siteId;

  const createMutation = useMutation({
    mutationFn: () =>
      vendorMasterService.create({
        // no code: the API gives the supplier the next automatic one (S00001, ...), which is also its account code
        vendorName: name.trim(),
        vendorCatCode: category,
        mobile1: mobile.trim() || undefined,
        siteId,
        creditPeriod: 30,
        active: true,
      }),
    onSuccess: async (vendor) => {
      // wait for the lists so the new supplier is already in the purchase screen's dropdown when it gets selected
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["vendors-lookup", compId] }),
        queryClient.invalidateQueries({ queryKey: ["vendor-master"] }),
        queryClient.invalidateQueries({ queryKey: ["item-master-vendors", compId] }),
      ]);
      toast({ title: t("quickAdd.supplierSaved", { name: vendor.vendorName, code: vendor.code }) });
      onCreated(vendor);
      onOpenChange(false);
    },
    onError: (err) => toast({ title: apiErrorMessage(err, t("common.errorGeneric")), variant: "destructive" }),
  });

  function save() {
    if (canSave && !createMutation.isPending) createMutation.mutate();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-md"
        // Enter / Escape in here belong to this pop-up only (Escape closes just it).
        onKeyDown={(e) => {
          e.stopPropagation();
          enterMovesToNextField(e);
        }}
      >
        <DialogHeader>
          <DialogTitle>{t("quickAdd.newSupplier")}</DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <div className="space-y-1">
            <Label htmlFor="qs-name">{t("common.name")}</Label>
            <Input id="qs-name" autoFocus maxLength={150} value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label>{t("quickAdd.category")}</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger>
                <SelectValue placeholder={t("quickAdd.category")} />
              </SelectTrigger>
              <SelectContent>
                {activeCategories.map((c) => (
                  <SelectItem key={c.code} value={c.code}>
                    {c.vendorCatName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {activeCategories.length === 0 && <p className="text-xs text-destructive">{t("quickAdd.noSupplierCategory")}</p>}
          </div>
          <div className="space-y-1">
            <Label htmlFor="qs-mobile">{t("common.phone")}</Label>
            <Input id="qs-mobile" maxLength={20} inputMode="tel" value={mobile} onChange={(e) => setMobile(e.target.value)} />
          </div>
          <p className="text-xs text-muted-foreground">{t("quickAdd.supplierCodeAuto")}</p>
          <p className="text-xs text-muted-foreground">{t("quickAdd.completeLater")}</p>
        </div>

        <DialogFooter className="gap-2">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            {t("common.cancel")}
          </Button>
          <Button type="submit" disabled={!canSave || createMutation.isPending} onClick={save}>
            {t("common.save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
