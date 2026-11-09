"use client";

import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import { navConfig, isNavGroup, type NavEntry } from "@/config/nav";
import { PermissionGate } from "@/components/auth/permission-gate";
import { useUiStore } from "@/stores/ui-store";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

function NavLink({
  href,
  label,
  Icon,
  active,
  collapsed,
}: {
  href: string;
  label: string;
  Icon: NavEntry["icon"];
  active: boolean;
  collapsed?: boolean;
}) {
  return (
    <Link
      href={href}
      title={collapsed ? label : undefined}
      className={cn(
        "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
        collapsed && "justify-center px-2",
        active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
      )}
    >
      <Icon className="h-4 w-4 shrink-0" />
      {!collapsed && <span className="truncate">{label}</span>}
    </Link>
  );
}

// Collapsed rail (ChatGPT-style: icons only) has no room for an inline
// accordion, so a group becomes a flyout menu off its icon instead — same
// items, just reached via a popover rather than an expanding section.
function CollapsedNavGroup({ entry, pathname }: { entry: Extract<NavEntry, { items: unknown[] }>; pathname: string }) {
  const t = useTranslations();
  const groupActive = entry.items.some((i) => pathname.startsWith(i.href));

  return (
    <PermissionGate permission={entry.permission}>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            title={t(entry.labelKey)}
            className={cn(
              "flex w-full items-center justify-center rounded-md px-2 py-2 text-sm font-medium transition-colors",
              groupActive
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
            )}
          >
            <entry.icon className="h-4 w-4 shrink-0" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent side="right" align="start" className="min-w-48">
          <DropdownMenuLabel>{t(entry.labelKey)}</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {entry.items.map((leaf) => (
            <PermissionGate key={leaf.href} permission={leaf.permission}>
              <DropdownMenuItem asChild>
                <Link href={leaf.href} className="flex items-center gap-2">
                  <leaf.icon className="h-4 w-4 shrink-0" />
                  <span className="truncate">{t(leaf.labelKey)}</span>
                </Link>
              </DropdownMenuItem>
            </PermissionGate>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </PermissionGate>
  );
}

function NavGroupItem({ entry, pathname }: { entry: Extract<NavEntry, { items: unknown[] }>; pathname: string }) {
  const t = useTranslations();

  return (
    <PermissionGate permission={entry.permission}>
      <AccordionItem value={entry.labelKey}>
        <AccordionTrigger>
          <entry.icon className="h-4 w-4 shrink-0" />
          <span className="flex-1 truncate text-start">{t(entry.labelKey)}</span>
        </AccordionTrigger>
        <AccordionContent>
          <div className="ms-4 flex flex-col gap-1 border-s ps-3">
            {entry.items.map((leaf) => (
              <PermissionGate key={leaf.href} permission={leaf.permission}>
                <NavLink href={leaf.href} label={t(leaf.labelKey)} Icon={leaf.icon} active={pathname.startsWith(leaf.href)} />
              </PermissionGate>
            ))}
          </div>
        </AccordionContent>
      </AccordionItem>
    </PermissionGate>
  );
}

export function Sidebar({ mobile = false }: { mobile?: boolean }) {
  const t = useTranslations();
  const pathname = usePathname();
  const collapsedState = useUiStore((s) => s.sidebarCollapsed);
  // The mobile Sheet in header.tsx renders this same component — it must
  // always be visible/expanded there regardless of the md breakpoint that
  // hides/collapses the inline desktop sidebar.
  const collapsed = mobile ? false : collapsedState;

  // Which group(s) should start open — mirrors the previous per-item
  // `containsActive` behavior, just lifted to the Accordion root since
  // Radix's open/closed set is tracked there rather than per-item.
  const openGroupKeys = navConfig
    .filter(isNavGroup)
    .filter((entry) => entry.items.some((i) => pathname.startsWith(i.href)))
    .map((entry) => entry.labelKey);

  return (
    <aside
      className={cn(
        "h-screen shrink-0 flex-col border-e bg-card transition-all",
        mobile ? "flex w-64" : "hidden md:flex",
        !mobile && (collapsed ? "w-16" : "w-64"),
      )}
    >
      <div className={cn("flex h-16 items-center gap-2 border-b px-4", collapsed && "justify-center px-2")}>
        <img src="/branding/logo.jpeg" alt="" className="h-8 w-8 shrink-0 rounded-md object-contain" />
        {!collapsed && <span className="truncate font-semibold">{t("app.name")}</span>}
      </div>
      <nav className="flex-1 overflow-y-auto p-3">
        {collapsed ? (
          <div className="flex flex-col gap-1">
            {navConfig.map((entry) =>
              isNavGroup(entry) ? (
                <CollapsedNavGroup key={entry.labelKey} entry={entry} pathname={pathname} />
              ) : (
                <PermissionGate key={entry.href} permission={entry.permission}>
                  <NavLink href={entry.href} label={t(entry.labelKey)} Icon={entry.icon} active={pathname.startsWith(entry.href)} collapsed />
                </PermissionGate>
              ),
            )}
          </div>
        ) : (
          <Accordion type="multiple" defaultValue={openGroupKeys} className="flex flex-col gap-1">
            {navConfig.map((entry) =>
              isNavGroup(entry) ? (
                <NavGroupItem key={entry.labelKey} entry={entry} pathname={pathname} />
              ) : (
                <PermissionGate key={entry.href} permission={entry.permission}>
                  <NavLink href={entry.href} label={t(entry.labelKey)} Icon={entry.icon} active={pathname.startsWith(entry.href)} />
                </PermissionGate>
              ),
            )}
          </Accordion>
        )}
      </nav>
    </aside>
  );
}
