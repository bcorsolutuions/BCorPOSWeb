"use client";

import type { ReactNode } from "react";
import { AuthGuard } from "@/components/auth/auth-guard";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { ChatWidget } from "@/components/layout/chat-widget";
import { useLicenseGuard } from "@/hooks/use-license-guard";
import { LicenseStatusBanner } from "@/components/license/license-status-banner";
import { LicenseBlockedScreen } from "@/components/license/license-blocked-screen";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const licenseState = useLicenseGuard();

  return (
    <AuthGuard>
      <div className="flex h-screen overflow-hidden">
        <Sidebar />
        <div className="flex min-w-0 flex-1 flex-col">
          <Header />
          {licenseState.kind === "warning" && <LicenseStatusBanner daysRemaining={licenseState.daysRemaining} />}
          <main className="flex-1 overflow-y-auto p-6">{children}</main>
        </div>
      </div>
      <ChatWidget />
      {licenseState.kind === "blocked" && <LicenseBlockedScreen message={licenseState.message} />}
    </AuthGuard>
  );
}
