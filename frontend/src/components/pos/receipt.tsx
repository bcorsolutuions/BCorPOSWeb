import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { isRtl, type Locale } from "@/i18n/config";
import { formatDateTime, formatMoney, formatMoneyPlain } from "@/lib/utils";
import { useCurrencyStore } from "@/stores/currency-store";
import type { PosDto, PosPaymentType } from "@/types/pos";
import enMessages from "@/i18n/locales/en.json";
import arMessages from "@/i18n/locales/ar.json";

// Deliberately NOT using next-intl's useTranslations() here: that hook
// always resolves against the app's active route locale, but the receipt
// has its own language picker (ReceiptDialog) independent of whatever
// language the till itself runs in — a branch may need to print an
// Arabic receipt while the cashier's screen is in English. Reading the
// message files directly keyed by the receipt's own `locale` prop keeps
// that choice correct regardless of app locale.
const MESSAGES = { en: enMessages, ar: arMessages } satisfies Record<Locale, typeof enMessages>;

const PAYMENT_METHOD_KEY: Record<PosPaymentType, keyof typeof enMessages.pos> = {
  Cash: "cash",
  Card: "card",
  BenefitPay: "benefitPay",
  Wallet: "wallet",
  Credit: "credit",
  GiftVoucher: "giftVoucher",
  LoyaltyRedemption: "loyaltyRedemption",
};

/**
 * Receipt content only — RTL/LTR is driven by `locale`, independent of the
 * app UI's own direction (see 10-rtl-strategy.md, "POS Receipt / Print
 * Layout"). Wrapped by ReceiptDialog for on-screen preview + the
 * `.receipt-print-area` print target (globals.css). Reflects the real
 * PosDto returned by BCorDFWebApi's PosController — docNo/refNo, not a
 * synthetic invoice number.
 */
export function Receipt({ pos, locale }: { pos: PosDto; locale: Locale }) {
  const m = MESSAGES[locale];
  const rtl = isRtl(locale);
  const salesmanDisplay = pos.salesManCode;
  const branchName = (rtl && pos.receiptBranchNameArb) || pos.receiptBranchName;
  const branchAddress = (rtl && pos.receiptBranchAddressArb) || pos.receiptBranchAddress;
  const currency = useCurrencyStore((s) => s.currencyCode);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);

  // QR only ever appears once the server has actually stamped a token onto
  // this PosDto (PosController.AttachReceiptToken) — a bill fetched from
  // anywhere else (or before that backend change ships) just omits it, no QR.
  useEffect(() => {
    if (!pos.publicReceiptToken) {
      setQrDataUrl(null);
      return;
    }
    const url = `${window.location.origin}/${locale}/receipt/${pos.publicReceiptToken}`;
    let cancelled = false;
    QRCode.toDataURL(url, { margin: 0, width: 120 })
      .then((dataUrl) => {
        if (!cancelled) setQrDataUrl(dataUrl);
      })
      .catch(() => {
        if (!cancelled) setQrDataUrl(null);
      });
    return () => {
      cancelled = true;
    };
  }, [pos.publicReceiptToken, locale]);

  return (
    <div
      dir={rtl ? "rtl" : "ltr"}
      lang={locale}
      className="mx-auto w-[80mm] space-y-2 bg-white p-3 font-mono text-[11px] text-black"
    >
      <div className="space-y-0.5 text-center">
        {/* Heading: company, branch, branch address, branch phone. Arabic receipts
            prefer the branch's Arabic name/address when one is on file. */}
        <p className="text-sm font-bold">{pos.receiptCompanyName || m.app.name}</p>
        {branchName && <p className="font-bold">{branchName}</p>}
        {branchAddress && <p>{branchAddress}</p>}
        {pos.receiptBranchPhone && (
          <p className="bidi-isolate">
            {m.receipt.phone}: {pos.receiptBranchPhone}
          </p>
        )}
        {pos.receiptTaxRegisterNo && (
          <p className="bidi-isolate">
            {m.receipt.taxRegNo}: {pos.receiptTaxRegisterNo}
          </p>
        )}
        <p className="pt-1">{m.receipt.taxInvoice}</p>
        {pos.salesReturn && <p className="font-bold">({m.pos.returnBill})</p>}
        {pos.status === "Voided" && (
          <div className="my-1 border-2 border-black py-1 text-base font-bold">
            {m.receipt.voided}
            {pos.voidReason && <p className="text-[10px] font-normal">{pos.voidReason}</p>}
          </div>
        )}
      </div>

      <div className="border-t border-dashed border-black pt-1">
        <div className="flex justify-between bidi-isolate">
          <span>{m.receipt.invoiceNo}</span>
          <span>
            {pos.docNo} {pos.refNo ? `(${pos.refNo})` : ""}
          </span>
        </div>
        <div className="flex justify-between bidi-isolate">
          <span>{m.receipt.dateTime}</span>
          <span>{formatDateTime(pos.docDt, locale)}</span>
        </div>
        <div className="flex justify-between bidi-isolate">
          <span>{pos.terminalID}</span>
          <span>{m.pos.setupShift} {pos.shiftNo ?? "-"}</span>
        </div>
        <div className="flex justify-between">
          <span>{m.receipt.cashier}</span>
          <span>{pos.lastModifiedBy}</span>
        </div>
        {salesmanDisplay && (
          <div className="flex justify-between">
            <span>{m.pos.salesman}</span>
            <span>{salesmanDisplay}</span>
          </div>
        )}
        {pos.custName && (
          <div className="flex justify-between">
            <span>{m.receipt.customer}</span>
            <span>{pos.custName}</span>
          </div>
        )}
      </div>

      <table className="w-full border-t border-dashed border-black pt-1 text-start">
        <thead>
          <tr className="border-b border-dashed border-black">
            <th className="py-1 text-start font-normal">{m.receipt.item}</th>
            <th className="text-center font-normal">{m.receipt.qty}</th>
            <th className="text-end font-normal">
              {m.receipt.price} ({currency})
            </th>
            <th className="text-end font-normal">{m.receipt.total}</th>
          </tr>
        </thead>
        <tbody>
          {pos.details.map((line) => {
            const isWeighed = Math.abs(line.weighingQuantity) > 0;
            return (
              <tr key={line.id}>
                <td className="py-0.5">
                  {line.name ?? line.itemCode}
                  {/* Only lines that actually carry a barcode (trading / supermarket
                      items) print one — restaurant / service lines have none. */}
                  {line.barcode && (
                    <span className="block text-[9px] text-gray-600 bidi-isolate">{line.barcode}</span>
                  )}
                </td>
                <td className="text-center bidi-isolate">
                  {isWeighed ? `${Math.abs(line.weighingQuantity).toFixed(3)} ${m.pos.weightKg}` : line.quantity}
                </td>
                <td className="text-end bidi-isolate">
                  {formatMoneyPlain(line.unitPrice, currency, locale)}
                  {isWeighed ? m.pos.perKg : ""}
                </td>
                <td className="text-end bidi-isolate">{formatMoneyPlain(line.netAmount, currency, locale)}</td>
              </tr>
            );
          })}
          {/* Salon service lines print like any other line item — same four
              columns, no commission column (that's an internal/payroll
              figure, never shown to the customer). */}
          {pos.serviceDetails.map((line) => (
            <tr key={line.id}>
              <td className="py-0.5">{line.serviceName ?? line.serviceCode}</td>
              <td className="text-center bidi-isolate">{line.qty}</td>
              <td className="text-end bidi-isolate">{formatMoneyPlain(line.rate, currency, locale)}</td>
              <td className="text-end bidi-isolate">{formatMoneyPlain(line.netAmount, currency, locale)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="space-y-0.5 border-t border-dashed border-black pt-1">
        <div className="flex justify-between">
          <span>{m.receipt.subtotal}</span>
          <span className="bidi-isolate">{formatMoney(pos.subTotal, currency, locale)}</span>
        </div>
        <div className="flex justify-between">
          <span>{m.receipt.discount}</span>
          <span className="bidi-isolate">
            {pos.discountAmount > 0 ? "-" : ""}
            {formatMoney(pos.discountAmount, currency, locale)}
          </span>
        </div>
        <div className="flex justify-between">
          <span>{m.receipt.tax}</span>
          <span className="bidi-isolate">{formatMoney(pos.taxAmount, currency, locale)}</span>
        </div>
        <div className="flex justify-between text-sm font-bold">
          <span>{m.receipt.grandTotal}</span>
          <span className="bidi-isolate">{formatMoney(pos.netTotal, currency, locale)}</span>
        </div>
      </div>

      <div className="space-y-0.5 border-t border-dashed border-black pt-1">
        {pos.paymentDetails.map((p) => (
          <div key={p.id} className="flex justify-between">
            <span>
              {m.receipt.paidVia} ({m.pos[PAYMENT_METHOD_KEY[p.type]]})
            </span>
            <span className="bidi-isolate">{formatMoney(p.amount, currency, locale)}</span>
          </div>
        ))}
        {pos.changeAmount > 0 && (
          <div className="flex justify-between">
            <span>{m.receipt.change}</span>
            <span className="bidi-isolate">{formatMoney(pos.changeAmount, currency, locale)}</span>
          </div>
        )}
      </div>

      {qrDataUrl && (
        <div className="flex flex-col items-center gap-0.5 border-t border-dashed border-black pt-1">
          {/* eslint-disable-next-line @next/next/no-img-element -- data: URI, not a static/optimizable asset */}
          <img src={qrDataUrl} alt="" className="h-[30mm] w-[30mm]" />
          <p className="text-[9px] text-gray-600">{m.receipt.scanForDigitalCopy}</p>
        </div>
      )}

      <div className="space-y-0.5 border-t border-dashed border-black pt-1 text-center">
        <p>{m.receipt.thankYou}</p>
        <p className="text-[9px] text-gray-600">{m.receipt.poweredBy}</p>
      </div>
    </div>
  );
}
