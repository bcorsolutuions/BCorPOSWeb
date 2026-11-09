import createMiddleware from "next-intl/middleware";
import { NextRequest, NextResponse } from "next/server";
import { locales, defaultLocale } from "./i18n/config";

const intlMiddleware = createMiddleware({
  locales,
  defaultLocale,
  localePrefix: "always",
});

// Routes that do not require an authenticated session.
// "/receipt" is the public QR-on-receipt digital copy
// (app/[locale]/receipt/[token]/page.tsx) — a customer's own phone has no
// session, and the page's own backend call is already gated by a signed
// per-bill token, not by this list.
// "/q" is the QR Table Ordering customer menu (app/[locale]/q/[token]/page.tsx)
// — same reasoning, gated by RestaurantTableQR's opaque hashed token, not by this list.
// "/price-checker" is the public kiosk page (app/[locale]/price-checker/page.tsx)
// — a customer standing at a shop-floor scanner has no session; compId/siteId
// come from the kiosk device's own URL query params, not from a login.
const PUBLIC_PATHS = [
  "/login",
  "/forgot-password",
  "/onboarding",
  "/license-expired",
  "/receipt",
  "/q",
  "/mobile/login",
  "/price-checker",
];

function stripLocale(pathname: string): string {
  const segments = pathname.split("/").filter(Boolean);
  if (locales.includes(segments[0] as (typeof locales)[number])) {
    segments.shift();
  }
  return "/" + segments.join("/");
}

export default function middleware(request: NextRequest) {
  // The bare root has no locale segment — send it straight to the default
  // locale's entry point rather than falling through to a 404.
  if (request.nextUrl.pathname === "/") {
    return NextResponse.redirect(new URL(`/${defaultLocale}`, request.url));
  }

  const response = intlMiddleware(request);

  const pathWithoutLocale = stripLocale(request.nextUrl.pathname);
  const isPublic = PUBLIC_PATHS.some((p) => pathWithoutLocale.startsWith(p));
  const token = request.cookies.get("bcor_access_token")?.value;

  if (!isPublic && !token && pathWithoutLocale !== "/") {
    const locale = request.nextUrl.pathname.split("/")[1] || defaultLocale;
    // A deep-link into the mobile PWA (e.g. from a home-screen shortcut)
    // should bounce to the mobile-shaped login, not the desktop form.
    const loginPath = pathWithoutLocale.startsWith("/mobile") ? "/mobile/login" : "/login";
    const loginUrl = new URL(`/${locale}${loginPath}`, request.url);
    loginUrl.searchParams.set("redirectTo", pathWithoutLocale);
    return NextResponse.redirect(loginUrl);
  }

  return response;
}

export const config = {
  matcher: ["/", "/((?!api|_next|_vercel|.*\\..*).*)"],
};
