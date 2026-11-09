import { isRtl, type Locale } from "@/i18n/config";
import { formatDateTime, formatMoney } from "@/lib/utils";
import { useCurrencyStore } from "@/stores/currency-store";
import type { ShiftCloseResult, ShiftReport as ShiftReportData } from "@/lib/api/services/pos-operations-service";
import enMessages from "@/i18n/locales/en.json";
import arMessages from "@/i18n/locales/ar.json";

// Like Receipt: reads the message files directly by its own `locale` prop, because a printout has its own language
// picker independent of the language the till runs in.
const MESSAGES = { en: enMessages, ar: arMessages } satisfies Record<Locale, typeof enMessages>;

const PAYMENT_KEY: Record<string, keyof typeof enMessages.pos> = {
  cash: "cash",
  card: "card",
  benefitpay: "benefitPay",
  wallet: "wallet",
  credit: "credit",
  giftvoucher: "giftVoucher",
  loyaltyredemption: "loyaltyRedemption",
};

/**
 * The X report / shift close slip (80mm). Presentational: wrapped by the X Report and Shift Close dialogs for the on-screen
 * preview and the `.receipt-print-area` print target. `close` present = the final cash-up slip, absent = the interim X report.
 */
export function ShiftReportSlip({
  report,
  locale,
  cashier,
  siteId,
  close,
}: {
  report: ShiftReportData;
  locale: Locale;
  cashier: string;
  siteId: string;
  close?: ShiftCloseResult;
}) {
  const m = MESSAGES[locale].shiftReport;
  const mp = MESSAGES[locale].pos;
  const rtl = isRtl(locale);
  const currency = useCurrencyStore((s) => s.currencyCode);
  const money = (n: number) => formatMoney(n, currency, locale);
  const paymentLabel = (type: string) => {
    const key = PAYMENT_KEY[type.toLowerCase()];
    return key ? (mp[key] as string) : type;
  };

  return (
    <div dir={rtl ? "rtl" : "ltr"} lang={locale} className="mx-auto w-[80mm] space-y-2 bg-white p-3 font-mono text-[11px] text-black">
      <div className="space-y-0.5 text-center">
        <p className="text-sm font-bold">{close ? m.closeTitle : m.xTitle}</p>
        <p>{close ? m.closedFooter : m.xSubtitle}</p>
      </div>

      <Rule />
      <Line label={m.branch} value={siteId} />
      <Line label={m.terminal} value={report.terminalId} />
      <Line label={m.shift} value={String(report.shiftNo)} />
      <Line label={m.cashier} value={cashier} />
      <Line label={m.printed} value={formatDateTime(close?.closedAt ?? report.generatedAt, locale)} />
      {report.minDocNo != null && report.maxDocNo != null && (
        <Line label={m.billRange} value={`${report.minDocNo} – ${report.maxDocNo}`} />
      )}
      {close?.refNo && <Line label={m.closeRef} value={close.refNo} />}

      <Rule />
      <Line label={`${m.sales} (${report.salesCount})`} value={money(report.grossSales)} />
      <Line label={m.discounts} value={money(report.discounts > 0 ? -report.discounts : 0)} />
      <Line label={m.tax} value={money(report.tax)} />
      {report.rounding !== 0 && <Line label={m.rounding} value={money(report.rounding)} />}
      <Line label={m.netSales} value={money(report.netSales)} bold />
      <Line label={`${m.returns} (${report.returnsCount})`} value={money(report.returnsValue)} />
      <Line label={m.netTakings} value={money(report.netTakings)} bold />
      {report.voidCount > 0 && <Line label={`${m.voids} (${report.voidCount})`} value={money(report.voidValue)} muted />}

      <Rule />
      <p className="font-bold">{m.payments}</p>
      {report.payments.length === 0 && <p className="text-center">—</p>}
      {report.payments.map((p) => (
        <Line key={p.type} label={`${paymentLabel(p.type)} (${p.count})`} value={money(p.amount)} />
      ))}
      <Line label={m.totalPayments} value={money(report.totalPayments)} bold />
      <p className="text-[10px]">{m.paymentsNote}</p>

      <Rule />
      <p className="font-bold">{m.cashSection}</p>
      <Line label={m.openingFloat} value={money(close ? close.openingCash : report.openingFloat)} />
      <Line label={m.cashSales} value={money(report.cashNet)} />
      <Line label={m.expectedCash} value={money(close ? close.expectedCash : report.expectedCash)} bold />
      {close && (
        <>
          <Line label={m.countedCash} value={money(close.countedCash)} />
          <Line
            label={close.overShort === 0 ? m.balanced : close.overShort > 0 ? m.excess : m.short}
            value={close.overShort === 0 ? money(0) : money(Math.abs(close.overShort))}
            bold
          />
          {close.bankDeposit > 0 && <Line label={m.bankDeposit} value={money(close.bankDeposit)} />}
        </>
      )}

      {report.heldBills > 0 && <p className="pt-1 text-[10px]">{m.heldNote.replace("{count}", String(report.heldBills))}</p>}

      <Rule />
      <p className="text-center text-[10px]">{close ? `${m.closedBy}: ${close.closedBy}` : m.notClosed}</p>
    </div>
  );
}

function Rule() {
  return <hr className="border-t border-dashed border-black" />;
}

function Line({ label, value, bold, muted }: { label: string; value: string; bold?: boolean; muted?: boolean }) {
  return (
    <div className={`flex items-baseline justify-between gap-2 ${bold ? "font-bold" : ""} ${muted ? "opacity-70" : ""}`}>
      <span className="min-w-0 break-words">{label}</span>
      <span className="bidi-isolate shrink-0 tabular-nums">{value}</span>
    </div>
  );
}
