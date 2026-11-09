"use client";

import { useTranslations } from "next-intl";
import { ShieldAlert } from "lucide-react";
import { usePathname, Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";

export function LicenseBlockedScreen({ message }: { message: string }) {
  const t = useTranslations("licenseGuard");
  const pathname = usePathname();

  // Per the plan's validation-flow: the tenant can still reach their own
  // /license page to see status/renew instructions even while blocked.
  if (pathname.startsWith("/license")) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background/95 backdrop-blur-sm">
      <div className="mx-4 flex max-w-md flex-col items-center gap-4 text-center">
        <ShieldAlert className="h-12 w-12 text-destructive" />
        <h1 className="text-xl font-semibold">{t("blockedTitle")}</h1>
        <p className="text-sm text-muted-foreground">{message}</p>
        <Button asChild>
          <Link href="/license">{t("viewLicense")}</Link>
        </Button>
      </div>
    </div>
  );
}
