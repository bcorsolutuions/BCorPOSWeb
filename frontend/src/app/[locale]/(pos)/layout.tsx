import type { ReactNode } from "react";
import { AuthGuard } from "@/components/auth/auth-guard";
import { PosTopbar } from "@/components/pos/pos-topbar";
import { SiteSetupGate } from "@/components/pos/site-setup-gate";

export default function PosLayout({ children }: { children: ReactNode }) {
  return (
    <AuthGuard>
      <div className="flex h-screen flex-col overflow-hidden bg-muted/20">
        <PosTopbar />
        <main className="min-h-0 flex-1 overflow-hidden">{children}</main>
      </div>
      <SiteSetupGate />
    </AuthGuard>
  );
}
