"use client";

import { useLocale, useTranslations } from "next-intl";
import { Monitor } from "lucide-react";
import { Button } from "@/components/ui/button";

// Opens (or refocuses — browsers reuse a window.open target name) the
// Customer Display in a second window, meant to be dragged onto a
// customer-facing monitor/TV attached to the same POS PC. See
// hooks/use-customer-display-sync.ts for the live BroadcastChannel feed
// this window listens on, keyed by the same terminalId.
export function CustomerDisplayButton({ terminalId }: { terminalId: string }) {
  const t = useTranslations("pos");
  const locale = useLocale();

  function openDisplay() {
    const url = `/${locale}/pos-display?terminal=${encodeURIComponent(terminalId)}`;
    window.open(
      url,
      "bcor-customer-display",
      "width=1024,height=768,menubar=no,toolbar=no,location=no,status=no",
    );
  }

  return (
    <Button type="button" variant="outline" size="sm" onClick={openDisplay}>
      <Monitor className="me-1 h-4 w-4" />
      {t("customerDisplay")}
    </Button>
  );
}
