"use client";

import { useEffect, useRef } from "react";
import QRCode from "qrcode";

/**
 * One printable table-QR sticker — static branding logo (see the login
 * page's own use of the same asset; "do not hardcode branding" per the spec
 * meant no per-tenant logo upload flow was invented here, not that this
 * asset had to be avoided), "TABLE {code}", a large scannable QR of the
 * public ordering URL, and both "Scan to Order" and "امسح للطلب" printed
 * together (the diner's language isn't known until they scan, so the label
 * itself is bilingual regardless of the admin's current UI locale). Sized
 * for .qr-label-print-area's 80mm x 100mm page (see globals.css).
 */
export function QrTableLabelSticker({ tableCode, orderUrl }: { tableCode: string; orderUrl: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!canvasRef.current) return;
    QRCode.toCanvas(canvasRef.current, orderUrl, { margin: 1, width: 220 }).catch(() => {
      // A URL QRCode can't encode (shouldn't happen — it's always our own
      // https:// origin) — leave the canvas blank rather than crash the print run.
    });
  }, [orderUrl]);

  return (
    <div className="flex h-[100mm] w-[80mm] flex-col items-center justify-between gap-2 overflow-hidden border border-dashed border-gray-300 p-4 text-center text-black">
      {/* eslint-disable-next-line @next/next/no-img-element -- static branding asset, not backend-served */}
      <img src="/branding/logo.jpeg" alt="" className="h-12 w-12 rounded-md object-contain" />
      <p className="text-lg font-bold uppercase tracking-wide">TABLE {tableCode}</p>
      <canvas ref={canvasRef} />
      <div className="text-sm font-medium">
        <p>Scan to Order</p>
        <p dir="rtl">امسح للطلب</p>
      </div>
    </div>
  );
}
