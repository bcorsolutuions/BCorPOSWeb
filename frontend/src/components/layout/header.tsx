"use client";

import { useTranslations } from "next-intl";
import { Bell, Menu, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Breadcrumb } from "@/components/layout/breadcrumb";
import { BranchCompanySwitcher } from "@/components/layout/branch-company-switcher";
import { LanguageSwitcher } from "@/components/layout/language-switcher";
import { CurrencySwitcher } from "@/components/layout/currency-switcher";
import { ThemeSwitcher } from "@/components/layout/theme-switcher";
import { UserMenu } from "@/components/layout/user-menu";
import { Sidebar } from "@/components/layout/sidebar";
import { useUiStore } from "@/stores/ui-store";

export function Header() {
  const t = useTranslations("license");
  const { sidebarCollapsed, toggleSidebar } = useUiStore();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="flex h-16 items-center gap-3 border-b bg-background px-4">
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetTrigger asChild>
          <Button variant="ghost" size="icon" className="md:hidden" aria-label="Open menu">
            <Menu className="h-5 w-5" />
          </Button>
        </SheetTrigger>
        <SheetContent side="start" className="w-64 p-0">
          <Sidebar mobile />
        </SheetContent>
      </Sheet>

      <Button variant="ghost" size="icon" className="hidden md:inline-flex" onClick={toggleSidebar}>
        {sidebarCollapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
      </Button>

      <Breadcrumb />

      <div className="ms-auto flex items-center gap-2">
        <BranchCompanySwitcher />
        <Badge variant="success" className="hidden sm:inline-flex">
          {t("status")}: Active
        </Badge>
        <Button variant="ghost" size="icon" aria-label="Notifications">
          <Bell className="h-4 w-4" />
        </Button>
        <CurrencySwitcher />
        <ThemeSwitcher />
        <LanguageSwitcher />
        <UserMenu />
      </div>
    </header>
  );
}
