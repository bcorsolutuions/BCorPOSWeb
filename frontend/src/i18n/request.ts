import { getRequestConfig } from "next-intl/server";
import { locales, defaultLocale } from "./config";

// `requestLocale` (not the deprecated `locale` param) is what next-intl
// now recommends: it resolves correctly whether this request went through
// middleware.ts (the normal case) or not — build-time static rendering,
// Next's internal /_not-found boundary, prefetches, etc. all reach this
// file without middleware having set a locale header. Falling back to
// defaultLocale in that case avoids a hard notFound() for requests that
// are perfectly legitimate, just not middleware-routed.
export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale;
  const locale = locales.includes(requested as (typeof locales)[number])
    ? (requested as (typeof locales)[number])
    : defaultLocale;

  return {
    locale,
    messages: (await import(`./locales/${locale}.json`)).default,
    timeZone: "Asia/Dubai",
  };
});
