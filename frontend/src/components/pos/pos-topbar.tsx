"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { usePathname } from "next/navigation";
import { WifiOff, ArrowLeft, Building2 } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { LanguageSwitcher } from "@/components/layout/language-switcher";
import { CurrencySwitcher } from "@/components/layout/currency-switcher";
import { ThemeSwitcher } from "@/components/layout/theme-switcher";
import { UserMenu } from "@/components/layout/user-menu";
import { QrOrdersBell } from "@/components/pos/qr-orders-bell";
import { usePosSessionStore } from "@/stores/pos-session-store";

export function PosTopbar() {
  const t = useTranslations("pos");
  const [isOnline, setIsOnline] = useState(true);
  const pathname = usePathname();
  const siteId = usePosSessionStore((s) => s.siteId);
  const clearSiteId = usePosSessionStore((s) => s.clearSiteId);
  const resetTill = usePosSessionStore((s) => s.reset);
  // POS Billing (pos/sale) has its own Till Setup flow, configuring site +
  // terminal + shift together — switching branch there must reset all three
  // so Till Setup reappears with a clean slate, not just the site. Other
  // screens (SiteSetupGate) only ever set the branch and have no terminal/
  // shift concept, so they only need siteId cleared.
  const isSaleScreen = pathname.includes("/pos/sale");
  const showSwitchBranch = !!siteId;

  useEffect(() => {
    setIsOnline(navigator.onLine);
    const goOnline = () => setIsOnline(true);
    const goOffline = () => setIsOnline(false);
    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);
    return () => {
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
    };
  }, []);

  return (
    <header className="flex h-14 shrink-0 items-center gap-3 border-b bg-background px-4 short:h-11">
      <Link href="/dashboard" className="rounded-md p-2 hover:bg-accent" aria-label="Back to dashboard">
        <ArrowLeft className="h-4 w-4 rtl:rotate-180" />
      </Link>
      <span className="font-semibold">{t("title")}</span>

      {!isOnline && (
        <Badge variant="warning" className="gap-1">
          <WifiOff className="h-3 w-3" />
          {t("offline")}
        </Badge>
      )}

      <div className="ms-auto flex items-center gap-2">
        {showSwitchBranch && (
          <Button variant="outline" size="sm" onClick={() => (isSaleScreen ? resetTill() : clearSiteId())}>
            <Building2 className="me-1 h-4 w-4" />
            {t("switchBranch")}
          </Button>
        )}
        <QrOrdersBell />
        <CurrencySwitcher />
        <ThemeSwitcher />
        <LanguageSwitcher />
        <UserMenu />
      </div>
    </header>
  );
}
