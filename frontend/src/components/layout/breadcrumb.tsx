"use client";

import { useTranslations } from "next-intl";
import { ChevronRight, ChevronLeft } from "lucide-react";
import { Link, usePathname } from "@/i18n/navigation";
import { useDirection } from "@/i18n/use-direction";

export function Breadcrumb() {
  const pathname = usePathname();
  const t = useTranslations("nav");
  const { choose } = useDirection();
  const Separator = choose(ChevronRight, ChevronLeft);
  const segments = pathname.split("/").filter(Boolean);

  if (segments.length === 0) return null;

  return (
    <nav className="flex items-center gap-1 text-sm text-muted-foreground" aria-label="Breadcrumb">
      <Link href="/dashboard" className="hover:text-foreground">
        {t("dashboard")}
      </Link>
      {segments.map((segment, idx) => {
        const href = "/" + segments.slice(0, idx + 1).join("/");
        const isLast = idx === segments.length - 1;
        const label = segment
          .split("-")
          .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
          .join(" ");
        return (
          <span key={href} className="flex items-center gap-1">
            <Separator className="h-3.5 w-3.5" />
            {isLast ? (
              <span className="font-medium text-foreground">{label}</span>
            ) : (
              <Link href={href} className="hover:text-foreground">
                {label}
              </Link>
            )}
          </span>
        );
      })}
    </nav>
  );
}
