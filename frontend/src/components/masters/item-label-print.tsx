"use client";

import { useEffect, useRef } from "react";
import JsBarcode from "jsbarcode";
import { useLocale } from "next-intl";
import { formatMoney } from "@/lib/utils";
import { useCurrencyStore } from "@/stores/currency-store";
import type { ItemMaster } from "@/types/item-master";

/**
 * One 50mm x 30mm shelf label — name, price, and a scannable CODE128
 * barcode of item.barCode (see .label-print-area in globals.css for the
 * page size this is meant to fill). An item with no barCode still renders
 * (name + price only) rather than showing a broken/fabricated barcode —
 * this app never invents a barcode value that isn't the real one on record.
 */
export function ItemLabelSticker({ item }: { item: ItemMaster }) {
  const locale = useLocale();
  const currency = useCurrencyStore((s) => s.currencyCode);
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!svgRef.current || !item.barCode) return;
    try {
      JsBarcode(svgRef.current, item.barCode, {
        format: "CODE128",
        width: 1.5,
        height: 32,
        fontSize: 11,
        margin: 0,
        displayValue: true,
      });
    } catch {
      // A barcode value jsbarcode's CODE128 encoder can't render (unusual
      // characters) — leave the label's name/price intact rather than
      // crash the whole print run over one bad item.
    }
  }, [item.barCode]);

  return (
    <div className="flex h-[30mm] w-[50mm] flex-col items-center justify-between overflow-hidden border border-dashed border-gray-300 p-1 text-black">
      <p className="w-full truncate text-center text-[9px] font-semibold leading-tight">{item.name}</p>
      {item.barCode ? <svg ref={svgRef} className="max-w-full" /> : <p className="text-[8px] text-gray-400">{item.code}</p>}
      <p className="text-xs font-bold">{formatMoney(item.price ?? 0, currency, locale)}</p>
    </div>
  );
}

export function ItemLabelPrint({ item, quantity }: { item: ItemMaster; quantity: number }) {
  return (
    <>
      {Array.from({ length: Math.max(1, quantity) }).map((_, i) => (
        <ItemLabelSticker key={i} item={item} />
      ))}
    </>
  );
}
