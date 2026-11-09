"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { useMutation, useQuery } from "@tanstack/react-query";
import { ShieldAlert } from "lucide-react";
import { openItemSettingsService } from "@/lib/api/services/open-item-settings-service";
import { taxMasterService } from "@/lib/api/services/tax-master-service";
import { restaurantLookupService } from "@/lib/api/services/restaurant-lookup-service";
import { posAuthorizationService } from "@/lib/api/services/pos-authorization-service";
import { useAuthStore } from "@/stores/auth-store";
import { usePosSessionStore } from "@/stores/pos-session-store";
import { usePermission } from "@/hooks/use-permission";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { MoneyInput } from "@/components/shared/money-input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { DraftOrderLine } from "@/lib/restaurant/kot-mappers";

/**
 * Open Item Billing §5 — the touch-friendly popup for a one-off charge
 * ("Special Birthday Cake") rung against the shared generic OPENITEM menu
 * code, no new InventoryMaster record. Client-side checks here (blank
 * description, qty<=0, price out of Min/Max) mirror the backend's
 * ValidateOpenItemLinesAsync exactly for fast feedback, but the backend
 * re-validates unconditionally regardless of what this dialog allows —
 * see PosController/KOTController's own doc comments.
 */
export function OpenItemEntryDialog({
  open,
  onOpenChange,
  onAdd,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdd: (line: Omit<DraftOrderLine, "draftId">) => void;
}) {
  const t = useTranslations("openItem");
  const tc = useTranslations("common");
  const { can } = usePermission();
  const compId = useAuthStore((s) => s.user?.compId ?? "");
  const siteId = usePosSessionStore((s) => s.siteId ?? "");

  const [description, setDescription] = useState("");
  const [qty, setQty] = useState(1);
  const [unitPrice, setUnitPrice] = useState("0");
  const [taxCode, setTaxCode] = useState<string>("");
  const [stationCode, setStationCode] = useState<string>("");
  const [remarks, setRemarks] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [approvalOpen, setApprovalOpen] = useState(false);
  const [approverUser, setApproverUser] = useState("");
  const [approverPass, setApproverPass] = useState("");

  const { data: settings } = useQuery({
    queryKey: ["open-item-settings", compId, siteId],
    queryFn: () => openItemSettingsService.getBySite(compId, siteId),
    enabled: open && !!compId && !!siteId,
  });
  const { data: taxCodes = [] } = useQuery({
    queryKey: ["tax-codes", compId],
    queryFn: () => taxMasterService.getTaxCodes(compId),
    enabled: open && !!compId,
  });
  const { data: kitchens = [] } = useQuery({
    queryKey: ["kitchens", compId, siteId],
    queryFn: () => restaurantLookupService.getKitchens(compId, siteId),
    enabled: open && !!compId && !!siteId && !!settings?.openItemAllowKOT,
  });

  const canPriceEntry = !!settings?.allowOpenItemPriceEntry && can(PERMISSIONS.OPEN_ITEM_PRICE_ENTRY);
  const canTaxChange = !!settings?.allowOpenItemTaxChange && can(PERMISSIONS.OPEN_ITEM_TAX_CHANGE);
  const remarksRequired = !!settings?.openItemRemarksRequired;

  useEffect(() => {
    if (!open) return;
    setDescription("");
    setQty(1);
    setUnitPrice("0");
    setTaxCode("");
    setStationCode("");
    setRemarks("");
    setError(null);
  }, [open]);

  const priceNum = Number(unitPrice) || 0;
  const amount = qty * priceNum;
  const needsApproval = !!settings?.openItemManagerApproval && amount > (settings?.openItemApprovalAboveAmount ?? 0);

  const verifyApprovalMutation = useMutation({
    mutationFn: () => posAuthorizationService.verifySupervisor(approverUser, approverPass),
    onSuccess: (result) => {
      if (!result.authorized) {
        setError(result.reason ?? tc("errorGeneric"));
        return;
      }
      commit(result.userName ?? approverUser);
      setApprovalOpen(false);
      setApproverUser("");
      setApproverPass("");
    },
  });

  function validate(): string | null {
    if (!description.trim()) return t("descriptionRequired");
    if (qty <= 0) return t("quantityMustBePositive");
    if (priceNum < 0) return t("priceCannotBeNegative");
    if (remarksRequired && !remarks.trim()) return t("remarksRequired");
    if (settings?.openItemMaxPrice && settings.openItemMaxPrice > 0 && priceNum > settings.openItemMaxPrice)
      return t("maxPriceExceeded", { max: settings.openItemMaxPrice.toFixed(3) });
    if (settings?.openItemMinPrice && settings.openItemMinPrice > 0 && priceNum < settings.openItemMinPrice)
      return t("minPriceRequired", { min: settings.openItemMinPrice.toFixed(3) });
    return null;
  }

  function commit(approvedBy?: string) {
    onAdd({
      menuCode: settings?.openItemInventoryCode ?? "OPENITEM",
      menuName: description.trim(),
      rate: priceNum,
      qty,
      modifiers: [],
      preparationNotes: remarks || null,
      kitchenCode: settings?.openItemAllowKOT ? stationCode || null : null,
      isOpenItem: true,
      openItemDescription: description.trim(),
      openItemRemarks: remarks || null,
      approvedBy: approvedBy ?? null,
    });
    onOpenChange(false);
  }

  function handleAddToOrder() {
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }
    setError(null);
    if (needsApproval) {
      setApprovalOpen(true);
      return;
    }
    commit();
  }

  if (!settings?.enableOpenItem) return null;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{t("title")}</DialogTitle>
          </DialogHeader>

          <div className="space-y-3">
            <div className="space-y-1">
              <Label>{t("description")} *</Label>
              <Input value={description} onChange={(e) => setDescription(e.target.value)} autoFocus />
            </div>

            <div className="space-y-1">
              <Label>{t("quantity")} *</Label>
              <div className="flex items-center gap-2">
                <Button type="button" variant="outline" size="icon" onClick={() => setQty((q) => Math.max(1, q - 1))}>
                  −
                </Button>
                <Input
                  type="number"
                  min={0}
                  step="0.001"
                  value={qty}
                  onChange={(e) => setQty(Number(e.target.value) || 0)}
                  className="w-20 text-center"
                />
                <Button type="button" variant="outline" size="icon" onClick={() => setQty((q) => q + 1)}>
                  +
                </Button>
              </div>
            </div>

            <div className="space-y-1">
              <Label>{t("unitPrice")} *</Label>
              <MoneyInput value={unitPrice} onChange={(e) => setUnitPrice(e.target.value)} disabled={!canPriceEntry} />
            </div>

            <div className="space-y-1">
              <Label>{t("tax")}</Label>
              <Select value={taxCode} onValueChange={setTaxCode} disabled={!canTaxChange}>
                <SelectTrigger>
                  <SelectValue placeholder={t("tax")} />
                </SelectTrigger>
                <SelectContent>
                  {taxCodes.map((tx) => (
                    <SelectItem key={tx.code} value={tx.code}>
                      {tx.taxName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {settings.openItemAllowKOT && (
              <div className="space-y-1">
                <Label>{t("preparationStation")}</Label>
                <Select value={stationCode} onValueChange={setStationCode}>
                  <SelectTrigger>
                    <SelectValue placeholder={tc("none")} />
                  </SelectTrigger>
                  <SelectContent>
                    {kitchens.map((k) => (
                      <SelectItem key={k.code} value={k.code}>
                        {k.kitchenName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-1">
              <Label>
                {t("remarks")} {remarksRequired && "*"}
              </Label>
              <Textarea value={remarks} onChange={(e) => setRemarks(e.target.value)} rows={2} />
            </div>

            {error && <p className="text-sm font-medium text-destructive">{error}</p>}

            <div className="flex items-center justify-between border-t pt-2 text-sm font-semibold">
              <span>{tc("total")}</span>
              <span className="tabular-nums">{amount.toFixed(3)}</span>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              {tc("cancel")}
            </Button>
            <Button onClick={handleAddToOrder}>{t("addToOrder")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={approvalOpen} onOpenChange={setApprovalOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShieldAlert className="h-4 w-4 text-warning" />
              {t("managerApprovalRequired")}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>{t("supervisorUsername")}</Label>
              <Input value={approverUser} onChange={(e) => setApproverUser(e.target.value)} autoComplete="off" />
            </div>
            <div className="space-y-1">
              <Label>{t("supervisorPassword")}</Label>
              <Input
                type="password"
                value={approverPass}
                onChange={(e) => setApproverPass(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && verifyApprovalMutation.mutate()}
              />
            </div>
            {error && <p className="text-sm font-medium text-destructive">{error}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setApprovalOpen(false)}>
              {tc("cancel")}
            </Button>
            <Button
              disabled={!approverUser || !approverPass || verifyApprovalMutation.isPending}
              onClick={() => {
                setError(null);
                verifyApprovalMutation.mutate();
              }}
            >
              {t("approve")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
