"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Delete } from "lucide-react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9"];

// Calculator-style numeric keypad for entering a barcode by hand on
// touchscreen POS terminals with no physical keyboard — the scanner-input
// text box otherwise relies entirely on a hardware scanner's keyboard-wedge
// input (see barcode-scanner-input.tsx). Submits through the same onScan
// path a real scan uses, so callers need no changes.
//
// When `onQuantitySet` is supplied (supermarket scan-mode only — see
// SupermarketScanPanel), a second "Qty" tab appears alongside "Code": a
// cashier can type a quantity and hit "Set Qty" to apply a multiplier to the
// *next* scan/code entry (e.g. type 3, then scan → adds 3 units), without
// leaving this same dialog. Non-supermarket call sites pass nothing new and
// see zero UI change — only the Code tab's single-buffer keypad, as before.
export function BarcodeKeypadDialog({
  open,
  onOpenChange,
  onSubmit,
  onQuantitySet,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (code: string) => void;
  onQuantitySet?: (qty: number) => void;
}) {
  const t = useTranslations("pos");
  const tc = useTranslations("common");
  const showQtyTab = !!onQuantitySet;
  const [mode, setMode] = useState<"code" | "qty">("code");
  const [code, setCode] = useState("");
  const [qty, setQty] = useState("");
  // Local echo of the last-applied quantity, purely so the Code tab can show
  // "×3 will be added" — the dialog has no readback of the parent's actual
  // pending-qty state (onQuantitySet is a one-way callback).
  const [appliedQty, setAppliedQty] = useState<number | null>(null);

  const buffer = mode === "qty" ? qty : code;
  const setBuffer = mode === "qty" ? setQty : setCode;

  function handleClose(nextOpen: boolean) {
    if (!nextOpen) {
      setCode("");
      setQty("");
      setMode("code");
      setAppliedQty(null);
    }
    onOpenChange(nextOpen);
  }

  function handleSubmitCode() {
    if (!code) return;
    onSubmit(code);
    setCode("");
    setAppliedQty(null);
  }

  function handleSetQuantity() {
    const n = Number(qty);
    if (!qty || !Number.isFinite(n) || n <= 0) return;
    onQuantitySet?.(n);
    setQty("");
    setAppliedQty(n);
    // Switch to the Code tab instead of closing — closing here used to wipe
    // out anything already typed in the Code buffer (handleClose resets both
    // on close), so setting quantity after typing a code would silently
    // discard the code. Staying open lets qty + code be set in one session:
    // set the multiplier, then type/confirm the code right after.
    setMode("code");
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-xs">
        <DialogHeader>
          <DialogTitle>{mode === "qty" ? t("enterQuantity") : t("manualBarcodeEntry")}</DialogTitle>
        </DialogHeader>

        {showQtyTab && (
          <div className="grid grid-cols-2 gap-1 rounded-md bg-muted p-1">
            <Button
              type="button"
              size="sm"
              variant={mode === "code" ? "default" : "ghost"}
              onClick={() => setMode("code")}
            >
              {t("enterCode")}
            </Button>
            <Button type="button" size="sm" variant={mode === "qty" ? "default" : "ghost"} onClick={() => setMode("qty")}>
              {t("enterQuantity")}
            </Button>
          </div>
        )}

        {mode === "code" && appliedQty && appliedQty > 1 && (
          <p className="text-center text-xs font-medium text-primary">{t("scanQtyHint", { qty: appliedQty })}</p>
        )}

        <div className="rounded-md border bg-muted p-3 text-center text-2xl font-semibold tabular-nums">
          {buffer || " "}
        </div>

        <div className="grid grid-cols-3 gap-2">
          {KEYS.map((k) => (
            <Button
              key={k}
              type="button"
              variant="outline"
              size="lg"
              className="h-14 text-xl"
              onClick={() => setBuffer((c) => c + k)}
            >
              {k}
            </Button>
          ))}
          <Button type="button" variant="outline" size="lg" className="h-14 text-sm" onClick={() => setBuffer("")}>
            {tc("clear")}
          </Button>
          <Button type="button" variant="outline" size="lg" className="h-14 text-xl" onClick={() => setBuffer((c) => c + "0")}>
            0
          </Button>
          <Button
            type="button"
            variant="outline"
            size="lg"
            className="h-14"
            onClick={() => setBuffer((c) => c.slice(0, -1))}
          >
            <Delete className="h-5 w-5" />
          </Button>
        </div>

        <DialogFooter className="gap-2 sm:justify-between">
          <Button type="button" variant="outline" onClick={() => handleClose(false)}>
            {tc("cancel")}
          </Button>
          {mode === "qty" ? (
            <Button type="button" size="lg" disabled={!qty} onClick={handleSetQuantity} className={cn("min-w-32")}>
              {t("setQuantity")} {qty ? `×${qty}` : ""}
            </Button>
          ) : (
            <Button type="button" size="lg" disabled={!code} onClick={handleSubmitCode}>
              {tc("confirm")} {appliedQty && appliedQty > 1 ? `×${appliedQty}` : ""}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
