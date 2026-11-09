"use client";

import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { useLocale, useTranslations } from "next-intl";
import { Printer } from "lucide-react";
import { Receipt } from "@/components/pos/receipt";
import { Button } from "@/components/ui/button";
import { posService } from "@/lib/api/services/pos-service";
import type { Locale } from "@/i18n/config";

// Public digital copy of a receipt, reached by scanning the QR code printed
// on the paper one (see Receipt.tsx's scanForDigitalCopy block) — no
// AuthGuard, no login: a customer's own phone has no session, and the
// backend endpoint behind this (PosController.GetPublicReceipt) is
// deliberately [AllowAnonymous] and only ever accepts the opaque signed
// token in the URL, never a raw compId/siteId/docNo. Also listed in
// middleware.ts's PUBLIC_PATHS — without that the auth-cookie check would
// redirect an unauthenticated visitor straight to /login before this ever
// renders.
export default function PublicReceiptPage() {
  const params = useParams<{ token: string }>();
  const locale = useLocale() as Locale;
  const t = useTranslations("receipt");

  const { data: pos, isLoading, isError } = useQuery({
    queryKey: ["public-receipt", params.token],
    queryFn: () => posService.getPublic(params.token),
    retry: false,
  });

  return (
    <div className="flex min-h-screen flex-col items-center gap-4 bg-muted/30 p-4">
      {isLoading && <p className="mt-10 text-sm text-muted-foreground">{t("loading")}</p>}
      {isError && <p className="mt-10 text-sm text-destructive">{t("notFound")}</p>}

      {pos && (
        <>
          <div className="w-full max-w-sm overflow-hidden rounded-md border bg-white shadow-sm">
            <Receipt pos={pos} locale={locale} />
          </div>
          <Button onClick={() => window.print()}>
            <Printer className="me-1 h-4 w-4" />
            {t("print")}
          </Button>
          {/* Same print-area convention as ReceiptDialog — the on-screen
              preview above stays whatever size fits the page; only this
              hidden twin is what actually prints. */}
          <div className="receipt-print-area">
            <Receipt pos={pos} locale={locale} />
          </div>
        </>
      )}
    </div>
  );
}
