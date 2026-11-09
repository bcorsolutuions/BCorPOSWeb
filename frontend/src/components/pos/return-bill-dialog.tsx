"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useMutation } from "@tanstack/react-query";
import { RotateCcw } from "lucide-react";
import { posService } from "@/lib/api/services/pos-service";
import { useAuthStore } from "@/stores/auth-store";
import { usePosSessionStore } from "@/stores/pos-session-store";
import { usePosCartStore } from "@/stores/pos-cart-store";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

/**
 * "Return bill" lookup: the cashier enters the original bill's Ref No (the
 * number printed on the receipt, e.g. ADMS2600000038), we fetch that PosDto
 * whole, and load it into the cart as a return (see pos-cart-store.
 * startReturn / lib/pos/mappers.ts's isReturn sign-flip). The Ref No is kept
 * on the cart and saved as the return's SORefNo. A purely numeric entry is
 * still treated as the internal DocNo, as it was before.
 */
export function ReturnBillDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const t = useTranslations("pos");
  const compId = useAuthStore((s) => s.user?.compId ?? "");
  const siteId = usePosSessionStore((s) => s.siteId);
  const startReturn = usePosCartStore((s) => s.startReturn);
  const [refNo, setRefNo] = useState("");
  const [error, setError] = useState<string | null>(null);

  const lookupMutation = useMutation({
    mutationFn: () => {
      const value = refNo.trim();
      return /^\d+$/.test(value)
        ? posService.get(compId, siteId ?? "", Number(value))
        : posService.getByRefNo(compId, siteId ?? "", value);
    },
    onSuccess: (pos) => {
      startReturn(pos);
      setRefNo("");
      onOpenChange(false);
    },
    onError: () => setError(t("returnNotFound")),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xs">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <RotateCcw className="h-4 w-4" />
            {t("returnBill")}
          </DialogTitle>
          <DialogDescription>{t("returnBillLookup")}</DialogDescription>
        </DialogHeader>

        <Input
          value={refNo}
          onChange={(e) => setRefNo(e.target.value.toUpperCase().replace(/\s/g, ""))}
          placeholder={t("returnDocNoPlaceholder")}
          onKeyDown={(e) => e.key === "Enter" && refNo && lookupMutation.mutate()}
          autoFocus
        />
        {error && <p className="text-sm font-medium text-destructive">{error}</p>}

        <DialogFooter>
          <Button
            className="w-full"
            disabled={!refNo || lookupMutation.isPending}
            onClick={() => {
              setError(null);
              lookupMutation.mutate();
            }}
          >
            {t("returnBill")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
