"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { AuthGuard } from "@/components/auth/auth-guard";
import { formatMoney, formatMoneyPlain } from "@/lib/utils";
import { customerDisplayChannelName, type CustomerDisplayMessage } from "@/lib/pos/customer-display";

// The "thank you" screen after a completed sale reverts to idle on its own
// after a while — nobody's at the till to dismiss it, and the next customer
// shouldn't see a stale total from the last sale.
const THANK_YOU_DISPLAY_MS = 8000;

function CustomerDisplayContent() {
  const t = useTranslations("pos");
  const locale = useLocale();
  const searchParams = useSearchParams();
  const terminalId = searchParams.get("terminal") ?? "";
  const [message, setMessage] = useState<CustomerDisplayMessage>({ type: "idle" });
  const thankYouTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!terminalId || typeof BroadcastChannel === "undefined") return;
    const channel = new BroadcastChannel(customerDisplayChannelName(terminalId));
    channel.onmessage = (event) => {
      const data = event.data as CustomerDisplayMessage;
      setMessage(data);
      if (thankYouTimer.current) clearTimeout(thankYouTimer.current);
      if (data.type === "thankYou") {
        thankYouTimer.current = setTimeout(() => setMessage({ type: "idle" }), THANK_YOU_DISPLAY_MS);
      }
    };
    return () => {
      channel.close();
      if (thankYouTimer.current) clearTimeout(thankYouTimer.current);
    };
  }, [terminalId]);

  if (!terminalId) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-950 text-slate-400">
        {t("customerDisplayNoTerminal")}
      </div>
    );
  }

  if (message.type === "thankYou") {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-8 bg-emerald-600 text-white">
        <p className="text-6xl font-bold">{t("customerDisplayThankYou")}</p>
        <div className="space-y-2 text-center text-3xl">
          <p>
            {t("customerDisplayPaid")}: {formatMoney(message.amountPaid, message.currency, locale)}
          </p>
          {message.changeDue > 0 && (
            <p>
              {t("customerDisplayChange")}: {formatMoney(message.changeDue, message.currency, locale)}
            </p>
          )}
        </div>
      </div>
    );
  }

  if (message.type === "idle") {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-6 bg-slate-950 text-slate-50">
        {/* eslint-disable-next-line @next/next/no-img-element -- static branding asset */}
        <img src="/branding/logo.jpeg" alt="" className="h-28 w-28 rounded-2xl object-contain" />
        <p className="text-4xl font-semibold">{t("customerDisplayWelcome")}</p>
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col bg-slate-950 p-10 text-slate-50">
      <div className="flex items-center justify-between border-b border-slate-700 pb-6">
        {/* eslint-disable-next-line @next/next/no-img-element -- static branding asset */}
        <img src="/branding/logo.jpeg" alt="" className="h-14 w-14 rounded-lg object-contain" />
        {message.customerName && <p className="text-2xl text-slate-300">{message.customerName}</p>}
      </div>

      <div className="mt-6 flex-1 space-y-4 overflow-y-auto">
        {message.lines.map((line) => (
          <div key={line.lineId} className="flex items-center justify-between gap-6 text-2xl">
            <div className="min-w-0">
              <p className="truncate font-medium">{line.name}</p>
              {line.barcode && <p className="truncate font-mono text-sm text-slate-500">{line.barcode}</p>}
              <p className="text-lg text-slate-400">
                {line.isWeighted
                  ? `${line.quantity} kg`
                  : `${line.quantity}${line.unitCode ? ` ${line.unitCode}` : ""}`}
                {" × "}
                {formatMoneyPlain(line.unitPrice, message.currency, locale)}
              </p>
            </div>
            <p className="shrink-0 font-semibold tabular-nums">
              {formatMoneyPlain(line.netAmount, message.currency, locale)}
            </p>
          </div>
        ))}
      </div>

      <div className="mt-6 space-y-2 border-t border-slate-700 pt-6 text-2xl">
        <div className="flex justify-between text-slate-300">
          <span>{t("customerDisplaySubtotal")}</span>
          <span className="tabular-nums">{formatMoneyPlain(message.subTotal, message.currency, locale)}</span>
        </div>
        {message.discountAmount > 0 && (
          <div className="flex justify-between text-amber-400">
            <span>{t("customerDisplayDiscount")}</span>
            <span className="tabular-nums">-{formatMoneyPlain(message.discountAmount, message.currency, locale)}</span>
          </div>
        )}
        <div className="flex justify-between text-slate-300">
          <span>{t("customerDisplayTax")}</span>
          <span className="tabular-nums">{formatMoneyPlain(message.taxAmount, message.currency, locale)}</span>
        </div>
        <div className="flex justify-between text-4xl font-bold">
          <span>{t("customerDisplayGrandTotal")}</span>
          <span className="tabular-nums">{formatMoney(message.netTotal, message.currency, locale)}</span>
        </div>
      </div>
    </div>
  );
}

export default function CustomerDisplayPage() {
  return (
    <AuthGuard>
      <Suspense fallback={null}>
        <CustomerDisplayContent />
      </Suspense>
    </AuthGuard>
  );
}
