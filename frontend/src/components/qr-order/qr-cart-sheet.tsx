"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Trash2 } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useCurrencyStore } from "@/stores/currency-store";
import { formatMoney } from "@/lib/utils";
import type { QrCartLine, QrTableInfoDto } from "@/types/qr-order";

export function QrCartSheet({
  open,
  onOpenChange,
  lines,
  tableInfo,
  onRemoveLine,
  onPlaceOrder,
  isPlacing,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lines: QrCartLine[];
  tableInfo: QrTableInfoDto;
  onRemoveLine: (draftId: string) => void;
  onPlaceOrder: (input: { customerName: string; customerMobile: string; couponCode: string; remarks: string }) => void;
  isPlacing: boolean;
}) {
  const t = useTranslations("qrMenu");
  const locale = useLocale();
  const currency = useCurrencyStore((s) => s.currencyCode);

  const [customerName, setCustomerName] = useState("");
  const [customerMobile, setCustomerMobile] = useState("");
  const [couponCode, setCouponCode] = useState("");
  const [remarks, setRemarks] = useState("");

  const subtotal = lines.reduce((sum, l) => sum + l.unitPrice * l.qty, 0);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="flex max-h-[90vh] flex-col overflow-y-auto rounded-t-xl">
        <SheetHeader>
          <SheetTitle>{t("cart")}</SheetTitle>
        </SheetHeader>

        {lines.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">{t("emptyCart")}</p>
        ) : (
          <div className="flex-1 space-y-3 overflow-y-auto py-2">
            {lines.map((line) => (
              <div key={line.draftId} className="flex items-start justify-between gap-2 border-b pb-2">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">
                    {line.qty} × {line.name}
                  </p>
                  {line.modifiers && line.modifiers.length > 0 && (
                    <p className="truncate text-xs text-muted-foreground">{line.modifiers.map((m) => m.name).join(", ")}</p>
                  )}
                  {line.specialInstructions && <p className="truncate text-xs italic text-muted-foreground">{line.specialInstructions}</p>}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium tabular-nums">{formatMoney(line.unitPrice * line.qty, currency, locale)}</span>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onRemoveLine(line.draftId)}>
                    <Trash2 className="h-3.5 w-3.5 text-destructive" />
                  </Button>
                </div>
              </div>
            ))}

            <div className="space-y-2 pt-2">
              {tableInfo.askCustomerName && (
                <div className="space-y-1">
                  <Label className="text-xs">{t("customerName")}</Label>
                  <Input value={customerName} onChange={(e) => setCustomerName(e.target.value)} maxLength={150} />
                </div>
              )}
              {tableInfo.askMobileNumber && (
                <div className="space-y-1">
                  <Label className="text-xs">{t("customerMobile")}</Label>
                  <Input value={customerMobile} onChange={(e) => setCustomerMobile(e.target.value)} maxLength={20} />
                </div>
              )}
              {tableInfo.allowCoupon && (
                <div className="flex items-end gap-2">
                  <div className="flex-1 space-y-1">
                    <Label className="text-xs">{t("couponCode")}</Label>
                    <Input value={couponCode} onChange={(e) => setCouponCode(e.target.value.toUpperCase())} maxLength={30} />
                  </div>
                </div>
              )}
              <div className="space-y-1">
                <Label className="text-xs">{t("remarksPlaceholder")}</Label>
                <Textarea value={remarks} onChange={(e) => setRemarks(e.target.value.slice(0, 500))} rows={2} />
              </div>
            </div>

            <div className="flex items-center justify-between border-t pt-3 text-base font-semibold">
              <span>{t("subtotal")}</span>
              <span>{formatMoney(subtotal, currency, locale)}</span>
            </div>
            <p className="text-xs text-muted-foreground">{t("tax")} & {t("promotionDiscount")} — {t("total")}</p>
          </div>
        )}

        <Button
          className="w-full"
          size="lg"
          disabled={lines.length === 0 || isPlacing}
          onClick={() => onPlaceOrder({ customerName, customerMobile, couponCode, remarks })}
        >
          {isPlacing ? t("placingOrder") : t("placeOrder")}
        </Button>
      </SheetContent>
    </Sheet>
  );
}
