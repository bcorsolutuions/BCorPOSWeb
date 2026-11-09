import type { ReactNode } from "react";
import type { Metadata } from "next";
import { AuthGuard } from "@/components/auth/auth-guard";
import { SiteSetupGate } from "@/components/pos/site-setup-gate";
import { MobileServiceWorkerRegister } from "@/components/mobile/mobile-sw-register";
import { MobileBottomNav } from "@/components/mobile/mobile-bottom-nav";

export const metadata: Metadata = {
  manifest: "/mobile-manifest.json",
  themeColor: "#0f172a",
};

/**
 * Waiter Mobile Ordering — the authenticated mobile PWA shell. Reuses
 * AuthGuard/SiteSetupGate verbatim from the desktop (pos) layout (same
 * session/site-selection rules, no second auth or site-setup flow), but
 * skips PosTopbar — each mobile screen owns its own compact MobileHeader
 * instead of a shared desktop-width topbar.
 */
export default function MobileAppLayout({ children }: { children: ReactNode }) {
  return (
    <AuthGuard>
      <MobileServiceWorkerRegister />
      <div className="mx-auto flex min-h-screen max-w-md flex-col bg-background">
        <div className="flex flex-1 flex-col">{children}</div>
        <MobileBottomNav />
      </div>
      <SiteSetupGate />
    </AuthGuard>
  );
}
