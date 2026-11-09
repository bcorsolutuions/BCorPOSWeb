import { useTranslations, useLocale } from "next-intl";
import { formatMoney, formatMoneyPlain } from "@/lib/utils";
import { isRtl } from "@/i18n/config";
import type { GoodsReceipt } from "@/types/grn";
import type { VendorMaster } from "@/types/vendor-master";
import { useItemBarcodes } from "@/hooks/use-item-barcodes";

// A4 business document for a Goods Receipt Note — same .doc-print-area
// mechanism and layout conventions as components/purchase/purchase-order-print.tsx
// (kept separate rather than shared/parameterized since GRN carries no tax
// fields at all — GRNDet has no TaxPercentage/TaxAmount columns on the
// backend, receipt is costed at PO rate only, tax is handled downstream at
// the Purchase Invoice stage).
export function GrnPrint({
  receipt,
  vendor,
  branchName,
}: {
  receipt: GoodsReceipt;
  vendor: VendorMaster | null;
  branchName: string;
}) {
  const t = useTranslations();
  const locale = useLocale();
  const barcodeOf = useItemBarcodes();
  const rtl = isRtl(locale as "en" | "ar");
  const currency = receipt.currencyCode || "AED";

  const subtotal = receipt.details.reduce((sum, d) => sum + (d.qty * d.rate || 0), 0);
  const totalDiscount = receipt.details.reduce((sum, d) => sum + (d.discountAmount ?? 0), 0);
  const netTotal = receipt.totalAmount ?? subtotal - totalDiscount;

  return (
    <div dir={rtl ? "rtl" : "ltr"} lang={locale} className="mx-auto w-full max-w-[210mm] space-y-6 bg-white p-8 text-black">
      <div className="flex items-start justify-between border-b-2 border-black pb-4">
        <div>
          <p className="text-xl font-bold">{branchName}</p>
        </div>
        <div className="text-end">
          <p className="text-2xl font-bold uppercase tracking-wide">{t("grn.title")}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-8">
        <div className="space-y-1">
          <p className="text-xs font-semibold uppercase text-gray-500">{t("purchaseOrder.supplier")}</p>
          <p className="font-medium">
            {receipt.vendorCode}
            {vendor?.vendorName ? ` — ${vendor.vendorName}` : ""}
          </p>
          {vendor?.mobile1 && <p className="text-sm text-gray-600">{vendor.mobile1}</p>}
          {vendor?.email && <p className="text-sm text-gray-600">{vendor.email}</p>}
        </div>
        <div className="space-y-1 text-end">
          <div className="flex justify-between gap-4">
            <span className="text-xs font-semibold uppercase text-gray-500">{t("grn.grnNumber")}</span>
            <span className="font-medium">{receipt.docNo}</span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-xs font-semibold uppercase text-gray-500">{t("purchaseInvoice.refNo")}</span>
            <span className="font-medium">{receipt.refNo ?? "-"}</span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-xs font-semibold uppercase text-gray-500">{t("grn.poReference")}</span>
            <span className="font-medium">{receipt.lpoReference ?? "-"}</span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-xs font-semibold uppercase text-gray-500">{t("grn.receivedDate")}</span>
            <span className="font-medium">{new Date(receipt.docDt).toLocaleDateString(locale)}</span>
          </div>
        </div>
      </div>

      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-y-2 border-black">
            <th className="py-2 text-start font-semibold">{t("common.item")}</th>
            <th className="py-2 text-start font-semibold">{t("common.code")}</th>
            <th className="py-2 text-center font-semibold">{t("item.unit")}</th>
            <th className="py-2 text-end font-semibold">{t("grn.orderedQty")}</th>
            <th className="py-2 text-end font-semibold">{t("grn.receivedQty")}</th>
            <th className="py-2 text-end font-semibold">{t("item.costPrice")}</th>
            <th className="py-2 text-end font-semibold">{t("common.discount")} %</th>
            <th className="py-2 text-end font-semibold">{t("grn.netTotal")}</th>
          </tr>
        </thead>
        <tbody>
          {receipt.details.map((d, i) => {
            const amount = (d.qty || 0) * (d.rate || 0);
            const discountAmt = d.discountAmount ?? 0;
            const net = amount - discountAmt;
            return (
              <tr key={d.id ?? i} className="border-b border-gray-300">
                <td className="py-1.5">
                  {d.itemName || d.itemCode}
                  {barcodeOf(d.itemCode) && <span className="block font-mono text-[10px] text-gray-600">{barcodeOf(d.itemCode)}</span>}
                </td>
                <td className="py-1.5 text-gray-600">{d.itemCode}</td>
                <td className="py-1.5 text-center">{d.unitCode}</td>
                <td className="py-1.5 text-end">{d.orderedQty}</td>
                <td className="py-1.5 text-end">{d.qty}</td>
                <td className="py-1.5 text-end">{formatMoneyPlain(d.rate, currency, locale)}</td>
                <td className="py-1.5 text-end">{d.discountPercentage || 0}</td>
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
          <div className="flex justify-between border-t-2 border-black pt-1 text-base font-bold">
            <span>{t("grn.netTotal")}</span>
            <span>{formatMoney(netTotal, currency, locale)}</span>
          </div>
        </div>
      </div>

      {receipt.remarks && (
        <div className="border-t border-gray-300 pt-3 text-sm">
          <p className="text-xs font-semibold uppercase text-gray-500">{t("gl.remarks")}</p>
          <p>{receipt.remarks}</p>
        </div>
      )}

      <div className="mt-16 grid grid-cols-2 gap-8 text-sm">
        <div className="border-t border-black pt-2">{t("grn.receivedBy")}</div>
        <div className="border-t border-black pt-2 text-end">{t("purchaseOrder.supplier")}</div>
      </div>
    </div>
  );
}
