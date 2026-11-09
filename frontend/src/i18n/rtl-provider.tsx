"use client";

import { createContext, useContext, useEffect, type ReactNode } from "react";
import { DirectionProvider } from "@radix-ui/react-direction";
import { useLanguage } from "@/i18n/language-provider";
import { isRtl as computeIsRtl, type Direction } from "@/i18n/config";

interface RTLContextValue {
  direction: Direction;
  isRtl: boolean;
}

const RTLContext = createContext<RTLContextValue | null>(null);

/**
 * Derives direction from the active language (via LanguageProvider) and
 * fans it out two ways: to Radix's own DirectionProvider (so portaled
 * content — dropdowns, dialogs, toasts — inherits it outside the normal
 * DOM tree) and imperatively onto <html> as a defensive sync. The server
 * layout already sets `dir`/`lang` on <html> for correct first paint;
 * this covers the client-navigation case where language changes without
 * a full document reload.
 */
export function RTLProvider({ children }: { children: ReactNode }) {
  const { language } = useLanguage();
  const isRtl = computeIsRtl(language);
  const direction: Direction = isRtl ? "rtl" : "ltr";

  useEffect(() => {
    document.documentElement.dir = direction;
    document.documentElement.lang = language;
  }, [direction, language]);

  return (
    <RTLContext.Provider value={{ direction, isRtl }}>
      <DirectionProvider dir={direction}>{children}</DirectionProvider>
    </RTLContext.Provider>
  );
}

export function useRTLContext(): RTLContextValue {
  const ctx = useContext(RTLContext);
  if (!ctx) throw new Error("useRTLContext must be used within <RTLProvider>");
  return ctx;
}
