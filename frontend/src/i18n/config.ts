export const locales = ["en", "ar"] as const;
export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = "en";

export type Direction = "ltr" | "rtl";

export const localeDirection: Record<Locale, Direction> = {
  en: "ltr",
  ar: "rtl",
};

export const localeLabels: Record<Locale, string> = {
  en: "English",
  ar: "العربية",
};

export function isRtl(locale: string): boolean {
  return localeDirection[locale as Locale] === "rtl";
}
