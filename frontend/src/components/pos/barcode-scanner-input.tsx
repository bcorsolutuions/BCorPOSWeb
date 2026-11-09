"use client";

import { forwardRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Barcode, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { BarcodeKeypadDialog } from "@/components/pos/barcode-keypad-dialog";

/**
 * Doubles as the free-text product search box and the barcode-scan target:
 * USB/Bluetooth barcode scanners emulate a keyboard (fast keystrokes then
 * Enter), so a plain text input already receives a scan correctly — no
 * special capture logic is needed, just an onScan callback fired on Enter
 * so the caller can try an exact-barcode lookup before falling back to the
 * live text-search filter that's already running on every keystroke.
 * Forwards its ref so the "F1 focus search" keyboard shortcut can jump here.
 */
export const BarcodeScannerInput = forwardRef<
  HTMLInputElement,
  {
    value: string;
    onValueChange: (value: string) => void;
    onScan: (code: string) => void;
    onQuantitySet?: (qty: number) => void;
  }
>(function BarcodeScannerInput({ value, onValueChange, onScan, onQuantitySet }, ref) {
  const t = useTranslations("pos");
  const [focused, setFocused] = useState(false);
  const [keypadOpen, setKeypadOpen] = useState(false);

  return (
    <div className="relative w-full">
      <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        ref={ref}
        value={value}
        onChange={(e) => onValueChange(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && value.trim()) {
            onScan(value.trim());
          }
        }}
        placeholder={t("searchProduct")}
        className="h-11 ps-9 pe-9 text-base"
      />
      <button
        type="button"
        aria-label={t("enterBarcode")}
        onClick={() => setKeypadOpen(true)}
        className="absolute end-3 top-1/2 -translate-y-1/2"
      >
        <Barcode className={`h-4 w-4 ${focused ? "text-primary" : "text-muted-foreground"}`} />
      </button>

      <BarcodeKeypadDialog
        open={keypadOpen}
        onOpenChange={setKeypadOpen}
        onSubmit={(code) => {
          onScan(code);
          setKeypadOpen(false);
        }}
        onQuantitySet={onQuantitySet}
      />
    </div>
  );
});
