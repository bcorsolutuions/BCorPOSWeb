"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Printer } from "lucide-react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ItemLabelPrint, ItemLabelSticker } from "@/components/masters/item-label-print";
import type { ItemMaster } from "@/types/item-master";

export function PrintLabelDialog({ item, onOpenChange }: { item: ItemMaster | null; onOpenChange: (open: boolean) => void }) {
  const t = useTranslations("item");
  const tc = useTranslations("common");
  const [quantity, setQuantity] = useState(1);

  return (
    <Dialog open={!!item} onOpenChange={(open) => !open && onOpenChange(false)}>
      <DialogContent className="max-w-xs">
        <DialogHeader>
          <DialogTitle>{t("printLabel")}</DialogTitle>
        </DialogHeader>

        {item && (
          <>
            <div className="space-y-1">
              <Label>{t("labelQuantity")}</Label>
              <Input
                type="number"
                min={1}
                max={100}
                value={quantity}
                onChange={(e) => setQuantity(Math.max(1, Math.min(100, Number(e.target.value) || 1)))}
              />
            </div>

            <div className="flex justify-center overflow-auto rounded-md border bg-muted/30 p-2">
              <ItemLabelSticker item={item} />
            </div>

            {/* Print-only: as many copies as `quantity` — the visible
                preview above always shows just one, matching ReceiptDialog's
                own "preview one, print the real thing" convention. */}
            <div className="label-print-area">
              <ItemLabelPrint item={item} quantity={quantity} />
            </div>
          </>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {tc("close")}
          </Button>
          <Button onClick={() => window.print()} disabled={!item}>
            <Printer className="me-1 h-4 w-4" />
            {t("printLabel")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
