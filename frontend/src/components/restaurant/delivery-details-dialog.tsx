"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export interface DeliveryDetails {
  customerName: string;
  customerPhone: string;
  address: string;
}

// Shown before settling a bill whose order type requires an address/driver
// (Delivery, Online Delivery — see OrderTypeMaster.RequiresAddress/RequiresDriver).
// Captured details are passed straight into the auto-created DeliveryOrder at
// settle time — not persisted on the KOT/POS itself, so this needed no
// backend schema change.
export function DeliveryDetailsDialog({
  open,
  onOpenChange,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (details: DeliveryDetails) => void;
}) {
  const t = useTranslations("delivery");
  const tc = useTranslations("common");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [address, setAddress] = useState("");

  function handleConfirm() {
    onConfirm({ customerName, customerPhone, address });
    setCustomerName("");
    setCustomerPhone("");
    setAddress("");
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{t("deliveryDetails")}</DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <div className="space-y-1">
            <Label>{tc("name")}</Label>
            <Input value={customerName} onChange={(e) => setCustomerName(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label>{t("phone")}</Label>
            <Input value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label>{t("address")}</Label>
            <Input value={address} onChange={(e) => setAddress(e.target.value)} />
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            {tc("cancel")}
          </Button>
          <Button type="button" disabled={!customerName || !customerPhone || !address} onClick={handleConfirm}>
            {tc("continue")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
