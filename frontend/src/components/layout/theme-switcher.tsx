"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { useTheme } from "next-themes";
import { Moon, Sun, Monitor, Gem, Palette, SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ThemeCustomizer } from "@/components/layout/theme-customizer";

const THEMES = ["light", "dark", "system", "gulf", "mine"] as const;
const THEME_ICONS = { light: Sun, dark: Moon, system: Monitor, gulf: Gem, mine: Palette };

export function ThemeSwitcher() {
  const t = useTranslations("theme");
  const { theme, setTheme, resolvedTheme } = useTheme();
  // next-themes only knows the real theme after mount (it reads
  // localStorage/system preference client-side) — render a neutral icon
  // until then so SSR/first paint doesn't guess and mismatch.
  const [mounted, setMounted] = useState(false);
  const [customizeOpen, setCustomizeOpen] = useState(false);
  useEffect(() => setMounted(true), []);

  const ActiveIcon = mounted ? THEME_ICONS[(resolvedTheme as "light" | "dark" | "gulf" | "mine") ?? "light"] : Monitor;

  return (
    <>
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Switch theme">
          <ActiveIcon className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {THEMES.map((option) => {
          const Icon = THEME_ICONS[option];
          return (
            <DropdownMenuItem
              key={option}
              onClick={() => setTheme(option)}
              className={option === theme ? "font-semibold" : ""}
            >
              <Icon className="me-2 h-4 w-4" />
              {t(option)}
            </DropdownMenuItem>
          );
        })}
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => setCustomizeOpen(true)}>
          <SlidersHorizontal className="me-2 h-4 w-4" />
          {t("customize")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
    <ThemeCustomizer open={customizeOpen} onOpenChange={setCustomizeOpen} />
    </>
  );
}
