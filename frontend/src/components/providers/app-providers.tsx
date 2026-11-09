"use client";

import { ReactNode, useState } from "react";
import { ThemeProvider } from "next-themes";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { LanguageProvider } from "@/i18n/language-provider";
import { RTLProvider } from "@/i18n/rtl-provider";
import { DevExtremeThemeLink } from "@/components/providers/devextreme-theme-link";
import { CustomThemeApplier } from "@/components/providers/custom-theme-applier";

export function AppProviders({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            refetchOnWindowFocus: false,
            retry: 1,
          },
        },
      }),
  );

  return (
    // attribute="class" matches tailwind.config.ts's darkMode: ["class"] —
    // next-themes toggles .dark/.light on <html> via a blocking inline
    // script rendered before hydration, which is exactly what the root
    // layout's suppressHydrationWarning on <html> is there to allow
    // (see app/[locale]/layout.tsx) without React flagging a mismatch.
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
      themes={["light", "dark", "system", "gulf", "mine"]}
    >
      <DevExtremeThemeLink />
      <CustomThemeApplier />
      <LanguageProvider>
        <RTLProvider>
          <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
        </RTLProvider>
      </LanguageProvider>
    </ThemeProvider>
  );
}
