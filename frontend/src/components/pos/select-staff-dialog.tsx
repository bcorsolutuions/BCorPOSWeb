"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import type { ServiceDto, StaffDto } from "@/types/salon";

/**
 * Shown when a service tile is tapped — picks who performs the service
 * before it's added to the cart (commission is tracked per line off
 * whoever's selected here; see calcCommission). "No staff" stays a valid
 * choice, a service line doesn't require one.
 */
export function SelectStaffDialog({
  service,
  staffList,
  onOpenChange,
  onConfirm,
}: {
  service: ServiceDto | null;
  staffList: StaffDto[];
  onOpenChange: (open: boolean) => void;
  onConfirm: (staff: StaffDto | null, quantity: number) => void;
}) {
  const t = useTranslations("salon");
  const tc = useTranslations("common");
  const open = !!service;

  const [selectedCode, setSelectedCode] = useState<string | null>(null);
  const [qty, setQty] = useState(1);

  useEffect(() => {
    if (open) {
      setSelectedCode(null);
      setQty(1);
    }
  }, [open, service?.code]);

  function handleConfirm() {
    const staff = staffList.find((s) => s.code === selectedCode) ?? null;
    onConfirm(staff, qty);
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{service?.serviceName}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <Label className="w-20">{t("quantity")}</Label>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="icon" onClick={() => setQty((q) => Math.max(1, q - 1))}>
                −
              </Button>
              <Input
                type="number"
                min={1}
                value={qty}
                onChange={(e) => setQty(Math.max(1, Number(e.target.value) || 1))}
                className="w-16 text-center"
              />
              <Button variant="outline" size="icon" onClick={() => setQty((q) => q + 1)}>
                +
              </Button>
            </div>
          </div>

          <div className="space-y-1">
            <Label>{t("selectStaff")}</Label>
            <div className="max-h-56 space-y-1 overflow-y-auto rounded-md border p-2">
              <button
                type="button"
                onClick={() => setSelectedCode(null)}
                className={cn(
                  "flex w-full items-center justify-between rounded-md px-2 py-1.5 text-start text-sm hover:bg-muted",
                  selectedCode === null && "bg-muted font-medium",
                )}
              >
                {tc("no")}
              </button>
              {staffList.map((s) => (
                <button
                  key={s.code}
                  type="button"
                  onClick={() => setSelectedCode(s.code)}
                  className={cn(
                    "flex w-full items-center justify-between rounded-md px-2 py-1.5 text-start text-sm hover:bg-muted",
                    selectedCode === s.code && "bg-muted font-medium",
                  )}
                >
                  <span>{s.staffName}</span>
                  {s.commissionPercent ? (
                    <span className="text-xs text-muted-foreground">{s.commissionPercent}%</span>
                  ) : null}
                </button>
              ))}
              {staffList.length === 0 && (
                <p className="py-4 text-center text-sm text-muted-foreground">{tc("noData")}</p>
              )}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {tc("cancel")}
          </Button>
          <Button onClick={handleConfirm}>{tc("add")}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
