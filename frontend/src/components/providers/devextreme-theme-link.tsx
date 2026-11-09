"use client";

import { useEffect } from "react";
import { useTheme } from "next-themes";

// DevExtreme's grid/toolbar/pager chrome is a separate CSS framework from
// Tailwind — it doesn't see the .dark class next-themes toggles on <html>,
// so DataGridWrapper previously had a single, permanent
// `import "devextreme/dist/css/dx.light.css"`, which is why the grid never
// followed dark mode. Fixed by swapping a real <link> tag's href instead
// (a plain ES import can't be un-imported/replaced at runtime — a <link>
// can). The two theme files are copied into public/devextreme-themes/ (see
// that folder) since Next can't serve node_modules content directly.
// "gulf" is a light-background palette (see globals.css's .gulf block), so
// it uses the light DevExtreme skin too.
const DX_THEME_HREF: Record<string, string> = {
  light: "/devextreme-themes/dx.light.css",
  dark: "/devextreme-themes/dx.dark.css",
  gulf: "/devextreme-themes/dx.light.css",
  mine: "/devextreme-themes/dx.light.css",
};

const LINK_ID = "dx-theme-stylesheet";

// Only relevant when DevExtreme is the active grid provider — see
// data-grid-wrapper.tsx. When the free (default) provider is active, don't
// bother creating/touching this <link> at all (and the root layout skips
// rendering its server-side default counterpart too).
const isDevExtremeActive = process.env.NEXT_PUBLIC_GRID_PROVIDER === "devextreme";

export function DevExtremeThemeLink() {
  const { resolvedTheme } = useTheme();

  useEffect(() => {
    if (!isDevExtremeActive) return;
    const defaultHref = "/devextreme-themes/dx.light.css";
    const href = DX_THEME_HREF[resolvedTheme ?? "light"] ?? defaultHref;

    let link = document.getElementById(LINK_ID) as HTMLLinkElement | null;
    if (!link) {
      link = document.createElement("link");
      link.id = LINK_ID;
      link.rel = "stylesheet";
      document.head.appendChild(link);
    }
    if (!link.href.endsWith(href)) {
      link.href = href;
    }
  }, [resolvedTheme]);

  return null;
}
