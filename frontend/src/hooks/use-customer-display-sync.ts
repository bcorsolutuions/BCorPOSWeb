"use client";

import { useEffect, useRef } from "react";
import { usePosCartStore } from "@/stores/pos-cart-store";
import { useCurrencyStore } from "@/stores/currency-store";
import { calcBillTotals, calcLineTotals } from "@/lib/pos/calc";
import { customerDisplayChannelName, type CustomerDisplayMessage } from "@/lib/pos/customer-display";

/**
 * Publishing side of the Customer Display feature (see lib/pos/customer-
 * display.ts) — call once from the POS Billing page. Re-broadcasts the cart
 * on every change (or "idle" once it empties), and returns `postThankYou`
 * for the caller to fire right when a sale completes, before `cart.clear()`
 * wipes the lines this effect would otherwise re-broadcast as "idle".
 */
export function useCustomerDisplaySync(terminalId: string | null) {
  const lines = usePosCartStore((s) => s.lines);
  const customerName = usePosCartStore((s) => s.customerName);
  const billDiscountAmount = usePosCartStore((s) => s.billDiscountAmount);
  const currency = useCurrencyStore((s) => s.currencyCode);
  const channelRef = useRef<BroadcastChannel | null>(null);

  useEffect(() => {
    if (!terminalId || typeof BroadcastChannel === "undefined") return;
    const channel = new BroadcastChannel(customerDisplayChannelName(terminalId));
    channelRef.current = channel;
    return () => {
      channel.close();
      channelRef.current = null;
    };
  }, [terminalId]);

  useEffect(() => {
    const channel = channelRef.current;
    if (!channel) return;

    if (lines.length === 0) {
      channel.postMessage({ type: "idle" } satisfies CustomerDisplayMessage);
      return;
    }

    const displayLines = lines.map((l) => ({
      lineId: l.lineId,
      name: l.name,
      barcode: l.barcode,
      quantity: l.quantity,
      unitCode: l.unitCode,
      isWeighted: l.isWeighted,
      unitPrice: l.unitPrice,
      netAmount: calcLineTotals(l).net,
    }));
    const bill = calcBillTotals(lines, billDiscountAmount);

    channel.postMessage({
      type: "cart",
      lines: displayLines,
      subTotal: bill.subTotal,
      discountAmount: bill.discountAmount,
      taxAmount: bill.taxAmount,
      netTotal: bill.netTotal,
      currency,
      customerName,
      // terminalId isn't part of the message — the channel itself is
      // already scoped to it, and this effect only runs while `terminalId`
      // (a dependency below) is set, so `channelRef.current` is always the
      // channel for the current terminal.
    } satisfies CustomerDisplayMessage);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lines, billDiscountAmount, currency, customerName, terminalId]);

  function postThankYou(amountPaid: number, changeDue: number) {
    channelRef.current?.postMessage({
      type: "thankYou",
      amountPaid,
      changeDue,
      currency,
    } satisfies CustomerDisplayMessage);
  }

  return { postThankYou };
}
