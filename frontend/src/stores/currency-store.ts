import { create } from "zustand";
import { persist } from "zustand/middleware";

// ISO 4217 codes only — Intl.NumberFormat({style:"currency", currency})
// already applies the right symbol and minor-unit decimals per currency
// (e.g. BHD/KWD/OMR get 3 decimals, JPY would get 0) with no extra code
// needed here. GCC-focused list since this deployment targets that region
// (see the BenefitPay payment method already in POS Billing).
export const SUPPORTED_CURRENCIES = ["AED", "BHD", "SAR", "KWD", "OMR", "QAR", "USD"] as const;
export type CurrencyCode = (typeof SUPPORTED_CURRENCIES)[number];

interface CurrencyState {
  currencyCode: CurrencyCode;
  setCurrency: (code: CurrencyCode) => void;
}

/**
 * The single source of truth every formatMoney() call in the app reads
 * from — a client-side, persisted preference (mirrors how locale is
 * persisted via LanguageProvider). BCorDFWebApi's SysSiteMast.CurrencyCode
 * is the real per-branch field this *could* sync from/to, but that's a
 * bigger "branch settings" surface than this — this store is deliberately
 * simple: a user-facing setting, not derived from any document's stored
 * amounts (those are currency-agnostic decimal columns either way).
 */
export const useCurrencyStore = create<CurrencyState>()(
  persist(
    (set) => ({
      currencyCode: "BHD",
      setCurrency: (code) => set({ currencyCode: code }),
    }),
    { name: "bcor-currency" },
  ),
);
