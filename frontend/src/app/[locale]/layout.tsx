import type { ReactNode } from "react";
import type { Metadata } from "next";
import { NextIntlClientProvider } from "next-intl";
import { getMessages } from "next-intl/server";
import { Inter, Noto_Kufi_Arabic } from "next/font/google";
import { notFound } from "next/navigation";
import { locales, isRtl, type Locale } from "@/i18n/config";
import { CUSTOM_THEME_BOOT_SCRIPT } from "@/lib/theme/custom-theme";
import { AppProviders } from "@/components/providers/app-providers";
import { Toaster } from "@/components/ui/toaster";
import "@/styles/globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans", display: "swap" });
const notoKufiArabic = Noto_Kufi_Arabic({
  subsets: ["arabic"],
  variable: "--font-arabic",
  display: "swap",
});

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

// This app is an authenticated, client-data-driven admin/POS tool, not a
// static site — every route under here reads the logged-in user's own
// data (zustand stores, react-query against BCorDFWebApi) and has nothing
// meaningful to prerender. Forcing dynamic rendering avoids fighting
// Next's static-export attempt on pages that use headers()/cookies()
// indirectly via next-intl's locale resolution (see next-intl's own
// `setRequestLocale` static-rendering escape hatch, which doesn't fit an
// app this dynamic anyway).
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "SMART POS Enterprise",
  description: "Multi-tenant, multi-branch POS & retail management platform",
};

export default async function LocaleLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  if (!locales.includes(locale as Locale)) {
    notFound();
  }

  const messages = await getMessages();
  const dir = isRtl(locale) ? "rtl" : "ltr";

  return (
    <html lang={locale} dir={dir} suppressHydrationWarning>
      <head>
        {/* Saved "My mode" colours are applied here, before first paint, so a reload doesn't flash the default palette. */}
        <script dangerouslySetInnerHTML={{ __html: CUSTOM_THEME_BOOT_SCRIPT }} />
        {/* Only rendered when DevExtreme is the active grid provider (see
            data-grid-wrapper.tsx / NEXT_PUBLIC_GRID_PROVIDER) — server-
            rendered so grids aren't unstyled before hydration, then
            DevExtremeThemeLink swaps this link's href to dark/gulf
            client-side once next-themes knows the real resolved theme. */}
        {process.env.NEXT_PUBLIC_GRID_PROVIDER === "devextreme" && (
          <link id="dx-theme-stylesheet" rel="stylesheet" href="/devextreme-themes/dx.light.css" />
        )}
      </head>
      <body className={`${inter.variable} ${notoKufiArabic.variable} min-h-screen antialiased`}>
        <NextIntlClientProvider locale={locale} messages={messages}>
          <AppProviders>
            {children}
            <Toaster />
          </AppProviders>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
