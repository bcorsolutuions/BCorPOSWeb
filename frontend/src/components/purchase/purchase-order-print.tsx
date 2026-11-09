import { useTranslations, useLocale } from "next-intl";
import { formatMoney, formatMoneyPlain } from "@/lib/utils";
import { isRtl } from "@/i18n/config";
import type { PurchaseOrder } from "@/types/purchase";
import type { VendorMaster } from "@/types/vendor-master";
import { useItemBarcodes } from "@/hooks/use-item-barcodes";

// A4 business document, not a POS receipt — see .doc-print-area in
// globals.css (kept separate from .receipt-print-area, which is hard-sized
// for an 80mm thermal roll). Used both for the on-screen preview inside the
// print dialog and as the actual print target, same dual-render pattern
// components/pos/receipt-dialog.tsx already uses for receipts.
export function PurchaseOrderPrint({
  order,
  vendor,
  branchName,
}: {
  order: PurchaseOrder;
  vendor: VendorMaster | null;
  branchName: string;
}) {
  const t = useTranslations();
  const locale = useLocale();
  const barcodeOf = useItemBarcodes();
  const rtl = isRtl(locale as "en" | "ar");
  const currency = order.currencyCode || "AED";

  const subtotal = order.details.reduce((sum, d) => sum + (d.qty * d.rate || 0), 0);
  const totalDiscount = order.details.reduce((sum, d) => sum + (d.discountAmount ?? 0), 0);
  const totalTax = order.details.reduce((sum, d) => sum + (d.taxAmount ?? 0), 0);
  const netTotal = order.totalAmount ?? subtotal - totalDiscount + totalTax;

  return (
    <div dir={rtl ? "rtl" : "ltr"} lang={locale} className="mx-auto w-full max-w-[210mm] space-y-6 bg-white p-8 text-black">
      <div className="flex items-start justify-between border-b-2 border-black pb-4">
        <div>
          <p className="text-xl font-bold">{branchName}</p>
        </div>
        <div className="text-end">
          <p className="text-2xl font-bold uppercase tracking-wide">{t("purchaseOrder.title")}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-8">
        <div className="space-y-1">
          <p className="text-xs font-semibold uppercase text-gray-500">{t("purchaseOrder.supplier")}</p>
          <p className="font-medium">
            {order.vendorCode}
            {vendor?.vendorName ? ` — ${vendor.vendorName}` : ""}
          </p>
          {vendor?.mobile1 && <p className="text-sm text-gray-600">{vendor.mobile1}</p>}
          {vendor?.email && <p className="text-sm text-gray-600">{vendor.email}</p>}
        </div>
        <div className="space-y-1 text-end">
          <div className="flex justify-between gap-4">
            <span className="text-xs font-semibold uppercase text-gray-500">{t("purchaseOrder.poNumber")}</span>
            <span className="font-medium">{order.docNo}</span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-xs font-semibold uppercase text-gray-500">{t("purchaseInvoice.refNo")}</span>
            <span className="font-medium">{order.refNo ?? "-"}</span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-xs font-semibold uppercase text-gray-500">{t("common.date")}</span>
            <span className="font-medium">{new Date(order.docDt).toLocaleDateString(locale)}</span>
          </div>
        </div>
      </div>

      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-y-2 border-black">
            <th className="py-2 text-start font-semibold">{t("common.item")}</th>
            <th className="py-2 text-start font-semibold">{t("common.code")}</th>
            <th className="py-2 text-center font-semibold">{t("item.unit")}</th>
            <th className="py-2 text-end font-semibold">{t("pos.qty")}</th>
            <th className="py-2 text-end font-semibold">{t("item.costPrice")}</th>
            <th className="py-2 text-end font-semibold">{t("common.discount")} %</th>
            <th className="py-2 text-end font-semibold">{t("common.tax")} %</th>
            <th className="py-2 text-end font-semibold">{t("common.grandTotal")}</th>
          </tr>
        </thead>
        <tbody>
          {order.details.map((d, i) => {
            const amount = (d.qty || 0) * (d.rate || 0);
            const discountAmt = d.discountAmount ?? 0;
            const taxAmt = d.taxAmount ?? 0;
            const net = amount - discountAmt + taxAmt;
            return (
              <tr key={d.id ?? i} className="border-b border-gray-300">
                <td className="py-1.5">
                  {d.itemName || d.itemCode}
                  {barcodeOf(d.itemCode) && <span className="block font-mono text-[10px] text-gray-600">{barcodeOf(d.itemCode)}</span>}
                </td>
                <td className="py-1.5 text-gray-600">{d.itemCode}</td>
                <td className="py-1.5 text-center">{d.unitCode}</td>
                <td className="py-1.5 text-end">{d.qty}</td>
                <td className="py-1.5 text-end">{formatMoneyPlain(d.rate, currency, locale)}</td>
                <td className="py-1.5 text-end">{d.discountPercentage || 0}</td>
                <td className="py-1.5 text-end">{d.taxPercentage || 0}</td>
                <td className="py-1.5 text-end font-medium">{formatMoneyPlain(net, currency, locale)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <div className="flex justify-end">
        <div className="w-64 space-y-1 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-600">{t("common.subtotal")}</span>
            <span>{formatMoney(subtotal, currency, locale)}</span>
          </div>
          {totalDiscount > 0 && (
            <div className="flex justify-between">
              <span className="text-gray-600">{t("common.discount")}</span>
              <span>-{formatMoney(totalDiscount, currency, locale)}</span>
            </div>
          )}
          {totalTax > 0 && (
            <div className="flex justify-between">
              <span className="text-gray-600">{t("common.tax")}</span>
              <span>{formatMoney(totalTax, currency, locale)}</span>
            </div>
          )}
          <div className="flex justify-between border-t-2 border-black pt-1 text-base font-bold">
            <span>{t("common.grandTotal")}</span>
            <span>{formatMoney(netTotal, currency, locale)}</span>
          </div>
        </div>
      </div>

      {order.remarks && (
        <div className="border-t border-gray-300 pt-3 text-sm">
          <p className="text-xs font-semibold uppercase text-gray-500">{t("purchaseOrder.remarks")}</p>
          <p>{order.remarks}</p>
        </div>
      )}

      <div className="mt-16 grid grid-cols-2 gap-8 text-sm">
        <div className="border-t border-black pt-2">{t("common.createdBy")}</div>
        <div className="border-t border-black pt-2 text-end">{t("purchaseOrder.supplier")}</div>
      </div>
    </div>
  );
}
