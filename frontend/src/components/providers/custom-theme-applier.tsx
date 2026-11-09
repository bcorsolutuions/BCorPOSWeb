"use client";

import { useEffect } from "react";
import { useTheme } from "next-themes";
import { applyCustomTheme, clearCustomTheme, loadCustomTheme } from "@/lib/theme/custom-theme";

// Applies the saved "My mode" colours while that theme is active and removes them for every other theme,
// so Light / Dark / Gulf never inherit a custom value. (The first paint is handled by the inline boot script
// in the root layout; this keeps things right after hydration and on theme changes.)
export function CustomThemeApplier() {
  const { resolvedTheme } = useTheme();

  useEffect(() => {
    if (resolvedTheme === "mine") applyCustomTheme(loadCustomTheme());
    else clearCustomTheme();
  }, [resolvedTheme]);

  return null;
}
