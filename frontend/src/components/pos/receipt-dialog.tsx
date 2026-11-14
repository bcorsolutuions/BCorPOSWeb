"use client";

import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Printer } from "lucide-react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Receipt } from "@/components/pos/receipt";
import { locales, localeLabels, type Locale } from "@/i18n/config";
import { cn } from "@/lib/utils";
import type { PosDto } from "@/types/pos";

export function ReceiptDialog({
  open,
  onOpenChange,
  pos,
  autoPrint = false,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pos: PosDto | null;
  /** Print the receipt as soon as it shows, then close (used by the one-tap Cash / Card / BenefitPay buttons). */
  autoPrint?: boolean;
}) {
  const t = useTranslations("pos");
  const tc = useTranslations("common");
  const appLocale = useLocale() as Locale;
  const [printLocale, setPrintLocale] = useState<Locale>(appLocale);

  // One-tap payments (Cash / Card / BenefitPay) print the receipt straight away: wait a moment for the print-only twin below to be
  // mounted, print, then close so the till is ready for the next sale. The browser shows its print window unless it runs in kiosk-printing mode.
  useEffect(() => {
    if (!open || !autoPrint || !pos) return;
    const id = window.setTimeout(() => {
      window.print();
      onOpenChange(false);
    }, 300);
    return () => window.clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, autoPrint, pos]);

  if (!pos) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{t("printReceipt")}</DialogTitle>
        </DialogHeader>

        {/* Receipt language is independent of the cashier's own UI language —
            a customer may want an Arabic receipt regardless of till locale. */}
        <div className="flex justify-center gap-2">
          {locales.map((l) => (
            <button
              key={l}
              onClick={() => setPrintLocale(l)}
              className={cn(
                "rounded-md border px-3 py-1 text-sm",
                printLocale === l ? "border-primary bg-primary/10 text-primary" : "hover:bg-accent",
              )}
            >
              {localeLabels[l]}
            </button>
          ))}
        </div>

        <div className="max-h-[60vh] overflow-y-auto rounded-md border bg-muted/30 p-2">
          <Receipt pos={pos} locale={printLocale} />
        </div>

        {/* Print-only twin: globals.css hides it on screen and hides
            everything else except it under @media print, so the visible
            preview above can stay scrollable/scaled without that affecting
            the actual print layout. */}
        <div className="receipt-print-area">
          <Receipt pos={pos} locale={printLocale} />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {tc("close")}
          </Button>
          <Button onClick={() => window.print()}>
            <Printer className="me-1 h-4 w-4" />
            {t("printReceipt")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
