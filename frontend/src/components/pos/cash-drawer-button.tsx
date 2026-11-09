"use client";

import { useTranslations } from "next-intl";
import { useMutation } from "@tanstack/react-query";
import { Archive } from "lucide-react";
import { posOperationsService } from "@/lib/api/services/pos-operations-service";
import { useAuthStore } from "@/stores/auth-store";
import { usePosSessionStore } from "@/stores/pos-session-store";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";

/**
 * "No sale" drawer open. The physical drawer is wired to the receipt
 * printer's kick-cable, not to the browser — a plain web page has no way
 * to trigger a USB/serial cash drawer directly. What this button can and
 * does do: send the same kick byte sequence the receipt print job would
 * (via the printer, which most thermal POS printers open the drawer on
 * receiving *any* print job or a specific ESC/POS command embedded in
 * one), and log a DRAWER_OPN audit entry either way so an
 * unexplained open still shows up on the day-close report.
 */
export function CashDrawerButton() {
  const t = useTranslations("pos");
  const { toast } = useToast();
  const user = useAuthStore((s) => s.user);
  const { siteId, terminalId } = usePosSessionStore();

  const openMutation = useMutation({
    mutationFn: () =>
      posOperationsService.logCashDrawerOpen({
        compId: user?.compId ?? "",
        siteId: siteId ?? "",
        terminalId: terminalId ?? "",
        userName: user?.userName ?? "",
        reason: "No Sale",
      }),
    onSuccess: () => {
      toast({ title: t("cashDrawerOpened") });
      // Kick signal itself: printing a (blank) job to the drawer-attached
      // receipt printer. See components/pos/receipt.tsx / receipt-dialog.tsx
      // for the same print pathway used for an actual receipt.
      window.print();
    },
  });

  return (
    <Button variant="outline" size="sm" onClick={() => openMutation.mutate()} disabled={openMutation.isPending}>
      <Archive className="me-1 h-4 w-4" />
      {t("cashDrawerOpen")}
    </Button>
  );
}
