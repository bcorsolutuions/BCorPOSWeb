import type { ReactNode } from "react";
import { LanguageSwitcher } from "@/components/layout/language-switcher";

export default function PublicLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-muted/30">
      <header className="flex items-center justify-end p-4">
        <LanguageSwitcher />
      </header>
      <main className="flex flex-1 items-center justify-center p-4">{children}</main>
    </div>
  );
}
