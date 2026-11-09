"use client";

import { createContext, useContext, useEffect, useRef, type ReactNode } from "react";
import { useSearchParams } from "next/navigation";
import { useLocale } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";
import { locales, localeLabels, type Locale } from "@/i18n/config";

const STORAGE_KEY = "bcor-pos-language";

interface LanguageContextValue {
  language: Locale;
  languages: readonly Locale[];
  languageLabels: Record<Locale, string>;
  setLanguage: (next: Locale) => void;
}

const LanguageContext = createContext<LanguageContextValue | null>(null);

function readStoredLanguage(): Locale | null {
  if (typeof window === "undefined") return null;
  const stored = window.localStorage.getItem(STORAGE_KEY);
  return locales.includes(stored as Locale) ? (stored as Locale) : null;
}

/**
 * Owns the "which language is active" decision end to end:
 *  - URL locale segment (`/en/...`, `/ar/...`) stays the source of truth
 *    for routing/SSR, exactly as next-intl expects.
 *  - localStorage remembers the user's last choice across sessions/tabs
 *    (per the bilingual-support spec) and is what the very first client
 *    render reconciles against — if a user bookmarked `/en/...` but had
 *    last picked Arabic, we swap them onto `/ar/...` once, client-side.
 * `setLanguage` is the single place both concerns are updated together.
 */
export function LanguageProvider({ children }: { children: ReactNode }) {
  const locale = useLocale() as Locale;
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const hasReconciled = useRef(false);

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, locale);
  }, [locale]);

  useEffect(() => {
    if (hasReconciled.current) return;
    hasReconciled.current = true;

    const stored = readStoredLanguage();
    if (stored && stored !== locale) {
      router.replace({ pathname, query: Object.fromEntries(searchParams) }, { locale: stored });
    }
    // Only ever run this reconciliation once per app load — after that,
    // explicit navigation (setLanguage, direct URL entry) always wins.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function setLanguage(next: Locale) {
    window.localStorage.setItem(STORAGE_KEY, next);
    router.replace({ pathname, query: Object.fromEntries(searchParams) }, { locale: next });
  }

  return (
    <LanguageContext.Provider
      value={{ language: locale, languages: locales, languageLabels: localeLabels, setLanguage }}
    >
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage(): LanguageContextValue {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useLanguage must be used within <LanguageProvider>");
  return ctx;
}
