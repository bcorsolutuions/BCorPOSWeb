// Customer Display — a second browser window on the same POS PC (see
// components/pos/customer-display-button.tsx) that mirrors the live cart in
// real time for the customer to watch, plus a brief "thank you" screen once
// payment completes. Synced entirely client-side via BroadcastChannel (same
// origin, same machine) — no backend involved, works identically across
// every business type since it just mirrors whatever's in usePosCartStore
// regardless of which product panel (supermarket scan, tile grid, salon
// service picker) put it there.

export interface CustomerDisplayLine {
  lineId: string;
  name: string;
  barcode?: string | null;
  quantity: number;
  unitCode?: string | null;
  isWeighted?: boolean;
  unitPrice: number;
  netAmount: number;
}

export interface CustomerDisplayCartMessage {
  type: "cart";
  lines: CustomerDisplayLine[];
  subTotal: number;
  discountAmount: number;
  taxAmount: number;
  netTotal: number;
  currency: string;
  customerName?: string | null;
}

export interface CustomerDisplayThankYouMessage {
  type: "thankYou";
  amountPaid: number;
  changeDue: number;
  currency: string;
}

export interface CustomerDisplayIdleMessage {
  type: "idle";
}

export type CustomerDisplayMessage =
  | CustomerDisplayCartMessage
  | CustomerDisplayThankYouMessage
  | CustomerDisplayIdleMessage;

// Scoped by terminalId (not just a fixed name) so two tills configured in
// the same browser profile on one PC — unusual, but the till session is
// per-device by design (see pos-session-store.ts) — never cross-talk.
export function customerDisplayChannelName(terminalId: string): string {
  return `bcor-customer-display-${terminalId}`;
}
