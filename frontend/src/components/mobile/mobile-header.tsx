"use client";

import { ChevronLeft, LogOut, WifiOff } from "lucide-react";
import { useRouter } from "@/i18n/navigation";
import { useAuthStore } from "@/stores/auth-store";
import { useAuth } from "@/hooks/use-auth";
import { useOnlineStatus } from "@/hooks/use-online-status";
import { Button } from "@/components/ui/button";
import { LanguageSwitcher } from "@/components/layout/language-switcher";

/** Waiter Mobile Ordering §46 — always-visible table/context bar with back nav, logout, and network status. */
export function MobileHeader({ title, onBack }: { title: string; onBack?: () => void }) {
  const router = useRouter();
  const { logout } = useAuth();
  const userName = useAuthStore((s) => s.user?.userName ?? "");
  const online = useOnlineStatus();

  return (
    <header className="sticky top-0 z-10 flex items-center justify-between gap-2 border-b bg-background px-3 py-2">
      <div className="flex min-w-0 items-center gap-2">
        {onBack && (
          <Button variant="ghost" size="icon" className="h-9 w-9 shrink-0" onClick={() => (onBack ? onBack() : router.back())}>
            <ChevronLeft className="h-5 w-5" />
          </Button>
        )}
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">{title}</p>
          <p className="truncate text-xs text-muted-foreground">{userName}</p>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-1">
        {!online && <WifiOff className="h-4 w-4 text-destructive" aria-label="offline" />}
        <LanguageSwitcher />
        <Button variant="ghost" size="icon" className="h-9 w-9" onClick={logout}>
          <LogOut className="h-4 w-4" />
        </Button>
      </div>
    </header>
  );
}
