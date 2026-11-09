"use client";

import { useTranslations } from "next-intl";
import { ChefHat, Home, LayoutGrid, Receipt } from "lucide-react";
import { Link, usePathname } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

const ITEMS = [
  { key: "navHome", href: "/mobile", icon: Home },
  { key: "navTables", href: "/mobile/tables", icon: LayoutGrid },
  { key: "navKitchen", href: "/mobile/kitchen-status", icon: ChefHat },
  { key: "navBills", href: "/mobile/bill-requests", icon: Receipt },
] as const;

/**
 * The waiter app's bottom tab bar - four big targets reachable with a thumb. Hidden on the order screen
 * (/mobile/tables/<code>), which has its own sticky "View order" bar in the same spot.
 */
export function MobileBottomNav() {
  const t = useTranslations("mobileWaiter");
  const pathname = usePathname();

  if (/^\/mobile\/tables\/(?!mine$)[^/]+$/.test(pathname)) return null;

  return (
    <nav className="sticky bottom-0 z-10 grid grid-cols-4 border-t bg-background pb-[env(safe-area-inset-bottom)]">
      {ITEMS.map((item) => {
        const active = item.href === "/mobile" ? pathname === "/mobile" : pathname.startsWith(item.href);
        return (
          <Link
            key={item.key}
            href={item.href as never}
            className={cn(
              "flex h-16 flex-col items-center justify-center gap-1 text-[11px] font-medium transition-colors",
              active ? "text-primary" : "text-muted-foreground",
            )}
          >
            <item.icon className={cn("h-5 w-5", active && "stroke-[2.5]")} />
            {t(item.key)}
          </Link>
        );
      })}
    </nav>
  );
}
