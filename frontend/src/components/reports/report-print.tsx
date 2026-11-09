import { useTranslations, useLocale } from "next-intl";
import { isRtl } from "@/i18n/config";
import type { ReportResult } from "@/lib/api/services/dashboard-service";

// A4 rendering of a generated report — used both for the on-screen Preview
// dialog and as the actual print/PDF target (same .doc-print-area dual-use
// pattern as components/purchase/purchase-order-print.tsx etc.). Columns
// and values are entirely server-driven (see ReportsController), so unlike
// the purchase documents this has no fixed field list — it just walks
// result.columns/rows/totals generically.
export function ReportPrint({
  title,
  fromDate,
  toDate,
  branchName,
  result,
  columnLabel,
}: {
  title: string;
  fromDate: string;
  toDate: string;
  branchName: string;
  result: ReportResult;
  columnLabel: (column: string) => string;
}) {
  const t = useTranslations();
  const locale = useLocale();
  const rtl = isRtl(locale as "en" | "ar");

  return (
    <div dir={rtl ? "rtl" : "ltr"} lang={locale} className="mx-auto w-full max-w-[297mm] space-y-6 bg-white p-8 text-black">
      <div className="flex items-start justify-between border-b-2 border-black pb-4">
        <div>
          <p className="text-xl font-bold">{branchName}</p>
          <p className="text-sm text-gray-600">
            {new Date(fromDate).toLocaleDateString(locale)} – {new Date(toDate).toLocaleDateString(locale)}
          </p>
        </div>
        <div className="text-end">
          <p className="text-2xl font-bold uppercase tracking-wide">{title}</p>
        </div>
      </div>

      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-y-2 border-black">
            {result.columns.map((col) => (
              <th key={col} className="whitespace-nowrap px-2 py-2 text-start font-semibold">
                {columnLabel(col)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {result.rows.map((row, i) => (
            <tr key={i} className="border-b border-gray-300">
              {result.columns.map((col) => (
                <td key={col} className="px-2 py-1.5">
                  {row[col]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
        {result.totals && (
          <tfoot>
            <tr className="border-t-2 border-black font-bold">
              {result.columns.map((col, i) => (
                <td key={col} className="px-2 py-2">
                  {i === 0 ? t("common.total") : (result.totals?.[col] ?? "")}
                </td>
              ))}
            </tr>
          </tfoot>
        )}
      </table>
    </div>
  );
}
