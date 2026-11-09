"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { AlertTriangle, X } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";

export function LicenseStatusBanner({ daysRemaining }: { daysRemaining: number | null }) {
  const t = useTranslations("licenseGuard");
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  return (
    <div className="flex items-center gap-3 border-b border-warning/30 bg-warning/10 px-4 py-2 text-sm text-warning-foreground">
      <AlertTriangle className="h-4 w-4 shrink-0 text-warning" />
      <span className="flex-1">
        {daysRemaining != null && daysRemaining >= 0
          ? t("expiringSoon", { days: daysRemaining })
          : t("expiringSoonUnknown")}
      </span>
      <Button asChild variant="outline" size="sm">
        <Link href="/license">{t("viewLicense")}</Link>
      </Button>
      <button
        type="button"
        onClick={() => setDismissed(true)}
        aria-label={t("dismiss")}
        className="shrink-0 rounded p-1 hover:bg-warning/20"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
